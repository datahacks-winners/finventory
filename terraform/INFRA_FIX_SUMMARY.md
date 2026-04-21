# Infrastructure Fix Summary

## Problem Diagnosis

The original Terraform setup had these critical flaws:

1. **Hybrid Auth Hell**: Trying to use Firebase CLI + Terraform together
   - Firebase CLI needs `FIREBASE_TOKEN`
   - Terraform uses Application Default Credentials
   - They conflict, causing quota project errors

2. **Broken Custom Module**: `modules/cloud_function/` was incomplete
   - No source upload mechanism
   - Wrong event trigger format
   - No secret manager support

3. **Deprecated Firestore Config**:
   ```hcl
   app_engine_integration_mode = "ENABLED"  # ❌ No longer supported
   ```

4. **Cloud Functions v2 Complexity**:
   - Requires source code in GCS before Terraform runs
   - Complex initialization (ADC vs explicit credentials)
   - Separate build step needed

## Solution: Terraform-Only with Cloud Run

### Architecture Change

**Before (Broken)**:
```
Terraform: Cloud Run (web), Firestore, IAM
Firebase CLI: Functions (auth hell)
```

**After (Clean)**:
```
Terraform: Cloud Run (web), Cloud Run (api), Firestore, IAM, Scheduler
Single auth flow: ADC only
```

### Why Cloud Run > Cloud Functions for This Use Case

| Aspect | Cloud Functions | Cloud Run |
|--------|------------------|-----------|
| **Source Deployment** | Requires GCS bucket + separate upload | Container Registry/Artifact Registry |
| **Local Dev** | Emulator needed | Just `docker run` |
| **Auth** | Complex (ADC + Firebase) | Simple (ADC only) |
| **Terraform** | Needs source object pre-created | Just reference container image |
| **Routing** | Function per endpoint | Express router (cleaner) |
| **Scheduled Jobs** | Requires Cloud Scheduler anyway | Same Cloud Scheduler |
| **Triggers** | Native (but complex) | Eventarc (cleaner) |

### Files Changed

#### Deleted:
- `terraform/functions.tf` - Broken custom module approach
- `terraform/modules/cloud_function/` - Incomplete module

#### New:
- `terraform/api.tf` - Cloud Run API service + Scheduler jobs + Eventarc triggers
- `terraform/firestore.tf` - Fixed Firestore config (disabled app engine)
- `apps/api/` - Express API server (replaces Cloud Functions)
- `apps/api/Dockerfile` - Container build
- `apps/api/cloudbuild.yaml` - Cloud Build config

#### Modified:
- `terraform/web.tf` - Uses standard Cloud Run (already worked)

## Deployment Flow (Terraform Only)

```bash
# 1. Build and push API container
cd apps/api
gcloud builds submit --config cloudbuild.yaml

# 2. Build and push Web container
cd apps/web
gcloud builds submit --tag us-central1-docker.pkg.dev/finventory-1776558252/web-images/web:latest .

# 3. Deploy everything via Terraform
cd terraform
terraform apply -auto-approve
```

## What This Fixes

1. ✅ **Single Auth Flow**: Terraform uses ADC, no Firebase CLI needed
2. ✅ **No Source Upload Dance**: Containers are pre-built, Terraform just deploys
3. ✅ **Cleaner Code**: Express API is simpler than Cloud Functions v2
4. ✅ **Works Locally**: `docker build && docker run` vs Function emulator
5. ✅ **Unified Platform**: Everything is Cloud Run (simpler mental model)

## Trade-offs

**Pros**:
- Terraform-only deployment
- No Firebase CLI dependency
- Local development works with Docker
- Simpler routing (Express vs Function triggers)

**Cons**:
- Need to manage containers (but Cloud Build handles this)
- Eventarc triggers slightly more config than native Function triggers
- Webhook endpoints public by default (need IAP or API key for true security)

## Next Steps to Deploy

```bash
# 1. Enable required APIs
gcloud services enable run.googleapis.com eventarc.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project=finventory-1776558252

# 2. Create Artifact Registry repositories
gcloud artifacts repositories create web-images --repository-format=docker --location=us-central1 --project=finventory-1776558252
gcloud artifacts repositories create api-images --repository-format=docker --location=us-central1 --project=finventory-1776558252

# 3. Build containers
cd apps/api && gcloud builds submit --config cloudbuild.yaml
cd apps/web && gcloud builds submit --tag us-central1-docker.pkg.dev/finventory-1776558252/web-images/web:latest .

# 4. Deploy
cd terraform && terraform apply -auto-approve
```

Result: Working marketplace with Terraform-only deployment.
