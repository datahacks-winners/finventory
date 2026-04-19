# GitHub Actions + Cloud Functions CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update GitHub Actions workflows to deploy Cloud Functions instead of non-existent Cloud Run API, with proper testing and Firebase deployment targets.

**Architecture:** GitHub Actions CI/CD pipeline that tests, builds, and deploys Cloud Functions to Firebase projects (dev/prod) with environment-based protections.

**Tech Stack:** GitHub Actions, Firebase CLI, Firebase Cloud Functions (Node.js 20, TypeScript), Firebase deployment targets

---

## File Structure

```
.github/
├── workflows/
│   ├── staging.yml          # Modify: add Functions deployment
│   └── production.yml       # Modify: add Functions deployment
├── workflows/
│   └── README.md             # Modify: update documentation
.firebaserc                   # Modify: add deployment targets
functions/
├── package.json              # Modify: add test script
└── test/                     # Create: Functions tests (optional)
```

---

## Task 1: Update Firebase Deployment Targets

**Files:**
- Modify: `.firebaserc`

- [ ] **Step 1: Read current .firebaserc**

Run: `cat .firebaserc`
Expected: See current project alias configuration

- [ ] **Step 2: Update .firebaserc with deployment targets**

`.firebaserc`:
```json
{
  "projects": {
    "default": "finventory-dev",
    "production": "finventory-prod"
  },
  "targets": {
    "production": {
      "project": "finventory-prod"
    }
  }
}
```

- [ ] **Step 3: Verify configuration**

Run: `firebase projects:list`
Expected: Shows both `finventory-dev` and `finventory-prod` projects

- [ ] **Step 4: Commit**

```bash
git add .firebaserc
git commit -m "feat: add Firebase deployment targets for dev and prod"
```

---

## Task 2: Add Functions Test Script

**Files:**
- Modify: `functions/package.json`

- [ ] **Step 1: Read current functions package.json**

Run: `cat functions/package.json`

- [ ] **Step 2: Add test script to functions package.json**

Add to `scripts` section:
```json
"test": "jest"
```

Add to `devDependencies`:
```json
"@types/jest": "^29.5.0",
"jest": "^29.7.0"
"ts-jest": "^29.1.0"
```

- [ ] **Step 3: Create Jest configuration**

`functions/jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
}
```

- [ ] **Step 4: Install Jest dependencies**

Run: `cd functions && npm install --save-dev @types/jest jest ts-jest`

- [ ] **Step 5: Commit**

```bash
git add functions/package.json functions/jest.config.js
git commit -m "feat: add Jest testing setup for Cloud Functions"
```

---

## Task 3: Create Basic Functions Test

**Files:**
- Create: `functions/src/__tests__/config.test.ts`

- [ ] **Step 1: Create config test**

`functions/src/__tests__/config.test.ts`:
```typescript
import { db, rtdb, auth, storage } from '../config.js'

describe('Firebase Config', () => {
  test('should export db instance', () => {
    expect(db).toBeDefined()
  })

  test('should export rtdb instance', () => {
    expect(rtdb).toBeDefined()
  })

  test('should export auth instance', () => {
    expect(auth).toBeDefined()
  })

  test('should export storage instance', () => {
    expect(storage).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify setup**

Run: `cd functions && npm test`
Expected: Tests pass (4 passed)

- [ ] **Step 3: Commit**

```bash
git add functions/src/__tests__/config.test.ts
git commit -m "test: add basic Firebase config tests"
```

---

## Task 4: Update staging.yml - Add Functions Testing

**Files:**
- Modify: `.github/workflows/staging.yml`

- [ ] **Step 1: Read current staging.yml**

Run: `cat .github/workflows/staging.yml`

- [ ] **Step 2: Add Functions test step to test job**

After line 33 (Type Check step), add:
```yaml
      - name: Test Cloud Functions
        working-directory: ./functions
        run: npm test
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/staging.yml
git commit -m "feat: add Functions testing to staging workflow"
```

---

## Task 5: Update staging.yml - Add Functions Build

**Files:**
- Modify: `.github/workflows/staging.yml`

- [ ] **Step 1: Add Functions build step**

In the `build` job, after `npm run build`, add:
```yaml
      - name: Build Cloud Functions
        working-directory: ./functions
        run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/staging.yml
