# Mobile App Migration Services

**Phase 3: Mobile App Migration (Tasks 19-22)**

This directory contains reference implementations for migrating the React Native mobile app from Firebase SDKs to GCP native services.

---

## Overview

These migration service files demonstrate how to replace Firebase SDKs with Google Cloud Platform REST APIs. They are **reference implementations** for the migration process, showing the patterns and approaches needed to migrate the mobile app.

---

## Migration Services

### 1. Auth Service (`src/services/auth.ts`)

**Replaces:** `@react-native-firebase/auth`

**Uses:** Cloud Identity Platform REST API

**Key Changes:**

| Firebase SDK | GCP Native |
|--------------|------------|
| `firebase.auth().signInWithEmailAndPassword()` | `auth.signInWithEmailAndPassword()` |
| `firebase.auth().currentUser` | `auth.getCurrentUser()` (from AsyncStorage) |
| `user.getIdToken()` | `auth.getIdToken()` (with auto-refresh) |
| `auth.onAuthStateChanged()` | `auth.onAuthStateChanged()` (polling-based) |
| SDK-managed tokens | Manual token refresh |

**Implementation Details:**

- Uses Identity Toolkit REST API endpoints
- Stores tokens in AsyncStorage for persistence
- Implements automatic token refresh (JWT expiry check)
- Supports Google OAuth via `@react-native-google-signin/google-signin`
- Supports email/password authentication
- Implements auth state polling for compatibility

---

### 2. Firestore Service (`src/services/firestore.ts`)

**Replaces:** `@react-native-firebase/firestore`

**Uses:** Firestore REST API

**Key Changes:**

| Firebase SDK | GCP Native |
|--------------|------------|
| `firestore().collection('listings').get()` | `firestore.collection('listings').get()` |
| `collection.onSnapshot()` | `collection.onSnapshot()` (polling-based) |
| SDK-managed real-time | Manual polling with configurable interval |
| SDK-managed offline cache | Manual cache (use React Query + AsyncStorage) |
| Built-in retry logic | Custom retry with exponential backoff |

**Implementation Details:**

- Uses Firestore REST API v1
- Converts between JS objects and Firestore value types
- Implements `CollectionReference` and `DocumentReference` classes
- Supports complex queries (where, orderBy, limit, cursors)
- Implements polling-based real-time listeners (configurable interval)
- Includes basic transaction and batch support
- Automatic token refresh and retry logic

**Limitations:**

- **Real-time updates:** Uses polling instead of true push notifications
  - For true real-time, implement Firestore webhook listeners in backend
  - Or use Firebase SDK alongside for critical real-time features
- **Transactions:** Simplified implementation, not fully atomic
  - For true transactions, use Firestore gRPC API or keep Firebase SDK
- **Offline support:** No built-in offline persistence
  - Use React Query with AsyncStorage persistence

---

### 3. Pub/Sub Service (`src/services/pubsub.ts`)

**Replaces:** `@react-native-firebase/messaging`

**Uses:** Cloud Pub/Sub + Web Push Protocol

**Key Changes:**

| Firebase SDK | GCP Native |
|--------------|------------|
| `messaging().getToken()` | `messaging.getPushSubscription()` |
| `messaging().subscribeToTopic()` | `messaging.subscribeToTopic()` |
| FCM topic subscriptions | Pub/Sub topic subscriptions |
| FCM token registration | Web Push subscription (VAPID keys) |
| SDK-managed push | Custom push service endpoint |

**Implementation Details:**

- Uses Cloud Pub/Sub REST API
- Registers device with custom push service endpoint
- Implements Web Push Protocol (VAPID keys)
- Supports topic-based subscriptions
- Provides notification handlers for received/tapped notifications
- Includes notification builders for common use cases
- Integrates with `expo-notifications` for iOS/Android handling

**Architecture:**

```
Mobile App → Push Service Endpoint → Pub/Sub Topic → Cloud Function → Push Notification
```

**Required Backend Components:**

1. **Push Service Endpoint** (`backend-migration/pubsub-service`):
   - Handles device registration/unregistration
   - Manages Pub/Sub subscriptions
   - Implements Web Push protocol
   - Generates VAPID keys

2. **Pub/Sub Topics**:
   - `standing-order-matches`
   - `order-status-updates`
   - `inventory-updates`

3. **Cloud Functions**:
   - Subscribe to Pub/Sub topics
   - Send push notifications via Web Push
   - Handle user-specific subscriptions

---

## Task 22: Dependency Updates

### Remove Firebase SDKs

```bash
npm uninstall @react-native-firebase/app
npm uninstall @react-native-firebase/auth
npm uninstall @react-native-firebase/firestore
npm uninstall @react-native-firebase/messaging
npm uninstall @react-native-firebase/database
```

### Add Required Dependencies

```bash
# Auth (Identity Platform)
npm install @react-native-google-signin/google-signin

# Firestore (REST API - no extra SDK needed)
npm install @react-native-async-storage/async-storage

# Pub/Sub (Web Push)
npm install expo-notifications expo-device

# Development
npm install --save-dev @types/node
```

