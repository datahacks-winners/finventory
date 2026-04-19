# GitHub Actions + Cloud Functions CI/CD Design

**Project:** Fish Rescue App (finventory)
**Date:** 2026-04-18
**Author:** Claude Code + Justin

---

## Overview

Add Cloud Functions deployment to existing GitHub Actions workflows. Remove non-existent Cloud Run deployment, add Functions-specific build and test steps.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  GitHub Push    │────▶│  GitHub Actions  │
│  (develop/main) │     │  CI/CD Pipeline  │
└─────────────────┘     └──────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  Test & Build│
                       └──────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
        ┌───────────────┐           ┌──────────────┐
        │ Deploy Firebase│           │  Deploy to   │
        │  (Functions,  │           │  Environment │
        │   Rules, etc) │           │   (staging/  │
        └───────────────┘           │    prod)     │
                                    └──────────────┘
```

---

## Deployment Flow

### Staging (develop branch)
1. Push to `develop` branch
2. Run tests (lint, typecheck, Functions tests)
3. Build Functions
4. Deploy to `finventory-dev` (automatic)

### Production (main branch)
1. Push to `main` branch
2. Run tests (lint, typecheck, Functions tests)
3. Build Functions
4. Manual approval required
5. Deploy to `finventory-prod`

---

## Firebase Deployment Targets

**`.firebaserc`**
```json
{
  "projects": {
    "default": "finventory-dev",
    "production": "finventory-prod"
  }
}
```

**Projects:**
- `finventory-dev` — Development/staging environment
- `finventory-prod` — Production environment

---

## Workflow Changes

### Remove
- `deploy-cloud-run` job (Cloud Run API doesn't exist)
- Cloud Run authentication and deployment steps

### Add
- `deploy-functions` job (replaces deploy-cloud-run)
- Functions-specific testing step
- Functions build step
- Firestore indexes deployment
- Firebase deployment targets

### Keep
- `test` job (lint + typecheck)
- `build` job
- `deploy-firebase` job (expanded scope)
- `notify` job (updated)
- Environment structure (staging/production)

---

## Implementation Details

### staging.yml Updates

**Add to test job:**
```yaml
- name: Test Cloud Functions
  run: cd functions && npm test
```

**Add new deploy-functions job:**
```yaml
deploy-functions:
  name: Deploy Cloud Functions
  runs-on: ubuntu-latest
  needs: [test, build]
  environment: staging
  steps:
    - uses: actions/checkout@v4
    
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'npm'
    
    - run: npm ci
    
    - name: Install Firebase CLI
      run: npm install -g firebase-tools
    
    - name: Deploy Functions
      run: firebase deploy --only functions --project finventory-dev
      env:
        FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

**Update deploy-firebase job:**
```yaml
deploy-firebase:
  name: Deploy Firebase Rules & Indexes
  runs-on: ubuntu-latest
  needs: [test, build]
  environment: staging
  steps:
    # ... existing steps ...
    
    - name: Deploy Firestore Indexes
      if: hashFiles('firestore.indexes.json') != ''
      run: firebase deploy --only firestore:indexes --project finventory-dev
      env:
        FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### production.yml Updates

Same structure as staging.yml but:
- Environment: `production`
- Project: `finventory-prod`
- Keep manual approval requirement

---

## GitHub Secrets

### Required Secrets

**Option 1: Firebase Token (Simpler)**
- `FIREBASE_TOKEN` — Firebase CLI token (run `firebase login:ci`)

**Option 2: Service Account Keys (Traditional)**
- `FIREBASE_SERVICE_ACCOUNT_FINVENTORY_DEV`
- `FIREBASE_SERVICE_ACCOUNT_FINVENTORY_PROD`

**Option 3: GitHub OIDC (Recommended)**
- No secrets needed
- Configure in Firebase Console: Project Settings → GitHub → Connect
- Federated authentication via GitHub Actions

---

## Job Structure

### staging.yml

| Job | Purpose | Needs |
|-----|---------|-------|
| `test` | Lint, typecheck, Functions tests | - |
| `build` | Build all code | test |
| `deploy-firebase` | Deploy rules, indexes | test, build |
| `deploy-functions` | Deploy Cloud Functions | test, build |
| `notify` | Deployment summary | deploy-firebase, deploy-functions |

### production.yml

Same as staging.yml but:
- `deploy-functions` and `deploy-firebase` require manual approval
- Deploys to `finventory-prod`

---

## Testing Strategy

### Unit Tests
```bash
cd functions && npm test
```

### Integration Tests (Optional)
```bash
# Start emulators in CI
firebase emulators:exec --only functions,firestore "npm test"
```

### Pre-deployment Validation
- TypeScript compilation (typecheck)
- ESLint validation
- Functions tests pass

---

## Rollback Strategy

**Git-based rollback:**
- Revert commit to previous version
- Push to trigger deployment

**Firebase Console:**
- Functions have deployment history
- Can rollback to previous versions in Console

**Deployment channels:**
```yaml
# Use for staging
args: deploy --only functions --project finventory-dev

# Use for production with channel
args: deploy --only functions --project finventory-prod --channel live
```

---

## Migration Path

Since Cloud Run API doesn't exist:
1. ✅ No migration needed
2. ✅ Remove Cloud Run deployment steps
3. ✅ Add Functions deployment
4. ✅ Keep existing rules deployment

---

## Success Criteria

- [ ] Functions deploy on push to develop (automatic)
- [ ] Functions deploy on push to main (with approval)
- [ ] Tests run before all deployments
- [ ] Firestore rules and indexes deploy correctly
- [ ] Production deployments require manual approval
- [ ] Deployment failures are visible in GitHub Actions UI

---

## Future Considerations

**Enhancements:**
- Add Firebase Hosting deployment (if web app added)
- Add Functions-specific integration tests with emulators
- Add deployment notifications (Slack, Discord)
- Add blue-green deployment strategy
- Add automated rollback on failure

**Monitoring:**
- Firebase Functions logs integration
- Error tracking (Sentry, etc.)
- Performance monitoring

---

## Notes

- Project is Firebase-first (no Cloud Run to migrate)
- Two Firebase projects: dev + prod
- GitHub environments: staging (develop), production (main)
- Functions built with TypeScript ES2022 modules
- Firebase deployment targets enable multi-project deployment
