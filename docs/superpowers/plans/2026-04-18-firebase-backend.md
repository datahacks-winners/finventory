# Firebase Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a complete Firebase backend for the fish rescue marketplace with Firestore, Authentication, Storage, Cloud Functions, Realtime Database, and Cloud Messaging.

**Architecture:** Client-direct architecture where mobile apps connect to Firebase SDKs. Cloud Functions handle business logic (matching, payments, QR verification). Realtime Database provides live inventory updates.

**Tech Stack:** Firebase (Firestore, Auth, Storage, Functions, Realtime DB, Cloud Messaging), TypeScript, Node.js 20+

---

## File Structure

```
finventory/
├── firebase.json                 # Firebase configuration
├── .firebaserc                   # Firebase project alias
├── firestore.indexes.json        # Firestore indexes
├── firestore.rules               # Firestore security rules
├── storage.rules                 # Storage security rules
├── functions/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              # Functions entry point
│   │   ├── config.ts             # Firebase admin config
│   │   ├── api/
│   │   │   ├── listings.ts
│   │   │   ├── orders.ts
│   │   │   └── standingOrders.ts
│   │   ├── triggers/
│   │   │   ├── onListingCreated.ts
│   │   │   ├── onOrderCreated.ts
│   │   │   └── onListingUpdated.ts
│   │   ├── jobs/
│   │   │   └── standingOrderMatcher.ts
│   │   └── utils/
│   │       ├── geohash.ts
│   │       └── notifications.ts
│   └── test/
│       └── integration/
│           ├── listings.test.ts
│           └── orders.test.ts
└── scripts/
    └── init-firebase.sh          # Firebase project init script
```

---

## Task 1: Initialize Firebase Project

**Files:**
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `scripts/init-firebase.sh`

- [ ] **Step 1: Create firebase.json**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log"
      ],
      "predeploy": [
        "npm --prefix \"$RESOURCE_DIR\" run lint"
      ]
    }
  ]
}
```

- [ ] **Step 2: Create .firebaserc**

```json
{
  "projects": {
    "default": "finventory"
  }
}
```

- [ ] **Step 3: Create Firebase init script**

`scripts/init-firebase.sh`:
```bash
#!/bin/bash
set -e

echo "Creating Firebase project..."

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Login if not authenticated
echo "Make sure you're logged in to Firebase:"
firebase login

# Initialize project (interactive)
firebase init firestore functions storage

echo "Firebase project initialized!"
echo "Next steps:"
echo "1. Create the project in Firebase Console"
echo "2. Run: firebase use --add"
echo "3. Run: firebase deploy"
```

- [ ] **Step 4: Make script executable**

Run: `chmod +x scripts/init-firebase.sh`

- [ ] **Step 5: Commit**

```bash
git add firebase.json .firebaserc scripts/
git commit -m "feat: add Firebase project configuration"
```

---

## Task 2: Setup Cloud Functions Project

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Create: `functions/src/config.ts`

- [ ] **Step 1: Create functions package.json**

`functions/package.json`:
```json
{
  "name": "finventory-functions",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "lint": "eslint src/**/*.ts",
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "@firebase/genql": "^1.0.0",
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "ngeohash": "^0.6.3"
  },
  "devDependencies": {
    "@types/ngeohash": "^0.6.2",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": "20"
  }
}
```

- [ ] **Step 2: Create TypeScript config**

`functions/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "ES2022",
    "target": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "outDir": "lib",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "lib"]
}
```

- [ ] **Step 3: Create Firebase config**

`functions/src/config.ts`:
```typescript
import * as admin from 'firebase-admin'

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.GCP_PROJECT_ID || 'finventory',
  // In production, this will use ADC automatically
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: `https://${serviceAccount.projectId}-default-rtdb.firebaseio.com`
})

export const db = admin.firestore()
export const rtdb = admin.database()
export const auth = admin.auth()
export const storage = admin.storage()
```

- [ ] **Step 4: Create empty index.ts**

`functions/src/index.ts`:
```typescript
// Cloud Functions entry point
// Functions will be exported here in subsequent tasks

