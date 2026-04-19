import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import type { SellerVerification } from './verification.js'

// ============================================================================
// Types
// ============================================================================

export type DisputeType = 'grade_mismatch' | 'freshness' | 'quantity_short' | 'damaged' | 'wrong_species' | 'contamination' | 'other'
export type DisputeStatus = 'open' | 'under_review' | 'resolved_buyer_favor' | 'resolved_seller_favor' | 'compromise' | 'escalated' | 'appealed'
export type ResolutionType = 'full_refund' | 'partial_refund' | 'seller_credit' | 'replacement' | 'rejected' | 'escalated'

export interface QualityDispute {
  id: string
  orderId: string
  
  // Who filed
  filedBy: 'buyer' | 'seller'
  filedById: string
  filedAt: admin.firestore.Timestamp
  
  // Claim details
  disputeType: DisputeType
  claimDescription: string
  claimedGrade?: string
  actualQuantityKg?: number
  claimedDefects?: string[]
  
  // Evidence
  evidencePhotos: string[]
  evidenceVideos?: string[]
  temperatureLog?: string
  thirdPartyReport?: string
  
  // Resolution
  status: DisputeStatus
  resolution?: {
    type: ResolutionType
    refundAmount?: number
    sellerCreditAmount?: number
    reason: string
    resolvedBy: string
    resolvedAt: admin.firestore.Timestamp
  }
  
  // Financial
  amountInDispute: number
  commissionAdjustment?: number
  
  // Appeal
  appeal?: {
    appealedAt: admin.firestore.Timestamp
    reason: string
    status: 'pending' | 'accepted' | 'rejected'
  }
  
  // Communication
  messages: DisputeMessage[]
  
  // Auto-resolution tracking
  autoResolved: boolean
  autoResolutionReason?: string
  
  createdAt: admin.firestore.Timestamp
  updatedAt: admin.firestore.Timestamp
}

export interface DisputeMessage {
  id: string
  senderId: string
  senderType: 'buyer' | 'seller' | 'admin' | 'system'
  message: string
  attachments?: string[]
  timestamp: admin.firestore.Timestamp
}

// ============================================================================
// Filing Window Configuration
// ============================================================================

const DISPUTE_FILING_WINDOW_HOURS = 24
const AUTO_RESOLUTION_THRESHOLD_SHORT = 0.1 // 10% short for auto-refund

// ============================================================================
// API Functions
// ============================================================================

/**
 * File a new quality dispute
 */
