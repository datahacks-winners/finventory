# GitHub Actions Workflows

## Overview

| Workflow | Trigger | Environment | Approval |
|----------|---------|-------------|----------|
| `staging.yml` | Push to `develop` | finventory-dev | Automatic |
| `production.yml` | Push to `main` or tag `v*` | finventory-prod | Manual (GitHub Environments) |

## Required Secrets

Configure these in **Settings > Secrets and variables > Actions**:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `FIREBASE_TOKEN` | Firebase CLI authentication token | Firebase rules deploy |
| `GCLOUD_AUTH_KEY` | GCP service account JSON key | Cloud Run deploy |

### Getting FIREBASE_TOKEN

```bash
firebase login:ci
```

Copy the token and add it as a GitHub secret.

### Getting GCLOUD_AUTH_KEY

1. Create a service account in GCP with roles:
   - `Cloud Run Admin`
   - `Artifact Registry Writer`
   - `Service Account User`

2. Create and download a JSON key
3. Add the entire JSON content as `GCLOUD_AUTH_KEY` secret

## Environment Protection

Production deployments require manual approval via GitHub Environments:

1. Go to **Settings > Environments > production**
2. Enable **Required reviewers** and add approvers
3. Optionally enable **Wait timer** for delayed deployments

## Workflow Jobs

### Test
- Installs dependencies
- Runs ESLint
- Type checks (non-blocking)

### Build
- Builds all workspaces
- Must pass before deployment

### Deploy Firebase Rules
- Deploys `firestore.rules` if present
- Deploys `storage.rules` if present

### Deploy Cloud Run
- Builds Docker image from `apps/api/Dockerfile`
- Pushes to Artifact Registry
- Deploys to Cloud Run
- Only runs if `apps/api/Dockerfile` exists

## Concurrency

- **Staging**: Cancels in-progress runs (latest code takes priority)
- **Production**: Queues runs (no cancellation, deploys complete in order)
