# Authentication & Authorization Design

**Date:** 2026-04-18
**Status:** Approved
**Author:** Claude Code + User

---

## Overview

Implement Firebase Authentication with Firestore Security Rules for the Fish Rescue App. Enables anonymous browsing while requiring authentication for purchases, favorites, and messaging. Single user role (everyone can buy and sell).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Native App                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Auth      │  │  Firestore  │  │   Storage   │         │
│  │   Context   │  │  Services   │  │  Services   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Firebase Project                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Firebase    │  │  Firestore  │  │   Cloud     │         │
│  │ Auth        │  │  + Rules    │  │  Functions  │         │
│  │             │  │             │  │  (Optional) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## Firebase Auth Configuration

**Enabled Providers:**
- Email/Password
- Google OAuth
- Apple Sign In

**Anonymous Auth:**
- Enabled for browsing sessions
- Converts to permanent account on signup
- Tracks session for analytics

**User Flow:**
```
Launch App → Check Auth State
  ├─ Logged In → Load Profile
  └─ Not Logged In → Create Anonymous Session
      └─ User Taps "Buy/Favorite/Message" → Show Auth Modal
          └─ Link Anonymous → Provider Account → Proceed
```

---

## Auth Capabilities

| Action | Anonymous | Authenticated |
|--------|-----------|---------------|
| Browse listings | ✅ | ✅ |
| View listing details | ✅ | ✅ |
| Add to favorites | ❌ | ✅ |
| Send messages | ❌ | ✅ |
| Place orders | ❌ | ✅ |
| Manage profile | ❌ | ✅ |

---

## Firestore Data Model

### Users Collection
```
users/{userId}
├── displayName: string
├── email: string
├── photoURL: string (optional)
├── phone: string (optional)
├── createdAt: timestamp
├── updatedAt: timestamp
├── providers: array<string>
├── isAnonymous: boolean
│
├── sellerProfile: {
│   ├── businessName: string
│   ├── description: string
│   ├── certifications: [
│       { type, number, expiryDate, verified }
│   ],
│   ├── location: geoPoint
│   └── rating: number
│}
│
├── buyerProfile: {
│   └── deliveryAddresses: [
│       { label, street, city, state, zip, isDefault }
│   ]
│}
│
├── paymentMethods: [
│   { stripePaymentMethodId, last4, brand, expiryMonth, expiryYear, isDefault }
│]
│
└── notificationPreferences: {
    ├── orders: boolean,
    ├── messages: boolean,
    ├── standingOrderMatches: boolean,
    ├── promotions: boolean
}
```

### Favorites (Subcollection)
```
users/{userId}/favorites/{listingId}
├── createdAt: timestamp
└── listingRef: reference
```

### Messages (Root Collection)
```
messages/{messageId}
├── participants: array<string> (both userIds)
├── senderId: string
├── recipientId: string
├── listingRef: reference (optional)
├── content: string
├── read: boolean
└── createdAt: timestamp
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============ HELPER FUNCTIONS ============
    
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isAnonymous() {
      return isSignedIn() && request.auth.token.anonymous == true;
    }
    
    function isParticipant(participants) {
      return isSignedIn() && request.auth.uid in participants;
    }
    
    // ============ USERS ============
    
    match /users/{userId} {
      allow read: if true;
      allow write: if isOwner(userId);
      
      match /favorites/{listingId} {
        allow read, write: if isOwner(userId);
      }
      
      match /conversations/{otherUserId} {
        allow read, write: if isOwner(userId);
      }
    }
    
    // ============ MESSAGES ============
    
    match /messages/{messageId} {
      allow create: if isSignedIn()
        && request.resource.data.senderId == request.auth.uid
        && request.resource.data.participants.hasAll([request.auth.uid, request.resource.data.recipientId]);
      
      allow read: if isParticipant(resource.data.participants);
      
      allow update: if isSignedIn() && resource.data.senderId == request.auth.uid;
      
      allow delete: if false;
    }
    
    // ============ LISTINGS ============
    
    match /listings/{listingId} {
      allow read: if true;
      
      allow create: if isSignedIn()
        && request.resource.data.sellerId == request.auth.uid;
      
      allow update: if isSignedIn()
        && resource.data.sellerId == request.auth.uid;
      
      allow delete: if isSignedIn()
        && resource.data.sellerId == request.auth.uid;
    }
    
    // ============ ORDERS ============
    
    match /orders/{orderId} {
      allow create: if isSignedIn()
        && request.resource.data.buyerId == request.auth.uid;
      
      allow read: if isSignedIn()
        && (resource.data.buyerId == request.auth.uid || resource.data.sellerId == request.auth.uid);
      
      allow update: if isSignedIn()
        && (resource.data.buyerId == request.auth.uid || resource.data.sellerId == request.auth.uid);
      
      allow delete: if false;
    }
    
    // ============ STANDING ORDERS ============
    
    match /standingOrders/{orderId} {
      allow read, write: if isSignedIn()
        && resource.data.buyerId == request.auth.uid;
      
      allow create: if isSignedIn()
        && request.resource.data.buyerId == request.auth.uid;
    }
  }
}
```

---

## Push Notifications (FCM)

**Triggers:**
- New message (app closed)
- Standing order match
- Order status update
- Promotions (opt-in)

**Storage:**
```
users/{userId}
└── fcmTokens: array<string>
```

**Cloud Function:**
```javascript
exports.sendPushNotification = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const recipientTokens = await getFCMTokens(message.recipientId);
    
    await admin.messaging().sendMulticast({
      tokens: recipientTokens,
      notification: {
        title: `New message from ${senderName}`,
        body: message.content
      },
      data: { messageId: context.params.messageId }
    });
  });
```

---

## Deployment (IaC)

**File Structure:**
```
finventory/
├── firestore.rules           ← Production rules
├── firestore.rules.dev       ← Development rules
├── firebase.json             ← Config
└── .firebaserc               ← Project aliases
```

**Commands:**
```bash
firebase deploy --only firestore:rules        # Default
firebase deploy --only firestore:rules -P dev     # Staging
firebase deploy --only firestore:rules -P prod    # Production
```

---

## Testing Strategy

### Unit Tests (Firebase Emulator)
- Anonymous user can browse listings
- Anonymous cannot create orders
- Authenticated user can create orders
- User can only update own profile

### Security Rules Tests
```javascript
test('user can only update own profile', async () => {
  const db = authedApp({ uid: 'user123' });
  await expect(
    doc(db, 'users/user123').update({ displayName: 'New' })
  ).toAllow();
  
  await expect(
    doc(db, 'users/other-user').update({ displayName: 'Hacked' })
  ).toDeny();
});
```

### Integration Tests (Firebase Testing)
- Signup → Login → Logout
- Provider linking (Google, Apple)
- Anonymous → permanent conversion

### E2E Tests (Detox)
- Signup flow
- Login flow
- Protected route redirects

---

## Dependencies

- `firebase` (React Native SDK)
- `@react-native-firebase/app`
- `@react-native-firebase/auth`
- `@react-native-firebase/firestore`
- `@react-native-firebase/messaging`
- `@react-native-firebase/storage`
- `@invertase/react-native-apple-authentication`

---

## Implementation Plan

Next: Create detailed implementation plan using `writing-plans` skill.
