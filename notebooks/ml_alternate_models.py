"""Train non–XGBoost models on the bottle-sparse Larvae matrix with
feature selection + hyperparameter tuning.

**Excluded** (already documented in ``notebooks/README.md``): XGBoost,
sklearn ``GradientBoostingRegressor``, linear OLS/Ridge/Lasso/ElasticNet,
Kalman, hand-composite rankers.

**Included**: ``HistGradientBoostingRegressor``, ``RandomForestRegressor``,
``ExtraTreesRegressor``, ``lightgbm.LGBMRegressor``.

Same time split and target as ``xgb_advanced_bottlejoin.py`` (train ≤ 2018,
test ≥ 2019, ``y = log1p(larvae_10m2)``).

Run::

    .venv/bin/python notebooks/enrich_with_bottle.py   # if parquet missing
    .venv/bin/python notebooks/ml_alternate_models.py

Outputs: ``notebooks/outputs/ml_alternate_models.json``
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ.setdefault("MPLCONFIGDIR", str(HERE.parent / ".venv" / ".mplcache"))
sys.path.insert(0, str(HERE))

import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from scipy.stats import loguniform, randint, uniform
from sklearn.ensemble import (
    ExtraTreesRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
)
from sklearn.feature_selection import SelectFromModel
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import RandomizedSearchCV
from output_paths import JSN, OUT, ensure_output_dirs  # noqa: E402
from xgb_advanced_bottlejoin import (
    FEAT_COLS_BOTTLE,
    TARGET,
    build_bottle,
    _time_split,
)

ensure_output_dirs()

# Tuning budget: large train set → subsample rows for RandomizedSearchCV only
CV_SUBSAMPLE = 120_000
CV_ITER = 18
CV_FOLDS = 3
RANDOM_STATE = 0


def _jsonable(obj):
    if isinstance(obj, dict):
        return {k: _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_jsonable(v) for v in obj]
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def _metrics(y_true, y_pred) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return {
        "r2": float(r2_score(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
    }


def _make_xy(train: pd.DataFrame, test: pd.DataFrame, feat_cols: list[str]):
    X_tr = train[feat_cols].copy()
    X_te = test[feat_cols].copy()
    y_tr = train[TARGET].astype(float)
    y_te = test[TARGET].astype(float)
    return X_tr, y_tr, X_te, y_te


def _cv_indices(n: int, rng: np.random.Generator) -> np.ndarray:
    if n <= CV_SUBSAMPLE:
        return np.arange(n)
    return rng.choice(n, size=CV_SUBSAMPLE, replace=False)


def main():
    print("loading bottle-enriched data (same as xgb_advanced_bottlejoin)...")
    bottle_df = build_bottle()
    train_df, test_df = _time_split(bottle_df)
    feat_cols = [c for c in FEAT_COLS_BOTTLE if c in train_df.columns]
    X_tr, y_tr, X_te, y_te = _make_xy(train_df, test_df, feat_cols)
    n_train, n_test = len(X_tr), len(X_te)
    print(f"  n_train={n_train:,}  n_test={n_test:,}  |features|={len(feat_cols)}")

    # --- Median imputation (same simple strategy for all models) -----------
    imputer = SimpleImputer(strategy="median")
    X_tr_i = imputer.fit_transform(X_tr)
    X_te_i = imputer.transform(X_te)
    feat_names = list(feat_cols)

    # --- Feature selection: ET importance, drop below median ---------------
    print("\nfeature selection: SelectFromModel(ExtraTreesRegressor, threshold=median)...")
    et_sel = ExtraTreesRegressor(
        n_estimators=200,
        max_depth=None,
        min_samples_leaf=80,
        max_features=0.35,
        n_jobs=-1,
        random_state=RANDOM_STATE,
    )
    et_sel.fit(X_tr_i, y_tr)
    selector = SelectFromModel(et_sel, prefit=True, threshold="median")
    support = selector.get_support()
    n_keep = int(support.sum())
    selected_names = [feat_names[i] for i, k in enumerate(support) if k]
    print(f"  kept {n_keep}/{len(feat_names)} features: {selected_names[:8]}{'...' if n_keep > 8 else ''}")

    X_tr_s = X_tr_i[:, support]
    X_te_s = X_te_i[:, support]

    rng = np.random.default_rng(RANDOM_STATE)
    cv_idx = _cv_indices(len(X_tr_s), rng)
    X_cv = X_tr_s[cv_idx]
    y_cv = y_tr.iloc[cv_idx].to_numpy()

    results: dict = {
        "split": {
            "train_max_year": 2018,
            "test_min_year": 2019,
            "n_train": n_train,
            "n_test": n_test,
        },
        "feature_selection": {
            "method": "SelectFromModel(ExtraTreesRegressor(n=200), threshold=median)",
            "n_features_in": len(feat_names),
            "n_features_selected": n_keep,
            "selected_features": selected_names,
        },
        "cv_subsample": int(len(cv_idx)),
        "models": {},
    }

    # --- Model 1: HistGradientBoosting -------------------------------------
    print("\n=== HistGradientBoostingRegressor (RandomizedSearchCV) ===")
    hgb = HistGradientBoostingRegressor(random_state=RANDOM_STATE)
    hgb_grid = {
        "max_depth": randint(6, 16),
        "learning_rate": loguniform(1e-2, 2e-1),
        "max_iter": randint(250, 700),
        "l2_regularization": uniform(0.0, 1.5),
        "min_samples_leaf": randint(15, 200),
        "max_leaf_nodes": randint(31, 127),
    }
    hgb_search = RandomizedSearchCV(
        hgb,
        hgb_grid,
        n_iter=CV_ITER,
        cv=CV_FOLDS,
        scoring="r2",
        n_jobs=-1,
        random_state=RANDOM_STATE,
        verbose=1,
    )
    hgb_search.fit(X_cv, y_cv)
    best_hgb = hgb_search.best_estimator_
    best_hgb.fit(X_tr_s, y_tr)
    pred_tr = best_hgb.predict(X_tr_s)
    pred_te = best_hgb.predict(X_te_s)
    results["models"]["HistGradientBoostingRegressor"] = {
        "best_params": _jsonable(hgb_search.best_params_),
        "best_cv_r2": float(hgb_search.best_score_),
        "train": _metrics(y_tr, pred_tr),
        "test": _metrics(y_te, pred_te),
    }
    print(
        f"  best CV R²={hgb_search.best_score_:.4f}  "
        f"test R²={results['models']['HistGradientBoostingRegressor']['test']['r2']:.4f}"
    )

    # --- Model 2: RandomForest ---------------------------------------------
    print("\n=== RandomForestRegressor (RandomizedSearchCV) ===")
    rf = RandomForestRegressor(random_state=RANDOM_STATE, n_jobs=-1)
    rf_grid = {
        "n_estimators": randint(200, 600),
        "max_depth": [None] + list(range(18, 45, 3)),
        "min_samples_leaf": randint(2, 60),
        "max_features": uniform(0.25, 0.55),
    }
    rf_search = RandomizedSearchCV(
        rf,
        rf_grid,
        n_iter=CV_ITER,
        cv=CV_FOLDS,
        scoring="r2",
        n_jobs=-1,
        random_state=RANDOM_STATE,
        verbose=1,
    )
    rf_search.fit(X_cv, y_cv)
    best_rf = rf_search.best_estimator_
    # max_features float from uniform — sklearn expects float in (0,1] for fraction
    best_rf.fit(X_tr_s, y_tr)
    pred_tr = best_rf.predict(X_tr_s)
    pred_te = best_rf.predict(X_te_s)
    results["models"]["RandomForestRegressor"] = {
        "best_params": _jsonable(rf_search.best_params_),
        "best_cv_r2": float(rf_search.best_score_),
        "train": _metrics(y_tr, pred_tr),
        "test": _metrics(y_te, pred_te),
    }

    print(
        f"  best CV R²={rf_search.best_score_:.4f}  "
        f"test R²={results['models']['RandomForestRegressor']['test']['r2']:.4f}"
    )

    # --- Model 3: ExtraTrees (separate from selector) ----------------------
    print("\n=== ExtraTreesRegressor (RandomizedSearchCV) ===")
    et = ExtraTreesRegressor(random_state=RANDOM_STATE, n_jobs=-1)
    et_grid = {
        "n_estimators": randint(200, 600),
        "max_depth": [None] + list(range(20, 50, 3)),
        "min_samples_leaf": randint(2, 50),
        "max_features": uniform(0.25, 0.55),
    }
    et_search = RandomizedSearchCV(
        et,
        et_grid,
        n_iter=CV_ITER,
        cv=CV_FOLDS,
        scoring="r2",
        n_jobs=-1,
        random_state=RANDOM_STATE,
        verbose=1,
    )
    et_search.fit(X_cv, y_cv)
    best_et = et_search.best_estimator_
    best_et.fit(X_tr_s, y_tr)
    pred_tr = best_et.predict(X_tr_s)
    pred_te = best_et.predict(X_te_s)
    results["models"]["ExtraTreesRegressor"] = {
        "best_params": _jsonable(et_search.best_params_),
        "best_cv_r2": float(et_search.best_score_),
        "train": _metrics(y_tr, pred_tr),
        "test": _metrics(y_te, pred_te),
    }
    print(
        f"  best CV R²={et_search.best_score_:.4f}  "
        f"test R²={results['models']['ExtraTreesRegressor']['test']['r2']:.4f}"
    )

    # --- Model 4: LightGBM -------------------------------------------------
    print("\n=== LGBMRegressor (RandomizedSearchCV) ===")
    lgb = LGBMRegressor(
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbose=-1,
    )
    lgb_grid = {
        "n_estimators": randint(400, 1200),
        "max_depth": randint(6, 14),
        "learning_rate": loguniform(0.02, 0.12),
        "num_leaves": randint(48, 192),
        "subsample": uniform(0.65, 0.3),
        "colsample_bytree": uniform(0.65, 0.3),
        "min_child_samples": randint(20, 200),
        "reg_lambda": loguniform(1e-2, 10.0),
    }
    lgb_search = RandomizedSearchCV(
        lgb,
        lgb_grid,
        n_iter=CV_ITER,
        cv=CV_FOLDS,
        scoring="r2",
        n_jobs=-1,
        random_state=RANDOM_STATE,
        verbose=1,
    )
    lgb_search.fit(X_cv, y_cv)
    best_lgb = lgb_search.best_estimator_
    best_lgb.fit(X_tr_s, y_tr)
    pred_tr = best_lgb.predict(X_tr_s)
    pred_te = best_lgb.predict(X_te_s)
    results["models"]["LGBMRegressor"] = {
        "best_params": _jsonable(lgb_search.best_params_),
        "best_cv_r2": float(lgb_search.best_score_),
        "train": _metrics(y_tr, pred_tr),
        "test": _metrics(y_te, pred_te),
    }
    print(
        f"  best CV R²={lgb_search.best_score_:.4f}  "
        f"test R²={results['models']['LGBMRegressor']['test']['r2']:.4f}"
    )

    # --- Best by test R² ---------------------------------------------------
    ranked = sorted(
        results["models"].items(),
        key=lambda kv: kv[1]["test"]["r2"],
        reverse=True,
    )
    results["best_test_r2"] = {
        "model": ranked[0][0],
        "test_r2": ranked[0][1]["test"]["r2"],
        "test_rmse": ranked[0][1]["test"]["rmse"],
    }
    results["reference_xgb_bottle_sparse_test_r2"] = 0.544  # from README

    out_path = JSN / "ml_alternate_models.json"
    out_path.write_text(json.dumps(_jsonable(results), indent=2))
    print(f"\n=== SUMMARY (test R², higher=better) ===")
    for name, m in ranked:
        print(
            f"  {name:<32s}  test R²={m['test']['r2']:.4f}  "
            f"RMSE={m['test']['rmse']:.4f}  MAE={m['test']['mae']:.4f}"
        )
    print(f"\n  README XGB bottle-sparse reference:  test R² ≈ 0.544")
    print(f"  best alternate: {results['best_test_r2']['model']}  "
          f"test R²={results['best_test_r2']['test_r2']:.4f}")
    print(f"\nwrote {out_path}")


if __name__ == "__main__":
    main()
