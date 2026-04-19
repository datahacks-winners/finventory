# GitHub Actions Workflows

## Overview

| Workflow | Trigger | Environment | Approval |
|----------|---------|-------------|----------|
| `staging.yml` | Push to `develop` | finventory-dev | Automatic |
| `production.yml` | Tag `v*` | finventory-prod | Manual (GitHub Environments) |

## Required Secrets

Configure this in **Settings > Secrets and variables > Actions**:

| Secret | Description | Required For |
|--------|-------------|--------------|
| `GCLOUD_AUTH_KEY` | GCP service account JSON key | Firebase rules & indexes deploy |
| `FIREBASE_TOKEN` | Firebase CI token | Cloud Functions deploy |

### Getting GCLOUD_AUTH_KEY

1. Create a service account in GCP with roles:
   - `Firebase Rules Admin` (for Firestore/Storage rules)
   - `Firebase Management Agent` (for indexes)

2. Create and download a JSON key
3. Add the entire JSON content as `GCLOUD_AUTH_KEY` secret

The service account handles Firebase rules and indexes deployment via Application Default Credentials (ADC).

### Getting FIREBASE_TOKEN

The Firebase token is required for Cloud Functions deployment:

```bash
firebase login:ci
```

1. Run the command locally - it will open a browser for OAuth
2. Copy the generated token
3. Add it as `FIREBASE_TOKEN` secret in GitHub Actions

The token expires and must be refreshed periodically.

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
- Runs Cloud Functions tests

### Build
- Builds all workspaces
- Builds Cloud Functions
- Must pass before deployment

### Deploy Firebase Rules
- Deploys `firestore.rules` if present
- Deploys `storage.rules` if present
- Uses GCLOUD_AUTH_KEY for authentication

### Deploy Firestore Indexes
- Deploys `firestore.indexes.json` if present
- Uses GCLOUD_AUTH_KEY for authentication

### Deploy Cloud Functions
- Builds and deploys functions from `functions/` directory
- Uses FIREBASE_TOKEN for authentication
- Deploys all functions to the Firebase project

## Concurrency

- **Staging**: Cancels in-progress runs (latest code takes priority)
- **Production**: Queues runs (no cancellation, deploys complete in order)

## Deployment Targets

| Environment | Firebase Project | Functions URL |
|-------------|------------------|---------------|
| Staging | finventory-dev | https://us-central1-finventory-dev.cloudfunctions.net |
| Production | finventory-prod | https://us-central1-finventory-prod.cloudfunctions.net |
