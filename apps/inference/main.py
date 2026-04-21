"""
CalCOFI Inference API
FastAPI service for larval fish density prediction using XGBoost, OLS, and TimesFM models.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# TimesFM imports (optional - model loads lazily)
try:
    import timesfm
    TIMESFM_AVAILABLE = True
except ImportError:
    TIMESFM_AVAILABLE = False
    logging.warning("TimesFM not installed. Forecast endpoint will be unavailable.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CalCOFI Inference API",
    description="ML-powered oceanographic prediction for larval fish density",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model paths
MODELS_DIR = Path(os.environ.get("MODELS_DIR", "./models"))

# Feature lists (from training joblib metadata)
XGB_FEATURES = [
    "year", "month_sin", "month_cos", "latitude", "longitude", "species_id",
    "tow_type_code", "log_volume_sampled", "standard_haul_factor", "log_matched_eggs",
    "frac_past_flexion", "mean_larva_size_mm", "bot_sst_100m", "bot_sal_100m",
    "bot_sigma_100m", "bot_o2_100m", "bot_chla_100m", "bot_po4_100m", "bot_no3_100m",
    "bot_sio3_100m", "bot_mld_05", "bot_strat_dT", "bot_chla_max", "bot_chla_int",
    "bot_o2_min_200", "bot_nitracline", "cast_wind_spd", "cast_wind_dir", "cast_barom",
    "cast_dry_t", "cast_wet_t", "cast_secchi"
]

OLS_FEATURES = [
    "year", "month_sin", "month_cos", "latitude", "longitude", "log_volume_sampled",
    "standard_haul_factor", "log_matched_eggs", "frac_past_flexion", "mean_larva_size_mm",
    "bot_sst_100m", "bot_sal_100m", "bot_sigma_100m", "bot_o2_100m", "bot_chla_100m",
    "bot_po4_100m", "bot_no3_100m", "bot_sio3_100m", "bot_mld_05", "bot_strat_dT",
    "bot_chla_max", "bot_chla_int", "bot_o2_min_200", "bot_nitracline", "cast_wind_spd",
    "cast_wind_dir", "cast_barom", "cast_dry_t", "cast_wet_t", "cast_secchi",
    "species_id", "tow_type_code"
]

# Model storage
models: Dict[str, Any] = {
    "xgboost_binned_5yr": None,
    "ols_pipeline_binned_10yr": None,
    "timesfm": None
}

# Pydantic models
class FeaturesRequest(BaseModel):
    features: Dict[str, float] = Field(..., description="Feature dictionary with all required keys")

class XGBResponse(BaseModel):
    model: str
    log1p_mean_larvae_10m2: float

class OLSResponse(BaseModel):
    model: str
    log1p_mean_larvae_10m2: float

class ForecastRequest(BaseModel):
    history: List[float] = Field(..., description="Historical time series values (CPUE)")
    horizon: int = Field(default=5, ge=1, le=256, description="Number of steps to forecast")
    variant: str = Field(default="binned_5yr", description="Model variant")

class ForecastResponse(BaseModel):
    model: str
    point_forecast: List[float]
    variant: str

class HealthResponse(BaseModel):
    status: str
    models: Dict[str, bool]


def load_models():
    """Load all models on startup."""
    logger.info(f"Loading models from {MODELS_DIR}")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Load XGBoost
    xgb_path = MODELS_DIR / "xgboost_binned_5yr.joblib"
    if xgb_path.exists():
        try:
            models["xgboost_binned_5yr"] = joblib.load(xgb_path)
            logger.info(f"✓ Loaded XGBoost model from {xgb_path}")
        except Exception as e:
            logger.error(f"✗ Failed to load XGBoost: {e}")
    else:
        logger.warning(f"✗ XGBoost model not found at {xgb_path}")

    # Load OLS
    ols_path = MODELS_DIR / "ols_pipeline_binned_10yr.joblib"
    if ols_path.exists():
        try:
            models["ols_pipeline_binned_10yr"] = joblib.load(ols_path)
            logger.info(f"✓ Loaded OLS model from {ols_path}")
        except Exception as e:
            logger.error(f"✗ Failed to load OLS: {e}")
    else:
        logger.warning(f"✗ OLS model not found at {ols_path}")

    # Load TimesFM (lazy - takes time)
    if TIMESFM_AVAILABLE:
        try:
            logger.info("Loading TimesFM model...")
            models["timesfm"] = timesfm.TimesFm(
                context_len=512,
                horizon_len=30,
                input_patch_len=32,
                output_patch_len=128,
                num_layers=20,
                model_dims=1280,
                backend="cpu",  # Use "gpu" if available
            )
            # Load pretrained checkpoint
            checkpoint_path = MODELS_DIR / "timesfm_2p5_200m_torch"
            if checkpoint_path.exists():
                models["timesfm"].load_from_checkpoint(checkpoint_path)
                logger.info(f"✓ Loaded TimesFM from {checkpoint_path}")
            else:
                logger.warning(f"TimesFM checkpoint not found at {checkpoint_path}, using random init")
        except Exception as e:
            logger.error(f"✗ Failed to load TimesFM: {e}")
            models["timesfm"] = None
    else:
        logger.warning("TimesFM not available (timesfm package not installed)")


@app.on_event("startup")
async def startup_event():
    load_models()


@app.get("/health", response_model=HealthResponse)
@app.get("/healthz", response_model=HealthResponse)
def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        models={
            "xgboost_binned_5yr": models["xgboost_binned_5yr"] is not None,
            "ols_pipeline_binned_10yr": models["ols_pipeline_binned_10yr"] is not None,
            "timesfm": models["timesfm"] is not None
        }
    )


@app.post("/v1/predict/xgb-binned-5yr", response_model=XGBResponse)
def predict_xgb(request: FeaturesRequest):
    """
    Predict larval fish density using XGBoost (5-year binned model).
    Returns log1p(mean larvae / 10m²).
    """
    if models["xgboost_binned_5yr"] is None:
        raise HTTPException(status_code=503, detail="XGBoost model not loaded")

    # Validate features
    missing = [f for f in XGB_FEATURES if f not in request.features]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing features: {missing}"
        )

    # Extract features in correct order
    features_array = np.array([[request.features[f] for f in XGB_FEATURES]])

    # Predict
    try:
        prediction = models["xgboost_binned_5yr"].predict(features_array)[0]
        return XGBResponse(
            model="xgboost_binned_5yr",
            log1p_mean_larvae_10m2=float(prediction)
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/v1/predict/ols-binned-10yr", response_model=OLSResponse)
def predict_ols(request: FeaturesRequest):
    """
    Predict larval fish density using OLS pipeline (10-year binned model).
    Returns log1p(mean larvae / 10m²).
    """
    if models["ols_pipeline_binned_10yr"] is None:
        raise HTTPException(status_code=503, detail="OLS model not loaded")

    # Validate features
    missing = [f for f in OLS_FEATURES if f not in request.features]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing features: {missing}"
        )

    # Extract features in correct order
    features_array = np.array([[request.features[f] for f in OLS_FEATURES]])

    # Predict
    try:
        prediction = models["ols_pipeline_binned_10yr"].predict(features_array)[0]
        return OLSResponse(
            model="ols_pipeline_binned_10yr",
            log1p_mean_larvae_10m2=float(prediction)
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/v1/forecast/timesfm", response_model=ForecastResponse)
def forecast_timesfm(request: ForecastRequest):
    """
    Time-series forecast using TimesFM foundation model.
    Input/Output in log1p(CPUE) units.
    """
    if models["timesfm"] is None:
        raise HTTPException(
            status_code=503,
            detail="TimesFM model not loaded (package may not be installed)"
        )

    try:
        # Limit history to 1024 points (model constraint)
        history = request.history[-1024:] if len(request.history) > 1024 else request.history

        # Run forecast
        forecast = models["timesfm"].forecast(
            inputs=[history],
            freq=["D"],  # Daily frequency
            prediction_length=request.horizon
        )

        return ForecastResponse(
            model="timesfm_2p5_200m_torch",
            point_forecast=forecast[0].tolist()[:request.horizon],
            variant=request.variant
        )
    except Exception as e:
        logger.error(f"Forecast error: {e}")
        raise HTTPException(status_code=500, detail=f"Forecast failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
