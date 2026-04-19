# Finventory Deployment Guide

**Deployment procedures for all environments**

---

## Environments

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | https://api.finventory.app | Live user traffic |
| Staging | https://api-staging.finventory.app | Pre-release testing |
| Development | http://localhost:3000 | Local development |

---

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                    │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Cloud Run  │  │ Cloud Build │  │   Cloud     │         │
│  │  (API)      │  │  (CI/CD)    │  │   SQL       │         │
│  │  us-west1   │  │             │  │ PostgreSQL  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Firebase   │  │   Cloud     │  │   Secret    │         │
│  │  (Firestore,│  │  Functions  │  │   Manager   │         │
│  │   Auth, FCM)│  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐                         │
│  │Cloud Storage│  │   Memory    │                         │
│  │  (Photos)   │  │   Store     │                         │
│  │             │  │  (Redis)    │                         │
│  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Tools

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash

# Install Firebase CLI
npm install -g firebase-tools

# Authenticate
gcloud auth login
gcloud auth application-default login
firebase login

# Set default project
gcloud config set project finventory-prod
```

### Required Permissions

| Role | Purpose |
|------|---------|
| `roles/cloudbuild.builds.editor` | Trigger builds |
| `roles/run.admin` | Deploy Cloud Run |
| `roles/cloudsql.admin` | Manage databases |
| `roles/firebase.admin` | Manage Firebase |
| `roles/secretmanager.admin` | Access secrets |
| `roles/storage.admin` | Manage buckets |

---

## Deployment Pipeline

### CI/CD Flow

```
GitHub PR merged → main
        │
        ▼
┌───────────────┐
│  Cloud Build  │───► Run tests
│   Trigger     │───► Build container
└───────────────┘───► Push to GCR
        │
        ▼
┌───────────────┐
│  Deploy to    │───► Staging (auto)
│   Cloud Run   │───► Production (manual)
└───────────────┘
        │
        ▼
┌───────────────┐
│ Smoke Tests   │───► Health checks
│               │───► Rollback if fail
└───────────────┘
```

---

## API Deployment

### Build and Deploy

```bash
# Build container
cd apps/api
gcloud builds submit --tag gcr.io/finventory-prod/api:$VERSION

# Deploy to Cloud Run
gcloud run deploy finventory-api \
  --image gcr.io/finventory-prod/api:$VERSION \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "DATABASE_URL=db-url:latest,STRIPE_SECRET_KEY=stripe:latest"
```

### Environment Variables

| Variable | Secret? | Description |
|----------|---------|-------------|
| `NODE_ENV` | No | `production` or `staging` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `FIREBASE_PROJECT_ID` | No | Firebase project ID |
| `STRIPE_SECRET_KEY` | Yes | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `MAPBOX_ACCESS_TOKEN` | Yes | Mapbox API token |

### Secrets Management

```bash
# Add/update secret
echo -n "secret-value" | gcloud secrets versions add db-url --data-file=-

# Grant access to Cloud Run service
gcloud secrets add-iam-policy-binding db-url \
  --member="serviceAccount:finventory-api@finventory-prod.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Database Deployment

### Migration Strategy

```bash
# Run migrations before app deployment
npm run db:migrate:prod

# Or in Cloud Build step
- name: 'gcr.io/cloud-builders/npm'
  args: ['run', 'db:migrate:prod']
  env:
    - 'DATABASE_URL=${_DATABASE_URL}'
```

### Zero-Downtime Migrations

1. **Additive changes only** in production
2. **Two-phase deployments**:
   - Phase 1: Add new columns/tables (backward compatible)
   - Phase 2: Update app code to use new columns
   - Phase 3: Remove old columns (if needed)

### Database Backup

```bash
# Automated daily backups (configured in Cloud SQL)
gcloud sql backups list --instance finventory-postgres

# Manual backup before major deploy
gcloud sql backups create --instance finventory-postgres

# Restore from backup (emergency only)
gcloud sql backups restore [BACKUP_ID] --restore-instance finventory-postgres
```

