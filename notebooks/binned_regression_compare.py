"""Train XGBoost, OLS/Ridge, and optionally TimesFM on **5-year** and **10-year**
non-overlapping bins of the larvae–bottle–cast joined data.

Transformation
--------------
Each tow row from ``build_bottle()`` (same pipeline as
``xgb_advanced_bottlejoin.py``) is assigned a bin start year::

    bin_start = yr0 + ((year - yr0) // span) * span

with ``yr0 = min(year)`` in the survey and ``span ∈ {5, 10}``.

Rows are aggregated with **(scientific_name, bin_start)**:

* **Target** ``y`` = ``log1p(mean(larvae_10m²))`` within the bin — i.e. mean
  density *per tow* in that bin, then log1p (matches the interpretation
  “bin-average CPUE in transformed space”).
* **Features** = column-wise **means** of the same bottle / cast / tow
  fields used in ``FEAT_COLS_BOTTLE``, plus ``year`` set to the bin
  **representative year** ``bin_start + span // 2`` (integer center).
* ``tow_type_code`` = **modal** tow type per bin (not the mean code).

Time split (same as rest of the project): train ``year <= 2018``, test
``year >= 2019`` where ``year`` is that representative year.

TimesFM is evaluated on **per-species** histories of ``y`` ordered by
``bin_start``: hold out the last ``H`` bins, forecast ``H`` steps from
prior context, pool MAE vs **naive persistence** (repeat last training
value). Only species with enough bins are included.

Outputs (see ``output_paths.py``)::

    binned_regression_metrics.json   — in ``outputs/`` (root)
    tables/binned_regression_summary.csv
    figures/binned_regression_pred_scatter_{5yr,10yr}.png
    figures/binned_regression_pred_anchors_{5yr,10yr}.png

TimesFM is **opt-in** (``--timesfm``). Following ``timesfm_larvae_forecast.py``:

* ``torch`` / ``timesfm`` are imported **inside** the TimesFM block with
  ``torch.set_float32_matmul_precision("high")``, and ``ForecastConfig`` matches
  that script (including ``per_core_batch_size=8``).
* **XGBoost + OLS + Ridge run first**; TimesFM loads **after** those fits finish.
  Keeping PyTorch and XGBoost ``fit()`` out of the same critical section avoids
  macOS SIGSEGV from LibTorch + OpenMP interactions.
"""
from __future__ import annotations

import argparse
import gc
import os
import sys
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".venv" / ".mplcache"))

# Match timesfm_larvae_forecast.py — enough history for per-species bin series.
MAX_TIMESFM_CONTEXT = 1024

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import pearsonr
from sklearn.linear_model import LinearRegression, RidgeCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

sys.path.insert(0, str(HERE))
from linreg_baseline import CAT_COLS, NUM_COLS, make_pipeline  # noqa: E402
from output_paths import FIG, JSN, OUT, TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

# Filled in main() via ``load_bottlejoin_imports()``.
FEAT_COLS_BOTTLE: list | None = None
TARGET = "y"
TRAIN_MAX_YEAR = 2018
TEST_MIN_YEAR = 2019
build_bottle = None  # type: ignore

# Same four species as ``kalman_survivability.ANCHORS`` (for diagnostic plots).
ANCHOR_SPECIES = (
    "Engraulis mordax",
    "Sardinops sagax",
    "Merluccius productus",
    "Trachurus symmetricus",
)

MIN_TOWS_PER_BIN = 5
TIMESFM_HOLDOUT_BINS = 3

# Same XGB hyperparameters as bottle sparse (slightly fewer rounds if tiny test)
XGB_PARAMS = dict(
    n_estimators=800,
    max_depth=8,
    learning_rate=0.05,
    subsample=0.85,
    colsample_bytree=0.85,
    reg_lambda=1.0,
    tree_method="hist",
    n_jobs=-1,
    random_state=0,
    early_stopping_rounds=35,
)


def _tow_mode(s: pd.Series):
    s = pd.to_numeric(s, errors="coerce").dropna()
    if s.empty:
        return np.nan
    m = s.mode()
    return float(m.iloc[0]) if len(m) else float(s.iloc[0])


