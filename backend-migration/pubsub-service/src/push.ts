import { PubSub } from '@google-cloud/pubsub'
import * as admin from 'firebase-admin'
import { config } from './config.js'

// Initialize Firebase Admin for FCM
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: config.projectId
  })
}

const fcm = admin.messaging()

/**
 * Push Notification Service
 * Handles sending push notifications via FCM (Firebase Cloud Messaging)
 * This service subscribes to Pub/Sub topics and sends notifications to devices
 */

export interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
}

export interface StandingOrderMatchNotification {
  buyerId: string
  listingId: string
  species: string
  grade: string
  timestamp: string
}

/**
 * Send a push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<void> {
  try {
    // Get user's FCM tokens from Firestore
    const userDoc = await admin
      .firestore()
      .collection(config.collections.users)
      .doc(userId)
      .get()

    if (!userDoc.exists) {
      console.error(`[sendPushNotification] User ${userId} not found`)
      return
    }

    const userData = userDoc.data()
    const fcmTokens = userData?.fcmTokens || []

    if (fcmTokens.length === 0) {
      console.log(`[sendPushNotification] No FCM tokens for user ${userId}`)
      return
    }

    // Send multicast message to all user's devices
    const message = {
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: payload.data || {},
      tokens: fcmTokens
    }

    const response = await fcm.sendMulticast(message)

    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = []
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(fcmTokens[idx])
        }
      })

      // Remove invalid tokens from Firestore
      await admin
        .firestore()
        .collection(config.collections.users)
        .doc(userId)
        .update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
        })

      console.log(
        `[sendPushNotification] Removed ${failedTokens.length} invalid tokens for user ${userId}`
      )
    }

    console.log(
      `[sendPushNotification] Sent to ${response.successCount}/${fcmTokens.length} devices for user ${userId}`
    )
  } catch (error) {
    console.error('[sendPushNotification] Error:', error)
    throw error
  }
}

/**
 * Send standing order match notification
 */
export async function sendStandingOrderMatchNotification(
  match: StandingOrderMatchNotification
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: 'New Match Found!',
    body: `A ${match.grade} grade ${match.species} listing matches your standing order.`,
    data: {
      type: 'standing_order_match',
      listingId: match.listingId,
      species: match.species,
      grade: match.grade,
      timestamp: match.timestamp
    }
  }

  await sendPushNotification(match.buyerId, payload)
}

/**
 * Send order confirmation notification
 */
export async function sendOrderConfirmationNotification(
  userId: string,
  orderId: string,
  species: string
): Promise<void> {
  const payload: PushNotificationPayload = {
    title: 'Order Confirmed!',
    body: `Your order for ${species} has been confirmed.`,
    data: {
      type: 'order_confirmed',
      orderId: orderId
    }
  }

  await sendPushNotification(userId, payload)
}

/**
 * Send pickup reminder notification
 */
export async function sendPickupReminderNotification(
  userId: string,
  orderId: string,
  species: string,
  pickupTime: Date
): Promise<void> {
  const timeStr = pickupTime.toLocaleTimeString()
  const payload: PushNotificationPayload = {
    title: 'Pickup Reminder',
    body: `Remember to pick up your ${species} order at ${timeStr}.`,
    data: {
      type: 'pickup_reminder',
      orderId: orderId
    }
  }

  await sendPushNotification(userId, payload)
}