---

## Firebase Deployment

### Firestore Rules

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Cloud Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:onListingCreated
```

### Storage Rules

```bash
# Deploy storage security rules
firebase deploy --only storage
```

---

## Mobile App Deployment

### iOS

```bash
cd apps/mobile

# Bump version
npm version patch

# Build release
npx react-native build-ios --configuration Release

# Upload to App Store Connect
xcrun altool --upload-app \
  --type ios \
  --file build/Finventory.ipa \
  --apiKey $APP_STORE_KEY \
  --apiIssuer $APP_STORE_ISSUER
```

### Android

```bash
cd apps/mobile

# Build release
npx react-native build-android --mode release

# Upload to Play Store
# (via Google Play Console or fastlane)
fastlane android deploy
```

### Environment-Specific Config

```typescript
// apps/mobile/src/config/index.ts
const configs = {
  development: {
    apiUrl: 'http://localhost:3000/v1',
    firebaseEmulator: true
  },
  staging: {
    apiUrl: 'https://api-staging.finventory.app/v1',
    firebaseEmulator: false
  },
  production: {
    apiUrl: 'https://api.finventory.app/v1',
    firebaseEmulator: false
  }
};
```

---

## Rollback Procedures

### API Rollback

```bash
# List revisions
gcloud run revisions list --service finventory-api

# Rollback to previous revision
gcloud run services update-traffic finventory-api \
  --to-revisions LATEST-1=100 \
  --region us-west1

# Or specific revision
gcloud run services update-traffic finventory-api \
  --to-revisions finventory-api-abc123=100
```

### Database Rollback

```bash
# Point-in-time recovery (within 7 days)
gcloud sql instances clone finventory-postgres \
  --point-in-time-retention-enabled \
  --point-in-time-timestamp "2026-04-18T10:00:00Z"
```

---

## Monitoring & Alerting

### Health Checks

```typescript
// apps/api/src/routes/health.ts
app.get('/health', async (req, reply) => {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkFirestore()
  ]);
  
  const healthy = checks.every(c => c.healthy);
  
  return reply.status(healthy ? 200 : 503).send({
    status: healthy ? 'healthy' : 'unhealthy',
    checks: Object.fromEntries(checks.map(c => [c.name, c.healthy]))
  });
});
```

### Alerts (Cloud Monitoring)

| Metric | Threshold | Notification |
|--------|-----------|--------------|
| Error rate | > 5% for 5min | PagerDuty |
| Latency p99 | > 2s for 10min | Slack |
| Database CPU | > 80% for 15min | Email |
| Disk usage | > 85% | Email |

---

## Environment Setup

### Production Checklist

Before first production deploy:

- [ ] Firebase project created and configured
- [ ] PostgreSQL instance provisioned
- [ ] Redis (Memorystore) instance created
- [ ] Cloud Run service accounts configured
- [ ] Secrets added to Secret Manager
- [ ] Stripe webhook endpoint configured
- [ ] Firestore indexes created
- [ ] Cloud Storage buckets configured
- [ ] Domain configured (DNS + SSL)
- [ ] Monitoring/alerting set up
- [ ] Database migrations run
- [ ] Smoke tests passing

### Staging Environment

Staging mirrors production:
- Same Cloud SQL configuration (smaller instance)
- Separate Firebase project
- Same container image, different env vars
- Same deployment pipeline, auto-deploy

---

## Troubleshooting

### Common Issues

**Container fails to start:**
```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=finventory-api" --limit 50

# Check service details
gcloud run services describe finventory-api --region us-west1
```

**Database connection fails:**
```bash
# Verify Cloud SQL proxy or connection string
gcloud sql instances describe finventory-postgres

# Test connection from local
gcloud sql connect finventory-postgres --user=postgres
```

**Deployment stuck:**
```bash
# Cancel build
gcloud builds cancel [BUILD_ID]

# Check build logs
gcloud builds log [BUILD_ID]
```
