# CalCOFI inference API — endpoints

Base URL is the service host (e.g. `http://localhost:8080` locally, or your Cloud Run URL). All paths below are **relative** to that origin.

**Content type:** `application/json` for all `POST` bodies.

---

## Health

| Method | Path    | Body | Response |
|--------|---------|------|----------|
| `GET`  | `/health`  | — | `{"status":"ok","models":{...}}` — booleans for XGB, OLS, TimesFM whether each model loaded |
| `GET`  | `/healthz` | — | Same as `/health` |

On **Google Cloud Run**, use **`/health` for checks**; `GET /healthz` can be mishandled by the platform (known quirk for some paths ending in `z`).

---

## `POST /v1/predict/xgb-binned-5yr`

XGBoost model: 5-year binned `log1p(mean larvae / 10m²)`.

**Body**

```json
{
  "features": {
    "<column_name>": <number>,
    "…": "… all 32 keys required (see list below)"
  }
}
```

`features` must include **every** key the training joblib expects; **no extra keys** are required, but **missing** keys return **400** with `Missing features: [...]`.

**Feature keys (32)** — use the same names and numeric semantics as training:

`year`, `month_sin`, `month_cos`, `latitude`, `longitude`, `species_id`, `tow_type_code`, `log_volume_sampled`, `standard_haul_factor`, `log_matched_eggs`, `frac_past_flexion`, `mean_larva_size_mm`, `bot_sst_100m`, `bot_sal_100m`, `bot_sigma_100m`, `bot_o2_100m`, `bot_chla_100m`, `bot_po4_100m`, `bot_no3_100m`, `bot_sio3_100m`, `bot_mld_05`, `bot_strat_dT`, `bot_chla_max`, `bot_chla_int`, `bot_o2_min_200`, `bot_nitracline`, `cast_wind_spd`, `cast_wind_dir`, `cast_barom`, `cast_dry_t`, `cast_wet_t`, `cast_secchi`

**Response**

```json
{
  "model": "xgboost_binned_5yr",
  "log1p_mean_larvae_10m2": 0.0
}
```

**Errors:** **503** if `xgboost_binned_5yr.joblib` is missing on disk.

---

## `POST /v1/predict/ols-binned-10yr`

OLS pipeline: 10-year binned `log1p(mean larvae / 10m²)`.

**Body**

Same shape as XGB: **`{"features": { ... }}`**, but the **required keys differ** from the XGB route (still **32** columns).

**Feature keys (32)**

`year`, `month_sin`, `month_cos`, `latitude`, `longitude`, `log_volume_sampled`, `standard_haul_factor`, `log_matched_eggs`, `frac_past_flexion`, `mean_larva_size_mm`, `bot_sst_100m`, `bot_sal_100m`, `bot_sigma_100m`, `bot_o2_100m`, `bot_chla_100m`, `bot_po4_100m`, `bot_no3_100m`, `bot_sio3_100m`, `bot_mld_05`, `bot_strat_dT`, `bot_chla_max`, `bot_chla_int`, `bot_o2_min_200`, `bot_nitracline`, `cast_wind_spd`, `cast_wind_dir`, `cast_barom`, `cast_dry_t`, `cast_wet_t`, `cast_secchi`, `species_id`, `tow_type_code`

**Response**

```json
{
  "model": "ols_pipeline_binned_10yr",
  "log1p_mean_larvae_10m2": 0.0
}
```

**Errors:** **503** if `ols_pipeline_binned_10yr.joblib` is missing on disk.

---

## `POST /v1/forecast/timesfm`

TimesFM univariate forecast in **log1p(CPUE)** units (aligned with training).

**Body**

```json
{
  "history": [2.5, 2.6, 2.4],
  "horizon": 5,
  "variant": "binned_5yr"
}
```

| Field     | Type   | Required | Constraints / default |
|-----------|--------|----------|------------------------|
| `history` | `float[]` | yes | Non-empty. If longer than **1024** points, only the **last 1024** are used. |
| `horizon` | `int`  | no       | Default **5**. **1**–**256**. |
| `variant` | `str`  | no       | Default **`"binned_5yr"`** — echoed in the response; documented for annual vs binned use cases. |

**Response**

```json
{
  "model": "timesfm_2p5_200m_torch",
  "point_forecast": [0.0, 0.0],
  "variant": "binned_5yr"
}
```

**Errors:** **503** if TimesFM failed to load.

---

## OpenAPI & interactive docs

| Method | Path          | Purpose        |
|--------|---------------|----------------|
| `GET`  | `/openapi.json` | Machine-readable OpenAPI 3 schema |
| `GET`  | `/docs`           | Swagger UI                        |

---

## Example `curl` (replace `BASE`)

```bash
BASE="https://YOUR_HOST"

curl -sS "${BASE}/health"

curl -sS -X POST "${BASE}/v1/forecast/timesfm" \
  -H "Content-Type: application/json" \
  -d '{"history":[2.5,2.6,2.4],"horizon":5,"variant":"binned_5yr"}'
```

Feature lists for XGB/OLS are derived from the shipped `.joblib` bundles under `models/`; if you regenerate models, re-export these lists from the bundles or add a small introspection script.
