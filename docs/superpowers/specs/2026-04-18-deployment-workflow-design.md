# Deployment Workflow Design

**Date:** 2026-04-18
**Status:** Approved

## Overview

Automated Firebase deployment pipeline with staging and production environments, test gates, and manual production approval via GitHub Actions.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Push to develop│────▶│  Staging Deploy │
│                 │     │  (automatic)    │
└─────────────────┘     │  finventory-dev │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Push to main    │────▶│   Run Tests     │────▶│ Manual Approval │────▶│ Production Deploy│
│ or tag v*       │     │                 │     │  (GitHub UI)    │     │  finventory-prod│
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Triggers

| Branch/Tag | Environment | Automation |
|------------|-------------|------------|
| `develop` | Staging | Automatic after tests pass |
| `main` | Production | Manual approval after tests pass |
| `v*` (tags) | Production | Manual approval after tests pass |

Feature branches do not trigger deployment.

## Deployment Artifacts

Each deployment deploys the following to the target Firebase project:
- Cloud Functions (`functions/`)
- Firestore security rules (`firestore.rules`)
- Storage security rules (`storage.rules`)

## Firebase Projects

| Environment | Project ID |
|-------------|------------|
| Staging | `finventory-dev` |
| Production | `finventory-prod` |

## GitHub Secrets

| Secret Name | Purpose | Source |
|-------------|---------|--------|
| `FIREBASE_TOKEN` | Firebase CLI authentication | `firebase login:ci` |

## GitHub Environments

Create in repository Settings → Environments:

| Environment | Protection Rules |
|-------------|------------------|
| `staging` | None (automatic deployment) |
| `production` | Required reviewers (manual approval) |

## Branch Protection

Applied to `main` branch:

| Rule | Setting |
|------|---------|
| Require PR reviews | 1 approval required |
| Dismiss stale reviews | Enabled |
| Require status checks | `test` must pass |
| Strict mode | Enabled (branches must be up-to-date) |
| Restrict pushes | Only merge commits allowed |
| Allow force pushes | Disabled |
| Allow deletions | Disabled |

## Workflow File

**Location:** `.github/workflows/deploy.yml`

**Jobs:**

1. **`test`** - Runs on all pushes, validates code before deployment
2. **`deploy-staging`** - Deploys to `finventory-dev` on `develop` branch (automatic)
3. **`deploy-production`** - Deploys to `finventory-prod` on `main` branch or tags (requires approval)

**Permissions:** `contents: read`, `id-token: write` for OIDC authentication

## Setup Steps

1. Generate Firebase token: `firebase login:ci`
2. Add `FIREBASE_TOKEN` to GitHub repository secrets
3. Create GitHub environments (`staging`, `production`)
4. Add required reviewers to `production` environment
5. Apply branch protection rules to `main` branch
6. Add test script to `package.json` if not present

## Development Workflow

1. Create feature branch from `develop`
2. Make changes and commit
3. Create PR to `develop`
4. Tests pass, PR approved
5. Merge to `develop`
6. Automatic deployment to staging
7. Verify staging environment
8. Create PR from `develop` to `main`
9. Tests pass, PR approved
10. Merge to `main`
11. Workflow runs tests, then waits for manual approval
12. Approve in GitHub Actions UI
13. Production deployment to `finventory-prod`
