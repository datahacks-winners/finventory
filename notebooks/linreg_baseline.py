"""Plain linear regression baseline for per-tow log-density prediction.

Same feature matrix and time-based split as
``notebooks/xgb_advanced_bottlejoin.py`` — the only differences are
what linear models need that XGBoost didn't:

* NaN-handling: ``SimpleImputer(strategy="median", add_indicator=True)``
  on the numeric columns. Adds a binary ``*_missing`` indicator for
  every column that has at least one NaN, so the model can still tell
  "no bottle match" from "bottle match that happened to be zero".
* Categorical encoding: ``species_id`` and ``tow_type_code`` go through
  ``OneHotEncoder`` instead of being treated as ordinals.
* Feature scaling: numeric columns are ``StandardScaler``ed so the
  Ridge / Lasso penalty makes sense.

Four linear models are fit with identical preprocessing:

* ``OLS``      — plain ordinary least squares, no regularisation.
* ``Ridge``    — L2 with α chosen by 5-fold CV on the train set.
* ``Lasso``    — L1 with α chosen by 5-fold CV (gives feature selection).
* ``ElasticNet`` — 50/50 L1-L2 mix, α chosen by CV.

The script also reports the top-20 standardized Ridge coefficients so
you can read off what each feature is worth, and writes a bar chart
comparing linear-model test R² against the XGBoost bottle-sparse model.

Run::

    .venv/bin/python notebooks/linreg_baseline.py

Outputs::

    notebooks/outputs/linreg_metrics.json
    notebooks/outputs/figures/linreg_vs_xgb_r2.png
    notebooks/outputs/tables/linreg_top_coefficients.csv
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ.setdefault("MPLCONFIGDIR", str(HERE.parent / ".venv" / ".mplcache"))
sys.path.insert(0, str(HERE))
from output_paths import FIG, JSN, OUT, TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import (
    ElasticNetCV,
    LassoCV,
    LinearRegression,
    RidgeCV,
)
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA = HERE.parent / "data"
BOTTLE_PARQUET = OUT / "larvae_bottle_enriched.parquet"
XGB_METRICS_JSON = JSN / "xgb_bottle_metrics.json"

TRAIN_MAX_YEAR = 2018
TEST_MIN_YEAR = 2019
ADVANCED_STAGES = {"FLEX", "POFX", "PFLX", "POSF", "POST", "TRAN", "TRNS", "TRANS"}

# --- Feature partition (matches xgb_advanced_bottlejoin.py + OHE cats) ------

NUM_COLS = [
    # tow + season + space
    "year", "month_sin", "month_cos", "latitude", "longitude",
    "log_volume_sampled", "standard_haul_factor",
    # life-stage signals (joined from Eggs / Stages / Sizes)
    "log_matched_eggs", "frac_past_flexion", "mean_larva_size_mm",
    # upper-ocean bottle means
    "bot_sst_100m", "bot_sal_100m", "bot_sigma_100m", "bot_o2_100m",
    "bot_chla_100m", "bot_po4_100m", "bot_no3_100m", "bot_sio3_100m",
    # derived ecology features
    "bot_mld_05", "bot_strat_dT", "bot_chla_max", "bot_chla_int",
    "bot_o2_min_200", "bot_nitracline",
    # per-cast weather
    "cast_wind_spd", "cast_wind_dir", "cast_barom",
    "cast_dry_t", "cast_wet_t", "cast_secchi",
]
CAT_COLS = ["species_id", "tow_type_code"]

TARGET = "y"


# ---------------------------------------------------------------------------
# Data assembly (copy of xgb_advanced_bottlejoin.build_bottle + helpers)
# ---------------------------------------------------------------------------


def _prepare_base(larvae: pd.DataFrame) -> pd.DataFrame:
    larvae["time"] = pd.to_datetime(larvae["time"], errors="coerce", utc=True)
    larvae = larvae.dropna(
        subset=["larvae_10m2", "time", "latitude", "longitude", "scientific_name"]
    )
    larvae = larvae[larvae["larvae_10m2"] >= 0].copy()
    larvae["year"] = larvae["time"].dt.year.astype("int32")
    larvae["month"] = larvae["time"].dt.month.astype("int16")
    larvae["month_sin"] = np.sin(2 * np.pi * larvae["month"] / 12.0)
    larvae["month_cos"] = np.cos(2 * np.pi * larvae["month"] / 12.0)
    larvae["cruise"] = larvae["cruise"].astype(str)
    return larvae


def _join_eggs_stages_sizes(larvae: pd.DataFrame) -> pd.DataFrame:
    print("  joining Eggs.csv, LarvaeStages.csv, LarvaeSizes.csv...")
    eggs = pd.read_csv(
        DATA / "Eggs.csv",
        usecols=["cruise", "line", "station", "scientific_name", "eggs_10m2"],
        low_memory=False,
    )
    eggs["cruise"] = eggs["cruise"].astype(str)
    eggs_agg = (
        eggs.dropna(subset=["eggs_10m2"])
        .groupby(["cruise", "line", "station", "scientific_name"], dropna=False)["eggs_10m2"]
        .sum().reset_index().rename(columns={"eggs_10m2": "matched_eggs_10m2"})
    )
    larvae = larvae.merge(eggs_agg, on=["cruise", "line", "station", "scientific_name"], how="left")

    stages = pd.read_csv(
        DATA / "LarvaeStages.csv",
        usecols=["cruise", "line", "station", "scientific_name",
                 "larvae_stage", "larvae_stage_count"],
        low_memory=False,
    )
    stages["cruise"] = stages["cruise"].astype(str)
    stages["stage_clean"] = (
        stages["larvae_stage"].astype(str).str.upper().str.strip().str.replace(" ", "")
    )
    stages["advanced"] = stages["stage_clean"].isin(ADVANCED_STAGES).astype(int)
    stages["larvae_stage_count"] = stages["larvae_stage_count"].fillna(0).astype(float)
    stage_agg = (
        stages.groupby(["cruise", "line", "station", "scientific_name"])
        .agg(stage_total=("larvae_stage_count", "sum"),
             stage_adv=("advanced",
                        lambda s: (s * stages.loc[s.index, "larvae_stage_count"]).sum()))
        .reset_index()
    )
    stage_agg["frac_past_flexion"] = np.where(
        stage_agg["stage_total"] > 0,
        stage_agg["stage_adv"] / stage_agg["stage_total"],
        np.nan,
    )
    larvae = larvae.merge(
        stage_agg[["cruise", "line", "station", "scientific_name", "frac_past_flexion"]],
        on=["cruise", "line", "station", "scientific_name"], how="left",
    )

    sizes = pd.read_csv(
        DATA / "LarvaeSizes.csv",
        usecols=["cruise", "line", "station", "scientific_name",
                 "larvae_size", "larvae_count"],
        low_memory=False,
    )
    sizes["cruise"] = sizes["cruise"].astype(str)
    sizes = sizes.dropna(subset=["larvae_size"])
    sizes["larvae_count"] = sizes["larvae_count"].fillna(1).astype(float)
    sizes["num"] = sizes["larvae_size"].astype(float) * sizes["larvae_count"]
    size_agg = (
        sizes.groupby(["cruise", "line", "station", "scientific_name"])
        .agg(num=("num", "sum"), den=("larvae_count", "sum")).reset_index()
    )
    size_agg["mean_larva_size_mm"] = np.where(
        size_agg["den"] > 0, size_agg["num"] / size_agg["den"], np.nan
    )
    larvae = larvae.merge(
        size_agg[["cruise", "line", "station", "scientific_name", "mean_larva_size_mm"]],
        on=["cruise", "line", "station", "scientific_name"], how="left",
    )
    return larvae


def build_dataset() -> pd.DataFrame:
    if not BOTTLE_PARQUET.exists():
        raise FileNotFoundError(
            f"{BOTTLE_PARQUET} missing. Run notebooks/enrich_with_bottle.py first."
        )
    print("loading bottle-enriched Larvae parquet...")
    df = pd.read_parquet(BOTTLE_PARQUET)
    df = _prepare_base(df)
    df = _join_eggs_stages_sizes(df)

    # Derived numeric columns
    df["log_matched_eggs"] = np.log1p(df["matched_eggs_10m2"].fillna(0))
    df["log_volume_sampled"] = np.log1p(
        pd.to_numeric(df["volume_sampled"], errors="coerce")
    )
    df["standard_haul_factor"] = pd.to_numeric(
        df["standard_haul_factor"], errors="coerce"
    )

    # Categoricals (keep NaN as its own category for OHE)
    df["tow_type_code"] = (
        df["tow_type"].astype("category").cat.codes.astype("int32")
    )
    df["species_id"] = (
        df["scientific_name"].astype("category").cat.codes.astype("int32")
    )

    # Force every expected numeric column to float (NaNs preserved)
    for c in NUM_COLS:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    df[TARGET] = np.log1p(df["larvae_10m2"].astype(float))
    return df


# ---------------------------------------------------------------------------
# Pipelines
# ---------------------------------------------------------------------------


def make_pipeline(estimator):
    """Pipeline: median-impute + missing-indicator + scale numerics,
    one-hot-encode categoricals, then the chosen linear model."""
    numeric = Pipeline(
        steps=[
            ("imp", SimpleImputer(strategy="median", add_indicator=True)),
            ("sc", StandardScaler(with_mean=False)),  # sparse-friendly
        ]
    )
    categorical = OneHotEncoder(handle_unknown="ignore", dtype=np.float32)
    pre = ColumnTransformer(
        [("num", numeric, NUM_COLS), ("cat", categorical, CAT_COLS)],
        remainder="drop",
        sparse_threshold=1.0,
    )
    return Pipeline([("pre", pre), ("est", estimator)])


def evaluate(name, pipe, X_tr, y_tr, X_te, y_te, t0):
    pred_tr = pipe.predict(X_tr)
    pred_te = pipe.predict(X_te)
    m = {
        "name": name,
        "train": {
            "r2": float(r2_score(y_tr, pred_tr)),
            "rmse": float(np.sqrt(mean_squared_error(y_tr, pred_tr))),
            "mae": float(mean_absolute_error(y_tr, pred_tr)),
        },
        "test": {
            "r2": float(r2_score(y_te, pred_te)),
            "rmse": float(np.sqrt(mean_squared_error(y_te, pred_te))),
            "mae": float(mean_absolute_error(y_te, pred_te)),
        },
    }
    print(f"  {name:<12s}  train R²={m['train']['r2']:.4f}  "
          f"test R²={m['test']['r2']:.4f}  RMSE={m['test']['rmse']:.3f}  "
          f"MAE={m['test']['mae']:.3f}")
    return m


def _all_ridge_coefs(pipe, ridge_top=True) -> pd.DataFrame:
    """All coefficients, annotated with feature name and |β|."""
    pre: ColumnTransformer = pipe.named_steps["pre"]
    est = pipe.named_steps["est"]
    num_names = pre.named_transformers_["num"].named_steps["imp"].get_feature_names_out(NUM_COLS)
    cat_names = pre.named_transformers_["cat"].get_feature_names_out(CAT_COLS)
    feat_names = np.concatenate([num_names, cat_names])
    coefs = est.coef_.ravel() if hasattr(est, "coef_") else np.zeros(len(feat_names))
    n = min(len(coefs), len(feat_names))
    df = pd.DataFrame({"feature": feat_names[:n], "coef": coefs[:n]})
    df["abs"] = df["coef"].abs()
    return df


def top_coefficients(pipe, top_n=25) -> pd.DataFrame:
    """Extract the standardized coefficients sorted by |β|."""
    df = _all_ridge_coefs(pipe)
    return df.sort_values("abs", ascending=False).head(top_n).reset_index(drop=True)


def main():
    df = build_dataset()
    train = df[df["year"] <= TRAIN_MAX_YEAR]
    test = df[df["year"] >= TEST_MIN_YEAR]
    print(f"\ntrain: {len(train):>8,} rows  test: {len(test):>7,} rows")
    print(f"species: {df['species_id'].nunique():,}  "
          f"tow types: {df['tow_type_code'].nunique():,}")
    print(f"numeric features: {len(NUM_COLS)}  categorical features: {len(CAT_COLS)}")

    X_tr, y_tr = train[NUM_COLS + CAT_COLS], train[TARGET].astype(float)
    X_te, y_te = test[NUM_COLS + CAT_COLS], test[TARGET].astype(float)

    print("\ntraining linear models...")
    results = {}

    # 1. OLS
    pipe = make_pipeline(LinearRegression())
    pipe.fit(X_tr, y_tr)
    results["OLS"] = evaluate("OLS", pipe, X_tr, y_tr, X_te, y_te, None)

    # 2. RidgeCV
    pipe = make_pipeline(RidgeCV(alphas=np.logspace(-2, 3, 12), cv=5))
    pipe.fit(X_tr, y_tr)
    best_alpha = pipe.named_steps["est"].alpha_
    print(f"    Ridge best α = {best_alpha:g}")
    results["Ridge"] = evaluate("Ridge", pipe, X_tr, y_tr, X_te, y_te, None)
    results["Ridge"]["best_alpha"] = float(best_alpha)
    ridge_top = top_coefficients(pipe, top_n=25)

    # 3. LassoCV (can be slow; cap max iter)
    pipe = make_pipeline(
        LassoCV(cv=5, n_alphas=20, max_iter=5000, random_state=0, n_jobs=-1)
    )
    pipe.fit(X_tr, y_tr)
    best_alpha = pipe.named_steps["est"].alpha_
    n_nonzero = int(np.count_nonzero(pipe.named_steps["est"].coef_))
    print(f"    Lasso best α = {best_alpha:g}  (nonzero coefs: {n_nonzero})")
    results["Lasso"] = evaluate("Lasso", pipe, X_tr, y_tr, X_te, y_te, None)
    results["Lasso"]["best_alpha"] = float(best_alpha)
    results["Lasso"]["n_nonzero_coefs"] = n_nonzero

    # 4. ElasticNetCV
    pipe = make_pipeline(
        ElasticNetCV(cv=5, l1_ratio=0.5, n_alphas=20, max_iter=5000,
                      random_state=0, n_jobs=-1)
    )
    pipe.fit(X_tr, y_tr)
    best_alpha = pipe.named_steps["est"].alpha_
    n_nonzero = int(np.count_nonzero(pipe.named_steps["est"].coef_))
    print(f"    ElasticNet best α = {best_alpha:g}  (nonzero coefs: {n_nonzero})")
    results["ElasticNet"] = evaluate(
        "ElasticNet", pipe, X_tr, y_tr, X_te, y_te, None
    )
    results["ElasticNet"]["best_alpha"] = float(best_alpha)
    results["ElasticNet"]["n_nonzero_coefs"] = n_nonzero

    # --- Compare against XGBoost baselines ---------------------------------
    xgb = None
    if XGB_METRICS_JSON.exists():
        xgb = json.loads(XGB_METRICS_JSON.read_text())
        print("\n=== HEAD-TO-HEAD (linear vs. XGBoost) ===")
        print(f"  {'model':<32s}  {'train R²':>10s}  {'test R²':>9s}")
        for name, m in results.items():
            print(f"  {name:<32s}  {m['train']['r2']:>10.4f}  {m['test']['r2']:>9.4f}")
        for name, m in xgb["metrics"].items():
            tag = m.get("tag", name)
            print(f"  XGB: {tag:<27s}  {m['train']['r2']:>10.4f}  {m['test']['r2']:>9.4f}")

    # --- Top coefficients table -------------------------------------------
    print("\ntop-25 standardized Ridge coefficients (|β|) — all features:")
    with pd.option_context("display.max_rows", None, "display.width", 140):
        print(ridge_top.to_string(index=False))
    ridge_top.to_csv(TBL / "linreg_top_coefficients.csv", index=False)

    # Top coefficients among the *numeric* features only (the interesting
    # part for interpretation — species one-hots always dominate otherwise).
    ridge_full = _all_ridge_coefs(pipe, ridge_top=False)
    num_mask = ~ridge_full["feature"].str.startswith(("species_id_", "tow_type_code_"))
    ridge_num_top = (
        ridge_full[num_mask]
        .reindex(ridge_full.loc[num_mask, "abs"].sort_values(ascending=False).index)
        .head(20)
        .reset_index(drop=True)
    )
    print("\ntop-20 standardized Ridge coefficients (|β|) — numeric features only:")
    print(ridge_num_top.to_string(index=False))
    ridge_num_top.to_csv(TBL / "linreg_top_numeric_coefficients.csv", index=False)

    # --- Save metrics ------------------------------------------------------
    payload = {
        "models": results,
        "numeric_features": NUM_COLS,
        "categorical_features": CAT_COLS,
        "ridge_top_coefficients": ridge_top.to_dict(orient="records"),
        "compared_xgb_metrics_path": str(XGB_METRICS_JSON),
    }
    (JSN / "linreg_metrics.json").write_text(json.dumps(payload, indent=2))

    # --- Plot --------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(11, 5.5))
    names, test_r2, train_r2 = [], [], []
    for n, m in results.items():
        names.append(n)
        test_r2.append(m["test"]["r2"])
        train_r2.append(m["train"]["r2"])
    if xgb is not None:
        for key, m in xgb["metrics"].items():
            tag_short = {
                "baseline": "XGB cruise-CUFES",
                "envjoin-sparse": "XGB CUFES-envjoin",
                "bottle-sparse": "XGB bottle-sparse",
                "bottle-matched": "XGB bottle-matched",
            }.get(key, f"XGB {key}")
            names.append(tag_short)
            test_r2.append(m["test"]["r2"])
            train_r2.append(m["train"]["r2"])

    x = np.arange(len(names))
    w = 0.38
    ax.bar(x - w/2, train_r2, w, label="train R²", color="#6C8EBF")
    ax.bar(x + w/2, test_r2, w, label="test R²", color="#F4A261")
    for xi, v in zip(x - w/2, train_r2):
        ax.text(xi, v + 0.01, f"{v:.3f}", ha="center", fontsize=8)
    for xi, v in zip(x + w/2, test_r2):
        ax.text(xi, v + 0.01, f"{v:.3f}", ha="center", fontsize=8)
    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=30, ha="right")
    ax.set_ylabel("R²")
    ax.set_title("Linear regression vs. XGBoost (same bottle-sparse features, same split)")
    ax.legend()
    ax.grid(axis="y", alpha=0.2)
    fig.tight_layout()
    fig.savefig(FIG / "linreg_vs_xgb_r2.png", dpi=130)
    plt.close(fig)

    print(f"\nwrote {JSN/'linreg_metrics.json'}")
    print(f"wrote {TBL/'linreg_top_coefficients.csv'}")
    print(f"wrote {FIG/'linreg_vs_xgb_r2.png'}")


if __name__ == "__main__":
    main()
