import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { db } from '../config.js';
import { distanceInMiles } from '../utils/geohash.js';
import { notifyStandingOrderMatch } from '../utils/notifications.js';
/**
 * Scheduled function - runs every 5 minutes
 * Finds active listings that match standing orders and notifies buyers
 */
export const matchStandingOrders = functions.pubsub.schedule('every 5 minutes').onRun(async (_context) => {
    const now = admin.firestore.Timestamp.now();
    // Get all active listings
    const listingsSnapshot = await db
        .collection('listings')
        .where('status', '==', 'active')
        .where('expiresAt', '>', now)
        .get();
    if (listingsSnapshot.empty) {
        console.log('No active listings found');
        return null;
    }
    // Get all active standing orders
    const standingOrdersSnapshot = await db
        .collection('standingOrders')
        .where('isActive', '==', true)
        .get();
    if (standingOrdersSnapshot.empty) {
        console.log('No active standing orders found');
        return null;
    }
    let matchCount = 0;
    // Check each listing against each standing order
    for (const listingDoc of listingsSnapshot.docs) {
        const listing = listingDoc.data();
        const listingId = listingDoc.id;
        for (const soDoc of standingOrdersSnapshot.docs) {
            const order = soDoc.data();
            // Skip if recently matched (within last hour)
            if (order.lastMatchedAt) {
                const lastMatched = order.lastMatchedAt.toDate();
                const hoursSinceMatch = (now.toDate().getTime() - lastMatched.getTime()) / (1000 * 60 * 60);
                if (hoursSinceMatch < 1) {
                    continue;
                }
            }
            // Check for match
            const isMatch = checkMatch(listing, order);
            if (isMatch) {
                await notifyStandingOrderMatch(order.buyerId, listingId, listing.species, listing.grade);
                // Update last matched timestamp
                await soDoc.ref.update({
                    lastMatchedAt: now
                });
                matchCount++;
            }
        }
    }
    console.log(`Standing order matcher completed: ${matchCount} matches found`);
    return null;
});
function checkMatch(listing, order) {
    // Check species match
    const speciesMatch = order.species.includes('*') || order.species.includes(listing.species);
    if (!speciesMatch)
        return false;
    // Check grade match
    const gradeOrder = { sushi: 3, A: 2, B: 1 };
    if (gradeOrder[order.minGrade] > gradeOrder[listing.grade]) {
        return false;
    }
    // Check price match
    if (order.maxPricePerUnit && listing.pricePerUnit > order.maxPricePerUnit) {
        return false;
    }
    // Check distance
    const distance = distanceInMiles(order.location.latitude, order.location.longitude, listing.location.latitude, listing.location.longitude);
    return distance <= order.maxDistance;
}
