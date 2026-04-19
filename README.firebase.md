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
   npm run dev:firebase
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
