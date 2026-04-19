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
| Database | Firestore (primary data store) |
| Real-time | Firestore onSnapshot (live inventory) |
| Storage | Cloud Storage (photos, certificates) |
| Auth | Firebase Auth |
| Functions | Cloud Functions (business logic, cron jobs) |
| Push | FCM (Firebase Cloud Messaging) |

### Infrastructure
- **Language**: TypeScript
- **Runtime**: Node.js
- **Cloud Provider**: Google Cloud Platform (GCP)
- **Package Manager**: npm (workspaces)

---

## GCP/Firebase Conventions

- Use `gcloud` CLI for deployment and management
- Services: Cloud Functions (1st gen with Node.js), Firestore, Cloud Storage, FCM
- Firebase CLI: `firebase deploy` for Firestore rules, Storage rules
- Local emulation: `firebase emulators:start`
- Authentication: ADC via `gcloud auth application-default login`

---

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `listings` | Marketplace listings |
| `users` | User profiles + seller stats |
| `orders` | Order records |
| `standingOrders` | Buyer standing order criteria |
| `messages` | In-app messaging (optional) |

## Cloud Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `createListing` | Callable | Validate & create listing with timestamps |
| `autoDowngradeSushi` | Scheduled (cron) | 48hr sushi → Grade A |
| `matchStandingOrders` | Scheduled | Find matches, send FCM |
| `confirmPickup` | Callable | QR scan verification, update status |
| `stripeWebhook` | HTTP | Handle payment webhooks |

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
Cloud Function `matchStandingOrders` runs on schedule, queries new listings, matches against standing order criteria, sends FCM to buyers

### Sushi Expiry
- Scheduled Cloud Function `autoDowngradeSushi` runs every hour
- Finds listings where `grade === 'sushi'` && `createdAt < 48hrs ago`
- Updates `grade` to `gradeA`

### Order Lifecycle
`pending` → `pickedUp` (QR scan via Cloud Function) → Stripe payout to seller

---

## Development Workflow

1. **Always use git worktrees for feature work** - Create isolated worktrees for any new features or branches using `EnterWorktree` or git worktree commands
2. Authenticate: `gcloud auth application-default login` + `firebase login`
3. Start emulators: `firebase emulators:start`
4. Deploy functions: `firebase deploy --only functions`
5. Deploy rules: `firebase deploy --only firestore:rules,storage:rules`

---

## Project Structure

```
finventory/
├── package.json
├── CLAUDE.md           # This file - high-level overview
├── firebase.json       # Firebase config
├── firestore.rules     # Firestore security rules
├── storage.rules       # Cloud Storage security rules
├── docs/               # Comprehensive documentation
│   ├── README.md       # Documentation index
│   ├── ARCHITECTURE.md # System architecture, data flow
│   ├── DEVELOPMENT.md  # Local dev setup, conventions
│   ├── API.md          # REST API reference
│   ├── MOBILE.md       # React Native app guide
│   ├── SECURITY.md     # Auth, security model
│   ├── DEPLOYMENT.md   # Deploy procedures
│   └── superpowers/    # AI-generated implementation plans
│       ├── plans/
│       └── specs/
├── packages/           # Shared packages
│   └── shared/         # Shared types, utilities
├── apps/               # Applications
│   └── mobile/         # React Native app
│       └── src/
│           ├── services/    # Firebase (Firestore, FCM, Auth)
│           ├── screens/     # React Navigation screens
│           └── components/  # UI components
└── functions/          # Cloud Functions
    ├── src/
    │   ├── index.ts        # Main entry
    │   ├── createListing.ts
    │   ├── autoDowngradeSushi.ts
    │   ├── matchStandingOrders.ts
    │   ├── confirmPickup.ts
    │   └── stripeWebhook.ts
    └── package.json
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture, data flow, scaling strategy |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Local development setup, coding conventions |
| [docs/API.md](./docs/API.md) | Complete REST API reference |
| [docs/MOBILE.md](./docs/MOBILE.md) | Mobile app structure, navigation, components |
| [docs/SECURITY.md](./docs/SECURITY.md) | Authentication, authorization, data protection |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | GCP deployment, CI/CD, infrastructure |

---

## Notes

- Project initialized 2026-04-18
- **Firestore-first architecture** — no custom REST API needed
- Real-time inventory via Firestore onSnapshot listeners
- Push notifications via FCM for standing order matches
- Firebase Auth + Security Rules for data protection
- Cloud Functions for complex business logic (cron, webhooks)
