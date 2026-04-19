# CalCOFI inference API — optimized for GCP Cloud Run (CPU).
# Build from repo root:
#   docker build -f services/calcofi-api/Dockerfile -t calcofi-api .
#
# Tip: `.dockerignore` skips `timesfm_state.pt` (~900MB); the container still
# loads pretrained weights from Hugging Face (see calcofi_inference/runtime.py).
#
# Apple Silicon → Cloud Run amd64 workers:
#   docker build --platform linux/amd64 -f services/calcofi-api/Dockerfile -t calcofi-api .
#
# Requires trained artefacts under services/calcofi-api/models/ (run
# train_export_models.py locally first).

FROM python:3.11-slim-bookworm

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    CALCOFI_MODEL_DIR=/app/models \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

COPY services/calcofi-api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# TimesFM (vendored) for /v1/forecast/timesfm — must match local training env.
COPY vendor/timesfm ./vendor/timesfm
RUN pip install --no-cache-dir -e "./vendor/timesfm[torch]"

COPY services/calcofi-api/calcofi_inference ./calcofi_inference
COPY services/calcofi-api/models ./models

EXPOSE 8080

# Cloud Run sets PORT; default 8080 matches Dockerfile EXPOSE.
CMD ["sh", "-c", "exec uvicorn calcofi_inference.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