def aggregate_bins(df: pd.DataFrame, span: int, yr0: int) -> pd.DataFrame:
    """One row per (species, bin_start)."""
    assert FEAT_COLS_BOTTLE is not None, "call load_bottlejoin_imports() first"
    df = df.copy()
    y_i = df["year"].astype(int)
    df["bin_start"] = yr0 + ((y_i - yr0) // span) * span

    keys = ["scientific_name", "bin_start"]
    # Modal tow type handled separately — do not take the mean of the code.
    mean_cols = [
        c
        for c in FEAT_COLS_BOTTLE
        if c in df.columns and c not in ("species_id", "tow_type_code")
    ]

    agg_parts = [
        df.groupby(keys, observed=True)
        .agg(
            larvae_mean=("larvae_10m2", "mean"),
            n_tows=("larvae_10m2", "size"),
            **{c: (c, "mean") for c in mean_cols},
        )
        .reset_index()
    ]
    base = agg_parts[0]

    tow_m = (
        df.groupby(keys, observed=True)["tow_type_code"]
        .agg(_tow_mode)
        .reset_index(name="tow_type_code")
    )
    base = base.merge(tow_m, on=keys, how="left")

    base["year"] = (base["bin_start"] + span // 2).astype(np.int32)
    base["y"] = np.log1p(base["larvae_mean"])

    le = LabelEncoder()
    le.fit(df["scientific_name"].astype(str))
    base["species_id"] = le.transform(base["scientific_name"].astype(str))

    base = base[base["n_tows"] >= MIN_TOWS_PER_BIN].copy()
    return base


def time_split_bins(binned: pd.DataFrame):
    tr = binned[binned["year"] <= TRAIN_MAX_YEAR].copy()
    te = binned[binned["year"] >= TEST_MIN_YEAR].copy()
    return tr, te


def train_xgb(train: pd.DataFrame, test: pd.DataFrame, tag: str):
    import xgboost as xgb

    assert FEAT_COLS_BOTTLE is not None
    feat_cols = [c for c in FEAT_COLS_BOTTLE if c in train.columns]
    X_tr, y_tr = train[feat_cols], train[TARGET].astype(float)
    X_te, y_te = test[feat_cols], test[TARGET].astype(float)
    params = {k: v for k, v in XGB_PARAMS.items()}
    if len(test) < 50:
        params.pop("early_stopping_rounds", None)
        params["n_estimators"] = 400
        model = xgb.XGBRegressor(**params)
        model.fit(X_tr, y_tr)
    else:
        model = xgb.XGBRegressor(**params)
        model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)

    p_tr, p_te = model.predict(X_tr), model.predict(X_te)
    return {
        "tag": tag,
        "n_train": len(train),
        "n_test": len(test),
        "train": _metrics(y_tr, p_tr),
        "test": _metrics(y_te, p_te),
        "pred_te": pd.Series(p_te, index=test.index, dtype=float),
    }


def load_bottlejoin_imports():
    """Import ``xgb_advanced_bottlejoin`` (XGBoost + ``build_bottle``)."""
    global FEAT_COLS_BOTTLE, build_bottle, TARGET, TRAIN_MAX_YEAR, TEST_MIN_YEAR
    from xgb_advanced_bottlejoin import (  # noqa: WPS433
        FEAT_COLS_BOTTLE as _feat,
        TARGET as _tgt,
        TRAIN_MAX_YEAR as _tmax,
        TEST_MIN_YEAR as _tmin,
        build_bottle as _bb,
    )

    FEAT_COLS_BOTTLE = _feat
    TARGET = _tgt
    TRAIN_MAX_YEAR = _tmax
    TEST_MIN_YEAR = _tmin
    build_bottle = _bb


def _strip_pred_te(m: dict) -> dict:
    """Omit ``pred_te`` so results are JSON-serializable."""
    return {k: v for k, v in m.items() if k != "pred_te"}


def plot_binned_test_scatter(
    test: pd.DataFrame,
    pred_te: dict[str, pd.Series],
    span: int,
    label: str,
) -> None:
    """One row: XGB / OLS / Ridge — actual vs predicted on held-out bins."""
    y = test[TARGET].astype(float).values
    names = ["xgb", "ols", "ridge"]
    preds = [pred_te[n].reindex(test.index).astype(float).values for n in names]
    all_y = np.r_[y, *preds]
    lo, hi = float(np.nanmin(all_y)), float(np.nanmax(all_y))
    pad = (hi - lo) * 0.04 + 1e-6
    lo, hi = lo - pad, hi + pad

    fig, axes = plt.subplots(1, 3, figsize=(11, 3.8))
    titles = ["XGBoost", "OLS", "Ridge"]
    for ax, name, title in zip(axes, names, titles):
        pred = pred_te[name].reindex(test.index).astype(float).values
        ax.scatter(y, pred, s=10, alpha=0.35, color="#333", edgecolors="none")
        ax.plot([lo, hi], [lo, hi], color="#d62728", lw=1.2, linestyle="--")
        ax.set_xlim(lo, hi)
        ax.set_ylim(lo, hi)
        ax.set_aspect("equal", adjustable="box")
        ax.set_xlabel("actual y (test)")
        ax.set_ylabel(f"{title} predicted")
        ax.grid(alpha=0.3)

    fig.suptitle(
        f"Binned ({span}-yr) regression — test scatter (year ≥ {TEST_MIN_YEAR})",
        fontsize=11,
    )
    fig.tight_layout()
    outp = FIG / f"binned_regression_pred_scatter_{label}.png"
    fig.savefig(outp, dpi=140, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {outp}")


def plot_binned_anchor_series(
    train: pd.DataFrame,
    test: pd.DataFrame,
    pred_te: dict[str, pd.Series],
    span: int,
    label: str,
) -> None:
    """2×2 panels matching TimesFM anchor layout: history + test predictions."""
    fig, axes = plt.subplots(2, 2, figsize=(11, 8))
    axes = axes.ravel()

    for ax, sp in zip(axes, ANCHOR_SPECIES):
        tr = train[train["scientific_name"] == sp].sort_values("bin_start")
        te = test[test["scientific_name"] == sp].sort_values("bin_start")
        if len(tr):
            ax.plot(
                tr["bin_start"],
                tr[TARGET],
                "o-",
                color="#555",
                ms=3,
                lw=1,
                label="train actual",
            )
        if len(te):
            ax.plot(
                te["bin_start"],
                te[TARGET],
                "s-",
                color="#2ca02c",
                ms=5,
                lw=2,
                label="test actual",
            )
            idx = te.index
            ax.plot(
                te["bin_start"],
                pred_te["xgb"].reindex(idx).values,
                "^--",
                color="#d62728",
                ms=4,
                lw=1.5,
                label="XGB",
            )
            ax.plot(
                te["bin_start"],
                pred_te["ols"].reindex(idx).values,
                "v:",
                color="#1f77b4",
                ms=3,
                lw=1.5,
                label="OLS",
            )
            ax.plot(
                te["bin_start"],
                pred_te["ridge"].reindex(idx).values,
                "+-",
                color="#ff7f0e",
                ms=4,
                lw=1.5,
                label="Ridge",
            )
        ax.set_title(sp[:42])
        ax.set_xlabel(f"bin start year ({span}-yr bins)")
        ax.set_ylabel("log1p(mean larvae / 10m²)")
        ax.legend(loc="best", fontsize=6)
        ax.grid(alpha=0.3)

    fig.suptitle(
        f"Binned regression — anchor species ({label}, test period)",
        fontsize=12,
    )
    fig.tight_layout()
    outp = FIG / f"binned_regression_pred_anchors_{label}.png"
    fig.savefig(outp, dpi=140, bbox_inches="tight")
    plt.close(fig)
    print(f"  wrote {outp}")


def _metrics(y_true, y_pred):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return {
        "r2": float(r2_score(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "pearson_r": float(pearsonr(y_true, y_pred).statistic)
        if len(y_true) > 2
        else float("nan"),
    }


def train_linreg(train: pd.DataFrame, test: pd.DataFrame, name: str, ridge: bool):
    cols = [c for c in NUM_COLS + CAT_COLS if c in train.columns]
    X_tr, y_tr = train[cols], train[TARGET].astype(float)
    X_te, y_te = test[cols], test[TARGET].astype(float)
    if ridge:
        cv_folds = max(3, min(5, max(len(train) // 5, 3)))
        est = RidgeCV(alphas=np.logspace(-3, 3, 14), cv=cv_folds)
        pipe = make_pipeline(est)
    else:
        pipe = make_pipeline(LinearRegression())
    pipe.fit(X_tr, y_tr)
    p_tr = pipe.predict(X_tr)
    p_te = pipe.predict(X_te)
    out = {
        "tag": name,
        "n_train": len(train),
        "n_test": len(test),
        "train": _metrics(y_tr, p_tr),
        "test": _metrics(y_te, p_te),
        "pred_te": pd.Series(p_te, index=test.index, dtype=float),
    }
    if ridge and hasattr(pipe.named_steps["est"], "alpha_"):
        out["ridge_alpha"] = float(pipe.named_steps["est"].alpha_)
    return out


def eval_timesfm_binned(
    model,
    binned: pd.DataFrame,
    horizon: int = TIMESFM_HOLDOUT_BINS,
):
    """Same loop shape as ``timesfm_larvae_forecast``: list of float32 arrays."""
    maes_tf = []
    maes_nv = []
    used = 0
    for sp, grp in binned.groupby("scientific_name", observed=True):
        grp = grp.sort_values("bin_start")
        vals = grp["y"].to_numpy(dtype=np.float32)
        if len(vals) < horizon + 4:
            continue
        train_v = vals[:-horizon]
        if len(train_v) > MAX_TIMESFM_CONTEXT:
            train_v = train_v[-MAX_TIMESFM_CONTEXT:]
        hold_v = vals[-horizon:]
        inputs = [train_v]
        point, _qu = model.forecast(horizon=horizon, inputs=inputs)
        pred = np.asarray(point[0], dtype=float)
        maes_tf.append(np.mean(np.abs(pred - hold_v)))
        naive = np.full(horizon, train_v[-1], dtype=float)
        maes_nv.append(np.mean(np.abs(naive - hold_v)))
        used += 1

    if not maes_tf:
        return {"available": True, "n_species": 0, "note": "no species with enough bins"}

    return {
        "available": True,
        "n_species": used,
        "holdout_bins": horizon,
        "mae_timesfm_mean": float(np.mean(maes_tf)),
        "mae_naive_persist_mean": float(np.mean(maes_nv)),
    }


def build_timesfm_model_larvae_style():
    """Mirror ``timesfm_larvae_forecast.main()`` loader + compile exactly."""
    torch = None
    timesfm_mod = None
    try:
        import torch as _torch
        import timesfm as _timesfm

        torch = _torch
        timesfm_mod = _timesfm
    except ImportError:
        return None

    torch.set_float32_matmul_precision("high")
    print("\nLoading TimesFM 2.5 from Hugging Face (same config as timesfm_larvae_forecast.py)...")
    model = timesfm_mod.TimesFM_2p5_200M_torch.from_pretrained(
        "google/timesfm-2.5-200m-pytorch"
    )
    model.compile(
        timesfm_mod.ForecastConfig(
            max_context=min(MAX_TIMESFM_CONTEXT, 1024),
            max_horizon=max(TIMESFM_HOLDOUT_BINS, 256),
            normalize_inputs=True,
            use_continuous_quantile_head=True,
            force_flip_invariance=True,
            infer_is_positive=True,
            fix_quantile_crossing=True,
            per_core_batch_size=8,
        )
    )
    return model


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--timesfm",
        action="store_true",
        help="also load TimesFM and evaluate per-species bin series (needs torch)",
    )
    args = ap.parse_args()

    results: dict = {
        "min_tows_per_bin": MIN_TOWS_PER_BIN,
        "timesfm_enabled": bool(args.timesfm),
        "splits": {},
    }

    print("importing xgb_advanced_bottlejoin...")
    load_bottlejoin_imports()
    assert build_bottle is not None

    print("loading bottle joined data (same as xgb_advanced_bottlejoin)...")
    df = build_bottle()
    yr0 = int(df["year"].min())
    print(f"  yr0 anchor for bins: {yr0}   year range {df['year'].min()}–{df['year'].max()}")
    results["yr0"] = yr0

    bins_store: dict[str, pd.DataFrame] = {}

    for span, label in [(5, "5yr"), (10, "10yr")]:
        print(f"\n=== {label} bins (span={span}) ===")
        binned = aggregate_bins(df, span, yr0)
        bins_store[label] = binned
        train, test = time_split_bins(binned)
        print(
            f"  binned rows: {len(binned):,}  "
            f"train {len(train):,}  test {len(test):,}  "
            f"species {binned['scientific_name'].nunique()}"
        )

        block: dict = {"span": span, "n_rows": len(binned)}

        xgb_res = train_xgb(train, test, f"xgb_{label}")
        ols_res = train_linreg(train, test, f"ols_{label}", ridge=False)
        ridge_res = train_linreg(train, test, f"ridge_{label}", ridge=True)

        block["xgb"] = _strip_pred_te(xgb_res)
        block["ols"] = _strip_pred_te(ols_res)
        block["ridge"] = _strip_pred_te(ridge_res)

        pred_bundle = {
            "xgb": xgb_res["pred_te"],
            "ols": ols_res["pred_te"],
            "ridge": ridge_res["pred_te"],
        }
        plot_binned_test_scatter(test, pred_bundle, span, label)
        plot_binned_anchor_series(train, test, pred_bundle, span, label)

        print(
            f"  XGB  train R²={block['xgb']['train']['r2']:.4f} "
            f"test R²={block['xgb']['test']['r2']:.4f}"
        )
        print(
            f"  OLS  train R²={block['ols']['train']['r2']:.4f} "
            f"test R²={block['ols']['test']['r2']:.4f}"
        )
        print(
            f"  Ridge train R²={block['ridge']['train']['r2']:.4f} "
            f"test R²={block['ridge']['test']['r2']:.4f} "
            f"α={block['ridge'].get('ridge_alpha', 'n/a')}"
        )

        if not args.timesfm:
            block["timesfm"] = {
                "available": False,
                "reason": "pass --timesfm to evaluate (after XGB/OLS/Ridge)",
            }

        results["splits"][label] = block

    if args.timesfm:
        tfm_model = build_timesfm_model_larvae_style()
        if tfm_model is None:
            print(
                "\nTimesFM unavailable. Install:\n"
                "  pip install torch\n"
                "  pip install -e vendor/timesfm[torch]\n",
                file=sys.stderr,
            )
            for label in ("5yr", "10yr"):
                results["splits"][label]["timesfm"] = {
                    "available": False,
                    "reason": "import failed",
                }
        else:
            try:
                for label in ("5yr", "10yr"):
                    print(f"\n  TimesFM on {label} binned series (last {TIMESFM_HOLDOUT_BINS} bins held out)...")
                    tfm = eval_timesfm_binned(tfm_model, bins_store[label])
                    results["splits"][label]["timesfm"] = tfm
                    if tfm.get("available") and tfm.get("n_species", 0):
                        print(
                            f"    MAE(TimesFM)={tfm['mae_timesfm_mean']:.4f}  "
                            f"MAE(naive)={tfm['mae_naive_persist_mean']:.4f}  "
                            f"n_species={tfm['n_species']}"
                        )
                    else:
                        print(f"    {tfm}")
            finally:
                del tfm_model
                gc.collect()

    outp = JSN / "binned_regression_metrics.json"
    with open(outp, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nwrote {outp}")

    rows = []
    for lab, blk in results["splits"].items():
        for model_name in ("xgb", "ols", "ridge"):
            m = blk[model_name]
            rows.append(
                {
                    "bin": lab,
                    "model": model_name,
                    "n_train": m["n_train"],
                    "n_test": m["n_test"],
                    "train_r2": m["train"]["r2"],
                    "test_r2": m["test"]["r2"],
                    "test_rmse": m["test"]["rmse"],
                    "test_mae": m["test"]["mae"],
                    "test_mae_naive": np.nan,
                    "timesfm_note": "",
                }
            )
        tfm = blk["timesfm"]
        rows.append(
            {
                "bin": lab,
                "model": "timesfm_holdout",
                "n_train": tfm.get("n_species", np.nan),
                "n_test": tfm.get("holdout_bins", np.nan),
                "train_r2": np.nan,
                "test_r2": np.nan,
                "test_rmse": np.nan,
                "test_mae": tfm.get("mae_timesfm_mean", np.nan),
                "test_mae_naive": tfm.get("mae_naive_persist_mean", np.nan),
                "timesfm_note": tfm.get("reason", "")
                if not tfm.get("available", True)
                else "",
            }
        )

    pd.DataFrame(rows).to_csv(TBL / "binned_regression_summary.csv", index=False)
    print(f"wrote {TBL / 'binned_regression_summary.csv'}")


if __name__ == "__main__":
    main()
