# Finventory Mock Data

Generated synthetic marketplace data for testing and development.

## 📦 What's Included

| Collection | Count | Description |
|------------|-------|-------------|
| **Users** | 35 | 15 sellers (fisheries) + 20 buyers (restaurants/caterers) |
| **Listings** | 276 | Active seafood listings with grades, prices, photos |
| **Orders** | 157 | Purchase orders with 2% platform fee calculation |
| **Standing Orders** | 34 | Recurring order preferences for buyers |

## 🐟 Species Available

Pacific Bluefin Tuna, Yellowfin Tuna, Albacore, California Yellowtail, 
Pacific Halibut, Rockfish, Sea Bass, Swordfish, Mahi Mahi, Salmon, 
Sardines, Squid, Dungeness Crab, Spiny Lobster, Oysters, and more.

## 💰 Pricing Model

- **Sushi Grade**: 1.5x base price
- **Grade A**: 1.2x base price  
- **Grade B**: Base price
- **Grade C**: 0.7x base price
- **Platform Fee**: 2% of subtotal
- **Shipping**: $15-50 (optional)

## 🚀 How to Import

### Option 1: Firebase Emulator (Local Testing)

```bash
# 1. Start the emulator
cd /home/justin-lo/code/finventory
npm run dev:firebase

# 2. In another terminal, seed with mock data
cd scripts
./seed-emulator.sh
```

### Option 2: Production Firebase

```bash
# 1. Download service account key from Firebase Console
#    (Project Settings > Service Accounts > Generate New Private Key)

# 2. Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json

# 3. Install firebase-admin if not already installed
cd /home/justin-lo/code/finventory
npm install firebase-admin --save-dev

# 4. Import data
node scripts/import-to-firestore.js
```

### Option 3: Firebase Console (Manual)

1. Go to https://console.firebase.google.com/project/finventory-1776558252/firestore
2. Click "Start Collection"
3. Import JSON data manually (requires converting to Firestore format)

## 🔄 Regenerating Data

To create fresh mock data:

```bash
cd /home/justin-lo/code/finventory
python3 scripts/generate-mock-data.py
```

This will overwrite `mock-data.json` with new random data.

## 📍 Locations

All data is centered around **San Diego, CA** with realistic coastal coordinates:
- Lat: 32.5° - 33.2° N
- Lng: -117.3° - -116.8° W

## 🎨 Sample Data Structure

### Seller
```json
{
  "id": "uuid",
  "business_name": "Pacific Fish Market",
  "email": "seller@finventory.com",
  "type": "seller",
  "location": {"lat": 32.7157, "lng": -117.1611},
  "rating": 4.5,
  "verified_status": true
}
```

### Listing
```json
{
  "id": "uuid",
  "species": "bluefin tuna",
  "grade": "sushi",
  "quantity": 50.5,
  "unit": "lb",
  "pricePerUnit": 32.50,
  "totalPrice": 1641.25,
  "status": "active",
  "deliveryAvailable": true,
  "photos": ["https://images.unsplash.com/..."]
}
```

### Order
```json
{
  "id": "uuid",
  "status": "delivered",
  "quantity": 25.0,
  "subtotal": 812.50,
  "platformFee": 16.25,
  "shippingCost": 35.00,
  "totalPrice": 863.75,
  "fulfillmentType": "pickup"
}
```

## ⚠️ Notes

- All passwords for mock users are random (not stored)
- Photo URLs are from Unsplash (public domain seafood images)
- Date fields use ISO 8601 format
- Location data uses decimal degrees (WGS84)
- No real payment data is included

## 🧹 Cleaning Up

To delete all mock data from Firestore:

```javascript
// Run in Firebase Console > Firestore
const collections = ['users', 'listings', 'orders', 'standingOrders'];
for (const col of collections) {
  await Promise.all(
    (await db.collection(col).get()).docs.map(d => d.ref.delete())
  );
}
```

Or delete collections manually from the Firebase Console.
