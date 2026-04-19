# Project: Fish Rescue App (finventory)

## Overview

A peer-to-peer marketplace connecting seafood buyers and sellers to reduce waste through rapid local sales. Features proximity-based browsing, real-time inventory, and standing order automation.

---

## Tech Stack

### Mobile App
| Layer | Stack |
|-------|-------|
| Framework | React Native |
| Navigation | React Navigation |
| State | Zustand |
| Data Fetching | React Query |
| Maps | Mapbox GL |
| Camera | Vision Camera (photos), QR scanner |
| Payments | Stripe React Native SDK |

### Backend
| Layer | Stack |
|-------|-------|
| Framework | Node.js + Fastify |
| Database | PostgreSQL + PostGIS (relational), Firestore (real-time) |
| Cache | Redis |
| Real-time | Firestore onSnapshot (live inventory), FCM (push notifications) |
| Storage | Cloud Storage (photos, certificates) |
| Auth | Firebase Auth |

### Infrastructure
- **Language**: TypeScript
- **Runtime**: Node.js
- **Cloud Provider**: Google Cloud Platform (GCP)
- **Package Manager**: npm (workspaces)

---

## GCP Conventions

- Use `gcloud` CLI for deployment and management
- Services: Cloud Functions, Cloud Run, Cloud SQL, Cloud Storage, Firestore
- Infrastructure as Code: Terraform or Pulumi (to be determined)
- Authentication: ADC (Application Default Credentials) via `gcloud auth application-default login`

---

## Core API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/listings` | Browse with geo + filters |
| POST | `/listings` | Create listing (with sushi cert fields) |
| POST | `/orders` | Place order |
| POST | `/orders/:id/confirm-pickup` | QR scan confirmation |
| GET | `/standing-orders/matches` | Daily matches for standing orders |

---

## Navigation Structure

### Seller Flow
Dashboard → Listings → Scan (QR) → Profile

### Buyer Flow
Browse → Orders → Standing Orders (center) → Profile

---

## Key Screens

1. **Browse** — Map/list toggle, filter sheet, listing cards with grade badges
2. **Listing Detail** — Photo gallery, grade certification (sushi), freshness dates, quantity selector, delivery option
3. **Order Confirmation** — QR code, pickup details, add to calendar
4. **Seller Dashboard** — Active listings, pending pickups, quick stats, create button
5. **Create Listing** — 6-step flow: photos → basic info → sushi cert (conditional) → freshness → logistics → review
6. **Standing Orders** — Create criteria, match queue, history
7. **QR Scanner** — Camera + manual entry, confirm handoff

---

## Business Logic

### Grading System
- **Sushi Grade**: Highest quality, requires certification, 48-hour expiry
- **Grade A**: Premium, no certification required
- **Grade B**: Standard quality

### Matching Algorithm
Standing orders auto-match new listings → push notification to buyer

### Sushi Expiry
- 48-hour cron job auto-downgrades Sushi → Grade A

### Order Lifecycle
`Pending` → `Picked_Up` (QR scan) → payout released to seller

---

## Development Workflow

1. **Always use git worktrees for feature work** - Create isolated worktrees for any new features or branches using `EnterWorktree` or git worktree commands
2. Authenticate: `gcloud auth application-default login`
3. Start local dev: `npm run dev` (per workspace)
4. Deploy: TBD (Terraform/Pulumi + `gcloud`)

---

## Project Structure

```
finventory/
├── package.json
├── CLAUDE.md           # This file
├── packages/           # Shared packages
│   └── shared/         # Shared types, utilities
├── apps/               # Applications
│   ├── api/            # Backend API (Fastify + PostgreSQL)
│   └── mobile/         # React Native app
│       └── src/
│           └── services/ # Firebase (Firestore, FCM, Auth)
└── infra/              # Infrastructure (Terraform/Pulumi)
```

---

## Notes

- Project initialized 2026-04-18
- Using GCP + Firebase for cloud infrastructure
- Real-time inventory via Firestore onSnapshot listeners
- Push notifications via FCM for standing order matches
- Firebase Auth for authentication
