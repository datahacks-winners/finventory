import * as admin from 'firebase-admin'
import { db } from '../config.js'

export interface NotificationPayload {
  userId: string
  type: 'standing_order_match' | 'order_update' | 'listing_update'
  title: string
  body: string
  data?: Record<string, string>
}

/**
 * Create a notification document in Firestore
 */
export async function createNotification(
  payload: NotificationPayload
): Promise<string> {
  const notificationRef = await db
    .collection('users')
    .doc(payload.userId)
    .collection('notifications')
    .add({
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

  return notificationRef.id
}

/**
 * Send a push notification via FCM
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  // Get user's FCM tokens
  const userDoc = await db.collection('users').doc(userId).get()

  if (!userDoc.exists) {
    console.log(`User ${userId} not found`)
    return
  }

  const userData = userDoc.data()
  const fcmTokens = userData?.fcmTokens || []

  if (fcmTokens.length === 0) {
    console.log(`No FCM tokens for user ${userId}`)
    return
  }

  // Send to all tokens
  const message = {
    notification: { title, body },
    data: data || {},
    tokens: fcmTokens
  }

  try {
    const response = await admin.messaging().sendEachForMulticast(message)

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(fcmTokens[idx])
        }
      })

      if (invalidTokens.length > 0) {
        await db.collection('users').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        })
      }
    }
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

/**
 * Create notification and send push
 */
export async function notifyUser(
  payload: NotificationPayload
): Promise<void> {
  await createNotification(payload)
  await sendPushNotification(
    payload.userId,
    payload.title,
    payload.body,
    payload.data
  )
}

/**
 * Notify buyer of standing order match
 */
export async function notifyStandingOrderMatch(
  buyerId: string,
  listingId: string,
  species: string,
  grade: string
): Promise<void> {
  await notifyUser({
    userId: buyerId,
    type: 'standing_order_match',
    title: `New ${species} listing near you!`,
    body: `A ${grade.toLowerCase()} grade ${species} listing matching your criteria is now available.`,
    data: { listingId }
  })
}

/**
 * Notify seller of new order
 */
export async function notifyNewOrder(
  sellerId: string,
  orderId: string,
  listingTitle: string
): Promise<void> {
  await notifyUser({
    userId: sellerId,
    type: 'order_update',
    title: 'New order received!',
    body: `You have a new order for ${listingTitle}.`,
    data: { orderId }
  })
}

/**
 * Notify buyer of order status update
 */
export async function notifyOrderStatusUpdate(
  buyerId: string,
  orderId: string,
  status: string
): Promise<void> {
  const statusMessages: Record<string, string> = {
    pending: 'Your order has been placed.',
    picked_up: 'Your order has been picked up!',
    cancelled: 'Your order has been cancelled.'
  }

  await notifyUser({
    userId: buyerId,
    type: 'order_update',
    title: 'Order update',
    body: statusMessages[status] || 'Your order status has changed.',
    data: { orderId, status }
  })
}
