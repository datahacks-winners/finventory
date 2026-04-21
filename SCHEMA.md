# Finventory Database Schema

## Collections Overview

| Collection | Description | Documents |
|------------|-------------|-----------|
| `users` | Vendor and buyer profiles | 4 |
| `listings` | Seafood marketplace listings | 27 |
| `orders` | Purchase orders | 0 |
| `standingOrders` | Buyer recurring order criteria | 0 |
| `reviews` | User ratings and reviews | 0 |
| `geoIndex` | Spatial index for location queries | 0 |

---

## Collection: `users`

User profiles for vendors (sellers) and buyers.

### Document ID Format
- Vendors: `vendor-{slug}` (e.g., `vendor-pacific-catch`)
- Buyers: `buyer-{slug}` (e.g., `buyer-sushi-master`)

### Schema

```typescript
interface User {
  // Identity
  uid: string;                    // Document ID
  email: string;                  // Contact email
  displayName: string;            // Business or personal name
  photoURL: string;               // Avatar image URL
  phoneNumber: string;            // Contact phone

  // Account Type
  isVendor: boolean;              // true = seller, false = buyer
  isBuyer?: boolean;              // true for buyer accounts

  // Business Info
  businessName: string;           // Legal business name
  businessAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
    lat: number;                  // Geocoded latitude
    lng: number;                  // Geocoded longitude
  };

  // Vendor Stats (vendors only)
  rating?: number;                // Average rating 0-5
  totalSales?: number;            // Completed sales count

  // Buyer Data (buyers only)
  savedPaymentMethods?: string[];   // Payment method IDs
  standingOrders?: string[];      // Standing order IDs

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sample Document
```json
{
  "uid": "vendor-pacific-catch",
  "email": "pacific@catch.com",
  "displayName": "Pacific Catch Seafood",
  "photoURL": "https://ui-avatars.com/api/?name=Pacific+Catch&background=0D8ABC&color=fff",
  "phoneNumber": "+1-415-555-0100",
  "isVendor": true,
  "businessName": "Pacific Catch Seafood Co.",
  "businessAddress": {
    "street": "123 Fisherman's Wharf",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94133",
    "lat": 37.808,
    "lng": -122.4177
  },
  "rating": 4.8,
  "totalSales": 127,
  "createdAt": "2026-04-19T12:00:00Z",
  "updatedAt": "2026-04-19T12:00:00Z"
}
```

---

## Collection: `listings`

Seafood marketplace listings with real-time inventory.

### Document ID Format
- `{region}-{sequence}` (e.g., `listing-001`, `bodega-004`, `sf-001`, `sea-001`)

### Schema

```typescript
interface Listing {
  // Identity
  id: string;                     // Document ID
  sellerId: string;               // Reference to users/{sellerId}
  sellerName: string;             // Denormalized seller display name

  // Product Info
  species: string;                // Common name (e.g., "Chinook Salmon")
  grade: 'A' | 'B';               // Quality grade (sushi stored as 'A')
  title: string;                  // Marketing title
  description?: string;           // Detailed description

  // Pricing
  pricePerUnit: number;           // Price per unit (USD)
  unit: string;                   // Unit of sale: "lbs", "each", "crabs", etc.

  // Inventory
  quantity: number;               // Total quantity available

  // Freshness Tracking
  freshnessDate: Timestamp;       // When caught/harvested
  expiresAt: Timestamp;           // When listing expires (shelf life end)

  // Location
  location: {
    address: string;              // Human-readable address
    latitude: number;             // For map display
    longitude: number;            // For distance calculations
  };

  // Delivery
  deliveryAvailable: boolean;     // Delivery option available
  deliveryFee?: number;           // Delivery charge (USD)

  // Media
  photos: string[];               // Array of image URLs

  // Sushi Certification (sushi-grade only)
  sushiCertNumber?: string;       // Certification ID
  sushiCertExpiry?: Timestamp;    // Certification expiration

  // Status
  status: 'active' | 'sold' | 'expired' | 'cancelled';

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Grade System
- **A Grade**: Premium quality, suitable for all preparations including raw (if certified)
- **B Grade**: Standard quality, cooking-grade only
- Sushi-grade listings use `grade: 'A'` with `sushiCertNumber` field

### Sample Document
```json
{
  "id": "listing-001",
  "sellerId": "vendor-pacific-catch",
  "sellerName": "Pacific Catch Seafood",
  "species": "Chinook Salmon",
  "grade": "A",
  "title": "Wild Alaskan Salmon - Sushi Grade",
  "quantity": 50,
  "unit": "lbs",
  "pricePerUnit": 28.50,
  "freshnessDate": "2026-04-19T10:00:00Z",
  "expiresAt": "2026-04-22T10:00:00Z",
  "location": {
    "address": "123 Fisherman's Wharf, San Francisco, CA",
    "latitude": 37.808,
    "longitude": -122.4177
  },
  "deliveryAvailable": true,
  "deliveryFee": 5.00,
  "photos": [
    "https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=800",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800"
  ],
  "status": "active",
  "sushiCertNumber": "SUSHI-001",
  "sushiCertExpiry": "2026-07-19T10:00:00Z",
  "createdAt": "2026-04-19T12:00:00Z",
  "updatedAt": "2026-04-19T12:00:00Z"
}
```

---

## Collection: `orders`

Purchase orders linking buyers to listings.

### Schema

```typescript
interface Order {
  id: string;                     // Document ID
  buyerId: string;                // Reference to users/{buyerId}
  sellerId: string;               // Reference to users/{sellerId}
  listingId: string;              // Reference to listings/{listingId}

  // Order Details
  quantity: number;               // Amount purchased
  unitPrice: number;              // Price at time of purchase
  totalAmount: number;            // quantity * unitPrice
  deliveryFee?: number;           // Delivery charge

  // Status Flow
  status: 'pending' | 'confirmed' | 'pickedUp' | 'completed' | 'cancelled';

  // Pickup/Delivery
  pickupCode?: string;            // QR code for verification
  pickupTime?: Timestamp;         // Scheduled pickup
  deliveryAddress?: string;       // If delivery selected

  // Payment
  paymentIntentId?: string;       // Stripe payment reference
  payoutStatus?: 'pending' | 'completed' | 'failed';

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Collection: `standingOrders`

Recurring order preferences for buyers.

### Schema

```typescript
interface StandingOrder {
  id: string;                     // Document ID
  buyerId: string;                // Reference to users/{buyerId}

