# Firebase Backend Design

**Project:** Fish Rescue App (finventory)
**Date:** 2026-04-18
**Author:** Claude Code + Justin

---

## Overview

Replace the planned PostgreSQL/PostGIS/Redis/Fastify backend with Firebase services for a peer-to-peer seafood marketplace. Mobile app connects directly to Firebase SDKs; Cloud Functions handle business logic.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  React Native   │────▶│   Firebase       │
│     Mobile      │     │   Services       │
│                 │     │                  │
│  - Navigation   │     │  - Firestore     │
│  - State (Zustand)│   │  - Auth          │
│  - React Query  │     │  - Storage       │
│  - Mapbox       │     │  - Functions     │
└─────────────────┘     │  - Realtime DB   │
                        │  - Cloud Msg     │
                        └──────────────────┘
```

**Key decisions:**
1. Client-direct architecture — Mobile app uses Firebase SDKs directly
2. Serverless functions — Cloud Functions for business logic
3. Separate real-time layer — Realtime Database for live inventory

---

## Firebase Services

| Service | Purpose | Plan |
|---------|---------|------|
| Firestore | Primary database | Spark/Blaze |
| Authentication | Email/password, Google Sign-in | Free |
| Storage | Photos, certificates | Blaze |
| Cloud Functions | API logic, cron jobs | Blaze |
| Realtime Database | Live inventory updates | Minimal |
| Cloud Messaging | Push notifications | Free |

---

## Database Schema

### Core Collections

#### `users`
```typescript
{
  id: string                    // auth.uid
  email: string
  displayName: string
  role: 'buyer' | 'seller' | 'both'
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  photoURL?: string
  phoneNumber?: string
  createdAt: Timestamp
  stripeAccountId?: string
}
```

#### `listings`
```typescript
{
  id: string
  sellerId: string
  species: string
  grade: 'sushi' | 'A' | 'B'     // static quality level
  sushiCertNumber?: string       // required if grade === 'sushi'
  sushiCertExpiry?: Timestamp    // cert validity only
  quantity: number
  unit: 'lb' | 'kg'
  pricePerUnit: number
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  photos: string[]
  freshnessDate: Timestamp       // catch age (separate from grade)
  deliveryAvailable: boolean
  status: 'active' | 'pending_pickup' | 'sold' | 'expired'
  createdAt: Timestamp
  expiresAt: Timestamp
}
```

#### `orders`
```typescript
{
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  quantity: number
  totalPrice: number
  status: 'pending' | 'picked_up' | 'cancelled'
  pickupQRCode: string
  deliveryOption: 'pickup' | 'delivery'
  deliveryAddress?: { /* ... */ }
  createdAt: Timestamp
  pickedUpAt?: Timestamp
  paymentIntentId?: string
}
```

#### `standingOrders`
```typescript
{
  id: string
  buyerId: string
  name: string
  species: string[]
  minGrade: 'sushi' | 'A' | 'B'
  maxDistance: number            // miles
  maxPricePerUnit?: number
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  isActive: boolean
  createdAt: Timestamp
  lastMatchedAt?: Timestamp
}
```

#### `geoIndex`
```typescript
{
  geohash: string
  listingId: string
  latitude: number
  longitude: number
  expiresAt: Timestamp
}
```

### Optional Collections (All Included)

#### `sushiCertificates`
```typescript
{
  id: string
  sellerId: string
  certificateNumber: string
  issuingBody: string
  issuedDate: Timestamp
  expiryDate: Timestamp
  documentURL: string
  isActive: boolean
  createdAt: Timestamp
}
```

#### `reviews`
```typescript
{
  id: string
  sellerId: string
  buyerId: string
  orderId: string
  rating: number                 // 1-5
  comment?: string
  createdAt: Timestamp
}
```

#### `messages`
```typescript
{
  id: string
  orderId: string
  senderId: string
  receiverId: string
  content: string
  read: boolean
  createdAt: Timestamp
}
```

#### `favorites`
```typescript
{
  id: string
  buyerId: string
  listingId: string
  createdAt: Timestamp
}
```

#### `transactions`
```typescript
{
  id: string
  orderId: string
  stripePaymentIntentId: string
  amount: number
  status: 'pending' | 'succeeded' | 'failed'
  sellerPayoutStatus: 'pending' | 'paid'
  createdAt: Timestamp
}
```

### Subcollections

#### `users/{userId}/notifications`
```typescript
{
  id: string
  type: string
  title: string
  body: string
  data?: any
  read: boolean
  createdAt: Timestamp
}
```

#### `listings/{listingId}/views`
```typescript
{
  id: string
  userId?: string
  viewedAt: Timestamp
}
```

---

## Cloud Functions Structure

```
functions/
├── src/
│   ├── api/
│   │   ├── listings.ts         # create, update, delete
│   │   ├── orders.ts           # create, confirm-pickup, cancel
│   │   ├── standingOrders.ts   # create, update, delete
│   │   └── reviews.ts          # create
│   ├── triggers/
│   │   ├── onListingCreated.ts # Create geoIndex entry
│   │   ├── onOrderCreated.ts   # Notify seller
│   │   ├── onListingUpdated.ts # Update real-time inventory
│   │   └── onListingExpired.ts # Cleanup
│   ├── jobs/
│   │   └── standingOrderMatcher.ts  # Every 5 min
│   ├── utils/
│   │   ├── geohash.ts
│   │   ├── stripe.ts
│   │   └── notifications.ts
│   └── index.ts
```

### Key Functions

| Function | Type | Trigger | Purpose |
|----------|------|---------|---------|
| `createListing` | Callable | Client call | Create listing + geo entry |
| `onListingCreated` | Trigger | listings.onCreate | Index geo, notify nearby standing orders |
| `matchStandingOrders` | Scheduled | Every 5 min | Find matches, send push |
| `confirmPickup` | Callable | QR scan | Verify code, update order, trigger payout |
| `processPayment` | Callable | Client call | Create Stripe intent |

---

## Real-time Features

### Realtime Database Structure
```javascript
/live_inventory
  /{listingId}
    /count: number
    /status: string
    /lastUpdated: timestamp
