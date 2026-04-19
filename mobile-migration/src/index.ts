/**
 * Mobile Migration Services
 *
 * This package provides GCP-native replacements for Firebase SDKs in React Native.
 * These are reference implementations showing how to migrate from Firebase to GCP.
 *
 * MIGRATION GUIDE:
 *
 * 1. AUTH SERVICE (auth.ts)
 *    - Replaces: @react-native-firebase/auth
 *    - Uses: Cloud Identity Platform REST API
 *    - Key changes: Manual token management vs SDK-managed
 *
 * 2. FIRESTORE SERVICE (firestore.ts)
 *    - Replaces: @react-native-firebase/firestore
 *    - Uses: Firestore REST API
 *    - Key changes: Polling vs real-time onSnapshot
 *
 * 3. PUBSUB SERVICE (pubsub.ts)
 *    - Replaces: @react-native-firebase/messaging
 *    - Uses: Cloud Pub/Sub + Web Push
 *    - Key changes: Topic subscriptions via REST API
 *
 * USAGE IN MOBILE APP:
 *
 * ```typescript
 * import { auth, firestore, messaging } from '@finventory/mobile-migration'
 *
 * // Auth
 * await auth.signInWithEmailAndPassword(email, password)
 * const user = await auth.getCurrentUser()
 * const token = await auth.getIdToken()
 *
 * // Firestore
 * const listings = await firestore.collection('listings')
 *   .where('grade', '==', 'sushi')
 *   .limit(20)
 *   .get()
 *
 * // Pub/Sub
 * await messaging.initializePushNotifications(userId)
 * await messaging.subscribeToTopic('standing-order-matches')
 * messaging.onNotification((notification) => {
 *   console.log('Received:', notification)
 * })
 * ```
 */

export { auth, default as authService } from './services/auth.js'
export type { User, AuthCredentials, AuthError, AuthProvider } from './services/auth.js'

export { firestore, default as firestoreService } from './services/firestore.js'
export type {
  FirestoreError,
  WithId,
  FirestoreDocument,
  FirestoreValue,
  WhereFilter,
  OrderBy,
  QueryOptions,
  CollectionReference,
  DocumentReference
} from './services/firestore.js'

export { messaging, default as messagingService } from './services/pubsub.js'
export type {
  PubSubError,
  PushNotificationPayload,
  PushSubscription,
  StandingOrderMatchNotification,
  OrderStatusNotification,
  NotificationHandler,
  NotificationTapHandler
} from './services/pubsub.js'
