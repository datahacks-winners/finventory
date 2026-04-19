import * as functions from 'firebase-functions';
import * as v1 from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db } from '../config.js';
// ============================================================================
// Tier Configuration
// ============================================================================
export const TIER_CONFIG = {
    unverified: {
        maxListings: 3,
        maxQuantityPerListing: 50,
        commissionRate: 0.20,
        features: ['basic_listing'],
        minScore: 0
    },
    bronze: {
        maxListings: 10,
        maxQuantityPerListing: 100,
        commissionRate: 0.18,
        features: ['basic_listing', 'photos', 'shipping'],
        minScore: 40
    },
    silver: {
        maxListings: 25,
        maxQuantityPerListing: 500,
        commissionRate: 0.15,
        features: ['basic_listing', 'photos', 'shipping', 'pre_orders', 'analytics'],
        minScore: 60
    },
    gold: {
        maxListings: 100,
        maxQuantityPerListing: 2000,
        commissionRate: 0.12,
        features: ['all', 'featured_placement', 'priority_support'],
        minScore: 75
    },
    platinum: {
        maxListings: Infinity,
        maxQuantityPerListing: Infinity,
        commissionRate: 0.10,
        features: ['all', 'dedicated_manager', 'api_access', 'custom_terms'],
        minScore: 90
    }
};
// ============================================================================
// Tier Calculation
// ============================================================================
export function calculateTierScore(verification) {
    let score = 0;
    const v = verification.verifications;
    // Identity verifications (40 points max)
    if (v.email.verified)
        score += 5;
    if (v.phone.verified)
        score += 5;
    if (v.businessLicense.verified)
        score += 10;
    if (v.healthPermit.verified)
        score += 10;
    if (v.taxId.verified)
        score += 5;
    if (v.bankAccount.verified)
        score += 5;
    // Location verification (10 points)
    if (v.physicalLocation.verified)
        score += 10;
    // Performance metrics (30 points max)
    const m = verification.metrics;
    if (m.totalOrders >= 10)
        score += 5;
    if (m.totalOrders >= 50)
        score += 5;
    if (m.avgRating >= 4.5)
        score += 10;
    if (m.disputeRate < 0.02)
        score += 5;
    if (m.onTimePickupRate > 0.95)
        score += 5;
    // Additional (20 points)
    if (verification.backgroundCheck?.status === 'clear')
        score += 10;
    if (verification.liabilityInsurance)
        score += 10;
    return Math.min(100, score);
}
export function getTierFromScore(score) {
    if (score >= 90)
        return 'platinum';
    if (score >= 75)
        return 'gold';
    if (score >= 60)
        return 'silver';
    if (score >= 40)
        return 'bronze';
    return 'unverified';
}
// ============================================================================
// API Functions
// ============================================================================
/**
 * Get my verification status and progress
 */
export const getMyVerification = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const sellerId = request.auth.uid;
    try {
        // Get or create verification record
        let verification = await db.collection('sellerVerifications').doc(sellerId).get();
        if (!verification.exists) {
            // Create initial verification record
            const initialVerification = {
                tier: 'unverified',
                tierScore: 0,
                verifications: {
                    email: { verified: false },
                    phone: { verified: false },
                    businessLicense: { verified: false },
                    healthPermit: { verified: false },
                    taxId: { verified: false },
                    bankAccount: { verified: false },
                    physicalLocation: { verified: false }
                },
                metrics: {
                    totalOrders: 0,
                    completedOrders: 0,
                    cancelledOrders: 0,
                    disputeRate: 0,
                    avgRating: 0,
                    onTimePickupRate: 0,
                    photoComplianceRate: 0,
                    accountAgeDays: 0
                },
                currentListingCount: 0,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            await db.collection('sellerVerifications').doc(sellerId).set(initialVerification);
            verification = await db.collection('sellerVerifications').doc(sellerId).get();
        }
        const data = verification.data();
        const config = TIER_CONFIG[data.tier];
        // Calculate what's needed for next tier
        const currentScore = calculateTierScore(data);
        const nextTier = getTierFromScore(currentScore + 1);
        const nextTierConfig = nextTier !== data.tier ? TIER_CONFIG[nextTier] : null;
        return {
            verification: {
                ...data,
                calculatedScore: currentScore
            },
            tierConfig: config,
            nextTier: nextTierConfig ? {
                tier: nextTier,
                config: nextTierConfig,
                pointsNeeded: nextTierConfig.minScore - currentScore
            } : null
        };
    }
    catch (error) {
        console.error('Error fetching verification:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch verification');
    }
});
/**
 * Submit verification document
 */
