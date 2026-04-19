# Finventory Architecture

**System Architecture Document for the Fish Rescue App**

---

## System Overview

Finventory is a peer-to-peer seafood marketplace connecting buyers and sellers to reduce waste through rapid local sales. The system uses a hybrid architecture with Firebase for real-time features and a PostgreSQL-backed API for transactional operations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      React Native App (iOS/Android)                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │    Browse    │  │   Listings   │  │    Orders    │            │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │   │
│  │  │     Map      │  │    Camera    │  │  Standing    │            │   │
│  │  │   (Mapbox)   │  │  (VisionCam) │  │    Orders    │            │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS / gRPC
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GATEWAY LAYER                                   │
│                     (Firebase Auth + Cloud CDN)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  FIREBASE LAYER │         │    API LAYER    │         │  STORAGE LAYER  │
│                 │         │                 │         │                 │
│ ┌─────────────┐ │         │ ┌─────────────┐ │         │ ┌─────────────┐ │
│ │  Firestore  │ │         │ │   Fastify   │ │         │ │Cloud Storage│ │
│ │ (Real-time) │ │         │ │   API       │ │         │ │  (Photos)   │ │
│ └─────────────┘ │         │ └─────────────┘ │         │ └─────────────┘ │
│ ┌─────────────┐ │         │        │        │         └─────────────────┘
│ │ Firebase    │ │         │        ▼        │
│ │   Auth      │ │         │ ┌─────────────┐ │
│ └─────────────┘ │         │ │  PostgreSQL │ │
│ ┌─────────────┐ │         │ │  + PostGIS  │ │
│ │  Cloud      │ │         │ └─────────────┘ │
│ │ Functions   │ │         │        │        │
│ └─────────────┘ │         │        ▼        │
│ ┌─────────────┐ │         │ ┌─────────────┐ │
│ │     FCM     │ │         │ │    Redis    │ │
│ │  (Push)     │ │         │ │   (Cache)   │ │
│ └─────────────┘ │         │ └─────────────┘ │
└─────────────────┘         └─────────────────┘
```

---

## Service Responsibilities

### Firebase Services

| Service | Responsibility | Data Type |
|---------|----------------|-----------|
| Firestore | Real-time inventory, standing orders, user sessions | Hot/fast-changing |
| Firebase Auth | User authentication, anonymous sessions | Auth state |
| Cloud Functions | Sushi expiry cron, matching algorithm triggers | Background jobs |
| FCM | Push notifications for matches and orders | Notifications |
| Cloud Storage | Photo uploads, certificates | BLOB storage |

### API Services

| Service | Responsibility | Data Type |
|---------|----------------|-----------|
| Fastify API | Transactional operations, payments, complex queries | Business logic |
| PostgreSQL | Orders, payments, audit logs, reporting | Relational data |
| PostGIS | Geospatial indexing for proximity search | Location data |
| Redis | Session cache, rate limiting, pub/sub | Ephemeral data |

---

## Data Flow Patterns

### Real-Time Inventory (Hot Path)

```
Seller creates listing
       │
       ▼
┌──────────────┐
│  Firestore   │◄────── onSnapshot listeners (all buyers in radius)
│  Listings    │         Mobile apps auto-update
└──────────────┘
       │
       ▼
Trigger Cloud Function
       │
       ▼
Check standing orders ──► FCM Push to matching buyers
```

### Order Transaction (Transactional Path)

```
Buyer places order
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Fastify API │───►│  PostgreSQL  │───►│  Firestore   │
│  /orders     │    │  (ACID txn)  │    │  (sync status)│
└──────────────┘    └──────────────┘    └──────────────┘
       │
       ▼
Stripe payment hold
       │
       ▼
QR code generated
```

### Pickup Confirmation

```
Seller scans QR
       │
       ▼
┌──────────────┐
│  Mobile App  │───► POST /orders/:id/confirm-pickup
└──────────────┘         │
                         ▼
                  ┌──────────────┐
                  │  Fastify API │───► Verify QR + release Stripe hold
                  └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  Firestore   │───► Real-time status update
                  └──────────────┘
```

---

## Database Schema Overview

### PostgreSQL (Primary)

```
users
├── id (PK)
├── firebase_uid (unique)
├── email
├── phone
├── location (geometry)
└── created_at

listings
├── id (PK)
├── seller_id (FK)
├── title
├── description
├── grade (sushi|a|b)
├── quantity_kg
├── price_per_kg
├── location (geometry)
├── expiry_date
├── photos[]
├── certificates[] (for sushi)
├── status (active|expired|sold)
└── created_at

orders
├── id (PK)
├── buyer_id (FK)
├── listing_id (FK)
├── quantity_kg
├── total_price
├── status (pending|picked_up|cancelled)
├── qr_code
├── pickup_code
├── payment_intent_id
├── picked_up_at
└── created_at

standing_orders
├── id (PK)
├── buyer_id (FK)
├── criteria (JSONB)
│   ├── grade
│   ├── max_price
│   ├── radius_km
│   └── fish_types[]
├── is_active
└── created_at
```

### Firestore (Secondary / Real-time)

```
/users/{userId}
├── profile (denormalized from PostgreSQL)
├── preferences
└── fcm_tokens[]

/listings/{listingId}
├── sync_from_postgres (via trigger)
├── real_time_status
├── view_count
└── favorite_count

/standing_orders/{orderId}
├── buyer_id
├── criteria
├── matches[] (subcollection)
└── notification_settings
```

---

## Synchronization Strategy

### PostgreSQL → Firestore

- **Method**: PostgreSQL triggers + Cloud Functions
- **Frequency**: Real-time via trigger
- **Data**: Listing status, availability, order status updates
- **Conflict Resolution**: PostgreSQL is source of truth

### Firestore → PostgreSQL

- **Method**: Cloud Functions on Firestore writes
- **Frequency**: Event-driven
- **Data**: Analytics events, user engagement metrics
- **Conflict Resolution**: Firestore timestamp wins

---

## Scaling Considerations

### Firestore
- **Sharding**: Not needed initially (autoscales)
- **Hot documents**: Use distributed counters for high-traffic listings
- **Queries**: Composite indexes for geo + filters

### PostgreSQL
- **Partitioning**: Partition listings by status + date
- **Read replicas**: For browse queries
- **Connection pooling**: PgBouncer for API layer

### API Layer
- **Stateless**: All state in external stores
- **Horizontal scaling**: Cloud Run container instances
- **Rate limiting**: Redis-based per user/IP

---

## Security Model

### Authentication
- Firebase Auth tokens (JWT) required for all API calls
- Anonymous auth for browsing only
- Email/Google/Apple for full access

### Authorization
- Firestore Security Rules control document access
- API middleware validates user ownership
- Row-level security in PostgreSQL

### Data Protection
- TLS 1.3 for all connections
- Signed URLs for Cloud Storage (time-limited)
- No PII in Firestore (reference IDs only)
