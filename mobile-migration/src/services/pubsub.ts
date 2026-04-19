/**
 * Pub/Sub Push Notification Service - GCP Native
 *
 * MIGRATION GUIDE: Replacing FCM (@react-native-firebase/messaging)
 * with Cloud Pub/Sub + Web Push.
 *
 * KEY CHANGES:
 * - Firebase SDK: FCM topic subscriptions + token management
 * - GCP Native: Pub/Sub subscriptions + Web Push Protocol
 * - Token registration: FCM token vs VAPID keys
 * - Message format: FCM format vs Web Push standard
 *
 * ARCHITECTURE:
 * 1. Mobile app registers with Pub/Sub via REST API
 * 2. Backend publishes messages to Pub/Sub topics
 * 3. Pub/Sub pushes to mobile endpoints via web push
 * 4. App receives and displays notifications
 */

import { Platform } from 'react-native'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getIdToken } from './auth.js'

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'finventory-gcp',
  baseUrl: 'https://pubsub.googleapis.com/v1',
  pushServiceUrl: process.env.EXPO_PUBLIC_PUSH_SERVICE_URL || 'https://finventory-gcp.appspot.com/_ah/push',
  storageKeys: {
    subscriptionId: '@finventory_pubsub_subscription_id',
    deviceToken: '@finventory_pubsub_device_token',
    vapidKeys: '@finventory_pubsub_vapid_keys'
  },
  topics: {
    standingOrderMatches: 'standing-order-matches',
    orderStatusUpdates: 'order-status-updates',
    inventoryUpdates: 'inventory-updates'
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface PubSubError {
  code: number
  message: string
  status: string
}

export interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  icon?: string
  badge?: number
  sound?: string
}

export interface PushSubscription {
  subscriptionId: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface StandingOrderMatchNotification {
  buyerId: string
  listingId: string
  species: string
  grade: string
  timestamp: string
}

export interface OrderStatusNotification {
  orderId: string
  status: 'pending' | 'confirmed' | 'pickedUp' | 'cancelled'
  species: string
  timestamp: string
}

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Make authenticated request to Pub/Sub REST API
 */
async function pubsubRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const idToken = await getIdToken()

  if (!idToken) {
    throw {
      code: 401,
      message: 'No authentication token available',
      status: 'UNAUTHENTICATED'
    } as PubSubError
  }

  const url = `${CONFIG.baseUrl}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw {
      code: response.status,
      message: error.error?.message || 'Pub/Sub request failed',
      status: error.error?.status || 'UNKNOWN'
    } as PubSubError
  }

  return response.json()
}

// ============================================================================
// DEVICE REGISTRATION
// ============================================================================

/**
 * Get device information for push registration
 */
function getDeviceInfo(): {
  platform: string
  model: string
  deviceId: string
} {
  return {
    platform: Platform.OS,
    model: Device.modelName || 'unknown',
    deviceId: `${Platform.OS}-${Device.deviceYearClass || Date.now()}`
  }
}

/**
 * Register device for push notifications
 *
 * MIGRATION: messaging().getToken()
 *
 * In GCP native, we:
 * 1. Generate VAPID keys for Web Push
 * 2. Register device with our push service
 * 3. Create Pub/Sub subscription for the device
 */
export async function registerDeviceForPush(): Promise<PushSubscription> {
  const deviceInfo = getDeviceInfo()
  const idToken = await getIdToken()

  if (!idToken) {
    throw new Error('User not authenticated')
  }

  try {
    // Call our push registration endpoint
    // This endpoint is part of our backend-migration/pubsub-service
    const response = await fetch(`${CONFIG.pushServiceUrl}/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platform: deviceInfo.platform,
        model: deviceInfo.model,
        deviceId: deviceInfo.deviceId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to register device')
    }

    const subscription: PushSubscription = await response.json()

    // Store subscription locally
    await AsyncStorage.setItem(
      CONFIG.storageKeys.subscriptionId,
      subscription.subscriptionId
    )
    await AsyncStorage.setItem(
      CONFIG.storageKeys.deviceToken,
      JSON.stringify(subscription)
    )

    return subscription
  } catch (error) {
    console.error('[registerDeviceForPush] Error:', error)
    throw error
  }
}