  // Criteria
  species: string[];              // Desired species
  grades: ('A' | 'B')[];          // Acceptable grades
  minQuantity: number;            // Minimum order size
  maxDistance: number;            // Max miles from buyer
  maxPricePerUnit: number;        // Price ceiling

  // Location
  deliveryLocation: {
    address: string;
    latitude: number;
    longitude: number;
  };

  // Status
  isActive: boolean;              // Currently seeking matches

  // Matching
  lastMatchAt?: Timestamp;        // Last successful match
  matchCount: number;             // Total matches made

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## Collection: `reviews`

User ratings and feedback.

### Schema

```typescript
interface Review {
  id: string;                     // Document ID
  orderId: string;                // Reference to orders/{orderId}
  reviewerId: string;             // Buyer writing review
  sellerId: string;               // Vendor being reviewed

  // Review Content
  rating: number;                 // 1-5 stars
  comment?: string;               // Text feedback
  tags?: string[];                // Quick feedback tags

  // Media
  photos?: string[];              // Optional review photos

  // Response
  sellerResponse?: string;        // Vendor reply
  respondedAt?: Timestamp;

  createdAt: Timestamp;
}
```

---

## Collection: `geoIndex`

Spatial indexing for efficient geoqueries.

### Schema

```typescript
interface GeoIndex {
  id: string;                     // geohash + listingId
  geohash: string;                // 9-character geohash
  listingId: string;              // Reference to listing
  location: GeoPoint;             // Firestore GeoPoint
  expiresAt: Timestamp;           // For TTL cleanup
}
```

---

## Firestore Indexes

### Composite Indexes

```yaml
# Listings by seller + status
listings:
  - sellerId ASC
  - status ASC
  - createdAt DESC

# Active listings with expiry (main marketplace query)
listings:
  - status ASC
  - expiresAt ASC

# Orders by buyer
orders:
  - buyerId ASC
  - createdAt DESC

# Orders by seller + status
orders:
  - sellerId ASC
  - status ASC
  - createdAt DESC

# Standing orders
standingOrders:
  - buyerId ASC
  - isActive ASC

# Geo + expiry (for geo queries)
geoIndex:
  - geohash ASC
  - expiresAt ASC
```

---

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all access (development mode)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Production rules should implement:**
- Users can only write their own profile
- Vendors can only write their own listings
- Listings immutable after creation (except status)
- Orders only readable by buyer and seller

---

## Data Statistics

| Metric | Count |
|--------|-------|
| Total Users | 4 (2 vendors, 2 buyers) |
| Total Listings | 27 |
| Active Listings | 27 |
| A Grade | 24 |
| B Grade | 3 |
| Sushi Certified | 2 |
| Delivery Available | 18 |
| By Region: | |
| - Bodega Bay | 13 |
| - San Francisco | 6 |
| - Seattle | 8 |

---

## Species Inventory

| Species | Grade | Listings | Total Qty | Avg Price |
|---------|-------|----------|-----------|-----------|
| Salmon (Chinook) | A | 2 | 110 lbs | $21.25/lb |
| Salmon (Coho) | A | 1 | 65 lbs | $16.50/lb |
| Salmon (Sockeye) | A | 1 | 50 lbs | $24.00/lb |
| Tuna (Albacore) | A | 1 | 55 lbs | $19.50/lb |
| Tuna (Yellowfin) | A | 1 | 40 lbs | $45.00/lb |
| Halibut | A | 2 | 50 lbs | $29.00/lb |
| Crab (Dungeness) | A | 2 | 55 crabs | $17.00/ea |
| Crab (King) | A | 1 | 40 lbs | $52.00/lb |
| Rockfish (Vermilion) | B | 1 | 75 lbs | $8.50/lb |
| Rockfish (Canary) | A | 1 | 30 lbs | $13.00/lb |
| Lingcod | A | 1 | 35 lbs | $14.50/lb |
| Sablefish | A | 1 | 40 lbs | $22.00/lb |
| Oysters | A | 1 | 200 each | $2.50/ea |
| Spot Prawns | A | 1 | 15 lbs | $38.00/lb |
| Sea Urchin | A | 1 | 100 each | $8.00/ea |
| Geoduck | A | 1 | 30 lbs | $42.00/lb |
| Mussels | A | 1 | 150 lbs | $4.50/lb |
| Razor Clams | A | 1 | 50 lbs | $15.00/lb |
| Sand Dabs | B | 1 | 80 lbs | $6.50/lb |
| Petrale Sole | B | 1 | 60 lbs | $9.00/lb |
| Striped Bass | A | 1 | 40 lbs | $18.00/lb |
| White Sturgeon | A | 1 | 25 lbs | $35.00/lb |
| Leopard Shark | B | 1 | 45 lbs | $7.00/lb |
