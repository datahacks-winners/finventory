# Finventory Development Guide

**Local development setup, conventions, and workflows**

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x | Runtime |
| npm | 10.x | Package manager |
| Docker | Latest | PostgreSQL, Redis locally |
| gcloud CLI | Latest | GCP authentication |
| Firebase CLI | Latest | Emulators, deployment |

---

## Initial Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd finventory
npm install
```

### 2. GCP Authentication

```bash
# Login to Google Cloud
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project finventory-prod
```

### 3. Environment Configuration

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Required environment variables:

```env
# Firebase
FIREBASE_PROJECT_ID=finventory-prod
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=finventory-prod.firebaseapp.com
FIREBASE_STORAGE_BUCKET=finventory-prod.appspot.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/finventory
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Mapbox
MAPBOX_ACCESS_TOKEN=pk.xxx
```

### 4. Start Local Infrastructure

```bash
# Start PostgreSQL + Redis
docker-compose up -d

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### 5. Start Development Servers

```bash
# Terminal 1: API
cd apps/api
npm run dev

# Terminal 2: Mobile (requires React Native setup)
cd apps/mobile
npm run ios     # or npm run android

# Terminal 3: Firebase emulators (optional)
firebase emulators:start
```

---

## Project Structure

```
finventory/
├── apps/
│   ├── api/              # Fastify backend API
│   │   ├── src/
│   │   │   ├── routes/   # API route handlers
│   │   │   ├── models/   # Database models
│   │   │   ├── services/ # Business logic
│   │   │   └── plugins/  # Fastify plugins
│   │   └── package.json
│   │
│   └── mobile/           # React Native app
│       ├── src/
│       │   ├── screens/  # Screen components
│       │   ├── components/ # Reusable UI
│       │   ├── services/   # API clients
│       │   ├── hooks/      # Custom hooks
│       │   └── stores/     # Zustand stores
│       └── package.json
│
├── packages/
│   └── shared/           # Shared types, utilities
│       ├── src/
│       │   ├── types/    # TypeScript types
│       │   └── utils/    # Shared utilities
│       └── package.json
│
├── infra/                # Infrastructure code
│   ├── terraform/        # Terraform configs
│   └── firebase/         # Firestore rules, indexes
│
└── docs/                 # Documentation
    ├── ARCHITECTURE.md
    ├── DEVELOPMENT.md
    └── API.md
```

---

## Git Workflow

### Branch Naming

```
feature/listing-creation
bugfix/qr-scan-failure
hotfix/payment-webhook
refactor/api-structure
```

### Commit Conventions

```
feat: add sushi grade certification upload
fix: resolve QR scan crash on Android
refactor: extract listing service from routes
docs: update API authentication guide
test: add unit tests for order service
```

### Feature Development with Worktrees

```bash
# Create isolated worktree for feature
git worktree add ../finventory-feature-listing feature/listing-creation
cd ../finventory-feature-listing

# Work on feature...

# Return to main and merge
cd ../finventory
git merge feature/listing-creation
git worktree remove ../finventory-feature-listing
```

---

## Code Conventions

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` with type guards)
- Explicit return types on public functions
- Interface over type for object shapes

### API Routes

```typescript
// apps/api/src/routes/listings.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const CreateListingSchema = z.object({
  title: z.string().min(3).max(100),
  grade: z.enum(['sushi', 'a', 'b']),
  quantityKg: z.number().positive(),
  pricePerKg: z.number().positive(),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  })
});

export default async function listingRoutes(app: FastifyInstance) {
  app.post('/', {
    schema: {
      body: CreateListingSchema
    },
    handler: async (req, reply) => {
      const listing = await listingService.create(req.user.id, req.body);
      return reply.status(201).send(listing);
    }
  });
}
```

### Mobile Components

```typescript
// apps/mobile/src/components/ListingCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Listing } from '@finventory/shared';

interface ListingCardProps {
  listing: Listing;
  onPress: (id: string) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(listing.id)}>
      <View className="bg-white rounded-lg shadow p-4">
        <Image source={{ uri: listing.photos[0] }} className="h-40 rounded" />
        <Text className="text-lg font-bold">{listing.title}</Text>
        <GradeBadge grade={listing.grade} />
        <Text className="text-green-600">${listing.pricePerKg}/kg</Text>
      </View>
    </TouchableOpacity>
  );
};
```

---

## Testing

### Unit Tests

```bash
npm run test:unit
```

```typescript
// packages/shared/src/utils/grade.test.ts
import { calculateGrade } from './grade';

describe('calculateGrade', () => {
  it('returns sushi for certified fresh fish', () => {
    const result = calculateGrade({
      certified: true,
      hoursSinceCatch: 12,
      temperature: 2
    });
    expect(result).toBe('sushi');
  });
});
```

### Integration Tests

```bash
npm run test:integration
```

Requires local PostgreSQL + Redis running.

### E2E Tests

```bash
cd apps/mobile
npm run test:e2e:ios
```

Uses Detox for mobile E2E testing.

---

## Database Migrations

```bash
# Create migration
npm run db:migrate:create -- name:add_listing_status

# Run migrations
npm run db:migrate:up

# Rollback
npm run db:migrate:down

# Generate types from schema
npm run db:types
```

---

## Debugging

### API Debugging

```bash
# Start with debug logging
DEBUG=fastify:* npm run dev

# Or use Node inspector
node --inspect-brk apps/api/dist/index.js
```

### Mobile Debugging

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android

# Flipper (React Native debugger)
npx flipper
```

### Firebase Debugging

```bash
# View emulator logs
firebase emulators:start --debug

# Check Firestore rules
firebase firestore:rules:playground
```

---

## Common Issues

### PostgreSQL Connection Refused

```bash
# Check if container is running
docker ps

# Restart containers
docker-compose restart

# View logs
docker-compose logs postgres
```

### Firebase Auth Emulator Not Working

Ensure `.env.local` points to emulator:

```env
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIRESTORE_EMULATOR_HOST=localhost:8080
```

### Metro Bundler Cache Issues

```bash
cd apps/mobile
npx react-native start --reset-cache
```

---

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint across all packages |
| `npm run lint:fix` | Auto-fix ESLint errors |
| `npm run typecheck` | TypeScript type checking |
| `npm run build` | Build all packages |
| `npm run dev` | Start all dev servers |
| `npm run db:studio` | Open Prisma Studio |
| `firebase deploy` | Deploy to Firebase |
