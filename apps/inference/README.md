# CalCOFI Inference API

FastAPI service for larval fish density prediction using oceanographic data.

## Models

| Model | File | Endpoint | Description |
|-------|------|----------|-------------|
| XGBoost | `xgboost_binned_5yr.joblib` | `/v1/predict/xgb-binned-5yr` | 5-year binned regression |
| OLS | `ols_pipeline_binned_10yr.joblib` | `/v1/predict/ols-binned-10yr` | 10-year binned linear regression |
| TimesFM | `timesfm_2p5_200m_torch/` | `/v1/forecast/timesfm` | Google time-series foundation model |

## Quick Start

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Download model files to ./models/
# (See Model Training section)

# Run locally
python main.py
```

API will be available at `http://localhost:8080`

### Test Endpoints

```bash
# Health check
curl http://localhost:8080/health

# XGBoost prediction
curl -X POST http://localhost:8080/v1/predict/xgb-binned-5yr \
  -H "Content-Type: application/json" \
  -d '{"features": {"year": 2020, "latitude": 33.5, "longitude": -118.2, ...}}'

# TimesFM forecast
curl -X POST http://localhost:8080/v1/forecast/timesfm \
  -H "Content-Type: application/json" \
  -d '{"history": [2.5, 2.6, 2.4], "horizon": 5}'
```

## Deployment

### Build and Push to GCR

```bash
gcloud builds submit --config cloudbuild.yaml
```

### Manual Deploy to Cloud Run

```bash
# Build
gcloud builds submit --tag gcr.io/PROJECT_ID/calcofi-inference

# Deploy
gcloud run deploy calcofi-inference \
  --image gcr.io/PROJECT_ID/calcofi-inference \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

## Model Training

Models are trained separately and exported as joblib files:

```python
import joblib

# Train XGBoost
xgb_model = train_xgboost(data)  # Your training code
joblib.dump(xgb_model, "xgboost_binned_5yr.joblib")

# Train OLS
ols_pipeline = train_ols(data)  # Your training code
joblib.dump(ols_pipeline, "ols_pipeline_binned_10yr.joblib")
```

Place trained models in the `models/` directory before building the container.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `MODELS_DIR` | ./models | Path to model files |

## API Reference

See [docs/CALCOFI_API.md](../../docs/CALCOFI_API.md) for complete endpoint documentation.
