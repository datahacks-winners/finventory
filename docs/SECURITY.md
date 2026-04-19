# Finventory Security Model

**Authentication, authorization, and data protection**

---

## Authentication

### Firebase Auth Configuration

**Enabled Providers:**
- Email/Password (with email verification)
- Google Sign-In
- Apple Sign-In (iOS only)
- Anonymous Auth (browse only)

### Token Lifecycle

```
Firebase ID Token
├── Issued on: Sign in / Refresh
├── Expires: 1 hour
├── Refresh: Automatic via Firebase SDK
└── Usage: API Authorization header

Custom Claims (set via Admin SDK)
├── seller: boolean (verified seller status)
├── admin: boolean (internal admin access)
└── stripe_account_id: string (for payouts)
```

### Anonymous Auth Flow

```
User opens app
       │
       ▼
Sign in anonymously
       │
       ▼
Can browse listings, view details
       │
       ▼
Try to order → Prompt: "Sign up to purchase"
       │
       ▼
Link anonymous → permanent account
       │
       ▼
Cart/preferences preserved
```

---

## Authorization

### Firestore Security Rules

```javascript
// firestore.rules
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
    
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.admin == true;
    }

    // Listings - public read, owner write
    match /listings/{listingId} {
      allow read: if true;
      allow create: if isAuthenticated() && 
                       request.resource.data.sellerId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.sellerId);
    }

    // Standing orders - owner only
    match /standingOrders/{orderId} {
      allow read: if isOwner(resource.data.buyerId);
      allow create: if isAuthenticated() && 
                       request.resource.data.buyerId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.buyerId);
    }

    // User profiles - owner only
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // FCM tokens - owner only
    match /users/{userId}/tokens/{tokenId} {
      allow read, write: if isOwner(userId);
    }
  }
}
```

### API Authorization Middleware

```typescript
// apps/api/src/plugins/auth.ts
export async function authPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'Missing token' });
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = {
        id: decoded.uid,
        email: decoded.email,
        isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
        stripeAccountId: decoded.stripe_account_id
      };
    } catch (err) {
      return reply.status(401).send({ error: 'Invalid token' });
    }
  });
}
```

### Route-Level Guards

```typescript
// Require authentication
app.get('/orders', {
  preHandler: [requireAuth]
}, handler);

// Require non-anonymous
app.post('/orders', {
  preHandler: [requireAuth, requirePermanentUser]
}, handler);

// Require ownership
app.delete('/listings/:id', {
  preHandler: [requireAuth, requireListingOwner]
}, handler);
```

---

## Data Protection

### PostgreSQL Row Level Security

```sql
-- Enable RLS on tables
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Listings: anyone can read, only seller can modify
CREATE POLICY listings_select_all ON listings
  FOR SELECT USING (true);

CREATE POLICY listings_modify_owner ON listings
  FOR ALL USING (seller_id = current_setting('app.current_user_id')::uuid);

-- Orders: buyer or seller can view
CREATE POLICY orders_select_participants ON orders
  FOR SELECT USING (
    buyer_id = current_setting('app.current_user_id')::uuid OR
    EXISTS (
      SELECT 1 FROM listings l 
      WHERE l.id = orders.listing_id 
      AND l.seller_id = current_setting('app.current_user_id')::uuid
    )
  );
```

### Sensitive Data Handling

| Data Type | Storage | Encryption | Access |
|-----------|---------|------------|--------|
| Passwords | Firebase Auth | Firebase-managed | Never stored locally |
| Phone numbers | PostgreSQL | AES-256 at rest | Owner only |
| Payment methods | Stripe | PCI-DSS compliant | Tokenized only |
| Location (precise) | PostgreSQL | N/A | Proximity only |
| Photos | Cloud Storage | HTTPS transit | Signed URLs |
| Sushi certificates | Cloud Storage | HTTPS transit | Seller + Buyer only |

### PII Minimization

**Firestore (public-facing):**
```typescript
// Only store non-sensitive data
{
  userId: "uid",           // Reference only
  displayName: "John",     // No last name
  photoURL: "...",         // Avatar only
  location: {               // Geohash, not lat/lng
    geohash: "9q8yym",
    precision: 6            // ~1.2km precision
  }
}
```

