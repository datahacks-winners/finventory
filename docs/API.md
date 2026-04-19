# Finventory API Reference

**REST API documentation for the Fish Rescue App**

---

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://api.finventory.app/v1` |
| Staging | `https://api-staging.finventory.App/v1` |
| Local | `http://localhost:3000/v1` |

---

## Authentication

All endpoints (except `/listings` GET) require Firebase Auth token:

```http
Authorization: Bearer <firebase_id_token>
```

### Token Refresh

Firebase tokens expire after 1 hour. Use the Firebase SDK to refresh:

```typescript
import { getAuth, getIdToken } from 'firebase/auth';

const auth = getAuth();
const token = await getIdToken(auth.currentUser, true);
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "quantityKg", "message": "Must be positive" }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 422 | Invalid request data |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### Listings

#### Browse Listings

```http
GET /listings?lat={lat}&lng={lng}&radius={km}&grade={grade}&page={page}
```

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| lat | number | Yes | Center latitude |
| lng | number | Yes | Center longitude |
| radius | number | No | Search radius in km (default: 50) |
| grade | string | No | Filter: `sushi`, `a`, `b` |
| minPrice | number | No | Minimum price per kg |
| maxPrice | number | No | Maximum price per kg |
| page | number | No | Pagination (default: 1) |
| limit | number | No | Results per page (default: 20, max: 50) |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "list_abc123",
      "seller": {
        "id": "user_def456",
        "name": "Ocean Fresh Seafood",
        "rating": 4.8
      },
      "title": "Fresh Salmon - Sushi Grade",
      "description": "Caught this morning, super fresh",
      "grade": "sushi",
      "quantityKg": 15.5,
      "pricePerKg": 28.00,
      "photos": ["https://storage.../photo1.jpg"],
      "certificates": ["https://storage.../cert.pdf"],
      "location": {
        "lat": 34.0522,
        "lng": -118.2437,
        "address": "Santa Monica Pier, CA"
      },
      "expiryDate": "2026-04-20T18:00:00Z",
      "distanceKm": 12.5,
      "createdAt": "2026-04-18T06:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "hasMore": true
  }
}
```

---

#### Get Listing Details

```http
GET /listings/:id
```

**Response (200 OK):** Same as single item from browse, with additional fields:

```json
{
  "sellerPhone": "+1-555-0123",
  "viewCount": 45,
  "isFavorite": false
}
```

---

#### Create Listing

```http
POST /listings
```

**Request Body:**

```json
{
  "title": "Fresh Salmon - Sushi Grade",
  "description": "Caught this morning off the coast",
  "grade": "sushi",
  "fishType": "salmon",
  "quantityKg": 15.5,
  "pricePerKg": 28.00,
  "location": {
    "lat": 34.0522,
    "lng": -118.2437,
    "address": "Santa Monica, CA"
  },
  "expiryDate": "2026-04-20T18:00:00Z",
  "photos": ["temp_upload_abc123"],
  "certificates": ["temp_cert_def456"],
  "allowDelivery": true,
  "deliveryFee": 5.00
}
```

**Validation Rules:**
- `grade: sushi` requires at least one certificate
- `expiryDate` must be within 48 hours for sushi grade
- Photos: 1-10 required
- `quantityKg` and `pricePerKg` must be positive

**Response (201 Created):**

```json
{
  "id": "list_abc123",
  "status": "active",
  "createdAt": "2026-04-18T06:00:00Z"
}
```

---

#### Update Listing

```http
PATCH /listings/:id
```

Partial update. Same validation as create.

**Response (200 OK):** Updated listing object

---

#### Delete Listing

```http
DELETE /listings/:id
```

Can only delete if no pending orders.

**Response (204 No Content)**

---

### Orders

#### Place Order

```http
POST /orders
```

**Request Body:**

```json
{
  "listingId": "list_abc123",
  "quantityKg": 5.0,
  "delivery": {
    "method": "pickup",
    "pickupTime": "2026-04-18T16:00:00Z"
  },
  "paymentMethodId": "pm_card_xxx"
}
```

**Response (201 Created):**

```json
{
  "id": "ord_xyz789",
  "status": "pending",
  "totalPrice": 140.00,
  "qrCode": "https://api.finventory.app/qr/ord_xyz789.png",
  "pickupCode": "A7B3D9",
  "seller": {
    "name": "Ocean Fresh Seafood",
    "phone": "+1-555-0123",
    "location": {
      "address": "Santa Monica Pier"
    }
  },
  "createdAt": "2026-04-18T10:00:00Z"
}
```

---

#### Get My Orders

