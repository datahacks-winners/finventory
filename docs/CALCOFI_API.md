# CalCOFI Inference API

ML-powered larval fish density prediction using oceanographic and environmental features.

**Base URL:** `https://calcofi-api-270168887424.us-central1.run.app`

---

## Overview

The CalCOFI Inference API provides larval fish density predictions using three complementary ML models trained on CalCOFI survey data:

| Model | Type | Target | Use Case |
|-------|------|--------|----------|
| **XGBoost** | Gradient Boosting | `log1p(mean larvae / 10m²)` 5-year bins | Non-linear feature interactions |
| **OLS Pipeline** | Linear Regression | `log1p(mean larvae / 10m²)` 10-year bins | Interpretable baseline |
| **TimesFM** | Foundation Model (Google) | `log1p(CPUE)` univariate | Time-series forecasting |

All models are containerized in Docker, pushed to GCR, and served via FastAPI on Cloud Run.

---

## Health Checks

### `GET /health`

Returns status and model availability.

**Response:**
```json
{
  "status": "ok",
  "models": {
    "xgboost_binned_5yr": true,
    "ols_pipeline_binned_10yr": true,
    "timesfm": true
  }
}
```

### `GET /healthz`

Same response as `/health`. Use `/health` for Google Cloud Run health checks ( paths ending in `z` can be mishandled by the platform).

---

## XGBoost: 5-Year Binned Prediction

### `POST /v1/predict/xgb-binned-5yr`

Predicts `log1p(mean larvae / 10m²)` using 5-year binned XGBoost model.

**Request Body:**
```json
{
  "features": {
    "year": 2020,
    "month_sin": 0.5,
    "month_cos": 0.866,
    "latitude": 33.5,
    "longitude": -118.2,
    "species_id": 1,
    "tow_type_code": 1,
    "log_volume_sampled": 3.2,
    "standard_haul_factor": 1.0,
    "log_matched_eggs": 0.5,
    "frac_past_flexion": 0.3,
    "mean_larva_size_mm": 2.5,
    "bot_sst_100m": 14.2,
    "bot_sal_100m": 33.8,
    "bot_sigma_100m": 25.5,
    "bot_o2_100m": 4.5,
    "bot_chla_100m": 0.8,
    "bot_po4_100m": 1.2,
    "bot_no3_100m": 8.5,
    "bot_sio3_100m": 12.0,
    "bot_mld_05": 25.0,
    "bot_strat_dT": 2.1,
    "bot_chla_max": 1.5,
    "bot_chla_int": 45.0,
    "bot_o2_min_200": 2.5,
    "bot_nitracline": 50.0,
    "cast_wind_spd": 5.5,
    "cast_wind_dir": 270,
    "cast_barom": 1013.25,
    "cast_dry_t": 18.5,
    "cast_wet_t": 16.2,
    "cast_secchi": 15.0
  }
}
```

**Required Features (32 keys):**

| Feature | Description |
|---------|-------------|
| `year` | Survey year |
| `month_sin` | Sine of month (seasonal encoding) |
| `month_cos` | Cosine of month (seasonal encoding) |
| `latitude` | Sampling latitude |
| `longitude` | Sampling longitude |
| `species_id` | Fish species identifier |
| `tow_type_code` | Net tow type code |
| `log_volume_sampled` | Log of water volume sampled |
| `standard_haul_factor` | Standardization factor |
| `log_matched_eggs` | Log of matched egg count |
| `frac_past_flexion` | Fraction past notochord flexion |
| `mean_larva_size_mm` | Mean larva length |
| `bot_sst_100m` | Bottom sea surface temperature (100m) |
| `bot_sal_100m` | Bottom salinity (100m) |
| `bot_sigma_100m` | Bottom potential density (100m) |
| `bot_o2_100m` | Bottom dissolved oxygen (100m) |
| `bot_chla_100m` | Bottom chlorophyll-a (100m) |
| `bot_po4_100m` | Bottom phosphate (100m) |
| `bot_no3_100m` | Bottom nitrate (100m) |
| `bot_sio3_100m` | Bottom silicate (100m) |
| `bot_mld_05` | Mixed layer depth (0.05 criterion) |
| `bot_strat_dT` | Stratification temperature difference |
| `bot_chla_max` | Maximum chlorophyll concentration |
| `bot_chla_int` | Integrated chlorophyll |
| `bot_o2_min_200` | Minimum oxygen at 200m |
| `bot_nitracline` | Nitracline depth |
| `cast_wind_spd` | Wind speed during cast |
| `cast_wind_dir` | Wind direction during cast |
| `cast_barom` | Barometric pressure |
| `cast_dry_t` | Dry bulb temperature |
| `cast_wet_t` | Wet bulb temperature |
| `cast_secchi` | Secchi disk depth |