/**
 * Get current push subscription
 *
 * MIGRATION: messaging().getToken()
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    const tokenJson = await AsyncStorage.getItem(CONFIG.storageKeys.deviceToken)
    if (tokenJson) {
      return JSON.parse(tokenJson) as PushSubscription
    }
    return null
  } catch {
    return null
  }
}

/**
 * Unregister device from push notifications
 *
 * MIGRATION: messaging().deleteToken()
 */
export async function unregisterDeviceForPush(): Promise<void> {
  try {
    const subscription = await getPushSubscription()
    const idToken = await getIdToken()

    if (subscription && idToken) {
      // Call our push unregister endpoint
      await fetch(`${CONFIG.pushServiceUrl}/unregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscriptionId: subscription.subscriptionId
        })
      })
    }

    // Clear local storage
    await AsyncStorage.multiRemove([
      CONFIG.storageKeys.subscriptionId,
      CONFIG.storageKeys.deviceToken,
      CONFIG.storageKeys.vapidKeys
    ])
  } catch (error) {
    console.error('[unregisterDeviceForPush] Error:', error)
    throw error
  }
}

/**
 * Request push notification permissions
 *
 * MIGRATION: messaging().requestPermission()
 *
 * NOTE: React Native requires explicit permission handling
 * This is a platform-specific implementation
 */
export async function requestPushPermission(): Promise<boolean> {
  // For React Native, permission handling depends on the platform
  // iOS: Use expo-notifications or react-native-permissions
  // Android: Permissions are automatic, but user can disable in settings

  if (Platform.OS === 'ios') {
    // Import expo-notifications dynamically
    try {
      const Notifications = await import('expo-notifications')
      const { status } = await Notifications.getPermissionsAsync()

      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync()
        return newStatus === 'granted'
      }

      return true
    } catch {
      // Fallback if expo-notifications not available
      return true
    }
  }

  // Android permissions are automatic
  return true
}

// ============================================================================
// TOPIC SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to a Pub/Sub topic
 *
 * MIGRATION: messaging().subscribeToTopic()
 */
export async function subscribeToTopic(topic: string): Promise<void> {
  try {
    const subscription = await getPushSubscription()
    const idToken = await getIdToken()

    if (!subscription || !idToken) {
      throw new Error('Device not registered or user not authenticated')
    }

    // Call our push service to subscribe to topic
    await fetch(`${CONFIG.pushServiceUrl}/subscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriptionId: subscription.subscriptionId,
        topic
      })
    })

    console.log(`[subscribeToTopic] Subscribed to ${topic}`)
  } catch (error) {
    console.error('[subscribeToTopic] Error:', error)
    throw error
  }
}

/**
 * Unsubscribe from a Pub/Sub topic
 *
 * MIGRATION: messaging().unsubscribeFromTopic()
 */
