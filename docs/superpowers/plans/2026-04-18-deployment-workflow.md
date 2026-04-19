# Deployment Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up automated Firebase deployment pipeline with staging/production environments, test gates, and manual production approval.

**Architecture:** GitHub Actions workflow with three jobs (test, deploy-staging, deploy-production) triggered on push to develop/main or tags. Uses Firebase CLI for deployment, GitHub Environments for approval gates.

**Tech Stack:** GitHub Actions, Firebase CLI, Firebase Projects (finventory-dev, finventory-prod)

---

## File Structure

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | GitHub Actions workflow definition |
| `package.json` | Add test script |
| `docs/superpowers/specs/2026-04-18-deployment-workflow-setup.md` | Setup documentation |

---

## Task 1: Add Test Script to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add test script to package.json**

Edit `package.json`, add `"test"` to the `scripts` section after `"lint:fix"`:

```json
"test": "npm run lint"
```

This uses lint as a basic test pass/fail check. Add proper tests later.

- [ ] **Step 2: Verify the script works**

Run: `npm test`

Expected output: ESLint runs without errors (or shows lint issues to fix)

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add test script for deployment workflow"
```

---

## Task 2: Create GitHub Actions Workflow File

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflows directory**

Run: `mkdir -p .github/workflows`

- [ ] **Step 2: Create the deployment workflow file**

Create `.github/workflows/deploy.yml` with the following content:

```yaml
name: Deploy

on:
  push:
    branches: [main, develop]
    tags: ['v*']

permissions:
  contents: read
  id-token: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://finventory-dev.web.app
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Firebase (staging)
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions,firestore:rules,storage:rules --project finventory-dev
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

  deploy-production:
    if: startsWith(github.ref, 'refs/heads/main') || startsWith(github.ref, 'refs/tags/')
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://finventory-prod.web.app
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Firebase (production)
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions,firestore:rules,storage:rules --project finventory-prod
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

- [ ] **Step 3: Verify workflow syntax is valid**

Check that YAML is valid by looking for proper indentation and no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Actions deployment workflow"
```

---

## Task 3: Create Setup Documentation

**Files:**
- Create: `docs/superpowers/specs/2026-04-18-deployment-workflow-setup.md`

- [ ] **Step 1: Create setup documentation**

Create `docs/superpowers/specs/2026-04-18-deployment-workflow-setup.md`:

```markdown
# Deployment Workflow Setup Guide

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. GitHub CLI installed: `brew install gh` (macOS) or from [cli.github.com](https://cli.github.com)

## Step 1: Generate Firebase Token

Run the following command to authenticate and generate a CI token:

```bash
firebase login:ci
```

This will open a browser for authentication. Once complete, copy the generated token.

## Step 2: Add GitHub Secret

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `FIREBASE_TOKEN`
4. Value: Paste the token from Step 1
5. Click "Add secret"

## Step 3: Create GitHub Environments

1. Go to repository Settings → Environments
2. Click "New environment"
3. Name: `staging`
4. No protection rules needed (auto-deploy)
5. Click "Create environment"

Repeat for `production` environment, then add protection rules:
- Click "production" environment
- Under "Deployment branches", add required reviewers
- Select your username as required reviewer

## Step 4: Configure Branch Protection (Optional - Manual via UI)

1. Go to repository Settings → Branches
2. Click "Add branch protection rule"
3. Branch name pattern: `main`
4. Enable:
   - [x] Require a pull request before merging
   - [x] Require approvals (1)
   - [x] Dismiss stale reviews
   - [x] Require status checks to pass
   - [x] Require branches to be up to date
5. Status checks: Select `test`
6. Click "Create"

## Step 5: Verify Workflow

Push to `develop` branch to trigger staging deployment:

```bash
git checkout develop
git push origin develop
```

Go to Actions tab to see the workflow running.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-04-18-deployment-workflow-setup.md
git commit -m "docs: add deployment workflow setup guide"
```

---

## Task 4: Apply Branch Protection via GitHub CLI

**Files:**
- None (applies configuration via GitHub API)

- [ ] **Step 1: Apply branch protection to main branch**

Run the following command to set up branch protection:

```bash
gh api \
  repos/:owner/:repo/branches/main/protection \
  -X PUT \
  -f required_status_checks='{"strict":true,"checks":[{"context":"test"}]}' \
  -f enforce_admins=false \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  -f restrictions=null \
  -f allow_force_pushes=false \
  -f allow_deletions=false
```

Replace `:owner` and `:repo` with actual values, or let `gh` infer from current directory.

- [ ] **Step 2: Verify branch protection was applied**

Run: `gh api repos/:owner/:repo/branches/main/protection`

Expected: JSON output showing protection rules are active

- [ ] **Step 3: Document the configuration (no commit needed)**

The branch protection is now applied at GitHub level. No file changes to commit.

---

## Task 5: Push Changes and Verify

**Files:**
- None (verification steps)

- [ ] **Step 1: Push all commits to remote**

Run: `git push origin main`

- [ ] **Step 2: Create develop branch if it doesn't exist**

Run: `git checkout -b develop && git push -u origin develop`

- [ ] **Step 3: Verify workflow files are in GitHub**

Run: `gh api repos/:owner/:repo/contents/.github/workflows`

Expected: Shows `deploy.yml` is present

- [ ] **Step 4: Check that the workflow appears in Actions tab**

Go to repository Actions tab in browser. Verify "Deploy" workflow is listed.

---

## Post-Setup (Manual Steps)

These steps require manual interaction outside of git:

1. **Generate Firebase token** (if not done): `firebase login:ci`
2. **Add `FIREBASE_TOKEN` secret** in GitHub repository settings
3. **Create GitHub environments** (`staging`, `production`) with reviewers
4. **Test staging deployment**: Push to `develop` branch
5. **Test production deployment**: Push to `main` and approve in Actions UI

## Summary

After completing all tasks:
- ✅ GitHub Actions workflow created
- ✅ Test script added to package.json
- ✅ Branch protection applied to main
- ✅ Setup documentation created
- ✅ Ready for Firebase token and environment configuration