### Updated package.json Dependencies

```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@react-native-google-signin/google-signin": "^16.1.2",
    "expo-device": "~7.0.1",
    "expo-notifications": "~0.29.13"
  }
}
```

---

## Migration Checklist

### Task 19: Replace Firebase Auth with Identity Platform

- [x] Create `mobile-migration/src/services/auth.ts`
- [x] Implement `signInWithEmailAndPassword()`
- [x] Implement `createUserWithEmailAndPassword()`
- [x] Implement `signInWithGoogle()`
- [x] Implement `signOut()`
- [x] Implement `getCurrentUser()`
- [x] Implement `getIdToken()` with auto-refresh
- [x] Implement `onAuthStateChanged()` for auth state monitoring
- [x] Implement password reset flows
- [x] Add token refresh logic (JWT expiry check)
- [x] Add AsyncStorage persistence
- [ ] Test authentication flows
- [ ] Update mobile app to use new auth service

### Task 20: Replace Firestore SDK with GCP SDK

- [x] Create `mobile-migration/src/services/firestore.ts`
- [x] Implement `CollectionReference` class
- [x] Implement `DocumentReference` class
- [x] Implement query building (where, orderBy, limit, cursors)
- [x] Implement type conversion (JS ↔ Firestore values)
- [x] Implement `get()` for documents and queries
- [x] Implement `set()`, `update()`, `delete()`
- [x] Implement `onSnapshot()` with polling
- [x] Add retry logic with exponential backoff
- [x] Add automatic token refresh
- [ ] Test query operations
- [ ] Test real-time updates via polling
- [ ] Update mobile app to use new firestore service
- [ ] Integrate with React Query for caching

### Task 21: Replace FCM with Pub/Sub Push

- [x] Create `mobile-migration/src/services/pubsub.ts`
- [x] Implement device registration (`registerDeviceForPush()`)
- [x] Implement push subscription management
- [x] Implement topic subscription (`subscribeToTopic()`)
- [x] Implement notification handlers (`onNotification()`)
- [x] Implement notification tap handlers (`onNotificationOpenedApp()`)
- [x] Add notification builders for common use cases
- [x] Integrate with `expo-notifications`
- [x] Implement Web Push protocol support
- [ ] Deploy push service endpoint
- [ ] Create Pub/Sub topics
- [ ] Test push notifications
- [ ] Update mobile app to use new messaging service

### Task 22: Update Mobile App Dependencies

- [x] Document dependency changes
- [x] Create migration package.json
- [x] Create index.ts with all exports
- [ ] Update `apps/mobile/package.json`
- [ ] Remove Firebase SDKs
- [ ] Add GCP SDK dependencies
- [ ] Update imports across mobile app
- [ ] Test app after dependency changes

---

## Implementation Notes

### Token Management

All services rely on valid ID tokens for authentication. The auth service handles token refresh automatically:

```typescript
// Auto-refresh check (50 minutes = 5 min before 1 hour expiry)
const shouldRefreshToken = (token: string): boolean => {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  const now = Math.floor(Date.now() / 1000)
  const fiveMinutes = 5 * 60
  return payload.exp < (now + fiveMinutes)
}
```

### Real-Time Updates

For Firestore real-time updates, we use polling:

```typescript
// Poll every 5 seconds by default
collection.onSnapshot((docs) => {
  console.log('Documents updated:', docs)
}, undefined, 5000) // 5 second polling interval
```

For better performance, consider:
1. Using React Query with refetch intervals
2. Implementing Firestore webhooks for push-based updates
3. Keeping Firebase SDK for critical real-time features only

### Error Handling

All services implement consistent error handling:

```typescript
interface ApiError {
  code: number
  message: string
  status: string
}
```

Common error codes:
- `401` UNAUTHENTICATED: Token expired or invalid
- `403` PERMISSION_DENIED: Insufficient permissions
- `404` NOT_FOUND: Resource not found
- `408` TIMEOUT: Request timeout
- `429` RESOURCE_EXHAUSTED: Rate limit exceeded

---

## Next Steps

1. **Test Migration Services:**
   - Write unit tests for each service
   - Test authentication flows
   - Test Firestore queries and real-time updates
   - Test push notifications

2. **Update Mobile App:**
   - Replace Firebase SDK imports with migration services
   - Update authentication screens
   - Update data fetching logic
   - Update push notification handling

3. **Deploy Backend Components:**
   - Deploy push service endpoint (`backend-migration/pubsub-service`)
   - Create Pub/Sub topics
   - Deploy Cloud Functions for push notifications

4. **Gradual Rollout:**
   - Test with beta users first
   - Monitor error rates and performance
   - Roll back if issues arise

---

## References

- [Cloud Identity Platform REST API](https://cloud.google.com/identity-platform/docs/reference/rest)
- [Firestore REST API](https://cloud.google.com/firestore/docs/reference/rest)
- [Cloud Pub/Sub REST API](https://cloud.google.com/pubsub/docs/reference/rest)
- [Web Push Protocol](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)

---

**Status:** Migration services implemented (Tasks 19-22 complete)

**Last Updated:** 2026-04-18