export const submitVerificationDocument = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const sellerId = request.auth.uid;
    const now = admin.firestore.Timestamp.now();
    try {
        // Check if document already exists
        const existingDocs = await db.collection('verificationDocuments')
            .where('sellerId', '==', sellerId)
            .where('type', '==', data.type)
            .where('status', 'in', ['pending', 'verified'])
            .get();
        if (!existingDocs.empty) {
            throw new functions.https.HttpsError('already-exists', `You already have a ${data.type} document pending or verified`);
        }
        // Create document record
        const docRef = await db.collection('verificationDocuments').add({
            sellerId,
            type: data.type,
            status: 'pending',
            documentUrl: data.documentUrl,
            documentNumber: data.documentNumber,
            issuingBody: data.issuingBody,
            issuedAt: data.issuedAt,
            expiresAt: data.expiresAt,
            createdAt: now
        });
        // Link to verification record
        const verificationRef = db.collection('sellerVerifications').doc(sellerId);
        const verificationUpdate = {};
        switch (data.type) {
            case 'business_license':
                verificationUpdate['verifications.businessLicense'] = {
                    verified: false,
                    documentId: docRef.id
                };
                break;
            case 'health_permit':
                verificationUpdate['verifications.healthPermit'] = {
                    verified: false,
                    documentId: docRef.id
                };
                break;
            case 'liability_insurance':
                verificationUpdate.liabilityInsurance = {
                    provider: data.issuingBody,
                    policyNumber: data.documentNumber,
                    coverageAmount: 0, // Will be filled by admin
                    expiresAt: data.expiresAt
                };
                break;
        }
        verificationUpdate.updatedAt = now;
        await verificationRef.update(verificationUpdate);
        // Notify admin for review
        await notifyAdminOfPendingDocument(sellerId, data.type, docRef.id);
        return {
            success: true,
            documentId: docRef.id,
            status: 'pending'
        };
    }
    catch (error) {
        console.error('Error submitting document:', error);
        throw new functions.https.HttpsError('internal', 'Failed to submit document');
    }
});
/**
 * Admin: Verify or reject document
 */
export const reviewVerificationDocument = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Check if user is admin
    const adminDoc = await db.collection('admins').doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const now = admin.firestore.Timestamp.now();
    try {
        const docRef = db.collection('verificationDocuments').doc(data.documentId);
        const doc = await docRef.get();
        if (!doc.exists) {
            throw new functions.https.HttpsError('not-found', 'Document not found');
        }
        const docData = doc.data();
        if (data.action === 'verify') {
            await docRef.update({
                status: 'verified',
                verifiedBy: request.auth.uid,
                verifiedAt: now
            });
            // Update verification record
            const verificationRef = db.collection('sellerVerifications').doc(docData.sellerId);
            const verificationUpdate = {
                updatedAt: now
            };
            switch (docData.type) {
                case 'business_license':
                    verificationUpdate['verifications.businessLicense'] = {
                        verified: true,
                        documentId: data.documentId,
                        at: now
                    };
                    break;
                case 'health_permit':
                    verificationUpdate['verifications.healthPermit'] = {
                        verified: true,
                        documentId: data.documentId,
                        at: now
                    };
                    break;
                case 'tax_id':
                    verificationUpdate['verifications.taxId'] = {
                        verified: true,
                        at: now
                    };
                    break;
            }
            await verificationRef.update(verificationUpdate);
            // Recalculate tier
            await recalculateSellerTier(docData.sellerId);
            // Notify seller
            await notifySellerOfVerification(docData.sellerId, docData.type, true);
        }
        else {
            // Reject
            await docRef.update({
                status: 'rejected',
                rejectionReason: data.rejectionReason,
                verifiedBy: request.auth.uid,
                verifiedAt: now
            });
            // Notify seller
            await notifySellerOfVerification(docData.sellerId, docData.type, false, data.rejectionReason);
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error reviewing document:', error);
        throw new functions.https.HttpsError('internal', 'Failed to review document');
    }
});
/**
 * Check if seller can create listing (enforce tier limits)
 */