**Response:**
```json
{
  "model": "xgboost_binned_5yr",
  "log1p_mean_larvae_10m2": 2.456
}
```

**Errors:**
- `400` — Missing features: `[...]` (lists missing keys)
- `503` — Model file not loaded

---

## OLS: 10-Year Binned Prediction

### `POST /v1/predict/ols-binned-10yr`

Predicts `log1p(mean larvae / 10m²)` using 10-year binned OLS linear pipeline.

**Request Body:**
```json
{
  "features": {
    "year": 2020,
    "month_sin": 0.5,
    "month_cos": 0.866,
    "latitude": 33.5,
    "longitude": -118.2,
    "log_volume_sampled": 3.2,
    "standard_haul_factor": 1.0,
    "log_matched_eggs": 0.5,
    "frac_past_flexion": 0.3,
    "mean_larva_size_mm": 2.5,
    "bot_sst_100m": 14.2,
    "bot_sal_100m": 33.8,
    "bot_sigma_100m": 25.5,
    "bot_o2_100m": 4.5,
    "bot_chla_100m": 0.8,
    "bot_po4_100m": 1.2,
    "bot_no3_100m": 8.5,
    "bot_sio3_100m": 12.0,
    "bot_mld_05": 25.0,
    "bot_strat_dT": 2.1,
    "bot_chla_max": 1.5,
    "bot_chla_int": 45.0,
    "bot_o2_min_200": 2.5,
    "bot_nitracline": 50.0,
    "cast_wind_spd": 5.5,
    "cast_wind_dir": 270,
    "cast_barom": 1013.25,
    "cast_dry_t": 18.5,
    "cast_wet_t": 16.2,
    "cast_secchi": 15.0,
    "species_id": 1,
    "tow_type_code": 1
  }
}
```

**Required Features (32 keys):** Same as XGBoost but `species_id` and `tow_type_code` are at the end of the list order (note: feature order does not matter, only key presence).

**Response:**
```json
{
  "model": "ols_pipeline_binned_10yr",
  "log1p_mean_larvae_10m2": 2.312
}
```

**Errors:**
- `400` — Missing features
- `503` — Model file not loaded

---

## TimesFM: Time-Series Forecast

### `POST /v1/forecast/timesfm`

Univariate time-series forecasting in `log1p(CPUE)` units.

**Request Body:**
```json
{
  "history": [2.5, 2.6, 2.4, 2.7, 2.5, 2.3, 2.6, 2.8],
  "horizon": 5,
  "variant": "binned_5yr"
}
```

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `history` | `float[]` | Yes | — | Non-empty array. If >1024 points, only last 1024 used. |
| `horizon` | `int` | No | 5 | 1–256 steps |
| `variant` | `string` | No | `"binned_5yr"` | Documented variant for annual vs binned use |

**Response:**
```json
{
  "model": "timesfm_2p5_200m_torch",
  "point_forecast": [2.55, 2.48, 2.52, 2.60, 2.58],
  "variant": "binned_5yr"
}
```

**Errors:**
- `400` — Invalid horizon or empty history
- `503` — TimesFM failed to load

---

## Interactive Documentation

| Endpoint | Purpose |
|----------|---------|
| `GET /openapi.json` | Machine-readable OpenAPI 3 schema |
| `GET /docs` | Swagger UI interactive documentation |

---

## Usage Examples

### cURL: Health Check

```bash
curl -sS https://calcofi-api-270168887424.us-central1.run.app/health
```

### cURL: XGBoost Prediction

