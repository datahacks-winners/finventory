"""FastAPI app for CalCOFI larvae log-density and TimesFM forecasts."""
from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException

from . import runtime
from .schemas import (
    PredictBinRequest,
    PredictBinResponse,
    TimesFMForecastRequest,
    TimesFMForecastResponse,
)

app = FastAPI(
    title="CalCOFI inference",
    description="XGBoost (5-yr binned), OLS (10-yr binned), TimesFM (annual / binned CPUE scale).",
    version="0.1.0",
)


@app.get("/healthz")
def healthz():
    return {"status": "ok", "models": runtime.models_ready()}


@app.post("/v1/predict/xgb-binned-5yr", response_model=PredictBinResponse)
def predict_xgb(req: PredictBinRequest):
    try:
        y = runtime.predict_xgb_binned(req.features)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return PredictBinResponse(
        model="xgboost_binned_5yr",
        log1p_mean_larvae_10m2=y,
    )


@app.post("/v1/predict/ols-binned-10yr", response_model=PredictBinResponse)
def predict_ols(req: PredictBinRequest):
    try:
        y = runtime.predict_ols_binned(req.features)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return PredictBinResponse(
        model="ols_pipeline_binned_10yr",
        log1p_mean_larvae_10m2=y,
    )


@app.post("/v1/forecast/timesfm", response_model=TimesFMForecastResponse)
def forecast_timesfm(req: TimesFMForecastRequest):
    try:
        pts = runtime.forecast_timesfm(req.history, req.horizon)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    return TimesFMForecastResponse(
        model="timesfm_2p5_200m_torch",
        point_forecast=pts,
        variant=req.variant,
    )


# Cloud Run sets PORT
def run():
    import uvicorn

    port = int(os.environ.get("PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    run()