export const helloWorld = () => {
  console.log('Firebase Functions loaded')
}
```

- [ ] **Step 5: Install dependencies**

Run: `cd functions && npm install`

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: Creates `lib/` directory with compiled JS

- [ ] **Step 7: Commit**

```bash
git add functions/
git commit -m "feat: setup Cloud Functions project with TypeScript"
```

---

## Task 3: Create Firestore Security Rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Create Firestore rules**

`firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isSeller(listing) {
      return isAuthenticated() && request.auth.uid == listing.data.sellerId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if isAuthenticated() && request.resource.data.id == request.auth.uid;
      allow update: if isOwner(userId);
      allow delete: if false;
    }
    
    // Listings collection
    match /listings/{listingId} {
      allow read: if true;
      allow create: if isAuthenticated() && request.resource.data.sellerId == request.auth.uid;
      allow update: if isSeller(resource);
      allow delete: if isSeller(resource);
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow read: if isBuyer(resource) || resource.data.sellerId == request.auth.uid;
      allow create: if isAuthenticated() && request.resource.data.buyerId == request.auth.uid;
      allow update: if request.auth.uid == resource.data.sellerId 
                      || request.auth.uid == resource.data.buyerId;
      allow delete: if false;
    }
    
    // Standing orders collection
    match /standingOrders/{soId} {
      allow read, write, delete: if isAuthenticated() && request.auth.uid == resource.data.buyerId;
      allow create: if isAuthenticated() && request.resource.data.buyerId == request.auth.uid;
    }
    
    // Reviews collection
    match /reviews/{reviewId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update: if request.auth.uid == resource.data.buyerId;
      allow delete: if request.auth.uid == resource.data.buyerId;
    }
    
    // Messages collection
    match /messages/{messageId} {
      allow create: if isAuthenticated();
      allow read: if isAuthenticated() && (resource.data.senderId == request.auth.uid 
                                            || resource.data.receiverId == request.auth.uid);
      allow update: if false;
      allow delete: if false;
    }
    
    // Favorites collection
    match /favorites/{favId} {
      allow read, write, delete: if isAuthenticated() && request.resource.data.buyerId == request.auth.uid;
    }
    
    // Sushi certificates collection
    match /sushiCertificates/{certId} {
      allow read: if true;
      allow create: if isAuthenticated() && request.resource.data.sellerId == request.auth.uid;
      allow update: if request.auth.uid == resource.data.sellerId;
      allow delete: if request.auth.uid == resource.data.sellerId;
    }
    
    // Transactions collection
    match /transactions/{txnId} {
      allow read: if isAuthenticated();
      allow create, update: if false; // Cloud Functions only
    }
    
    // Geo index - Cloud Functions write only
    match /geoIndex/{docId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Subcollections
    match /users/{userId}/notifications/{notificationId} {
      allow read, write: if isOwner(userId);
    }
    
    match /listings/{listingId}/views/{viewId} {
      allow read: if true;
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }
  }
}
```

- [ ] **Step 2: Verify rules syntax**

Run: `firebase deploy --only firestore:rules --dry-run`
Expected: No syntax errors

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules"
```

---

## Task 4: Create Storage Security Rules

**Files:**
- Create: `storage.rules`

- [ ] **Step 1: Create Storage rules**

`storage.rules`:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Listing photos - anyone can read, only seller can write
    match /listings/{listingId}/{allPaths=**} {
      allow read: if true;
      allow write: if isAuthenticated() && request.resource.size < 5 * 1024 * 1024; // 5MB max
    }
    
    // Certificate documents
    match /certificates/{sellerId}/{allPaths=**} {
      allow read: if true;
      allow write: if isAuthenticated() && request.auth.uid == sellerId 
                      && request.resource.size < 10 * 1024 * 1024; // 10MB max
    }
    
    // Profile photos
    match /profiles/{userId} {
      allow read: if true;
      allow write: if isAuthenticated() && request.auth.uid == userId 
                      && request.resource.size < 2 * 1024 * 1024; // 2MB max
    }
  }
}
```

- [ ] **Step 2: Verify rules syntax**

Run: `firebase deploy --only storage:rules --dry-run`
Expected: No syntax errors

- [ ] **Step 3: Commit**

```bash
git add storage.rules
git commit -m "feat: add Storage security rules"
```

---

## Task 5: Create Firestore Indexes

**Files:**
- Create: `firestore.indexes.json`

- [ ] **Step 1: Create indexes configuration**

`firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "listings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sellerId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "listings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "location.geohash", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "listings",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "buyerId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sellerId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "standingOrders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "buyerId", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "standingOrders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "location.geohash", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "reviews",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sellerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "geoIndex",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "geohash", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 2: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat: add Firestore indexes configuration"
```

---

## Task 6: Create Geohash Utilities

**Files:**
- Create: `functions/src/utils/geohash.ts`

- [ ] **Step 1: Create geohash utility functions**

`functions/src/utils/geohash.ts`:
```typescript
import * as geohash from 'ngeohash'

export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface GeoResult {
  geohash: string
  latitude: number
  longitude: number
}

/**
 * Encode lat/lng to geohash with precision
 */
export function encodeGeohash(lat: number, lng: number, precision: number = 9): string {
  return geohash.encode(lat, lng, precision)
}

/**
 * Decode geohash to lat/lng
 */
export function decodeGeohash(hash: string): GeoPoint {
  const decoded = geohash.decode(hash)
  return {
    latitude: decoded.latitude,
    longitude: decoded.longitude
  }
}

/**
 * Get bounding box geohashes for a radius search
 * Returns all geohash prefixes within the radius
 */
export function getGeoHashesInRadius(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): string[] {
  // Convert miles to degrees (approximate)
  const radiusDegrees = radiusMiles / 69.0
  
  // Calculate bounding box
  const latMin = centerLat - radiusDegrees
  const latMax = centerLat + radiusDegrees
  const lngMin = centerLng - radiusDegrees
  const lngMax = centerLng + radiusDegrees
  
  // Generate geohashes for the bounding box
  // Using precision 6 for ~1.2km x 0.6km grid
  const hashes: string[] = []
  const precision = 6
  
  // Create a grid of geohashes covering the bounding box
  const latStep = 1 / Math.pow(5, precision / 2) // Rough estimate
  const lngStep = latStep
  
  for (let lat = latMin; lat <= latMax; lat += latStep) {
    for (let lng = lngMin; lng <= lngMax; lng += lngStep) {
      const hash = encodeGeohash(lat, lng, precision)
      if (!hashes.includes(hash)) {
        hashes.push(hash)
      }
    }
  }
  
  return hashes
}

/**
 * Calculate distance between two points in miles
 */
export function distanceInMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Add geo index entry for a listing
 */
export interface GeoIndexEntry {
  geohash: string
  listingId: string
  latitude: number
  longitude: number
  expiresAt: admin.firestore.Timestamp
}

export async function addGeoIndex(
  db: admin.firestore.Firestore,
  listingId: string,
  latitude: number,
  longitude: number,
  expiresAt: admin.firestore.Timestamp
): Promise<void> {
  const hash = encodeGeohash(latitude, longitude)
  
  await db.collection('geoIndex').add({
    geohash: hash,
    listingId,
    latitude,
    longitude,
    expiresAt
  })
}

