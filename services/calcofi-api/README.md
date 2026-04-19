# CalCOFI inference API

FastAPI service for **XGBoost (5-yr binned)**, **OLS (10-yr binned)**, and **TimesFM** forecasts. Models live under `models/` (gitignored); generate them with `train_export_models.py` or the TimesFM notebook scripts with `--save-model`.

**HTTP reference:** [API.md](./API.md) (paths, JSON bodies, feature column lists).

## Docker (local)

From the **repository root** (Docker Desktop / daemon must be running):

```bash
docker build -f services/calcofi-api/Dockerfile -t calcofi-api:local .
docker run --rm -p 8080:8080 -e PORT=8080 calcofi-api:local
```

Open `http://localhost:8080/healthz` (alias: `/health`). On **Cloud Run**, prefer **`/health`**: `GET /healthz` can be mishandled by the platform (known quirk for some paths ending in `z`); your app is still live if `GET /openapi.json` works.

**Cloud Build** uploads use the same rules as `.gitignore`. `*.joblib` and `timesfm_manifest.json` are re-included so the image contains XGB/OLS if those files exist on the machine that runs `gcloud builds submit` (keep `timesfm_state.pt` out; it stays ignored).

### Build troubleshooting

| Issue | What to do |
|-------|------------|
| **`input/output error` / BuildKit commit failed** | Often Docker Desktop disk pressure or a stuck builder. Run `docker system prune -f`, restart Docker Desktop, ensure **≥15GB** free disk, then rebuild. |
| **Slow upload / huge context (~1GB)** | `timesfm_state.pt` (~900MB) is **excluded** via `.dockerignore`; the image uses HF weights instead. Joblibs + manifest still copy in. |
| **`nvidia-nccl-cu12` / giant XGBoost layer** | Requirements pin **`xgboost<3`** so pip does not pull GPU-oriented 3.x wheels on ARM/macOS. |
| **Deploy to Cloud Run (amd64)** | Build with `docker build --platform linux/amd64 ...` so the binary stack matches typical Cloud Run nodes. |

## Deploy to Google Cloud Run

Automated script (uses **Cloud Build** so you do **not** need a local Docker daemon):

```bash
chmod +x services/calcofi-api/deploy_cloud_run.sh
./services/calcofi-api/deploy_cloud_run.sh
```

Or manually:

```bash
export PROJECT_ID=$(gcloud config get-value project)
export IMAGE=gcr.io/${PROJECT_ID}/calcofi-api:latest

gcloud builds submit --config=services/calcofi-api/cloudbuild.yaml \
  --substitutions=_IMAGE=${IMAGE} .

gcloud run deploy calcofi-api \
  --image=${IMAGE} \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=2 \
  --timeout=300
```

Do not set `PORT` in `--set-env-vars` on Cloud Run: it is **reserved** and injected for you. The image’s `CMD` already uses `${PORT:-8080}`.

### IAM / organization errors

If Cloud Build fails with **bucket access** or **serviceusage.services.use**, ask a project admin to grant roles such as **Cloud Build Editor**, **Storage Admin** (build staging bucket), **Service Usage Consumer**, or deploy from a CI service account with those roles.

### Image registry

`gcr.io/PROJECT/...` requires the **Container Registry API** (or switch `_IMAGE` to an **Artifact Registry** URL: `REGION-docker.pkg.dev/PROJECT/REPO/calcofi-api:latest` after creating the repository).

## Repo layout reminder

| Path | Role |
|------|------|
| `apps/mobile`, `apps/web` | Finventory clients |
| `functions` | Firebase Cloud Functions |
| **`services/calcofi-api`** | This Python inference sidecar |