git commit -m "feat: add Functions build step to staging workflow"
```

---

## Task 6: Update staging.yml - Add Functions Deployment

**Files:**
- Modify: `.github/workflows/staging.yml`

- [ ] **Step 1: Add deploy-functions job**

After the `deploy-firebase` job, add:
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

      - name: Deploy Cloud Functions
        working-directory: ./functions
        run: firebase deploy --only functions --project finventory-dev
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

- [ ] **Step 2: Update notify job to include Functions**

Update `needs` array:
```yaml
needs: [deploy-firebase, deploy-functions]
```

Add to summary:
```yaml
          echo "- Functions deployed to finventory-dev" >> $GITHUB_STEP_SUMMARY
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/staging.yml
git commit -m "feat: add Cloud Functions deployment to staging workflow"
```

---

## Task 7: Update staging.yml - Add Indexes Deployment

**Files:**
- Modify: `.github/workflows/staging.yml`

- [ ] **Step 1: Add indexes deployment to deploy-firebase job**

After "Deploy Storage Rules" step, add:
```yaml
      - name: Deploy Firestore Indexes
        if: hashFiles('firestore.indexes.json') != ''
        run: firebase deploy --only firestore:indexes --project finventory-dev
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/staging.yml
git commit -m "feat: add Firestore indexes deployment to staging workflow"
```

---

## Task 8: Remove Cloud Run from staging.yml

**Files:**
- Modify: `.github/workflows/staging.yml`

- [ ] **Step 1: Remove deploy-cloud-run job**

Delete the entire `deploy-cloud-run` job (lines 80-117 approximately).

- [ ] **Step 2: Remove GCP authentication steps (if not used elsewhere)**

If no other jobs use GCP authentication, remove the GCP setup steps.

- [ ] **Step 3: Update notify job needs array**

Change from:
```yaml
needs: [deploy-firebase, deploy-cloud-run]
```

To:
```yaml
needs: [deploy-firebase, deploy-functions]
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/staging.yml
git commit -m "refactor: remove Cloud Run deployment from staging workflow"
```

---

## Task 9: Update production.yml - Add All Functions Changes

**Files:**
- Modify: `.github/workflows/production.yml`

- [ ] **Step 1: Add Functions test step**

After line 34 (Type Check), add:
```yaml
      - name: Test Cloud Functions
        working-directory: ./functions
        run: npm test
```

- [ ] **Step 2: Add Functions build step**

In `build` job, after `npm run build`, add:
```yaml
      - name: Build Cloud Functions
        working-directory: ./functions
        run: npm run build
```

- [ ] **Step 3: Add indexes deployment**

In `deploy-firebase` job, after "Deploy Storage Rules", add:
```yaml
      - name: Deploy Firestore Indexes
        if: hashFiles('firestore.indexes.json') != ''
        run: firebase deploy --only firestore:indexes --project finventory-prod
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

- [ ] **Step 4: Add deploy-functions job**

After `deploy-firebase` job, add:
```yaml
  deploy-functions:
    name: Deploy Cloud Functions
    runs-on: ubuntu-latest
    needs: [test, build]
    environment:
      name: production
      url: https://api.finventory.app
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Deploy Cloud Functions
        working-directory: ./functions
        run: firebase deploy --only functions --project finventory-prod
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

- [ ] **Step 5: Remove deploy-cloud-run job**

Delete the entire `deploy-cloud-run` job.

- [ ] **Step 6: Update notify job**

Change `needs` array and add to summary:
```yaml
needs: [deploy-firebase, deploy-functions]
```

Add:
```yaml
          echo "- Functions deployed to finventory-prod" >> $GITHUB_STEP_SUMMARY
```

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/production.yml
git commit -m "feat: add Cloud Functions deployment to production workflow, remove Cloud Run"
```

---

## Task 10: Update Workflow README

**Files:**
- Modify: `.github/workflows/README.md`

- [ ] **Step 1: Read current README**

Run: `cat .github/workflows/README.md`

- [ ] **Step 2: Update README with Functions deployment info**

Update the workflow descriptions to include Cloud Functions deployment.

Update test job description to mention Functions testing.

Remove Cloud Run deployment references.