```bash
curl -sS -X POST \
  https://calcofi-api-270168887424.us-central1.run.app/v1/predict/xgb-binned-5yr \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "year": 2020,
      "month_sin": 0.5,
      "month_cos": 0.866,
      "latitude": 33.5,
      "longitude": -118.2,
      "species_id": 1,
      "tow_type_code": 1,
      "log_volume_sampled": 3.2,
      "standard_haul_factor": 1.0,
      "log_matched_eggs": 0.5,
      "frac_past_flexion": 0.3,
      "mean_larva_size_mm": 2.5,
      "bot_sst_100m": 14.2,
      "bot_sal_100m": 33.8,
      "bot_sigma_100m": 25.5,
      "bot_o2_100m": 4.5,
      "bot_chla_100m": 0.8,
      "bot_po4_100m": 1.2,
      "bot_no3_100m": 8.5,
      "bot_sio3_100m": 12.0,
      "bot_mld_05": 25.0,
      "bot_strat_dT": 2.1,
      "bot_chla_max": 1.5,
      "bot_chla_int": 45.0,
      "bot_o2_min_200": 2.5,
      "bot_nitracline": 50.0,
      "cast_wind_spd": 5.5,
      "cast_wind_dir": 270,
      "cast_barom": 1013.25,
      "cast_dry_t": 18.5,
      "cast_wet_t": 16.2,
      "cast_secchi": 15.0
    }
  }'
```

### cURL: TimesFM Forecast

```bash
curl -sS -X POST \
  https://calcofi-api-270168887424.us-central1.run.app/v1/forecast/timesfm \
  -H "Content-Type: application/json" \
  -d '{"history":[2.5,2.6,2.4,2.7,2.5,2.3,2.6,2.8],"horizon":5,"variant":"binned_5yr"}'
```

### Python

```python
import requests

API_URL = "https://calcofi-api-270168887424.us-central1.run.app"

# XGBoost prediction
features = {
    "year": 2020,
    "month_sin": 0.5,
    "month_cos": 0.866,
    "latitude": 33.5,
    "longitude": -118.2,
    # ... (all 32 features)
}

response = requests.post(
    f"{API_URL}/v1/predict/xgb-binned-5yr",
    json={"features": features}
)
result = response.json()
print(f"Predicted log1p density: {result['log1p_mean_larvae_10m2']}")

# TimesFM forecast
forecast_resp = requests.post(
    f"{API_URL}/v1/forecast/timesfm",
    json={"history": [2.5, 2.6, 2.4, 2.7], "horizon": 5}
)
forecast = forecast_resp.json()
print(f"Forecast: {forecast['point_forecast']}")
```

---

## Error Reference

| Status | Meaning | Example Response |
|--------|---------|------------------|
| `200` | Success | Prediction/forecast returned |
| `400` | Bad Request | `{"error":"Missing features: [\"bot_o2_100m\"]"}` |
| `422` | Validation Error | Invalid JSON schema |
| `503` | Service Unavailable | Model file not loaded on disk |

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Client    │────▶│  Cloud Run  │────▶│   FastAPI App   │
│             │     │  (Docker)   │     │                 │
└─────────────┘     └─────────────┘     └────────┬────────┘
                                                 │
           ┌─────────────────────────────────────┼─────────────────────────────────────┐
           │                                     │                                     │
           ▼                                     ▼                                     ▼
    ┌──────────────┐                    ┌──────────────┐                    ┌──────────────┐
    │  XGBoost     │                    │  OLS Pipeline│                    │   TimesFM    │
    │  binned_5yr  │                    │  binned_10yr │                    │  (Google)    │
    │  .joblib     │                    │  .joblib     │                    │  PyTorch     │
    └──────────────┘                    └──────────────┘                    └──────────────┘
```

- **Container Registry:** GCR
- **Runtime:** Cloud Run (serverless)
- **Framework:** FastAPI
- **Models:** joblib (XGBoost, OLS), PyTorch (TimesFM)

---

## Model Files

Models are loaded from `models/` directory at container startup:

| File | Route | Purpose |
|------|-------|---------|
| `xgboost_binned_5yr.joblib` | `/v1/predict/xgb-binned-5yr` | 5-year binned XGBoost |
| `ols_pipeline_binned_10yr.joblib` | `/v1/predict/ols-binned-10yr` | 10-year binned OLS |
| TimesFM (PyTorch) | `/v1/forecast/timesfm` | Google time-series FM |

---

## Related Resources

- [CalCOFI Dataset](https://calcofi.org/data/) — Original survey data
- [NOAA ERDDAP](https://coastwatch.pfeg.noaa.gov/erddap/) — Oceanographic data access
- [TimesFM Paper](https://arxiv.org/abs/2310.03589) — Time-series foundation model
- [CalCOFI Weather Data](https://github.com/datahacks-winners/calfico-weather-small) — Weather sources integration