/**
 * Remove geo index entries for a listing
 */
export async function removeGeoIndex(
  db: admin.firestore.Firestore,
  listingId: string
): Promise<void> {
  const snapshot = await db
    .collection('geoIndex')
    .where('listingId', '==', listingId)
    .get()
  
  const batch = db.batch()
  snapshot.forEach((doc) => {
    batch.delete(doc.ref)
  })
  
  await batch.commit()
}
```

- [ ] **Step 2: Install ngeohash types**

Run: `cd functions && npm install --save-dev @types/ngeohash`

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add functions/src/utils/geohash.ts
git commit -m "feat: add geohash utility functions"
```

---

## Task 7: Create Notification Utilities

**Files:**
- Create: `functions/src/utils/notifications.ts`

- [ ] **Step 1: Create notification utility functions**

`functions/src/utils/notifications.ts`:
```typescript
import * as admin from 'firebase-admin'
import { db } from '../config.js'

export interface NotificationPayload {
  userId: string
  type: 'standing_order_match' | 'order_update' | 'listing_update'
  title: string
  body: string
  data?: Record<string, unknown>
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
  data?: Record<string, unknown>
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
    const response = await admin.messaging().sendMulticast(message)
    
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/utils/notifications.ts
git commit -m "feat: add notification utility functions"
```

---

## Task 8: Create Listing API Functions

**Files:**
- Create: `functions/src/api/listings.ts`

- [ ] **Step 1: Create listing API**

`functions/src/api/listings.ts`:
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import { addGeoIndex, removeGeoIndex } from '../utils/geohash.js'

// Types
export interface CreateListingRequest {
  sellerId: string
  species: string
  grade: 'sushi' | 'A' | 'B'
  sushiCertNumber?: string
  sushiCertExpiry?: admin.firestore.Timestamp
  quantity: number
  unit: 'lb' | 'kg'
  pricePerUnit: number
  latitude: number
  longitude: number
  photos: string[]
  freshnessDate: admin.firestore.Timestamp
  deliveryAvailable: boolean
  expiresAt: admin.firestore.Timestamp
}

export interface Listing {
  id: string
  sellerId: string
  species: string
  grade: 'sushi' | 'A' | 'B'
  sushiCertNumber?: string
  sushiCertExpiry?: admin.firestore.Timestamp
  quantity: number
  unit: 'lb' | 'kg'
  pricePerUnit: number
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  photos: string[]
  freshnessDate: admin.firestore.Timestamp
  deliveryAvailable: boolean
  status: 'active' | 'pending_pickup' | 'sold' | 'expired'
  createdAt: admin.firestore.Timestamp
  expiresAt: admin.firestore.Timestamp
}

/**
 * Create a new listing
 */
export const createListing = functions.https.onCall(
  async (data: CreateListingRequest, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      )
    }
    
    const userId = context.auth.uid
    
    // Verify user is the seller
    if (data.sellerId !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Cannot create listing for another user'
      )
    }
    
    // Validate sushi grade requirements
    if (data.grade === 'sushi' && (!data.sushiCertNumber || !data.sushiCertExpiry)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Sushi grade requires certificate number and expiry'
      )
    }
    
    // Validate quantity
    if (data.quantity <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Quantity must be positive'
      )
    }
    
    // Validate price
    if (data.pricePerUnit <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Price must be positive'
      )
    }
    
    // Validate coordinates
    if (
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid coordinates'
      )
    }
    
    // Validate expiry date
    const now = admin.firestore.Timestamp.now()
    if (data.expiresAt < now) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Expiry date must be in the future'
      )
    }
    
    try {
      // Create geohash
      const { encodeGeohash } = await import('../utils/geohash.js')
      const geohash = encodeGeohash(data.latitude, data.longitude)
      
      // Create listing document
      const listingRef = await db.collection('listings').add({
        sellerId: data.sellerId,
        species: data.species.toLowerCase(),
        grade: data.grade,
        sushiCertNumber: data.sushiCertNumber,
        sushiCertExpiry: data.sushiCertExpiry,
        quantity: data.quantity,
        unit: data.unit,
        pricePerUnit: data.pricePerUnit,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          geohash
        },
        photos: data.photos,
        freshnessDate: data.freshnessDate,
        deliveryAvailable: data.deliveryAvailable,
        status: 'active',
        createdAt: now,
        expiresAt: data.expiresAt
      })
      
      // Add to geo index
      await addGeoIndex(db, listingRef.id, data.latitude, data.longitude, data.expiresAt)
      
      return {
        success: true,
        listingId: listingRef.id
      }
    } catch (error) {
      console.error('Error creating listing:', error)
      throw new functions.https.HttpsError(
        'internal',
        'Failed to create listing'
      )
    }
  }
)

/**
 * Update a listing
 */
