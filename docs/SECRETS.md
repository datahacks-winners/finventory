# GitHub Secrets Configuration

Required secrets for CI/CD workflows.

## Staging (develop branch)

| Secret | Description | How to Get |
|--------|-------------|------------|
| `GCP_PROJECT_ID` | GCP project ID | Google Cloud Console |
| `GCP_SA_KEY` | GCP service account JSON | IAM & Admin > Service Accounts |
| `VITE_UNSPLASH_ACCESS_KEY` | Unsplash API key | https://unsplash.com/developers |
| `GITHUB_TOKEN` | Auto-provided | No action needed |

## Production (tags)

| Secret | Description | How to Get |
|--------|-------------|------------|
| `GCP_SA_KEY_PROD` | GCP prod service account JSON | Production project IAM |
| `FIREBASE_TOKEN_PROD` | Firebase CLI token | `firebase login:ci` |
| `VITE_UNSPLASH_ACCESS_KEY_PROD` | Unsplash API key (prod) | Same as staging or separate key |

## Setting Secrets

```bash
# Using GitHub CLI
gh secret set GCP_SA_KEY --env staging < sa-key.json
gh secret set VITE_UNSPLASH_ACCESS_KEY --env staging

# Or via GitHub web UI:
# Settings > Secrets and variables > Actions > Repository secrets
```

## Unsplash API Key

1. Register at https://unsplash.com/developers
2. Create a new application
3. Copy the **Access Key**
4. Add to GitHub secrets as `VITE_UNSPLASH_ACCESS_KEY`

**Rate Limits:**
- Demo: 50 requests/hour
- Production: 5000 requests/hour

The key is injected at **build time** via Docker build args and baked into the Vite bundle.