export async function unsubscribeFromTopic(topic: string): Promise<void> {
  try {
    const subscription = await getPushSubscription()
    const idToken = await getIdToken()

    if (!subscription || !idToken) {
      return
    }

    // Call our push service to unsubscribe from topic
    await fetch(`${CONFIG.pushServiceUrl}/unsubscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriptionId: subscription.subscriptionId,
        topic
      })
    })

    console.log(`[unsubscribeFromTopic] Unsubscribed from ${topic}`)
  } catch (error) {
    console.error('[unsubscribeFromTopic] Error:', error)
    throw error
  }
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

/**
 * Notification handler callback type
 */
export type NotificationHandler = (notification: PushNotificationPayload) => void

/**
 * Registered notification handlers
 */
const notificationHandlers: Map<string, NotificationHandler> = new Map()

/**
 * Register notification handler
 *
 * MIGRATION: messaging().onNotification()
 *
 * NOTE: This is a simplified implementation. In production, you'd use
 * platform-specific notification handlers (expo-notifications, etc.)
 */
export function onNotification(handler: NotificationHandler): () => void {
  const handlerId = `handler-${Date.now()}-${Math.random()}`
  notificationHandlers.set(handlerId, handler)

  // Return unsubscribe function
  return () => {
    notificationHandlers.delete(handlerId)
  }
}

/**
 * Process incoming push notification
 *
 * This is called by the platform-specific notification handler
 * (e.g., expo-notifications onNotificationReceived)
 */
export function processPushNotification(notification: PushNotificationPayload): void {
  console.log('[processPushNotification] Received:', notification)

  // Call all registered handlers
  for (const handler of notificationHandlers.values()) {
    try {
      handler(notification)
    } catch (error) {
      console.error('[processPushNotification] Handler error:', error)
    }
  }
}

/**
 * Handle notification tap
 *
 * MIGRATION: messaging().onNotificationOpenedApp()
 *
 * NOTE: This is a simplified implementation. In production, you'd use
 * platform-specific handlers (expo-notifications onResponseReceived)
 */
export type NotificationTapHandler = (notification: PushNotificationPayload) => void

const tapHandlers: Map<string, NotificationTapHandler> = new Map()

export function onNotificationOpenedApp(handler: NotificationTapHandler): () => void {
  const handlerId = `tap-handler-${Date.now()}-${Math.random()}`
  tapHandlers.set(handlerId, handler)

  // Return unsubscribe function
  return () => {
    tapHandlers.delete(handlerId)
  }
}

/**
 * Process notification tap
 */
export function processNotificationTap(notification: PushNotificationPayload): void {
  console.log('[processNotificationTap] Tapped:', notification)

  for (const handler of tapHandlers.values()) {
    try {
      handler(notification)
    } catch (error) {
      console.error('[processNotificationTap] Handler error:', error)
    }
  }
}

// ============================================================================
// NOTIFICATION BUILDERS
// ============================================================================

/**
 * Build standing order match notification
 */
export function buildStandingOrderMatchNotification(
  match: StandingOrderMatchNotification
): PushNotificationPayload {
  return {
    title: 'New Match Found!',
    body: `A ${match.grade} grade ${match.species} listing matches your standing order.`,
    data: {
      type: 'standing_order_match',
      listingId: match.listingId,
      species: match.species,
      grade: match.grade,
      timestamp: match.timestamp
    },
    sound: 'default'
  }
}

/**
 * Build order status notification
 */
export function buildOrderStatusNotification(
  status: OrderStatusNotification
): PushNotificationPayload {
  const messages: Record<string, string> = {
    pending: 'Your order has been placed and is pending confirmation.',
    confirmed: 'Your order has been confirmed!',
    pickedUp: 'Your order has been picked up. Enjoy!',
    cancelled: 'Your order has been cancelled.'
  }

  return {
    title: `Order ${status.status.charAt(0).toUpperCase() + status.status.slice(1)}`,
    body: messages[status.status] || 'Your order status has changed.',
    data: {
      type: 'order_status_update',
      orderId: status.orderId,
      status: status.status,
      species: status.species,
      timestamp: status.timestamp
    },
    sound: 'default'
  }
}

/**
 * Build pickup reminder notification
 */
export function buildPickupReminderNotification(
  orderId: string,
  species: string,
  pickupTime: Date
): PushNotificationPayload {
  const timeStr = pickupTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })

  return {
    title: 'Pickup Reminder',
    body: `Remember to pick up your ${species} order at ${timeStr}.`,
    data: {
      type: 'pickup_reminder',
      orderId
    },
    sound: 'default'
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize push notifications
 *
 * MIGRATION: messaging().registerDeviceForRemoteMessages()
 *
 * This should be called on app startup to:
 * 1. Request permissions
 * 2. Register device
 * 3. Subscribe to default topics
 */
export async function initializePushNotifications(
  userId?: string
): Promise<PushSubscription | null> {
  try {
    // Request permission
    const hasPermission = await requestPushPermission()
    if (!hasPermission) {
      console.warn('[initializePushNotifications] Permission denied')
      return null
    }

    // Check if already registered
    let subscription = await getPushSubscription()

    if (!subscription) {
      // Register device
      subscription = await registerDeviceForPush()
    }

    // Subscribe to default topics if user is authenticated
    if (userId) {
      await subscribeToTopic(CONFIG.topics.inventoryUpdates)

      // Subscribe to user-specific topics
      await subscribeToTopic(`${CONFIG.topics.orderStatusUpdates}-${userId}`)
      await subscribeToTopic(`${CONFIG.topics.standingOrderMatches}-${userId}`)
    }

    return subscription
  } catch (error) {
    console.error('[initializePushNotifications] Error:', error)
    return null
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const messaging = {
  registerDeviceForPush,
  getPushSubscription,
  unregisterDeviceForPush,
  requestPushPermission,
  subscribeToTopic,
  unsubscribeFromTopic,
  onNotification,
  onNotificationOpenedApp,
  processPushNotification,
  processNotificationTap,
  buildStandingOrderMatchNotification,
  buildOrderStatusNotification,
  buildPickupReminderNotification,
  initializePushNotifications
}

export default messaging