export const fileDispute = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    orderId: string
    disputeType: DisputeType
    claimDescription: string
    claimedGrade?: string
    actualQuantityKg?: number
    claimedDefects?: string[]
    evidencePhotos: string[]
    evidenceVideos?: string[]
    temperatureLog?: string
  }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = request.auth.uid
    const now = admin.firestore.Timestamp.now()

    try {
      // Get order
      const orderRef = db.collection('orders').doc(data.orderId)
      const orderDoc = await orderRef.get()
      
      if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found')
      }
      
      const order = orderDoc.data()
      if (!order) {
        throw new functions.https.HttpsError('not-found', 'Order data not found')
      }

      // Verify user is buyer or seller
      const isBuyer = order.buyerId === userId
      const isSeller = order.sellerId === userId
      
      if (!isBuyer && !isSeller) {
        throw new functions.https.HttpsError('permission-denied', 'Not your order')
      }

      // Check filing window
      const pickupTime = order.pickupTime || order.shipping?.deliveredAt
      if (!pickupTime) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Cannot dispute order that has not been picked up or delivered'
        )
      }

      const hoursSincePickup = (now.toMillis() - pickupTime.toMillis()) / (1000 * 60 * 60)
      if (hoursSincePickup > DISPUTE_FILING_WINDOW_HOURS) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Dispute must be filed within ${DISPUTE_FILING_WINDOW_HOURS} hours of pickup/delivery`
        )
      }

      // Check if already disputed
      const existingDispute = await db.collection('qualityDisputes')
        .where('orderId', '==', data.orderId)
        .where('status', 'in', ['open', 'under_review'])
        .get()

      if (!existingDispute.empty) {
        throw new functions.https.HttpsError(
          'already-exists',
          'Order already has an open dispute'
        )
      }

      // Calculate amount in dispute
      let amountInDispute = order.total || 0
      
      // For quantity short, only dispute the missing portion
      if (data.disputeType === 'quantity_short' && data.actualQuantityKg) {
        const shortAmount = order.quantityKg - data.actualQuantityKg
        const shortPercent = shortAmount / order.quantityKg
        amountInDispute = Math.round((order.total || 0) * shortPercent)
      }

      // Create dispute
      const disputeRef = await db.collection('qualityDisputes').add({
        orderId: data.orderId,
        filedBy: isBuyer ? 'buyer' : 'seller',
        filedById: userId,
        filedAt: now,
        disputeType: data.disputeType,
        claimDescription: data.claimDescription,
        claimedGrade: data.claimedGrade,
        actualQuantityKg: data.actualQuantityKg,
        claimedDefects: data.claimedDefects,
        evidencePhotos: data.evidencePhotos,
        evidenceVideos: data.evidenceVideos || [],
        temperatureLog: data.temperatureLog,
        status: 'open',
        amountInDispute,
        messages: [{
          id: db.collection('_').doc().id,
          senderId: userId,
          senderType: isBuyer ? 'buyer' : 'seller',
          message: `Dispute filed: ${data.claimDescription}`,
          timestamp: now
        }],
        autoResolved: false,
        createdAt: now,
        updatedAt: now
      })

      // Hold seller payout if not yet paid
      await holdSellerPayout(data.orderId)

      // Notify other party
      const otherPartyId = isBuyer ? order.sellerId : order.buyerId
      await notifyDisputeOpened(otherPartyId, disputeRef.id, data.orderId, isBuyer)

      // Attempt auto-resolution for clear-cut cases
      await attemptAutoResolution(disputeRef.id, { ...data, order })

      return {
        success: true,
        disputeId: disputeRef.id,
        status: 'open'
      }
    } catch (error) {
      console.error('Error filing dispute:', error)
      if (error instanceof functions.https.HttpsError) throw error
      throw new functions.https.HttpsError('internal', 'Failed to file dispute')
    }
  }
)

/**
 * Get dispute details
 */
export const getDispute = functions.https.onCall(
  async (request: functions.https.CallableRequest<{ disputeId: string }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    try {
      const disputeDoc = await db.collection('qualityDisputes').doc(data.disputeId).get()
      
      if (!disputeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Dispute not found')
      }

      const dispute = disputeDoc.data() as QualityDispute

      // Verify access
      const orderDoc = await db.collection('orders').doc(dispute.orderId).get()
      const order = orderDoc.data()
      
      if (!order) {
        throw new functions.https.HttpsError('not-found', 'Order not found')
      }

      const isBuyer = order.buyerId === request.auth.uid
      const isSeller = order.sellerId === request.auth.uid
      const isAdmin = await checkIsAdmin(request.auth.uid)

      if (!isBuyer && !isSeller && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized')
      }

      return { dispute }
    } catch (error) {
      console.error('Error fetching dispute:', error)
      if (error instanceof functions.https.HttpsError) throw error
      throw new functions.https.HttpsError('internal', 'Failed to fetch dispute')
    }
  }
)

/**
 * Add message to dispute
 */
export const addDisputeMessage = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    disputeId: string
    message: string
    attachments?: string[]
  }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = request.auth.uid
    const now = admin.firestore.Timestamp.now()

    try {
      const disputeRef = db.collection('qualityDisputes').doc(data.disputeId)
      const disputeDoc = await disputeRef.get()
      
      if (!disputeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Dispute not found')
      }

      const dispute = disputeDoc.data() as QualityDispute

      // Verify access
      const orderDoc = await db.collection('orders').doc(dispute.orderId).get()
      const order = orderDoc.data()
      
      if (!order) {
        throw new functions.https.HttpsError('not-found', 'Order not found')
      }

      const isBuyer = order.buyerId === userId
      const isSeller = order.sellerId === userId
      const isAdmin = await checkIsAdmin(userId)

      if (!isBuyer && !isSeller && !isAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'Not authorized')
      }

      // Can't add messages to resolved disputes
      if (['resolved_buyer_favor', 'resolved_seller_favor', 'compromise'].includes(dispute.status)) {
        throw new functions.https.HttpsError('failed-precondition', 'Dispute is resolved')
      }

      const newMessage: DisputeMessage = {
        id: db.collection('_').doc().id,
        senderId: userId,
        senderType: isAdmin ? 'admin' : (isBuyer ? 'buyer' : 'seller'),
        message: data.message,
        attachments: data.attachments,
        timestamp: now
      }

      await disputeRef.update({
        messages: admin.firestore.FieldValue.arrayUnion(newMessage),
        updatedAt: now
      })

      // Notify other party
      const otherPartyId = isBuyer ? order.sellerId : order.buyerId
      await notifyNewMessage(otherPartyId, data.disputeId, isBuyer ? 'buyer' : 'seller')

      return { success: true, messageId: newMessage.id }
    } catch (error) {
      console.error('Error adding message:', error)
      if (error instanceof functions.https.HttpsError) throw error
      throw new functions.https.HttpsError('internal', 'Failed to add message')
    }
  }
)

/**
 * Admin: Resolve dispute
 */
export const resolveDispute = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    disputeId: string
    resolution: ResolutionType
    refundAmount?: number
    sellerCreditAmount?: number
    reason: string
  }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    // Check admin
    const isAdmin = await checkIsAdmin(request.auth.uid)
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required')
    }

    const now = admin.firestore.Timestamp.now()

    try {
      const disputeRef = db.collection('qualityDisputes').doc(data.disputeId)
      const disputeDoc = await disputeRef.get()
      
      if (!disputeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Dispute not found')
      }

      const dispute = disputeDoc.data() as QualityDispute

      // Map resolution to status
      const statusMap: Record<ResolutionType, DisputeStatus> = {
        'full_refund': 'resolved_buyer_favor',
        'partial_refund': 'compromise',
        'seller_credit': 'compromise',
        'replacement': 'compromise',
        'rejected': 'resolved_seller_favor',
        'escalated': 'escalated'
      }

      const newStatus = statusMap[data.resolution]

      await db.runTransaction(async (transaction) => {
        // Update dispute
        transaction.update(disputeRef, {
          status: newStatus,
          resolution: {
            type: data.resolution,
            refundAmount: data.refundAmount,
            sellerCreditAmount: data.sellerCreditAmount,
            reason: data.reason,
            resolvedBy: request.auth!.uid,
            resolvedAt: now
          },
          updatedAt: now
        })

        // Process financials
        if (data.refundAmount && data.refundAmount > 0) {
          await processRefund(dispute.orderId, data.refundAmount, transaction)
        }

        // Release or adjust seller payout
        await adjustSellerPayout(dispute.orderId, data.resolution, data.refundAmount, transaction)
      })

      // Notify parties
      const orderDoc = await db.collection('orders').doc(dispute.orderId).get()
      const order = orderDoc.data()
      
      if (order) {
        await notifyResolution(order.buyerId, data.disputeId, data.resolution, true)
        await notifyResolution(order.sellerId, data.disputeId, data.resolution, false)
      }

      // Update seller metrics
      await updateSellerDisputeMetrics(order?.sellerId, data.resolution)

      return { success: true, status: newStatus }
    } catch (error) {
      console.error('Error resolving dispute:', error)
      if (error instanceof functions.https.HttpsError) throw error
      throw new functions.https.HttpsError('internal', 'Failed to resolve dispute')
    }
  }
)

/**
 * Appeal a resolved dispute
 */
export const appealDispute = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    disputeId: string
    reason: string
  }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = request.auth.uid
    const now = admin.firestore.Timestamp.now()

    try {
      const disputeRef = db.collection('qualityDisputes').doc(data.disputeId)
      const disputeDoc = await disputeRef.get()
      
      if (!disputeDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Dispute not found')
      }

      const dispute = disputeDoc.data() as QualityDispute

      // Verify user was the losing party
      const isBuyer = dispute.filedBy === 'buyer'
      const canAppeal = 
        (isBuyer && dispute.status === 'resolved_seller_favor') ||
        (!isBuyer && dispute.status === 'resolved_buyer_favor') ||
        (dispute.status === 'compromise')

      if (!canAppeal) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Cannot appeal this resolution'
        )
      }

      // Check appeal window (48 hours)
      if (dispute.resolution?.resolvedAt) {
        const hoursSinceResolution = (now.toMillis() - dispute.resolution.resolvedAt.toMillis()) / (1000 * 60 * 60)
        if (hoursSinceResolution > 48) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'Appeal window (48 hours) has expired'
          )
        }
      }

      await disputeRef.update({
        status: 'appealed',
        appeal: {
          appealedAt: now,
          reason: data.reason,
          status: 'pending'
        },
        updatedAt: now
      })

      // Notify admin
      await notifyAdminOfAppeal(data.disputeId, userId, data.reason)

      return { success: true }
    } catch (error) {
      console.error('Error appealing dispute:', error)
      if (error instanceof functions.https.HttpsError) throw error
      throw new functions.https.HttpsError('internal', 'Failed to appeal dispute')
    }
  }
)

/**
 * Get my disputes (buyer or seller)
 */
export const getMyDisputes = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    status?: DisputeStatus[]
    limit?: number
  }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    const userId = request.auth.uid
    const limit = data.limit || 20

    try {
      // Get user's orders
      const buyerOrders = await db.collection('orders')
        .where('buyerId', '==', userId)
        .select('id')
        .get()
      
      const sellerOrders = await db.collection('orders')
        .where('sellerId', '==', userId)
        .select('id')
        .get()

      const orderIds = [
        ...buyerOrders.docs.map(d => d.id),
        ...sellerOrders.docs.map(d => d.id)
      ]

      if (orderIds.length === 0) {
        return { disputes: [] }
      }

      // Get disputes for those orders
      // Firestore limitation: can only do 10 items in 'in' query
      // For now, we'll get recent disputes and filter
      let query = db.collection('qualityDisputes')
        .orderBy('createdAt', 'desc')
        .limit(limit * 2) // Get extra to filter

      if (data.status && data.status.length > 0) {
        query = query.where('status', 'in', data.status)
      }

      const snapshot = await query.get()
      
      const disputes = snapshot.docs
        .filter(doc => {
          const d = doc.data()
          return orderIds.includes(d.orderId) || d.filedById === userId
        })
        .slice(0, limit)
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

      return { disputes }
    } catch (error) {
      console.error('Error fetching disputes:', error)
      throw new functions.https.HttpsError('internal', 'Failed to fetch disputes')
    }
  }
)

/**
 * Admin: Get all disputes
 */
export const getAllDisputes = functions.https.onCall(
  async (request: functions.https.CallableRequest<{
    status?: DisputeStatus[]
    limit?: number
  }>) => { const data = request.data; const context = request;
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }

    // Check admin
    const isAdmin = await checkIsAdmin(request.auth.uid)
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required')
    }

    const limit = data.limit || 50

    try {
      let query: admin.firestore.Query = db.collection('qualityDisputes')
        .orderBy('createdAt', 'desc')

      if (data.status && data.status.length > 0) {
        query = query.where('status', 'in', data.status)
      }

      const snapshot = await query.limit(limit).get()
      
      const disputes = await Promise.all(snapshot.docs.map(async (doc) => {
        const disputeData = doc.data()
        
        // Get order details
        const orderDoc = await db.collection('orders').doc(disputeData.orderId).get()
        const order = orderDoc.data()
        
        return {
          id: doc.id,
          ...disputeData,
          order: order ? {
            id: orderDoc.id,
            species: order.species,
            grade: order.grade,
            quantityKg: order.quantityKg,
            total: order.total
          } : null
        }
      }))

      return { disputes }
    } catch (error) {
      console.error('Error fetching disputes:', error)
      throw new functions.https.HttpsError('internal', 'Failed to fetch disputes')
    }
  }
)

// ============================================================================
// Helper Functions
// ============================================================================

async function checkIsAdmin(userId: string): Promise<boolean> {
  const adminDoc = await db.collection('admins').doc(userId).get()
  return adminDoc.exists
}

async function holdSellerPayout(orderId: string): Promise<void> {
  // Update transaction status to hold payout
  await db.collection('transactions')
    .where('orderId', '==', orderId)
    .get()
    .then(snapshot => {
      snapshot.docs.forEach(doc => {
        doc.ref.update({ payoutStatus: 'on_hold_dispute' })
      })
    })
}

async function processRefund(
  orderId: string, 
  amount: number, 
  dbOrTransaction: admin.firestore.Firestore | admin.firestore.Transaction
): Promise<void> {
  // Create refund record
  const refundRef = db.collection('refunds').doc()
  const refundData = {
    orderId,
    amount,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }
  
  // Check if it's a transaction or firestore instance
  if ('set' in dbOrTransaction) {
    // It's a transaction
    (dbOrTransaction as admin.firestore.Transaction).set(refundRef, refundData)
  } else {
    // It's a firestore instance, use normal set
    await refundRef.set(refundData)
  }
  
  // Actual Stripe refund would happen in a separate process
  // This just creates the record for the finance team
}

async function adjustSellerPayout(
  orderId: string,
  resolution: ResolutionType,
  refundAmount: number | undefined,
  dbOrTransaction: admin.firestore.Firestore | admin.firestore.Transaction
): Promise<void> {
  const transactionsRef = db.collection('transactions').where('orderId', '==', orderId)
  
  // Check if it's a transaction or firestore instance
  if ('get' in dbOrTransaction && 'update' in dbOrTransaction) {
    // It's a transaction
    const transaction = dbOrTransaction as admin.firestore.Transaction
    const transSnapshot = await transaction.get(transactionsRef)
    
    transSnapshot.docs.forEach(doc => {
      const t = doc.data()
      let newPayout = t.sellerPayout
      
      if (resolution === 'full_refund') {
        newPayout = 0
      } else if (resolution === 'partial_refund' && refundAmount) {
        newPayout = Math.max(0, t.sellerPayout - refundAmount)
      }
      
      transaction.update(doc.ref, {
        sellerPayout: newPayout,
        payoutStatus: resolution === 'rejected' ? 'released' : 'adjusted',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    })
  } else {
    // It's a firestore instance, use normal query
    const transSnapshot = await transactionsRef.get()
    
    for (const doc of transSnapshot.docs) {
      const t = doc.data()
      let newPayout = t.sellerPayout
      
      if (resolution === 'full_refund') {
        newPayout = 0
      } else if (resolution === 'partial_refund' && refundAmount) {
        newPayout = Math.max(0, t.sellerPayout - refundAmount)
      }
      
      await doc.ref.update({
        sellerPayout: newPayout,
        payoutStatus: resolution === 'rejected' ? 'released' : 'adjusted',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
  }
}

async function attemptAutoResolution(
  disputeId: string,
  data: FirebaseFirestore.DocumentData
): Promise<void> {
  const now = admin.firestore.Timestamp.now()
  
  // Rule 1: Quantity short > 10% with photo evidence
  if (data.disputeType === 'quantity_short' && data.actualQuantityKg && data.evidencePhotos?.length >= 1) {
    const shortAmount = data.order.quantityKg - data.actualQuantityKg
    const shortPercent = shortAmount / data.order.quantityKg
    
    if (shortPercent > AUTO_RESOLUTION_THRESHOLD_SHORT) {
      const refundAmount = Math.round((data.order.total || 0) * shortPercent)
      
      await db.collection('qualityDisputes').doc(disputeId).update({
        status: 'compromise',
        resolution: {
          type: 'partial_refund',
          refundAmount,
          reason: `Auto-resolved: Quantity short by ${(shortPercent * 100).toFixed(1)}% (${shortAmount.toFixed(1)}kg). Photo evidence provided.`,
          resolvedBy: 'system',
          resolvedAt: now
        },
        autoResolved: true,
        autoResolutionReason: 'quantity_short_auto',
        updatedAt: now
      })
      
      // Process refund
      await processRefund(data.orderId as string, refundAmount, db)
      
      // Adjust seller payout
      await adjustSellerPayout(data.orderId as string, 'partial_refund', refundAmount, db)
      
      // Notify parties
      await notifyResolution(data.order.buyerId, disputeId, 'partial_refund', true)
      await notifyResolution(data.order.sellerId, disputeId, 'partial_refund', false)
      
      console.log(`Auto-resolved dispute ${disputeId}: quantity short ${shortPercent}`)
      return
    }
  }
  
  // Future: Add AI-based auto-resolution for grade mismatches with clear photo evidence
}

async function updateSellerDisputeMetrics(
  sellerId: string | undefined,
  resolution: ResolutionType
): Promise<void> {
  if (!sellerId) return
  
  const verificationRef = db.collection('sellerVerifications').doc(sellerId)
  
  // Get current metrics
  const verification = await verificationRef.get()
  if (!verification.exists) return
  
  const data = verification.data()
  const currentTotal = data?.metrics?.totalOrders || 0
  const currentDisputes = data?.metrics?.disputedOrders || 0
  const lostDisputes = data?.metrics?.lostDisputes || 0
  
  const updates: FirebaseFirestore.DocumentData = {
    'metrics.disputedOrders': currentDisputes + 1,
    'metrics.disputeRate': (currentDisputes + 1) / Math.max(1, currentTotal),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
  
  // Count lost disputes
  if (['full_refund', 'partial_refund'].includes(resolution)) {
    updates['metrics.lostDisputes'] = lostDisputes + 1
  }
  
  await verificationRef.update(updates)
  
  // Recalculate tier (too many disputes may lower tier)
  await recalculateTier(sellerId)
}

async function recalculateTier(sellerId: string): Promise<void> {
  // Import and call tier recalculation from verification module
  const { calculateTierScore, getTierFromScore } = await import('./verification.js')
  
  const verification = await db.collection('sellerVerifications').doc(sellerId).get()
  if (!verification.exists) return
  
  const data = verification.data()
  if (!data) return
  const newScore = calculateTierScore(data as unknown as SellerVerification)
  const newTier = getTierFromScore(newScore)
  
  if (newTier !== data.tier) {
    await db.collection('sellerVerifications').doc(sellerId).update({
      tier: newTier,
      tierScore: newScore,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  }
}

// ============================================================================
// Notification Helpers
// ============================================================================

async function notifyDisputeOpened(
  recipientId: string,
  disputeId: string,
  orderId: string,
  isBuyerFiling: boolean
): Promise<void> {
  try {
    const { notifyUser } = await import('../utils/notifications.js')
    
    const otherRole = isBuyerFiling ? 'seller' : 'buyer'
    
    await notifyUser({
      userId: recipientId,
      type: 'order_update',
      title: `Quality Dispute Filed by ${otherRole}`,
      body: `A quality dispute has been filed on your order. Please review and respond.`,
      data: { disputeId, orderId, type: 'dispute_opened' }
    })
  } catch (error) {
    console.error('Failed to notify dispute opened:', error)
  }
}

async function notifyNewMessage(
  recipientId: string,
  disputeId: string,
  senderType: string
): Promise<void> {
  try {
    const { notifyUser } = await import('../utils/notifications.js')
    
    await notifyUser({
      userId: recipientId,
      type: 'order_update',
      title: 'New Message on Dispute',
      body: `The ${senderType} has added a message to the dispute.`,
      data: { disputeId, type: 'dispute_message' }
    })
  } catch (error) {
    console.error('Failed to notify new message:', error)
  }
}

async function notifyResolution(
  recipientId: string,
  disputeId: string,
  resolution: ResolutionType,
  isBuyer: boolean
): Promise<void> {
  try {
    const { notifyUser } = await import('../utils/notifications.js')
    
    const resolutionMessages: Record<ResolutionType, string> = {
      'full_refund': isBuyer ? 'Full refund approved' : 'Full refund issued to buyer',
      'partial_refund': isBuyer ? 'Partial refund approved' : 'Partial refund issued to buyer',
      'seller_credit': isBuyer ? 'Account credit issued' : 'Credit applied to your account',
      'replacement': isBuyer ? 'Replacement arranged' : 'Replacement required',
      'rejected': isBuyer ? 'Dispute rejected' : 'Dispute resolved in your favor',
      'escalated': 'Dispute escalated to review'
    }
    
    await notifyUser({
      userId: recipientId,
      type: 'order_update',
      title: 'Dispute Resolved',
      body: resolutionMessages[resolution],
      data: { disputeId, resolution, type: 'dispute_resolved' }
    })
  } catch (error) {
    console.error('Failed to notify resolution:', error)
  }
}

async function notifyAdminOfAppeal(
  disputeId: string,
  appellantId: string,
  reason: string
): Promise<void> {
  try {
    const admins = await db.collection('admins').get()
    const { notifyUser } = await import('../utils/notifications.js')
    
    for (const admin of admins.docs) {
      await notifyUser({
        userId: admin.id,
        type: 'listing_update',
        title: 'Dispute Appeal Filed',
        body: `User ${appellantId} has appealed a dispute resolution.`,
        data: { disputeId, appellantId, reason, type: 'dispute_appeal' }
      })
    }
  } catch (error) {
    console.error('Failed to notify admin of appeal:', error)
  }
}