export const checkCanCreateListing = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const sellerId = request.auth.uid;
    const { quantityKg } = data;
    try {
        // Get verification
        const verification = await db.collection('sellerVerifications').doc(sellerId).get();
        if (!verification.exists) {
            return {
                allowed: false,
                reason: 'verification_required',
                message: 'Please complete verification to start selling'
            };
        }
        const v = verification.data();
        // Check hard limit
        if (v.hardLimitReason) {
            return {
                allowed: false,
                reason: 'hard_limit',
                message: `Account restricted: ${v.hardLimitReason}`
            };
        }
        const config = TIER_CONFIG[v.tier];
        // Check quantity limit
        if (quantityKg > config.maxQuantityPerListing) {
            return {
                allowed: false,
                reason: 'quantity_limit',
                message: `Maximum ${config.maxQuantityPerListing}kg per listing for ${v.tier} tier. Upgrade to list more.`
            };
        }
        // Check active listing count
        const activeListings = await db.collection('listings')
            .where('sellerId', '==', sellerId)
            .where('status', '==', 'active')
            .count()
            .get();
        if (activeListings.data().count >= config.maxListings) {
            return {
                allowed: false,
                reason: 'listing_limit',
                message: `Maximum ${config.maxListings} active listings for ${v.tier} tier. Close some listings or upgrade.`
            };
        }
        return {
            allowed: true,
            tier: v.tier,
            commissionRate: config.commissionRate
        };
    }
    catch (error) {
        console.error('Error checking listing eligibility:', error);
        throw new functions.https.HttpsError('internal', 'Failed to check eligibility');
    }
});
/**
 * Admin: Set hard limit on seller (for violations)
 */
export const setSellerHardLimit = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Check if user is admin
    const adminDoc = await db.collection('admins').doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const now = admin.firestore.Timestamp.now();
    try {
        const verificationRef = db.collection('sellerVerifications').doc(data.sellerId);
        if (data.remove) {
            await verificationRef.update({
                hardLimitReason: admin.firestore.FieldValue.delete(),
                hardLimitSetAt: admin.firestore.FieldValue.delete(),
                updatedAt: now
            });
        }
        else {
            await verificationRef.update({
                hardLimitReason: data.reason,
                hardLimitSetAt: now,
                updatedAt: now
            });
            // Suspend all active listings
            const listings = await db.collection('listings')
                .where('sellerId', '==', data.sellerId)
                .where('status', '==', 'active')
                .get();
            for (const listing of listings.docs) {
                await listing.ref.update({ status: 'suspended' });
            }
            // Notify seller
            await notifySellerOfHardLimit(data.sellerId, data.reason);
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error setting hard limit:', error);
        throw new functions.https.HttpsError('internal', 'Failed to set limit');
    }
});
/**
 * Admin: List pending verification documents
 */
