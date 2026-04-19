"""Learned sustainability ranker using XGBoost regression on raw larva
counts / density.

Philosophy (vs. the composite score in ``run_analysis.py``):

* No handpicked feature weights.
* No handpicked Seafood-Watch labels.
* Target is observable: ``log1p(larvae_10m2)`` per net tow.
* Features are raw context: year, month, latitude, longitude,
  species id.
* Train/test split is **time-based** (train ≤ 2018, test ≥ 2019) so we
  are measuring whether the model extrapolates forward, not just
  interpolates.

Ranking is derived from the trained model by predicting each species'
expected log-density on its own historical stations in two windows:

* "earlier"  = 2005–2015 (baseline)
* "recent"   = 2019–2023 (the model's test window)

and then:

* ``xgb_recent_log_density``  — how abundant the model thinks it is now,
* ``xgb_delta_log_density``    — how much abundance has shifted,
* ``xgb_score = z(recent) + z(delta)``  (equal weights).

Run from repo root::

    .venv/bin/python notebooks/xgb_ranker.py
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
import xgboost as xgb
from scipy.stats import pearsonr, spearmanr
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder

from features import load_all

OUT_DIR = OUT

FEAT_COLS = ["year", "month_sin", "month_cos", "latitude", "longitude", "species_id"]
TARGET = "y"  # log1p(larvae_10m2)

TRAIN_MAX_YEAR = 2018
TEST_MIN_YEAR = 2019
EARLIER = (2005, 2015)
RECENT = (2019, 2023)

# Minimum train rows per species before we trust its predicted score.
MIN_TRAIN_OBS = 30

VALIDATION = [
    ("Sardinops sagax", "Pacific sardine"),
    ("Engraulis mordax", "Northern anchovy"),
    ("Merluccius productus", "Pacific hake"),
    ("Trachurus symmetricus", "Jack mackerel"),
]


def build_dataset() -> tuple[pd.DataFrame, LabelEncoder]:
    tables = load_all()
    larvae = tables["larvae"].copy()
    larvae = larvae.dropna(
        subset=["larvae_10m2", "year", "latitude", "longitude", "scientific_name", "time"]
    ).copy()
    larvae = larvae[larvae["larvae_10m2"] >= 0]

    larvae["month"] = larvae["time"].dt.month.astype("int16")
    larvae["month_sin"] = np.sin(2 * np.pi * larvae["month"] / 12.0)
    larvae["month_cos"] = np.cos(2 * np.pi * larvae["month"] / 12.0)

    le = LabelEncoder()
    larvae["species_id"] = le.fit_transform(larvae["scientific_name"].astype(str))
    larvae[TARGET] = np.log1p(larvae["larvae_10m2"].astype(float))

    larvae["year"] = larvae["year"].astype("int32")
    larvae["latitude"] = larvae["latitude"].astype("float32")
    larvae["longitude"] = larvae["longitude"].astype("float32")

    return larvae, le


def train_xgb(larvae: pd.DataFrame):
    train = larvae[larvae["year"] <= TRAIN_MAX_YEAR]
    test = larvae[larvae["year"] >= TEST_MIN_YEAR]

    X_tr, y_tr = train[FEAT_COLS], train[TARGET]
    X_te, y_te = test[FEAT_COLS], test[TARGET]

    model = xgb.XGBRegressor(
        n_estimators=800,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=1.0,
        random_state=0,
        tree_method="hist",
        n_jobs=-1,
        early_stopping_rounds=30,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)

    pred_tr = model.predict(X_tr)
    pred_te = model.predict(X_te)

    metrics = {
        "n_train": int(len(train)),
        "n_test": int(len(test)),
        "train_rows_coverage_years": [int(train["year"].min()), int(train["year"].max())],
        "test_rows_coverage_years": [int(test["year"].min()), int(test["year"].max())],
        "train": {
            "r2": float(r2_score(y_tr, pred_tr)),
            "rmse": float(np.sqrt(mean_squared_error(y_tr, pred_tr))),
            "mae": float(mean_absolute_error(y_tr, pred_tr)),
            "pearson_r": float(pearsonr(y_tr, pred_tr).statistic),
        },
        "test": {
            "r2": float(r2_score(y_te, pred_te)),
            "rmse": float(np.sqrt(mean_squared_error(y_te, pred_te))),
            "mae": float(mean_absolute_error(y_te, pred_te)),
            "pearson_r": float(pearsonr(y_te, pred_te).statistic),
        },
        "feature_importance": {
            k: float(v)
            for k, v in zip(FEAT_COLS, model.feature_importances_)
        },
    }
    return model, metrics, train, test


def derive_species_scores(
    model: xgb.XGBRegressor, larvae: pd.DataFrame
) -> pd.DataFrame:
    """For each species, compare the model's expected log-density in
    EARLIER vs. RECENT over the species' own historical stations."""
    earlier = larvae[(larvae["year"] >= EARLIER[0]) & (larvae["year"] <= EARLIER[1])].copy()
    recent = larvae[(larvae["year"] >= RECENT[0]) & (larvae["year"] <= RECENT[1])].copy()
    earlier["pred"] = model.predict(earlier[FEAT_COLS])
    recent["pred"] = model.predict(recent[FEAT_COLS])

    # Train rows per species so we can drop under-sampled species
    train_counts = (
        larvae[larvae["year"] <= TRAIN_MAX_YEAR]
        .groupby("scientific_name", observed=True)
        .size()
        .rename("n_train")
    )

    earlier_mean = (
        earlier.groupby("scientific_name", observed=True)["pred"]
        .mean()
        .rename("xgb_earlier_log_density")
    )
    recent_mean = (
        recent.groupby("scientific_name", observed=True)["pred"]
        .mean()
        .rename("xgb_recent_log_density")
    )
    common = (
        larvae.groupby("scientific_name", observed=True)["common_name"]
        .agg(lambda s: s.dropna().mode().iat[0] if not s.dropna().empty else "")
        .rename("common_name")
    )
    n_recent_obs = (
        recent.groupby("scientific_name", observed=True)
        .size()
        .rename("n_recent_obs")
    )

    df = (
        pd.concat(
            [train_counts, earlier_mean, recent_mean, common, n_recent_obs],
            axis=1,
        )
        .reset_index()
    )
    df = df[(df["n_train"] >= MIN_TRAIN_OBS) & df["n_recent_obs"].fillna(0).gt(0)]
    df["xgb_delta_log_density"] = df["xgb_recent_log_density"] - df["xgb_earlier_log_density"]

    for col in ["xgb_recent_log_density", "xgb_delta_log_density"]:
        vals = df[col].astype(float)
        mu, sd = vals.mean(), vals.std(ddof=0)
        df[col + "_z"] = 0.0 if not sd else (vals - mu) / sd

    df["xgb_score"] = df["xgb_recent_log_density_z"] + df["xgb_delta_log_density_z"]
    df = df.sort_values("xgb_score", ascending=False).reset_index(drop=True)
    df["rank"] = np.arange(1, len(df) + 1)
    return df


