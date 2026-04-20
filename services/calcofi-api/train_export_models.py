#!/usr/bin/env python3
"""Train and export ranked CalCOFI models for ``services/calcofi-api``.

Writes to ``services/calcofi-api/models/``::

  xgboost_binned_5yr.joblib       — XGBRegressor + ``feature_names``
  ols_pipeline_binned_10yr.joblib — sklearn Pipeline (OLS) + ``columns``

Optional (requires torch + ``timesfm`` / vendor install)::

  timesfm_manifest.json           — HF id + ForecastConfig knobs
  timesfm_state.pt                — ``state_dict`` snapshot (optional)

Training uses the **same** larvae–bottle–cast pipeline as
``notebooks/binned_regression_compare.py``: time split train year ≤2018.

Run from repo root with data present::

    .venv/bin/python services/calcofi-api/train_export_models.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

# …/repo/services/calcofi-api/train_export_models.py → repo root is parents[2]
REPO_ROOT = Path(__file__).resolve().parents[2]
NB = REPO_ROOT / "notebooks"
MODEL_DIR = Path(__file__).resolve().parent / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(NB))

from linreg_baseline import CAT_COLS, NUM_COLS, make_pipeline  # noqa: E402
from sklearn.linear_model import LinearRegression  # noqa: E402

from binned_regression_compare import (  # noqa: E402
    TARGET,
    XGB_PARAMS,
    aggregate_bins,
    load_bottlejoin_imports,
    time_split_bins,
)


def train_xgb_export(train: pd.DataFrame) -> dict:
    import xgboost as xgb

    from xgb_advanced_bottlejoin import FEAT_COLS_BOTTLE  # noqa: WPS433

    feat_cols = [c for c in FEAT_COLS_BOTTLE if c in train.columns]
    X_tr = train[feat_cols]
    y_tr = train[TARGET].astype(float)
    params = {**XGB_PARAMS}
    if params.get("early_stopping_rounds"):
        params.pop("early_stopping_rounds", None)
    model = xgb.XGBRegressor(**params)
    model.fit(X_tr, y_tr)
    return {
        "model": model,
        "feature_names": feat_cols,
        "target": TARGET,
        "bin_span_years": 5,
        "schema": "xgb_advanced_bottlejoin FEAT_COLS_BOTTLE slice",
    }


def train_ols_export(train: pd.DataFrame) -> dict:
    cols = [c for c in NUM_COLS + CAT_COLS if c in train.columns]
    X_tr = train[cols]
    y_tr = train[TARGET].astype(float)
    pipe = make_pipeline(LinearRegression())
    pipe.fit(X_tr, y_tr)
    return {
        "pipeline": pipe,
        "columns": cols,
        "target": TARGET,
        "bin_span_years": 10,
        "schema": "linreg_baseline NUM_COLS + CAT_COLS intersect train columns",
    }


def export_timesfm_snapshot() -> None:
    try:
        import torch
        import timesfm as tfm
    except ImportError:
        print("Skipping TimesFM export (install torch + timesfm / vendor/timesfm).")
        return

    torch.set_float32_matmul_precision("high")
    model = tfm.TimesFM_2p5_200M_torch.from_pretrained(
        "google/timesfm-2.5-200m-pytorch"
    )
    model.compile(
        tfm.ForecastConfig(
            max_context=1024,
            max_horizon=256,
            normalize_inputs=True,
            use_continuous_quantile_head=True,
            force_flip_invariance=True,
            infer_is_positive=True,
            fix_quantile_crossing=True,
            per_core_batch_size=8,
        )
    )
    state_path = MODEL_DIR / "timesfm_state.pt"
    inner = getattr(model, "model", None)
    if inner is None or not hasattr(inner, "state_dict"):
        raise RuntimeError("TimesFM has no inner .model for checkpoint export.")
    torch.save(inner.state_dict(), state_path)

    fc = {
        "max_context": 1024,
        "max_horizon": 256,
        "normalize_inputs": True,
        "use_continuous_quantile_head": True,
        "force_flip_invariance": True,
        "infer_is_positive": True,
        "fix_quantile_crossing": True,
        "per_core_batch_size": 8,
    }
    manifest = {
        "hf_model_id": "google/timesfm-2.5-200m-pytorch",
        "forecast_config": fc,
        "notes": "Shared weights for annual and binned univariate forecasting API.",
    }
    (MODEL_DIR / "timesfm_manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"wrote {state_path} and timesfm_manifest.json")


def main():
    load_bottlejoin_imports()
    from binned_regression_compare import build_bottle  # noqa: WPS433

    df = build_bottle()
    yr0 = int(df["year"].min())

    print("training XGBoost (5-yr bins)...")
    b5 = aggregate_bins(df, 5, yr0)
    tr5, _ = time_split_bins(b5)
    xgb_bundle = train_xgb_export(tr5)
    joblib.dump(xgb_bundle, MODEL_DIR / "xgboost_binned_5yr.joblib")
    print(f"wrote {MODEL_DIR / 'xgboost_binned_5yr.joblib'}")

    print("training OLS pipeline (10-yr bins)...")
    b10 = aggregate_bins(df, 10, yr0)
    tr10, _ = time_split_bins(b10)
    ols_bundle = train_ols_export(tr10)
    joblib.dump(ols_bundle, MODEL_DIR / "ols_pipeline_binned_10yr.joblib")
    print(f"wrote {MODEL_DIR / 'ols_pipeline_binned_10yr.joblib'}")

    export_timesfm_snapshot()


if __name__ == "__main__":
    main()