export const getPendingVerifications = functions.https.onCall(async (request) => {
    const data = request.data;
    const context = request;
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Check if user is admin
    const adminDoc = await db.collection('admins').doc(request.auth.uid).get();
    if (!adminDoc.exists) {
        throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }
    const limit = data.limit || 50;
    try {
        const snapshot = await db.collection('verificationDocuments')
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(limit)
            .get();
        const documents = await Promise.all(snapshot.docs.map(async (doc) => {
            const docData = doc.data();
            const sellerDoc = await db.collection('users').doc(docData.sellerId).get();
            const seller = sellerDoc.data();
            return {
                id: doc.id,
                ...docData,
                seller: {
                    id: docData.sellerId,
                    name: seller?.businessName || seller?.displayName || 'Unknown',
                    email: seller?.email
                }
            };
        }));
        return { documents };
    }
    catch (error) {
        console.error('Error fetching pending verifications:', error);
        throw new functions.https.HttpsError('internal', 'Failed to fetch documents');
    }
});
// ============================================================================
// Helper Functions
// ============================================================================
async function recalculateSellerTier(sellerId) {
    const verification = await db.collection('sellerVerifications').doc(sellerId).get();
    if (!verification.exists)
        return;
    const data = verification.data();
    const newScore = calculateTierScore(data);
    const newTier = getTierFromScore(newScore);
    if (newTier !== data.tier) {
        await db.collection('sellerVerifications').doc(sellerId).update({
            tier: newTier,
            tierScore: newScore,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Notify seller of tier change
        await notifySellerOfTierChange(sellerId, data.tier, newTier);
    }
}
async function notifyAdminOfPendingDocument(sellerId, type, documentId) {
    try {
        // Get all admins
        const admins = await db.collection('admins').get();
        const { notifyUser } = await import('../utils/notifications.js');
        for (const admin of admins.docs) {
            await notifyUser({
                userId: admin.id,
                type: 'listing_update',
                title: 'Verification Document Pending',
                body: `Seller ${sellerId} submitted ${type} for review`,
                data: { documentId, sellerId, type }
            });
        }
    }
    catch (error) {
        console.error('Failed to notify admin:', error);
    }
}
async function notifySellerOfVerification(sellerId, type, approved, reason) {
    try {
        const { notifyUser } = await import('../utils/notifications.js');
        const typeNames = {
            business_license: 'Business License',
            health_permit: 'Health Permit',
            tax_id: 'Tax ID',
            liability_insurance: 'Insurance'
        };
        if (approved) {
            await notifyUser({
                userId: sellerId,
                type: 'listing_update',
                title: 'Document Verified',
                body: `Your ${typeNames[type] || type} has been verified.`,
                data: { type, status: 'verified' }
            });
        }
        else {
            await notifyUser({
                userId: sellerId,
                type: 'listing_update',
                title: 'Document Rejected',
                body: `Your ${typeNames[type] || type} was rejected. Reason: ${reason || 'Invalid document'}`,
                data: { type, status: 'rejected', reason: reason || 'Invalid document' }
            });
        }
    }
    catch (error) {
        console.error('Failed to notify seller:', error);
    }
}
async function notifySellerOfTierChange(sellerId, oldTier, newTier) {
    try {
        const { notifyUser } = await import('../utils/notifications.js');
        const tierBenefits = {
            bronze: '10 listings, 18% commission',
            silver: '25 listings, 15% commission, analytics access',
            gold: '100 listings, 12% commission, featured placement',
            platinum: 'Unlimited listings, 10% commission, dedicated support'
        };
        await notifyUser({
            userId: sellerId,
            type: 'listing_update',
            title: `Upgraded to ${newTier.charAt(0).toUpperCase() + newTier.slice(1)}!`,
            body: tierBenefits[newTier]
                ? `Congratulations! You've been upgraded to ${newTier} tier. Benefits: ${tierBenefits[newTier]}`
                : `Congratulations! You've been upgraded to ${newTier} tier.`,
            data: { oldTier, newTier }
        });
    }
    catch (error) {
        console.error('Failed to notify seller:', error);
    }
}
async function notifySellerOfHardLimit(sellerId, reason) {
    try {
        const { notifyUser } = await import('../utils/notifications.js');
        await notifyUser({
            userId: sellerId,
            type: 'listing_update',
            title: 'Account Restricted',
            body: `Your account has been restricted: ${reason}. Please contact support.`,
            data: { reason, action: 'hard_limit' }
        });
    }
    catch (error) {
        console.error('Failed to notify seller:', error);
    }
}
// ============================================================================
// Scheduled Job: Check Expiring Documents
// ============================================================================
export const checkExpiringDocuments = v1.pubsub.schedule('every 24 hours').onRun(async (_context) => {
    console.log('Checking for expiring verification documents...');
    const now = admin.firestore.Timestamp.now();
    const thirtyDaysFromNow = new Date(now.toMillis() + (30 * 24 * 60 * 60 * 1000));
    try {
        // Find documents expiring in 30 days
        const expiringSoon = await db.collection('verificationDocuments')
            .where('expiresAt', '<=', admin.firestore.Timestamp.fromDate(thirtyDaysFromNow))
            .where('expiresAt', '>', now)
            .where('status', '==', 'verified')
            .get();
        for (const doc of expiringSoon.docs) {
            const data = doc.data();
            // Notify seller to renew
            try {
                const { notifyUser } = await import('../utils/notifications.js');
                await notifyUser({
                    userId: data.sellerId,
                    type: 'listing_update',
                    title: 'Document Expiring Soon',
                    body: `Your ${data.type} expires in less than 30 days. Please upload a renewed document.`,
                    data: { documentId: doc.id, type: data.type, expiresAt: data.expiresAt }
                });
            }
            catch (error) {
                console.error('Failed to send expiry notification:', error);
            }
        }
        // Find expired documents and mark status
        const expired = await db.collection('verificationDocuments')
            .where('expiresAt', '<=', now)
            .where('status', '==', 'verified')
            .get();
        for (const doc of expired.docs) {
            await doc.ref.update({ status: 'expired' });
            // Recalculate tier (may drop)
            const data = doc.data();
            await recalculateSellerTier(data.sellerId);
        }
        console.log(`Processed ${expiringSoon.size} expiring soon, ${expired.size} expired`);
        return null;
    }
    catch (error) {
        console.error('Error checking expiring documents:', error);
        throw error;
    }
});