```http
GET /orders?status={status}&role={role}&page={page}
```

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| status | string | `pending`, `picked_up`, `cancelled` |
| role | string | `buyer` or `seller` |
| page | number | Pagination |

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "ord_xyz789",
      "listing": {
        "title": "Fresh Salmon",
        "grade": "sushi",
        "photo": "https://storage.../thumb.jpg"
      },
      "quantityKg": 5.0,
      "totalPrice": 140.00,
      "status": "pending",
      "qrCode": "https://api.finventory.app/qr/ord_xyz789.png",
      "pickupCode": "A7B3D9",
      "createdAt": "2026-04-18T10:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

#### Confirm Pickup (QR Scan)

```http
POST /orders/:id/confirm-pickup
```

**Request Body:**

```json
{
  "pickupCode": "A7B3D9"
}
```

**Response (200 OK):**

```json
{
  "id": "ord_xyz789",
  "status": "picked_up",
  "pickedUpAt": "2026-04-18T16:30:00Z",
  "payoutReleased": true
}
```

---

#### Cancel Order

```http
POST /orders/:id/cancel
```

Can only cancel if status is `pending`.

**Response (200 OK):**

```json
{
  "id": "ord_xyz789",
  "status": "cancelled",
  "refundAmount": 140.00
}
```

---

### Standing Orders

#### Create Standing Order

```http
POST /standing-orders
```

**Request Body:**

```json
{
  "name": "Weekly Salmon Order",
  "criteria": {
    "fishTypes": ["salmon", "tuna"],
    "grades": ["sushi", "a"],
    "maxPricePerKg": 30.00,
    "radiusKm": 25,
    "minQuantityKg": 5
  },
  "notifications": {
    "push": true,
    "email": false
  },
  "isActive": true
}
```

**Response (201 Created):**

```json
{
  "id": "so_ghi012",
  "name": "Weekly Salmon Order",
  "criteria": { ... },
  "matchCount": 0,
  "createdAt": "2026-04-18T10:00:00Z"
}
```

---

#### Get Standing Orders

```http
GET /standing-orders
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "so_ghi012",
      "name": "Weekly Salmon Order",
      "criteria": { ... },
      "matchCount": 3,
      "unseenMatches": 1,
      "isActive": true
    }
  ]
}
```

---

#### Get Matches for Standing Order

```http
GET /standing-orders/:id/matches
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "match_jkl345",
      "listing": {
        "id": "list_mno678",
        "title": "Fresh Tuna - Grade A",
        "pricePerKg": 25.00,
        "location": { ... },
        "distanceKm": 8.5
      },
      "matchedAt": "2026-04-18T12:00:00Z",
      "seen": false
    }
  ]
}
```

---

#### Delete Standing Order

```http
DELETE /standing-orders/:id
```

**Response (204 No Content)**

---

### Uploads

#### Get Upload URL

```http
POST /uploads
```

**Request Body:**

```json
{
  "fileName": "salmon_photo.jpg",
  "contentType": "image/jpeg",
  "type": "listing_photo"
}
```

**Response (200 OK):**

```json
{
  "uploadUrl": "https://storage.googleapis.com/...",
  "publicUrl": "https://storage.finventory.app/listings/...",
  "expiresAt": "2026-04-18T10:15:00Z"
}
```

Upload file directly to `uploadUrl` via PUT request.

---

### User Profile

#### Get Current User

```http
GET /me
```

**Response (200 OK):**

```json
{
  "id": "user_def456",
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1-555-0123",
  "location": {
    "lat": 34.0522,
    "lng": -118.2437,
    "address": "Los Angeles, CA"
  },
  "isSeller": true,
  "sellerRating": 4.8,
  "totalSales": 47,
  "createdAt": "2026-01-15T00:00:00Z"
}
```

---

#### Update Profile

```http
PATCH /me
```

**Request Body:**

```json
{
  "name": "John Doe",
  "phone": "+1-555-0199",
  "location": {
    "lat": 34.0522,
    "lng": -118.2437,
    "address": "Santa Monica, CA"
  }
}
```

---

#### Get Favorites

```http
GET /me/favorites
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "listingId": "list_abc123",
      "title": "Fresh Salmon",
      "addedAt": "2026-04-18T08:00:00Z"
    }
  ]
}
```

---

#### Add Favorite

```http
POST /me/favorites
```

**Request Body:**

```json
{
  "listingId": "list_abc123"
}
```

---

#### Remove Favorite

```http
DELETE /me/favorites/:listingId
```

---

## Webhooks

### Stripe Webhooks

```http
POST /webhooks/stripe
```

Stripe sends events:
- `payment_intent.succeeded` → Mark order as paid
- `payment_intent.payment_failed` → Cancel order

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| All authenticated | 100/minute |
| Browse listings | 200/minute |
| Create listing | 10/minute |
| Place order | 5/minute |

Headers included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1713456000
```
