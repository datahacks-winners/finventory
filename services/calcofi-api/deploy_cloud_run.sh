#!/usr/bin/env bash
# Build container (Google Cloud Build) and deploy to Cloud Run.
#
# Prerequisites:
#   gcloud auth login && gcloud config set project YOUR_PROJECT
#   Enable: Cloud Run API, Cloud Build API, Container Registry or Artifact Registry
#
# Usage (from repo root):
#   chmod +x services/calcofi-api/deploy_cloud_run.sh
#   ./services/calcofi-api/deploy_cloud_run.sh
#
# Override:
#   GCP_REGION=europe-west1 IMAGE_NAME=gcr.io/myproject/calcofi-api:v2 ./services/calcofi-api/deploy_cloud_run.sh

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${SERVICE_NAME:-calcofi-api}"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "Configure a project: gcloud config set project YOUR_PROJECT_ID" >&2
  exit 1
fi

IMAGE="${IMAGE_NAME:-gcr.io/${PROJECT_ID}/${SERVICE}:latest}"

echo "==> Project: ${PROJECT_ID}"
echo "==> Image:   ${IMAGE}"
echo "==> Service: ${SERVICE} (${REGION})"

echo "==> Cloud Build (Dockerfile services/calcofi-api/Dockerfile)"
gcloud builds submit --config=services/calcofi-api/cloudbuild.yaml \
  --substitutions=_IMAGE="${IMAGE}" .

echo "==> Cloud Run deploy"
gcloud run deploy "${SERVICE}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=4Gi \
  --cpu=2 \
  --timeout=300 \
  --max-instances=10

# Cloud Run sets PORT automatically; do not pass it in --set-env-vars (reserved).

echo "==> Service URL"
gcloud run services describe "${SERVICE}" --region="${REGION}" --format='value(status.url)'
