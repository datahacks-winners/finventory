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