**PostgreSQL (private):**
```typescript
// Full data in relational DB
{
  id: "...",
  email: "john@example.com",
  phone: "+1-555-0123",
  location: { lat: 34.0522, lng: -118.2437 },
  stripe_customer_id: "cus_xxx"
}
```

---

## Cloud Storage Security

### Bucket Structure

```
finventory-prod.appspot.com/
├── listings/
│   ├── {listingId}/
│   │   ├── photos/
│   │   │   ├── 001.jpg
│   │   │   └── 002.jpg
│   │   └── certificates/
│   │       └── sushi_cert.pdf
│
├── users/
│   └── {userId}/
│       └── avatar.jpg
│
└── temp/
    └── {uploadId} (auto-deleted after 24h)
```

### Signed URLs

```typescript
// Generate time-limited access URLs
const [url] = await storage
  .bucket('finventory-prod')
  .file(`listings/${listingId}/photos/001.jpg`)
  .getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
```

---

## Input Validation

### Zod Schemas

```typescript
// Shared validation schemas
const ListingSchema = z.object({
  title: z.string().min(3).max(100),
  grade: z.enum(['sushi', 'a', 'b']),
  quantityKg: z.number().positive().max(10000),
  pricePerKg: z.number().positive().max(10000),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  expiryDate: z.date().min(new Date()),
  photos: z.array(z.string().uuid()).min(1).max(10),
  certificates: z.array(z.string().uuid()).optional()
}).refine(
  (data) => data.grade !== 'sushi' || (data.certificates?.length ?? 0) > 0,
  { message: 'Sushi grade requires certification' }
);
```

### SQL Injection Prevention

```typescript
// Use parameterized queries
const result = await pool.query(
  'SELECT * FROM listings WHERE grade = $1 AND price_per_kg < $2',
  [grade, maxPrice]
);

// Never: string concatenation
// WRONG: `SELECT * FROM listings WHERE grade = '${grade}'`
```

---

## Rate Limiting

### API Rate Limits

| Endpoint | Burst | Window |
|----------|-------|--------|
| Auth | 5 | 1 minute |
| Browse | 100 | 1 minute |
| Create listing | 10 | 1 hour |
| Place order | 5 | 10 minutes |
| Standing orders | 20 | 1 minute |

### Redis Implementation

```typescript
// apps/api/src/plugins/rateLimit.ts
export async function rateLimitPlugin(app: FastifyInstance) {
  app.addHook('onRequest', async (req, reply) => {
    const key = `rate:${req.user?.id ?? req.ip}:${req.routeOptions.url}`;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, 60); // 1 minute window
    }
    
    if (current > limit) {
      return reply.status(429).send({
        error: 'Rate limit exceeded',
        retryAfter: await redis.ttl(key)
      });
    }
  });
}
```

---

## Audit Logging

### Events Logged

| Event | Data Logged | Retention |
|-------|-------------|-----------|
| User signup | UID, timestamp, provider | 7 years |
| Listing created | Listing ID, seller, IP | 2 years |
| Order placed | Order ID, buyer, seller, amount | 7 years |
| Pickup confirmed | Order ID, QR code hash, timestamp | 7 years |
| Failed login | Email, IP, timestamp | 90 days |
| Admin action | Admin UID, action, target | 7 years |

### Implementation

```typescript
// apps/api/src/services/audit.ts
export async function logAudit(event: AuditEvent) {
  await pool.query(
    'INSERT INTO audit_logs (event_type, user_id, details, ip_address, created_at) VALUES ($1, $2, $3, $4, NOW())',
    [event.type, event.userId, JSON.stringify(event.details), event.ip]
  );
}
```

---

## Incident Response

### Security Contact
- Email: security@finventory.app
- PGP: 0x1234ABCD (available on key servers)

### Response SLAs
| Severity | Response Time | Resolution Target |
|----------|---------------|-------------------|
| Critical | 1 hour | 4 hours |
| High | 4 hours | 24 hours |
| Medium | 24 hours | 72 hours |
| Low | 72 hours | 1 week |

### Critical Incidents
1. Data breach suspected
2. Payment fraud detected
3. Admin account compromise
4. SQL injection vulnerability found

Response:
1. Isolate affected systems
2. Notify security team
3. Assess scope
4. User notification if required by law
5. Post-incident review within 48 hours