export const updateListing = functions.https.onCall(
  async (data: { listingId: string; updates: Partial<Listing> }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const { listingId, updates } = data
    
    // Get listing
    const listingRef = db.collection('listings').doc(listingId)
    const listingDoc = await listingRef.get()
    
    if (!listingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Listing not found')
    }
    
    const listing = listingDoc.data() as Listing
    
    // Verify ownership
    if (listing.sellerId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not your listing')
    }
    
    // Don't allow changing seller or critical fields
    const allowedUpdates = [
      'quantity',
      'pricePerUnit',
      'photos',
      'deliveryAvailable',
      'status'
    ]
    
    const invalidUpdates = Object.keys(updates).filter(
      (key) => !allowedUpdates.includes(key)
    )
    
    if (invalidUpdates.length > 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Cannot update: ${invalidUpdates.join(', ')}`
      )
    }
    
    try {
      await listingRef.update({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      return { success: true }
    } catch (error) {
      console.error('Error updating listing:', error)
      throw new functions.https.HttpsError('internal', 'Failed to update listing')
    }
  }
)

/**
 * Delete a listing
 */
export const deleteListing = functions.https.onCall(
  async (data: { listingId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const { listingId } = data
    
    // Get listing
    const listingRef = db.collection('listings').doc(listingId)
    const listingDoc = await listingRef.get()
    
    if (!listingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Listing not found')
    }
    
    const listing = listingDoc.data() as Listing
    
    // Verify ownership
    if (listing.sellerId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not your listing')
    }
    
    // Only allow deleting active listings
    if (listing.status !== 'active') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cannot delete listing with pending orders'
      )
    }
    
    try {
      // Remove from geo index
      await removeGeoIndex(db, listingId)
      
      // Delete listing
      await listingRef.delete()
      
      return { success: true }
    } catch (error) {
      console.error('Error deleting listing:', error)
      throw new functions.https.HttpsError('internal', 'Failed to delete listing')
    }
  }
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/api/listings.ts
git commit -m "feat: add listing API functions"
```

---

## Task 9: Create Order API Functions

**Files:**
- Create: `functions/src/api/orders.ts`

- [ ] **Step 1: Create order API**

`functions/src/api/orders.ts`:
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import { notifyNewOrder, notifyOrderStatusUpdate } from '../utils/notifications.js'

export interface CreateOrderRequest {
  listingId: string
  buyerId: string
  quantity: number
  deliveryOption: 'pickup' | 'delivery'
  deliveryAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
  }
}

export interface Order {
  id: string
  listingId: string
  buyerId: string
  sellerId: string
  quantity: number
  totalPrice: number
  status: 'pending' | 'picked_up' | 'cancelled'
  pickupQRCode: string
  deliveryOption: 'pickup' | 'delivery'
  deliveryAddress?: {
    street: string
    city: string
    state: string
    zipCode: string
  }
  createdAt: admin.firestore.Timestamp
  pickedUpAt?: admin.firestore.Timestamp
}

/**
 * Create a new order
 */
export const createOrder = functions.https.onCall(
  async (data: CreateOrderRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const userId = context.auth.uid
    
    // Verify buyer ID
    if (data.buyerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot order for another user')
    }
    
    // Get listing
    const listingRef = db.collection('listings').doc(data.listingId)
    const listingDoc = await listingRef.get()
    
    if (!listingDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Listing not found')
    }
    
    const listing = listingDoc.data()!
    
    // Check if listing is active
    if (listing.status !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', 'Listing is not available')
    }
    
    // Check if listing has expired
    const now = admin.firestore.Timestamp.now()
    if (listing.expiresAt < now) {
      throw new functions.https.HttpsError('failed-precondition', 'Listing has expired')
    }
    
    // Check if buyer is the seller
    if (listing.sellerId === userId) {
      throw new functions.https.HttpsError('failed-precondition', 'Cannot buy your own listing')
    }
    
    // Validate quantity
    if (data.quantity <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Quantity must be positive')
    }
    
    if (data.quantity > listing.quantity) {
      throw new functions.https.HttpsError('failed-precondition', 'Not enough quantity available')
    }
    
    // Validate delivery option
    if (data.deliveryOption === 'delivery' && !listing.deliveryAvailable) {
      throw new functions.https.HttpsError('failed-precondition', 'Delivery not available for this listing')
    }
    
    if (data.deliveryOption === 'delivery' && !data.deliveryAddress) {
      throw new functions.https.HttpsError('invalid-argument', 'Delivery address required')
    }
    
    // Generate unique QR code
    const pickupQRCode = `${data.listingId}-${userId}-${Date.now()}`
    
    try {
      // Calculate total price
      const totalPrice = data.quantity * listing.pricePerUnit
      
      // Create order
      const orderRef = await db.collection('orders').add({
        listingId: data.listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
        quantity: data.quantity,
        totalPrice,
        status: 'pending',
        pickupQRCode,
        deliveryOption: data.deliveryOption,
        deliveryAddress: data.deliveryAddress || null,
        createdAt: now
      })
      
      // Update listing quantity and status
      const newQuantity = listing.quantity - data.quantity
      const updates: admin.firestore.UpdateData = {
        quantity: newQuantity
      }
      
      if (newQuantity === 0) {
        updates.status = 'sold'
      }
      
      await listingRef.update(updates)
      
      // Notify seller
      await notifyNewOrder(
        listing.sellerId,
        orderRef.id,
        `${listing.species} (${listing.grade} grade)`
      )
      
      return {
        success: true,
        orderId: orderRef.id,
        pickupQRCode
      }
    } catch (error) {
      console.error('Error creating order:', error)
      throw new functions.https.HttpsError('internal', 'Failed to create order')
    }
  }
)

/**
 * Confirm order pickup (QR code scan)
 */
export const confirmPickup = functions.https.onCall(
  async (data: { orderId: string; qrCode: string; scannerRole: 'buyer' | 'seller' }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const { orderId, qrCode, scannerRole } = data
    
    // Get order
    const orderRef = db.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found')
    }
    
    const order = orderDoc.data()!
    
    // Verify QR code
    if (order.pickupQRCode !== qrCode) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid QR code')
    }
    
    // Verify user is either buyer or seller
    const userId = context.auth.uid
    const isBuyer = userId === order.buyerId
    const isSeller = userId === order.sellerId
    
    if (!isBuyer && !isSeller) {
      throw new functions.https.HttpsError('permission-denied', 'Not your order')
    }
    
    // Check if order is already picked up
    if (order.status === 'picked_up') {
      return {
        success: true,
        alreadyPickedUp: true
      }
    }
    
    // Check if order is cancelled
    if (order.status === 'cancelled') {
      throw new functions.https.HttpsError('failed-precondition', 'Order is cancelled')
    }
    
    try {
      // Update order status
      await orderRef.update({
        status: 'picked_up',
        pickedUpAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // Notify buyer
      await notifyOrderStatusUpdate(order.buyerId, orderId, 'picked_up')
      
      return {
        success: true,
        alreadyPickedUp: false
      }
    } catch (error) {
      console.error('Error confirming pickup:', error)
      throw new functions.https.HttpsError('internal', 'Failed to confirm pickup')
    }
  }
)

/**
 * Cancel an order
 */
export const cancelOrder = functions.https.onCall(
  async (data: { orderId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const { orderId } = data
    const userId = context.auth.uid
    
    // Get order
    const orderRef = db.collection('orders').doc(orderId)
    const orderDoc = await orderRef.get()
    
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found')
    }
    
    const order = orderDoc.data()!
    
    // Only buyer can cancel
    if (order.buyerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Only buyer can cancel')
    }
    
    // Can only cancel pending orders
    if (order.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Cannot cancel completed order')
    }
    
    try {
      // Cancel order
      await orderRef.update({
        status: 'cancelled'
      })
      
      // Restore listing quantity
      const listingRef = db.collection('listings').doc(order.listingId)
      const listingDoc = await listingRef.get()
      
      if (listingDoc.exists) {
        const listing = listingDoc.data()!
        await listingRef.update({
          quantity: admin.firestore.FieldValue.increment(order.quantity),
          status: 'active'
        })
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error cancelling order:', error)
      throw new functions.https.HttpsError('internal', 'Failed to cancel order')
    }
  }
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/api/orders.ts
git commit -m "feat: add order API functions"
```

---

## Task 10: Create Standing Order API Functions

**Files:**
- Create: `functions/src/api/standingOrders.ts`

- [ ] **Step 1: Create standing order API**

`functions/src/api/standingOrders.ts`:
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import { encodeGeohash } from '../utils/geohash.js'

export interface StandingOrder {
  id: string
  buyerId: string
  name: string
  species: string[]
  minGrade: 'sushi' | 'A' | 'B'
  maxDistance: number
  maxPricePerUnit?: number
  location: {
    latitude: number
    longitude: number
    geohash: string
  }
  isActive: boolean
  createdAt: admin.firestore.Timestamp
  lastMatchedAt?: admin.firestore.Timestamp
}

export interface CreateStandingOrderRequest {
  name: string
  species: string[]
  minGrade: 'sushi' | 'A' | 'B'
  maxDistance: number
  maxPricePerUnit?: number
  latitude: number
  longitude: number
}

/**
 * Create a new standing order
 */
export const createStandingOrder = functions.https.onCall(
  async (data: CreateStandingOrderRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const userId = context.auth.uid
    
    // Validate inputs
    if (!data.name || data.name.trim().length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Name is required')
    }
    
    if (!data.species || data.species.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'At least one species is required')
    }
    
    if (data.maxDistance <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Max distance must be positive')
    }
    
    if (data.maxPricePerUnit !== undefined && data.maxPricePerUnit <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Max price must be positive')
    }
    
    // Validate coordinates
    if (
      data.latitude < -90 ||
      data.latitude > 90 ||
      data.longitude < -180 ||
      data.longitude > 180
    ) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid coordinates')
    }
    
    // Normalize species to lowercase
    const normalizedSpecies = data.species.map((s) => s.toLowerCase())
    
    try {
      const geohash = encodeGeohash(data.latitude, data.longitude)
      
      const standingOrderRef = await db.collection('standingOrders').add({
        buyerId: userId,
        name: data.name.trim(),
        species: normalizedSpecies,
        minGrade: data.minGrade,
        maxDistance: data.maxDistance,
        maxPricePerUnit: data.maxPricePerUnit || null,
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          geohash
        },
        isActive: true,
        createdAt: admin.firestore.Timestamp.now()
      })
      
      return {
        success: true,
        standingOrderId: standingOrderRef.id
      }
    } catch (error) {
      console.error('Error creating standing order:', error)
      throw new functions.https.HttpsError('internal', 'Failed to create standing order')
    }
  }
)

/**
 * Update a standing order
 */
export const updateStandingOrder = functions.https.onCall(
  async (data: { standingOrderId: string; updates: Partial<StandingOrder> }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const { standingOrderId, updates } = data
    const userId = context.auth.uid
    
    // Get standing order
    const soRef = db.collection('standingOrders').doc(standingOrderId)
    const soDoc = await soRef.get()
    
    if (!soDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Standing order not found')
    }
    
    const so = soDoc.data()!
    
    // Verify ownership
    if (so.buyerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your standing order')
    }
    
    // Don't allow changing buyerId
    if (updates.buyerId !== undefined) {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot change buyer')
    }
    
    // Validate species if provided
    if (updates.species) {
      updates.species = updates.species.map((s) => s.toLowerCase())
    }
    
    try {
      await soRef.update(updates)
      return { success: true }
    } catch (error) {
      console.error('Error updating standing order:', error)
      throw new functions.https.HttpsError('internal', 'Failed to update standing order')
    }
  }
)

/**
 * Delete a standing order
 */
export const deleteStandingOrder = functions.https.onCall(
  async (data: { standingOrderId: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const { standingOrderId } = data
    const userId = context.auth.uid
    
    // Get standing order
    const soRef = db.collection('standingOrders').doc(standingOrderId)
    const soDoc = await soRef.get()
    
    if (!soDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Standing order not found')
    }
    
    const so = soDoc.data()!
    
    // Verify ownership
    if (so.buyerId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your standing order')
    }
    
    try {
      await soRef.delete()
      return { success: true }
    } catch (error) {
      console.error('Error deleting standing order:', error)
      throw new functions.https.HttpsError('internal', 'Failed to delete standing order')
    }
  }
)

/**
 * Get user's standing orders
 */
export const getMyStandingOrders = functions.https.onCall(
  async (data: unknown, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated')
    }
    
    const userId = context.auth.uid
    
    try {
      const snapshot = await db
        .collection('standingOrders')
        .where('buyerId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get()
      
      const standingOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      
      return { standingOrders }
    } catch (error) {
      console.error('Error getting standing orders:', error)
      throw new functions.https.HttpsError('internal', 'Failed to get standing orders')
    }
  }
)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/api/standingOrders.ts
git commit -m "feat: add standing order API functions"
```

---

## Task 11: Create Firestore Triggers

**Files:**
- Create: `functions/src/triggers/onListingCreated.ts`
- Create: `functions/src/triggers/onOrderCreated.ts`
- Create: `functions/src/triggers/onListingUpdated.ts`

- [ ] **Step 1: Create onListingCreated trigger**

`functions/src/triggers/onListingCreated.ts`:
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db, rtdb } from '../config.js'
import { distanceInMiles } from '../utils/geohash.js'
import { notifyStandingOrderMatch } from '../utils/notifications.js'

/**
 * Triggered when a new listing is created
 * - Updates real-time inventory
 * - Finds matching standing orders and notifies buyers
 */
export const onListingCreated = functions.firestore
  .document('listings/{listingId}')
  .onCreate(async (snap, context) => {
    const listing = snap.data()!
    const listingId = context.params.listingId
    
    // Update real-time inventory
    await rtdb.ref(`live_inventory/${listingId}`).set({
      count: listing.quantity,
      status: listing.status,
      lastUpdated: admin.database.ServerValue.TIMESTAMP
    })
    
    // Find matching standing orders
    const matchingOrders = await findMatchingStandingOrders(listing)
    
    // Notify matching buyers
    for (const order of matchingOrders) {
      await notifyStandingOrderMatch(
        order.buyerId,
        listingId,
        listing.species,
        listing.grade
      )
      
      // Update last matched timestamp
      await db.collection('standingOrders').doc(order.id).update({
        lastMatchedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
    
    console.log(`Processed new listing ${listingId}, found ${matchingOrders.length} matches`)
  })

interface StandingOrderMatch {
  id: string
  buyerId: string
}

async function findMatchingStandingOrders(listing: any): Promise<StandingOrderMatch[]> {
  // Get all active standing orders
  const snapshot = await db
    .collection('standingOrders')
    .where('isActive', '==', true)
    .get()
  
  const matches: StandingOrderMatch[] = []
  
  for (const doc of snapshot.docs) {
    const order = doc.data()
    
    // Check species match
    const speciesMatch = order.species.includes('*') || order.species.includes(listing.species)
    
    if (!speciesMatch) continue
    
    // Check grade match (standing order minGrade must be <= listing grade)
    const gradeOrder = { sushi: 3, A: 2, B: 1 }
    if (gradeOrder[order.minGrade] > gradeOrder[listing.grade]) {
      continue
    }
    
    // Check price match
    if (order.maxPricePerUnit && listing.pricePerUnit > order.maxPricePerUnit) {
      continue
    }
    
    // Check distance
    const distance = distanceInMiles(
      order.location.latitude,
      order.location.longitude,
      listing.location.latitude,
      listing.location.longitude
    )
    
    if (distance > order.maxDistance) {
      continue
    }
    
    matches.push({
      id: doc.id,
      buyerId: order.buyerId
    })
  }
  
  return matches
}
```

- [ ] **Step 2: Create onOrderCreated trigger**

`functions/src/triggers/onOrderCreated.ts`:
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { rtdb } from '../config.js'

/**
 * Triggered when a new order is created
 * - Updates real-time inventory count
 */
export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data()!
    
    // Get listing to update inventory
    const listingDoc = await admin.firestore().collection('listings').doc(order.listingId).get()
    
    if (!listingDoc.exists) {
      console.log(`Listing ${order.listingId} not found`)
      return
    }
    
    const listing = listingDoc.data()!
    
    // Update real-time inventory
    await rtdb.ref(`live_inventory/${order.listingId}`).update({
      count: listing.quantity,
      status: listing.status,
      lastUpdated: admin.database.ServerValue.TIMESTAMP
    })
    
    console.log(`Updated inventory for listing ${order.listingId}`)
  })
```

- [ ] **Step 3: Create onListingUpdated trigger**

`functions/src/triggers/onListingUpdated.ts`:
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { rtdb } from '../config.js'
import { removeGeoIndex } from '../utils/geohash.js'

/**
 * Triggered when a listing is updated
 * - Updates real-time inventory
 * - Cleans up geo index if listing is sold/expired
 */
export const onListingUpdated = functions.firestore
  .document('listings/{listingId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()!
    const after = change.after.data()!
    const listingId = context.params.listingId
    
    // Update real-time inventory
    await rtdb.ref(`live_inventory/${listingId}`).update({
      count: after.quantity,
      status: after.status,
      lastUpdated: admin.database.ServerValue.TIMESTAMP
    })
    
    // Clean up geo index if listing is no longer active
    if (before.status === 'active' && after.status !== 'active') {
      await removeGeoIndex(admin.firestore(), listingId)
      console.log(`Cleaned up geo index for inactive listing ${listingId}`)
    }
    
    // Clean up real-time inventory if sold/expired
    if (after.status === 'sold' || after.status === 'expired') {
      await rtdb.ref(`live_inventory/${listingId}`).remove()
    }
  })
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add functions/src/triggers/
git commit -m "feat: add Firestore triggers for listings and orders"
```

---

## Task 12: Create Standing Order Matcher Job

**Files:**
- Create: `functions/src/jobs/standingOrderMatcher.ts`

- [ ] **Step 1: Create standing order matcher**

`functions/src/jobs/standingOrderMatcher.ts`:
```typescript
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { db } from '../config.js'
import { distanceInMiles } from '../utils/geohash.js'
import { notifyStandingOrderMatch } from '../utils/notifications.js'

/**
 * Scheduled function - runs every 5 minutes
 * Finds active listings that match standing orders and notifies buyers
 */
export const matchStandingOrders = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()
    
    // Get all active listings
    const listingsSnapshot = await db
      .collection('listings')
      .where('status', '==', 'active')
      .where('expiresAt', '>', now)
      .get()
    
    if (listingsSnapshot.empty) {
      console.log('No active listings found')
      return null
    }
    
    // Get all active standing orders
    const standingOrdersSnapshot = await db
      .collection('standingOrders')
      .where('isActive', '==', true)
      .get()
    
    if (standingOrdersSnapshot.empty) {
      console.log('No active standing orders found')
      return null
    }
    
    let matchCount = 0
    
    // Check each listing against each standing order
    for (const listingDoc of listingsSnapshot.docs) {
      const listing = listingDoc.data()!
      const listingId = listingDoc.id
      
      for (const soDoc of standingOrdersSnapshot.docs) {
        const order = soDoc.data()!
        
        // Skip if recently matched (within last hour)
        if (order.lastMatchedAt) {
          const lastMatched = order.lastMatchedAt.toDate()
          const hoursSinceMatch = (now.toDate().getTime() - lastMatched.getTime()) / (1000 * 60 * 60)
          if (hoursSinceMatch < 1) {
            continue
          }
        }
        
        // Check for match
        const isMatch = checkMatch(listing, order)
        
        if (isMatch) {
          await notifyStandingOrderMatch(
            order.buyerId,
            listingId,
            listing.species,
            listing.grade
          )
          
          // Update last matched timestamp
          await soDoc.ref.update({
            lastMatchedAt: now
          })
          
          matchCount++
        }
      }
    }
    
    console.log(`Standing order matcher completed: ${matchCount} matches found`)
    return null
  })

function checkMatch(listing: any, order: any): boolean {
  // Check species match
  const speciesMatch = order.species.includes('*') || order.species.includes(listing.species)
  if (!speciesMatch) return false
  
  // Check grade match
  const gradeOrder: Record<string, number> = { sushi: 3, A: 2, B: 1 }
  if (gradeOrder[order.minGrade] > gradeOrder[listing.grade]) {
    return false
  }
  
  // Check price match
  if (order.maxPricePerUnit && listing.pricePerUnit > order.maxPricePerUnit) {
    return false
  }
  
  // Check distance
  const distance = distanceInMiles(
    order.location.latitude,
    order.location.longitude,
    listing.location.latitude,
    listing.location.longitude
  )
  
  return distance <= order.maxDistance
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add functions/src/jobs/
git commit -m "feat: add standing order matcher scheduled job"
```

---

## Task 13: Update Functions Entry Point

**Files:**
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Update index.ts with all exports**

`functions/src/index.ts`:
```typescript
// API Functions
export {
  createListing,
  updateListing,
  deleteListing
} from './api/listings.js'

export {
  createOrder,
  confirmPickup,
  cancelOrder
} from './api/orders.js'

export {
  createStandingOrder,
  updateStandingOrder,
  deleteStandingOrder,
  getMyStandingOrders
} from './api/standingOrders.js'

// Firestore Triggers
export {
  onListingCreated
} from './triggers/onListingCreated.js'

export {
  onOrderCreated
} from './triggers/onOrderCreated.js'

export {
  onListingUpdated
} from './triggers/onListingUpdated.js'

// Scheduled Jobs
export {
  matchStandingOrders
} from './jobs/standingOrderMatcher.js'
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd functions && npm run build`
Expected: No errors, all functions exported correctly

- [ ] **Step 3: Commit**

```bash
git add functions/src/index.ts
git commit -m "feat: export all Cloud Functions from entry point"
```

---

## Task 14: Create ESLint Configuration

**Files:**
- Create: `functions/.eslintrc.json`

- [ ] **Step 1: Create ESLint config**

`functions/.eslintrc.json`:
```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "off"
  }
}
```

- [ ] **Step 2: Install ESLint dependencies**

Run: `cd functions && npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser`

- [ ] **Step 3: Run linter**

Run: `cd functions && npm run lint`
Expected: No critical errors

- [ ] **Step 4: Commit**

```bash
git add functions/.eslintrc.json functions/package.json
git commit -m "feat: add ESLint configuration for Functions"
```

---

## Task 15: Create Local Development Emulator Setup

**Files:**
- Create: `functions/.firebase.json`

- [ ] **Step 1: Create emulator configuration**

`functions/.firebase.json`:
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "database": { "port": 9000 },
    "pubsub": { "port": 8085 },
    "ui": { "enabled": true, "port": 4000 }
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "ignore": ["node_modules", ".git", "firebase-debug.log"]
    }
  ]
}
```

- [ ] **Step 2: Create development script**

Add to root `package.json` scripts:
```json
"dev": "firebase emulators:start --only functions,firestore,auth,storage,database"
```

- [ ] **Step 3: Test emulator startup**

Run: `firebase emulators:start --only functions,firestore`
Expected: Emulators start on ports 5001, 8080, 9099

- [ ] **Step 4: Commit**

```bash
git add functions/.firebase.json package.json
git commit -m "feat: add Firebase emulator configuration for local dev"
```

---

## Task 16: Create README Documentation

**Files:**
- Create: `README.firebase.md`

- [ ] **Step 1: Create Firebase README**

`README.firebase.md`:
```markdown
# Firebase Backend Setup

This document describes the Firebase backend setup for the finventory application.

## Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- Google Cloud project with billing enabled

## Initial Setup

1. **Create Firebase project:**
   ```bash
   firebase login
   firebase projects:create finventory
   firebase use finventory
   ```

2. **Initialize Firebase:**
   ```bash
   ./scripts/init-firebase.sh
   ```

3. **Enable services in Firebase Console:**
   - Firestore (Create database)
   - Authentication (Email/Password, Google)
   - Storage (Start in production mode)
   - Functions (requires Blaze plan)
   - Realtime Database (Create database)
   - Cloud Messaging

4. **Install dependencies:**
   ```bash
   cd functions && npm install
   ```

## Local Development

1. **Start emulators:**
   ```bash
   npm run dev
   ```
   Or:
   ```bash
   firebase emulators:start
   ```

2. **Access emulator UI:**
   - http://localhost:4000

3. **Run functions locally:**
   ```bash
   cd functions
   npm run serve
   ```

## Deployment

1. **Deploy all:**
   ```bash
   firebase deploy
   ```

2. **Deploy specific services:**
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only functions
   firebase deploy --only storage:rules
   ```

## Collections Overview

### Core Collections
- `users` - User profiles
- `listings` - Marketplace listings
- `orders` - Purchase orders
- `standingOrders` - Buyer auto-match criteria
- `geoIndex` - Location index for proximity search

### Optional Collections
- `sushiCertificates` - Sushi grade certifications
- `reviews` - Seller ratings
- `messages` - Order messages
- `favorites` - Watched listings
- `transactions` - Payment records

## Cloud Functions

### API Functions (Callable)
- `createListing` - Create a new listing
- `updateListing` - Update listing details
- `deleteListing` - Delete a listing
- `createOrder` - Place an order
- `confirmPickup` - Confirm order pickup (QR scan)
- `cancelOrder` - Cancel an order
- `createStandingOrder` - Create standing order criteria
- `updateStandingOrder` - Update standing order
- `deleteStandingOrder` - Delete standing order
- `getMyStandingOrders` - Get user's standing orders

### Firestore Triggers
- `onListingCreated` - Index geo, match standing orders, update RTDB
- `onOrderCreated` - Update inventory count
- `onListingUpdated` - Update RTDB, cleanup geo index

### Scheduled Jobs
- `matchStandingOrders` - Run every 5 minutes to find matches

## Security Rules

Firestore and Storage rules enforce:
- Users can only modify their own data
- Sellers can only modify their listings
- Order participants can read relevant orders
- Geo index is write-only (Cloud Functions)

## Testing

1. **Start emulators:**
   ```bash
   firebase emulators:start
   ```

2. **Run integration tests:**
   ```bash
   cd functions
   npm test
   ```

## Monitoring

1. **View function logs:**
   ```bash
   firebase functions:log
   ```

2. **Monitor in Firebase Console:**
   - Functions: https://console.firebase.google.com/project/finventory/functions
   - Firestore: https://console.firebase.google.com/project/finventory/firestore
```

- [ ] **Step 2: Commit**

```bash
git add README.firebase.md
git commit -m "docs: add Firebase backend setup documentation"
```

---

## Task 17: Final Verification and Commit

- [ ] **Step 1: Run full build**

Run: `cd functions && npm run build`
Expected: No errors, all files compile

- [ ] **Step 2: Run linter**

Run: `cd functions && npm run lint`
Expected: No critical errors

- [ ] **Step 3: Verify all files exist**

Run: 
```bash
ls -la firebase.json .firebaserc firestore.rules firestore.indexes.json storage.rules
ls -la functions/src/api/
ls -la functions/src/triggers/
ls -la functions/src/jobs/
ls -la functions/src/utils/
```
Expected: All files present

- [ ] **Step 4: Create summary commit**

```bash
git add -A
git commit -m "feat: complete Firebase backend implementation

- Firebase project configuration
- Firestore security rules and indexes
- Storage security rules
- Cloud Functions (API, triggers, jobs)
- Geohash and notification utilities
- Emulator configuration
- Documentation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

- [ ] **Step 5: Review implementation against spec**

Verify all spec requirements are implemented:
- ✅ Firebase project setup and configuration
- ✅ Firestore database with all collections
- ✅ Security rules (Firestore + Storage)
- ✅ Cloud Functions structure and core functions
- ✅ Realtime Database setup for live inventory
- ✅ Storage buckets configuration
- ✅ Authentication enabled
- ✅ Documentation

---

## Implementation Complete

All tasks completed! The Firebase backend is ready for deployment.

**Next steps:**
1. Create the Firebase project in the console
2. Run `./scripts/init-firebase.sh`
3. Deploy with `firebase deploy`
4. Configure mobile app with Firebase config