def compare_with_composite(xgb_df: pd.DataFrame) -> dict:
    comp_path = TBL / "species_rankings.csv"
    if not comp_path.exists():
        return {"available": False}
    comp = pd.read_csv(comp_path)
    merged = xgb_df.merge(
        comp[["scientific_name", "survivability_score"]],
        on="scientific_name",
        how="inner",
    ).dropna(subset=["xgb_score", "survivability_score"])
    if len(merged) < 5:
        return {"available": False, "reason": "too few overlapping species"}
    pr = pearsonr(merged["xgb_score"], merged["survivability_score"])
    sr = spearmanr(merged["xgb_score"], merged["survivability_score"])
    return {
        "available": True,
        "n_overlap": int(len(merged)),
        "pearson_r": float(pr.statistic),
        "pearson_p": float(pr.pvalue),
        "spearman_rho": float(sr.statistic),
        "spearman_p": float(sr.pvalue),
    }


def plot_parity(model: xgb.XGBRegressor, test: pd.DataFrame, path: Path) -> None:
    pred = model.predict(test[FEAT_COLS])
    y = test[TARGET].to_numpy()
    fig, ax = plt.subplots(figsize=(6, 6))
    ax.hexbin(y, pred, gridsize=60, cmap="viridis", mincnt=1)
    lim = [min(y.min(), pred.min()), max(y.max(), pred.max())]
    ax.plot(lim, lim, color="white", lw=1, alpha=0.7)
    ax.set_xlabel("actual log1p(larvae/10 m²)")
    ax.set_ylabel("predicted log1p(larvae/10 m²)")
    ax.set_title(f"XGB parity on test ({TEST_MIN_YEAR}+)  R²={r2_score(y, pred):.3f}")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def plot_top_bottom(ranked: pd.DataFrame, path: Path, k: int = 15) -> None:
    top = ranked.head(k).iloc[::-1]
    bottom = ranked.tail(k)
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    for ax, frame, title, color in [
        (axes[0], top, f"Top {k} — XGB-learned promote", "#2A9D8F"),
        (axes[1], bottom, f"Bottom {k} — XGB-learned deprioritize", "#E76F51"),
    ]:
        labels = frame["common_name"].where(
            frame["common_name"].astype(str).str.len() > 0, frame["scientific_name"]
        )
        ax.barh(labels, frame["xgb_score"], color=color)
        ax.set_title(title)
        ax.set_xlabel("xgb_score (z)")
        ax.grid(axis="x", alpha=0.2)
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def plot_species_trajectory(
    model: xgb.XGBRegressor,
    larvae: pd.DataFrame,
    species: list[tuple[str, str]],
    path: Path,
) -> None:
    fig, axes = plt.subplots(len(species), 1, figsize=(10, 2.4 * len(species)), sharex=True)
    for ax, (sci, common) in zip(axes, species):
        sp = larvae[larvae["scientific_name"] == sci]
        if sp.empty:
            ax.set_visible(False); continue
        pred = model.predict(sp[FEAT_COLS])
        annual = (
            pd.DataFrame({"year": sp["year"].to_numpy(), "pred": pred, "actual": sp[TARGET].to_numpy()})
            .groupby("year")
            .mean()
        )
        ax.plot(annual.index.astype(int), annual["actual"], color="#0077B6", lw=1.3, label="actual")
        ax.plot(annual.index.astype(int), annual["pred"], color="#E76F51", lw=1.3, label="XGB pred")
        ax.axvspan(TEST_MIN_YEAR, annual.index.max(), color="#FFEED6", alpha=0.6, zorder=-1)
        ax.set_title(f"{common} ({sci}) — actual vs. XGB predicted log1p(larvae/10 m²)")
        ax.grid(alpha=0.2)
        ax.legend(loc="upper right", fontsize=8)
    axes[-1].set_xlabel("year")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def main() -> None:
    print("loading larvae data...")
    larvae, le = build_dataset()
    print(f"  {len(larvae):,} rows, {larvae['scientific_name'].nunique()} species,"
          f" years {larvae['year'].min()}–{larvae['year'].max()}")

    print("training XGBoost (time-split)...")
    model, metrics, train, test = train_xgb(larvae)
    print(f"  n_train={metrics['n_train']:,}  n_test={metrics['n_test']:,}")
    print(f"  train R²={metrics['train']['r2']:.3f}  RMSE={metrics['train']['rmse']:.3f}")
    print(f"   test R²={metrics['test']['r2']:.3f}  RMSE={metrics['test']['rmse']:.3f}")
    print(f"  feature importances:")
    for k, v in metrics["feature_importance"].items():
        print(f"    {k:>12s}: {v:.3f}")

    print("deriving per-species XGB score...")
    ranked = derive_species_scores(model, larvae)
    print(f"  {len(ranked)} species scored (MIN_TRAIN_OBS={MIN_TRAIN_OBS})")

    ranked.to_csv(TBL / "xgb_rankings.csv", index=False)
    (JSN / "xgb_rankings.json").write_text(
        json.dumps(ranked.replace({np.nan: None}).to_dict(orient="records"), indent=2)
    )

    print("\nTop 10 (XGB-learned):")
    print(ranked.head(10)[["rank", "scientific_name", "common_name", "xgb_score", "xgb_recent_log_density", "xgb_delta_log_density", "n_train"]].to_string(index=False))
    print("\nBottom 10:")
    print(ranked.tail(10)[["rank", "scientific_name", "common_name", "xgb_score", "xgb_recent_log_density", "xgb_delta_log_density", "n_train"]].to_string(index=False))

    print("\nValidation (known cases):")
    val = ranked[ranked["scientific_name"].isin([s for s, _ in VALIDATION])]
    print(val[["rank", "scientific_name", "common_name", "xgb_score", "xgb_recent_log_density", "xgb_delta_log_density"]].to_string(index=False))

    print("\nplots...")
    plot_parity(model, test, FIG / "xgb_parity.png")
    plot_top_bottom(ranked, FIG / "xgb_top_bottom.png")
    plot_species_trajectory(model, larvae, VALIDATION, FIG / "xgb_trajectories.png")

    cmp = compare_with_composite(ranked)
    metrics["vs_composite_score"] = cmp
    metrics["ranking_windows"] = {"earlier": list(EARLIER), "recent": list(RECENT)}
    metrics["min_train_obs"] = MIN_TRAIN_OBS
    (JSN / "xgb_metrics.json").write_text(json.dumps(metrics, indent=2))
    if cmp.get("available"):
        print(f"\nXGB score vs. composite score agreement on {cmp['n_overlap']} species:")
        print(f"  Pearson r    : {cmp['pearson_r']:.3f}  (p={cmp['pearson_p']:.3g})")
        print(f"  Spearman rho : {cmp['spearman_rho']:.3f}  (p={cmp['spearman_p']:.3g})")

    print(f"\nwrote artifacts to {OUT_DIR}")


if __name__ == "__main__":
    main()
