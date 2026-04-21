# GitHub Actions CI/CD Documentation

**Complete guide to Finventory's automated deployment pipeline using GitHub Actions**

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Workflow Configuration](#workflow-configuration)
- [Deployment Process](#deployment-process)
- [Verification & Testing](#verification--testing)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

---

## Overview

Finventory uses GitHub Actions for continuous integration and deployment, automating the pipeline from code commit to production deployment. The system deploys Firebase Cloud Functions to staging and production environments.

### Key Features

- **Automated Testing**: All pushes trigger linting, type checking, and function tests
- **Multi-Environment**: Separate staging (auto-deploy) and production (manual approval)
- **Firebase Deployment**: Automated deployment of Cloud Functions, Firestore rules, and indexes
- **Zero-Downtime**: Functions deploy without service interruption
- **Security**: Uses GitHub secrets for authentication, manual approval for production

---

## Architecture

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Repository                          │
│                                                                   │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │ Push to        │         │ Push to        │                  │
│  │ develop        │         │ main           │                  │
│  └────────┬───────┘         └────────┬───────┘                  │
│           │                          │                          │
│           ▼                          ▼                          │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │ Staging Workflow│        │ Production     │                  │
│  │ (automatic)    │         │ Workflow       │                  │
│  └────────┬───────┘         │ (manual        │                  │
│           │                 │  approval)     │                  │
│           │                 └────────┬───────┘                  │
│           │                          │                          │
│           ▼                          ▼                          │
│  ┌──────────────────────────────────────────────┐              │
│  │         CI/CD Pipeline Steps                  │              │
│  │  1. Install & Test                            │              │
│  │  2. Build Functions                           │              │
│  │  3. Deploy Firebase Rules & Indexes           │              │
│  │  4. Deploy Cloud Functions                    │              │
│  └──────────────────────────────────────────────┘              │
│           │                          │                          │
│           ▼                          ▼                          │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │ finventory-dev │         │ finventory-    │                  │
│  │ (staging)      │         │ prod           │                  │
│  └────────────────┘         └────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### Environments

| Environment | Branch | Firebase Project | Deployment | URL |
|-------------|--------|------------------|------------|-----|
| Staging | `develop` | finventory-dev | Automatic | https://us-central1-finventory-dev.cloudfunctions.net |
| Production | `main` | finventory-prod | Manual Approval | https://us-central1-finventory-prod.cloudfunctions.net |

---

## Prerequisites

### 1. GitHub Secrets Configuration

Navigate to **Settings > Secrets and variables > Actions** in your GitHub repository and configure:

#### GCLOUD_AUTH_KEY

Required for Firebase rules and indexes deployment.

**Creation Steps:**
```bash
# 1. Create service account in GCP Console
# 2. Grant roles:
#    - Firebase Rules Admin
#    - Firebase Management Agent
#    - Cloud Functions Developer

# 3. Create and download JSON key
gcloud iam service-accounts keys create gcloud-key.json \
  --iam-account=github-actions@finventory-prod.iam.gserviceaccount.com

# 4. Copy entire JSON content to GitHub secret
cat gcloud-key.json
```

**Add to GitHub:** Paste entire JSON as `GCLOUD_AUTH_KEY`

#### FIREBASE_TOKEN

Required for Cloud Functions deployment.

**Creation Steps:**
```bash
# 1. Run Firebase login
firebase login:ci

# 2. Complete OAuth in browser
# 3. Copy the generated token
# Token format: 1//0xxxxxxxxxxxxxxxxxxxxx
```

**Add to GitHub:** Paste token as `FIREBASE_TOKEN`

**Token Refresh:** Firebase tokens expire periodically. Re-run `firebase login:ci` and update the secret.

### 2. GitHub Environments

Configure environments for deployment control:

#### Staging Environment

Go to **Settings > Environments > New environment**:
- Name: `staging`
- No protection rules needed (auto-deploy)

#### Production Environment

Go to **Settings > Environments > New environment**:
- Name: `production`
- **Required reviewers**: Add your team
- **Wait timer**: Optional (e.g., 5 minutes)
- Deployment branches: Restrict to `main`

### 3. Firebase Projects

Ensure both projects are configured:

| Project | ID | Purpose |
|---------|----|---------|
| Staging | finventory-dev | Development & testing |
| Production | finventory-prod | Live user traffic |

---

## Workflow Configuration

### Staging Workflow (`.github/workflows/staging.yml`)

**Trigger:** Push to `develop` branch

**Concurrency:** Cancels in-progress runs (latest code wins)

**Jobs:**

1. **Test**
   - Install dependencies
   - Run ESLint
   - Type check (non-blocking)
   - Test Cloud Functions

2. **Build**
   - Build all workspaces
   - Build Cloud Functions

3. **Deploy Firebase Rules**
   - Deploy `firestore.rules` (if present)
   - Deploy `storage.rules` (if present)
   - Deploy `firestore.indexes.json` (if present)
   - Uses GCLOUD_AUTH_KEY

4. **Deploy Cloud Functions**
   - Build functions from `functions/` directory
   - Deploy all functions to finventory-dev
   - Uses FIREBASE_TOKEN

5. **Notify**
   - Post deployment summary
   - Report status to GitHub Actions UI

### Production Workflow (`.github/workflows/production.yml`)

**Trigger:** Push to `main` branch or version tags (`v*`)

**Concurrency:** Queues runs (no cancellation)

**Jobs:** Same as staging, but:
- All deploy jobs require manual approval
- Deploys to finventory-prod
- Requires approval before deployment proceeds

### Workflow File Examples

**Key Configuration:**
```yaml
env:
  NODE_VERSION: '20'
  GCP_REGION: us-central1

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  deploy-functions:
    needs: [test, build]
    environment: production
    steps:
      - name: Deploy Cloud Functions
        run: firebase deploy --only functions --project finventory-prod
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

---

## Deployment Process

### Staging Deployment (Automatic)

1. **Developer** pushes to `develop` branch
2. **GitHub Actions** triggers staging workflow
3. **Test job** runs:
   ```bash
   npm ci
   npm run lint
   npm test  # Functions tests
   ```
4. **Build job** compiles code
5. **Deploy jobs** run in parallel:
   - Deploy Firebase rules (GCLOUD_AUTH_KEY)
   - Deploy Cloud Functions (FIREBASE_TOKEN)
6. **Notification** posts results

**Total time:** ~3-5 minutes

### Production Deployment (Manual Approval)

1. **Developer** creates PR from `develop` to `main`
2. **Team reviews** and merges PR
3. **GitHub Actions** triggers production workflow
4. **Test and build** jobs run automatically
5. **Approval required:**
   - Go to **Actions** tab
   - Click on the running workflow
   - Review the deployment
   - Click **"Approve and deploy"**
6. **Deploy jobs** proceed after approval
7. **Functions deploy** to production

**Total time:** ~5-10 minutes (including approval)

### Deployment Verification

After deployment, verify:

```bash
# Check function status
firebase functions:list --project finventory-prod

# View function logs
firebase functions:log --project finventory-prod

# Test specific function
curl https://us-central1-finventory-prod.cloudfunctions.net/apiHealth
```

---

## Verification & Testing

### Pre-Deployment Verification

Before deploying, ensure:

- [ ] All tests pass locally (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Functions build successfully (`cd functions && npm run build`)
- [ ] Firebase rules are valid (`firebase deploy --only firestore:rules --debug`)

### Staging Testing Procedure

1. **Create test branch:**
   ```bash
   git checkout -b test-ci-cd
   ```

2. **Make dummy change:**
   ```bash
   echo "# Test CI/CD" >> README.md
   git add README.md
   git commit -m "test: verify staging deployment"
   ```

3. **Push to develop:**
   ```bash
   git push origin test-ci-cd:develop
   ```

4. **Monitor workflow:**
   - Go to **Actions** tab in GitHub
   - Click on the running workflow
   - Verify all jobs pass

5. **Verify deployment:**
   ```bash
   firebase functions:log --project finventory-dev
   ```

6. **Clean up:**
   ```bash
   git checkout develop
   git reset --hard HEAD~1
   git push origin develop --force
   git branch -D test-ci-cd
   ```

### Production Testing Procedure

**WARNING:** Only perform during maintenance windows or low-traffic periods.

1. **Create test branch:**
   ```bash
   git checkout -b test-prod-deploy
   ```

2. **Make test change:**
   ```bash
   echo "# Test Prod Deploy" >> README.md
   git add README.md
   git commit -m "test: verify production deployment"
   ```

3. **Create PR to main:**
   ```bash
   git push origin test-prod-deploy
   # Create PR via GitHub UI
   ```

4. **Merge PR:**
   - Merge via GitHub UI
   - Wait for workflow to trigger

5. **Review and approve:**
   - Go to **Actions** tab
   - Review pending deployment
   - Approve when ready

6. **Verify deployment:**
   ```bash
   firebase functions:log --project finventory-prod
   ```

7. **Revert if needed:**
   ```bash
   git checkout main
   git revert HEAD
   git push origin main
   # Wait for production deployment
   ```

---

## Troubleshooting

### Common Issues

#### 1. Firebase Token Expired

**Symptom:** Deployment fails with authentication error

**Solution:**
```bash
# Refresh token
firebase login:ci

# Update GitHub secret
# Settings > Secrets > FIREBASE_TOKEN > Update
```

#### 2. Functions Build Failure

**Symptom:** Build step fails with compilation errors

**Solution:**
```bash
# Test build locally
cd functions
npm run build

# Fix errors, commit, push
```

#### 3. Rules Deployment Failed

**Symptom:** Firestore rules deployment fails

**Solution:**
```bash
# Test rules locally
firebase deploy --only firestore:rules --debug

# Check for syntax errors
# Fix and commit
```

#### 4. Tests Fail in CI

**Symptom:** Tests pass locally but fail in GitHub Actions

**Solution:**
```bash
# Check Node version mismatch
node --version  # Should be 20

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for environment-specific issues
# (e.g., missing env vars in test setup)
```

#### 5. Deployment Timeout

**Symptom:** Functions deployment hangs or times out

**Solution:**
```bash
# Check Firebase project status
firebase projects:list

# Verify network connectivity
# Check GCP status page

# Retry deployment
# GitHub Actions will auto-retry on failure
```

### Getting Help

1. **Check workflow logs:**
   - Go to **Actions** tab
   - Click on failed workflow run
   - Expand failed job for detailed logs

2. **Check Firebase console:**
   - Functions logs
   - Deployment history
   - Error messages

3. **Check GCP logs:**
   ```bash
   gcloud logging read "resource.type=cloud_function" --limit 50
   ```

---

## Maintenance

### Regular Tasks

#### Monthly

- [ ] Refresh FIREBASE_TOKEN (expires periodically)
- [ ] Review workflow logs for errors
- [ ] Update dependencies (`npm update`)
- [ ] Check for GitHub Actions updates

#### Quarterly

- [ ] Review and update workflow files
- [ ] Audit secrets access
- [ ] Review deployment costs
- [ ] Update Node version if needed

### Updating Dependencies

**To update Node version:**

1. Update in workflow files:
   ```yaml
   env:
     NODE_VERSION: '22'  # Update from 20
   ```

2. Update functions package.json:
   ```json
   {
     "engines": {
       "node": "22"
     }
   }
   ```

3. Test in staging first:
   ```bash
   git checkout -b update-node
   # Make changes
   git push origin update-node:develop
   # Verify staging deployment
   ```

### Monitoring Costs

Cloud Functions costs scale with usage. Monitor:

```bash
# Check function metrics
gcloud functions list --project finventory-prod

# View billing
gcloud billing accounts list
```

**Cost Optimization:**
- Set max instances for functions
- Use memory-efficient configurations
- Monitor and optimize cold starts
- Review function execution times

---

## Best Practices

### Development Workflow

1. **Feature branches:** Create from `develop`
2. **Test early:** Run tests locally before pushing
3. **Small commits:** Easier to debug and revert
4. **Code review:** All PRs reviewed before merge
5. **Staging first:** Always test in staging before production

### Deployment Safety

1. **Never push directly to `main`**: Always use PRs
2. **Test in staging**: Verify before production
3. **Use version tags**: Tag releases for easy rollback
4. **Monitor deployments**: Watch for errors after deploy
5. **Have rollback plan**: Know how to revert quickly

### Security

1. **Rotate tokens regularly**: Refresh FIREBASE_TOKEN monthly
2. **Limit secret access**: Only necessary team members
3. **Review audit logs**: Check GitHub Actions audit log
4. **Use branch protection**: Require PR reviews for `main`
5. **Enable 2FA**: Required for all deployers

---

## Quick Reference

### Common Commands

```bash
# Trigger staging deployment
git push origin develop

# Trigger production deployment
git push origin main

# View workflow runs
gh run list

# View specific run
gh run view [run-id]

# Re-run failed workflow
gh run rerun [run-id]

# Cancel running workflow
gh run cancel [run-id]

# Approve production deployment
# (Via GitHub UI: Actions > Run > Review deployments)
```

### Environment URLs

| Environment | Base URL | Example |
|-------------|----------|---------|
| Staging | https://us-central1-finventory-dev.cloudfunctions.net | /apiHealth |
| Production | https://us-central1-finventory-prod.cloudfunctions.net | /apiHealth |

### Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firebase Deployment Guide](https://firebase.google.com/docs/deploy)

---

## Appendix: Complete Workflow Files

See `.github/workflows/staging.yml` and `.github/workflows/production.yml` for complete workflow configurations.

For workflow-specific documentation, see [`.github/workflows/README.md`](../.github/workflows/README.md).

---

**Last Updated:** 2026-04-18
**Maintained By:** Finventory DevOps Team
