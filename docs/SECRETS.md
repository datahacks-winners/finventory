# GitHub Secrets Configuration

Required secrets for CI/CD workflows.

## Staging (develop branch)

| Secret | Description | How to Get |
|--------|-------------|------------|
| `GCP_PROJECT_ID` | GCP project ID | Google Cloud Console |
| `GCP_SA_KEY` | GCP service account JSON | IAM & Admin > Service Accounts |
| `VITE_PEXELS_API_KEY` | Pexels API key | https://www.pexels.com/api/ |
| `GITHUB_TOKEN` | Auto-provided | No action needed |

## Production (tags)

| Secret | Description | How to Get |
|--------|-------------|------------|
| `GCP_SA_KEY_PROD` | GCP prod service account JSON | Production project IAM |
| `FIREBASE_TOKEN_PROD` | Firebase CLI token | `firebase login:ci` |
| `VITE_PEXELS_API_KEY_PROD` | Pexels API key (prod) | Same as staging or separate key |

## Setting Secrets

```bash
# Using GitHub CLI
gh secret set GCP_SA_KEY --env staging < sa-key.json
gh secret set VITE_PEXELS_API_KEY --env staging

# Or via GitHub web UI:
# Settings > Secrets and variables > Actions > Repository secrets
```

## Pexels API Key

1. Register at https://www.pexels.com/api/
2. Accept terms and create an application
3. Copy the API key
4. Add to GitHub secrets as `VITE_PEXELS_API_KEY`

**Rate Limits:**
- Free tier: 200 requests/hour
- No attribution required but appreciated

The key is injected at **build time** via Docker build args and baked into the Vite bundle.
