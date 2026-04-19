"""Load ``.joblib`` bundles and optional TimesFM PyTorch weights."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

MODEL_DIR = Path(
    os.environ.get(
        "CALCOFI_MODEL_DIR",
        Path(__file__).resolve().parent.parent / "models",
    )
)

_xgb_bundle: dict[str, Any] | None = None
_ols_bundle: dict[str, Any] | None = None
_timesfm_model = None
_timesfm_forecast_cfg = None


def models_ready() -> dict[str, bool]:
    return {
        "xgboost_binned_5yr": xgb_bundle() is not None,
        "ols_binned_10yr": ols_bundle() is not None,
        "timesfm": _load_timesfm_lazy()[0] is not None,
    }


def xgb_bundle() -> dict[str, Any] | None:
    global _xgb_bundle
    if _xgb_bundle is not None:
        return _xgb_bundle
    path = MODEL_DIR / "xgboost_binned_5yr.joblib"
    if not path.is_file():
        return None
    _xgb_bundle = joblib.load(path)
    return _xgb_bundle


def ols_bundle() -> dict[str, Any] | None:
    global _ols_bundle
    if _ols_bundle is not None:
        return _ols_bundle
    path = MODEL_DIR / "ols_pipeline_binned_10yr.joblib"
    if not path.is_file():
        return None
    _ols_bundle = joblib.load(path)
    return _ols_bundle


def _load_timesfm_lazy():
    """Return (model, ForecastConfig-like dict) or (None, None)."""
    global _timesfm_model, _timesfm_forecast_cfg
    if _timesfm_model is not None:
        return _timesfm_model, _timesfm_forecast_cfg
    try:
        import torch
        import timesfm as tfm
    except ImportError:
        return None, None

    manifest_path = MODEL_DIR / "timesfm_manifest.json"
    state_path = MODEL_DIR / "timesfm_state.pt"
    if not manifest_path.is_file():
        # Fall back to Hugging Face pretrained (downloads on first use).
        torch.set_float32_matmul_precision("high")
        model = tfm.TimesFM_2p5_200M_torch.from_pretrained(
            "google/timesfm-2.5-200m-pytorch"
        )
        model.compile(
            tfm.ForecastConfig(
                max_context=min(1024, 1024),
                max_horizon=256,
                normalize_inputs=True,
                use_continuous_quantile_head=True,
                force_flip_invariance=True,
                infer_is_positive=True,
                fix_quantile_crossing=True,
                per_core_batch_size=8,
            )
        )
        _timesfm_model = model
        _timesfm_forecast_cfg = {"source": "huggingface_pretrained"}
        return _timesfm_model, _timesfm_forecast_cfg

    manifest = json.loads(manifest_path.read_text())
    torch.set_float32_matmul_precision("high")
    model = tfm.TimesFM_2p5_200M_torch.from_pretrained(manifest.get("hf_model_id", "google/timesfm-2.5-200m-pytorch"))
    if state_path.is_file():
        state = torch.load(state_path, map_location="cpu")
        inner = getattr(model, "model", None)
        if inner is not None and hasattr(inner, "load_state_dict"):
            inner.load_state_dict(state, strict=False)
        elif hasattr(model, "load_state_dict"):
            model.load_state_dict(state, strict=False)
    fc = manifest.get("forecast_config", {})
    model.compile(
        tfm.ForecastConfig(
            max_context=int(fc.get("max_context", 1024)),
            max_horizon=int(fc.get("max_horizon", 256)),
            normalize_inputs=bool(fc.get("normalize_inputs", True)),
            use_continuous_quantile_head=bool(fc.get("use_continuous_quantile_head", True)),
            force_flip_invariance=bool(fc.get("force_flip_invariance", True)),
            infer_is_positive=bool(fc.get("infer_is_positive", True)),
            fix_quantile_crossing=bool(fc.get("fix_quantile_crossing", True)),
            per_core_batch_size=int(fc.get("per_core_batch_size", 8)),
        )
    )
    _timesfm_model = model
    _timesfm_forecast_cfg = manifest
    return _timesfm_model, _timesfm_forecast_cfg


def predict_xgb_binned(row: dict) -> float:
    b = xgb_bundle()
    if b is None:
        raise FileNotFoundError("xgboost_binned_5yr.joblib missing")
    cols = b["feature_names"]
    missing = set(cols) - set(row.keys())
    if missing:
        raise ValueError(f"Missing features: {sorted(missing)}")
    X = pd.DataFrame([{c: row[c] for c in cols}])
    pred = b["model"].predict(X)[0]
    return float(pred)


def predict_ols_binned(row: dict) -> float:
    b = ols_bundle()
    if b is None:
        raise FileNotFoundError("ols_pipeline_binned_10yr.joblib missing")
    cols = b["columns"]
    missing = set(cols) - set(row.keys())
    if missing:
        raise ValueError(f"Missing features: {sorted(missing)}")
    X = pd.DataFrame([{c: row[c] for c in cols}])
    pred = b["pipeline"].predict(X)[0]
    return float(pred)


def forecast_timesfm(history: list[float], horizon: int) -> list[float]:
    model, _cfg = _load_timesfm_lazy()
    if model is None:
        raise RuntimeError("TimesFM not installed or failed to load")
    ctx = np.asarray(history, dtype=np.float32)
    if len(ctx) > 1024:
        ctx = ctx[-1024:]
    inputs = [ctx]
    point, _q = model.forecast(horizon=int(horizon), inputs=inputs)
    arr = np.asarray(point[0], dtype=float)
    return [float(x) for x in arr.reshape(-1)]