```

### Sync Strategy
- Cloud Functions update Realtime DB on listing changes
- Mobile app listeners subscribe to specific listings
- Automatic cleanup on expiry/sale

### Cloud Messaging Triggers
| Event | Notification |
|-------|--------------|
| Standing order matched | "New [species] listing near you!" |
| Order placed | "New order for [listing]" |
| Order picked up | "Order confirmed, payout processing" |

---

## Security Rules

Firestore rules enforce:
- Users can read/write own profiles
- Listings: readable by all, writable by seller
- Orders: readable by participants, writable by buyer/seller as appropriate
- Standing orders: owner-only access
- Geo index: Cloud Functions write-only

Storage rules enforce:
- Photos: readable by all, writable by owner
- Certificates: seller-only write access

---

## Storage Structure

```
finventory.appspot.com/
├── listings/{listingId}/{photoId}.jpg
├── certificates/{sellerId}/{certId}.pdf
└── profiles/{userId}.jpg
```

---

## Firestore Indexes

| Collection | Index | Fields |
|------------|-------|--------|
| listings | seller_active | sellerId, status |
| listings | location_expires | geohash, expiresAt |
| orders | buyer_status | buyerId, status |
| orders | seller_status | sellerId, status |
| standingOrders | buyer_active | buyerId, isActive |
| geoIndex | geohash_expires | geohash, expiresAt |
| reviews | seller_created | sellerId, createdAt |

---

## Scope

**In scope (this implementation):**
- Firebase project setup and configuration
- Firestore database with all collections
- Security rules
- Cloud Functions structure and core functions
- Realtime Database setup for live inventory
- Storage buckets configuration
- Authentication setup

**Out of scope (future work):**
- Mobile app implementation
- Stripe integration details
- Admin dashboard
- Advanced analytics

---

## Notes

- Grades are static quality designations (sushi, A, B) — no auto-downgrade
- Freshness date tracks catch age separately from grade
- Geohash-based index for accurate proximity queries
- Client-direct architecture simplifies mobile development