Add new section for Functions deployment.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/README.md
git commit -m "docs: update workflow README with Cloud Functions deployment"
```

---

## Task 11: Configure Firebase Token Secret

**Files:**
- None (GitHub Actions secret configuration)

- [ ] **Step 1: Generate Firebase CI token**

Run locally: `firebase login:ci`

Expected: Outputs Firebase token

- [ ] **Step 2: Add secret to GitHub**

Go to: Repository Settings → Secrets and variables → Actions → New repository secret

Name: `FIREBASE_TOKEN`
Value: [paste token from step 1]

- [ ] **Step 3: Verify secret is set**

Check: Repository Settings → Secrets and variables → Actions
Expected: `FIREBASE_TOKEN` is listed

Note: This step is manual and does not require a commit.

---

## Task 12: Verify and Test Workflows

**Files:**
- None (verification)

- [ ] **Step 1: Create test branch**

Run: `git checkout -b test-ci-cd`

- [ ] **Step 2: Make dummy change**

Create or modify a test file:
```bash
echo "// test" >> functions/src/utils/test.ts
```

- [ ] **Step 3: Commit and push to develop**

```bash
git add functions/src/utils/test.ts
git commit -m "test: CI/CD test commit"
git push origin test-ci-cd:develop
```

- [ ] **Step 4: Verify staging workflow runs**

Go to: GitHub Actions tab
Expected: "Staging Deploy" workflow is triggered

- [ ] **Step 5: Verify Functions deployment**

Check workflow logs for "Deploy Cloud Functions" step.
Expected: Functions deploy to `finventory-dev`

- [ ] **Step 6: Clean up test branch**

```bash
git checkout main
git branch -D test-ci-cd
```

Note: If deployment fails, check the error logs and fix issues in a follow-up commit.

---

## Task 13: Production Deployment Test

**Files:**
- None (verification)

- [ ] **Step 1: Create production test branch**

Run: `git checkout -b test-prod-deploy`

- [ ] **Step 2: Make test change**

```bash
echo "// test" >> README.md
```

- [ ] **Step 3: Commit and push to main**

```bash
git add README.md
git commit -m "test: production deployment test"
git push origin test-prod-deploy:main
```

- [ ] **Step 4: Verify production workflow requires approval**

Go to: GitHub Actions tab
Expected: "Production Deploy" workflow is waiting for approval

- [ ] **Step 5: Approve and deploy**

Click: "Review deployments" → Approve
Expected: Functions deploy to `finventory-prod`

- [ ] **Step 6: Clean up test branch**

```bash
git checkout main
git branch -D test-prod-deploy
# If merge conflict:
git reset --hard HEAD~1
```

- [ ] **Step 7: Delete test commit from main**

```bash
git reset --hard HEAD~1
git push origin main --force
```

---

## Task 14: Final Verification and Documentation

**Files:**
- Create: `docs/github-actions-cicd.md`

- [ ] **Step 1: Create CI/CD documentation**

`docs/github-actions-cicd.md`:
```markdown
# GitHub Actions CI/CD

## Overview

Automated deployment pipeline for Firebase backend using GitHub Actions.

## Workflows

### Staging (develop branch)

Triggered on push to `develop` branch.

Steps:
1. **Test** - Lint, typecheck, Functions tests
2. **Build** - Build Functions
3. **Deploy Firebase** - Deploy rules, indexes
4. **Deploy Functions** - Deploy Cloud Functions to finventory-dev

### Production (main branch)

Triggered on push to `main` branch.

Steps:
1. **Test** - Lint, typecheck, Functions tests
2. **Build** - Build Functions
3. **Deploy Firebase** - Deploy rules, indexes
4. **Deploy Functions** - Deploy Cloud Functions to finventory-prod (requires approval)

## Firebase Projects

- `finventory-dev` - Development/staging
- `finventory-prod` - Production

## Secrets

- `FIREBASE_TOKEN` - Firebase CI token (run `firebase login:ci`)

## Deployment Commands

### Manual Deployment

Deploy Functions to dev:
```bash
firebase deploy --only functions --project finventory-dev
```

Deploy Functions to prod:
```bash
firebase deploy --only functions --project finventory-prod
```

Deploy all Firebase resources:
```bash
firebase deploy --project finventory-dev
```

## Troubleshooting

### Functions deployment fails
- Check Functions build: `cd functions && npm run build`
- Check logs in Firebase Console
- Verify FIREBASE_TOKEN secret is set

### Tests fail
- Run locally: `cd functions && npm test`
- Check test configuration in `jest.config.js`

### Approval required
- Production deployments require manual approval
- Go to Actions tab → Review deployments
```

- [ ] **Step 2: Run final verification**

Run: `cd functions && npm run build && npm test`
Expected: Build passes, tests pass

- [ ] **Step 3: Verify workflow files**

Run:
```bash
ls -la .github/workflows/
cat .firebaserc
```
Expected: staging.yml and production.yml updated, .firebaserc has targets

- [ ] **Step 4: Create summary commit**

```bash
git add docs/github-actions-cicd.md
git commit -m "docs: add GitHub Actions CI/CD documentation"
```

---

## Implementation Complete

All tasks completed! The GitHub Actions workflows now properly deploy Cloud Functions.

**Summary of changes:**
- Updated `.firebaserc` with deployment targets
- Added Jest testing setup for Functions
- Updated `staging.yml` to test, build, and deploy Functions
- Updated `production.yml` to test, build, and deploy Functions
- Removed Cloud Run deployment (non-existent)
- Added Firestore indexes deployment
- Added CI/CD documentation

**Next steps:**
1. Functions will auto-deploy on push to develop
2. Production deployments require manual approval
3. Monitor deployments in GitHub Actions tab
