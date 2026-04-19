"""Three weight-free rankers on top of a single wide-feature XGBoost
abundance model.

Relative to ``xgb_ranker.py`` (which only used Larvae.csv columns), this
script joins **all four CalCOFI ichthyoplankton files plus CUFES env**
into one row-per-(tow, species) matrix and trains on that.

Approaches produced (all from the same model):

* **H — wide-X baseline ranker** : same "recent log-density vs earlier
  log-density, learned from model" ranker as ``xgb_ranker.py`` but with
  the richer feature set that uses all required CSVs.
* **A — residual ranker**        : per-species mean residual in the
  held-out window (2019–2023). "Species that outperformed the model's
  expectation are healthier than history would predict."
* **G — quantile ranker**        : two additional XGBoost models fit
  with ``reg:quantileerror`` at τ = 0.1 and 0.9. Ranks by the shift of
  the 10-th-percentile prediction from EARLIER to RECENT — i.e. a
  robust lower bound on how bad the species gets.

Zero handpicked feature weights. Every coefficient in every ranker is
either learned by XGBoost or computed directly from observable counts.

Run from repo root::

    .venv/bin/python notebooks/xgb_advanced.py
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

DATA = HERE.parent / "data"
TRAIN_MAX_YEAR = 2018
TEST_MIN_YEAR = 2019
EARLIER = (2005, 2015)
RECENT = (2019, 2023)
MIN_TRAIN_OBS = 30

ADVANCED_STAGES = {"FLEX", "POFX", "PFLX", "POSF", "POST", "TRAN", "TRNS", "TRANS"}

VALIDATION = [
    ("Sardinops sagax", "Pacific sardine"),
    ("Engraulis mordax", "Northern anchovy"),
    ("Merluccius productus", "Pacific hake"),
    ("Trachurus symmetricus", "Jack mackerel"),
]

FEAT_COLS = [
    # core context (Approach H parity with xgb_ranker.py)
    "year", "month_sin", "month_cos", "latitude", "longitude", "species_id",
    # tow metadata from Larvae.csv
    "tow_type_code", "log_volume_sampled", "standard_haul_factor",
    # joined from Eggs.csv / LarvaeStages.csv / LarvaeSizes.csv
    "log_matched_eggs", "frac_past_flexion", "mean_larva_size_mm",
    # joined from Cufes.csv (cruise-level env, 1996+)
    "cruise_sst", "cruise_sal",
]
TARGET = "y"


# ---------------------------------------------------------------------------
# Data assembly
# ---------------------------------------------------------------------------


def build_wide():
    print("  reading Larvae.csv...")
    larvae = pd.read_csv(
        DATA / "Larvae.csv",
        usecols=[
            "cruise", "time", "latitude", "longitude", "line", "station",
            "tow_type", "volume_sampled", "standard_haul_factor",
            "scientific_name", "common_name", "larvae_count", "larvae_10m2",
        ],
        low_memory=False,
    )
    larvae["time"] = pd.to_datetime(larvae["time"], errors="coerce", utc=True)
    larvae = larvae.dropna(
        subset=["larvae_10m2", "time", "latitude", "longitude", "scientific_name"]
    )
    larvae = larvae[larvae["larvae_10m2"] >= 0].copy()

    larvae["year"] = larvae["time"].dt.year.astype("int32")
    larvae["month"] = larvae["time"].dt.month.astype("int16")
    larvae["month_sin"] = np.sin(2 * np.pi * larvae["month"] / 12.0)
    larvae["month_cos"] = np.cos(2 * np.pi * larvae["month"] / 12.0)

    # --- Eggs (matched on cruise + line + station + species) -------------
    print("  joining Eggs.csv...")
    eggs = pd.read_csv(
        DATA / "Eggs.csv",
        usecols=["cruise", "line", "station", "scientific_name", "eggs_10m2"],
        low_memory=False,
    )
    eggs_agg = (
        eggs.dropna(subset=["eggs_10m2"])
        .groupby(["cruise", "line", "station", "scientific_name"], dropna=False)["eggs_10m2"]
        .sum()
        .reset_index()
        .rename(columns={"eggs_10m2": "matched_eggs_10m2"})
    )
    larvae = larvae.merge(
        eggs_agg, on=["cruise", "line", "station", "scientific_name"], how="left"
    )

    # --- LarvaeStages (fraction past flexion at same tow+species) --------
    print("  joining LarvaeStages.csv...")
    stages = pd.read_csv(
        DATA / "LarvaeStages.csv",
        usecols=[
            "cruise", "line", "station", "scientific_name",
            "larvae_stage", "larvae_stage_count",
        ],
        low_memory=False,
    )
    stages["stage_clean"] = (
        stages["larvae_stage"].astype(str).str.upper().str.strip().str.replace(" ", "")
    )
    stages["advanced"] = stages["stage_clean"].isin(ADVANCED_STAGES).astype(int)
    stages["larvae_stage_count"] = stages["larvae_stage_count"].fillna(0).astype(float)
    stage_agg = (
        stages.groupby(["cruise", "line", "station", "scientific_name"])
        .agg(
            stage_total=("larvae_stage_count", "sum"),
            stage_adv=(
                "advanced",
                lambda s: (s * stages.loc[s.index, "larvae_stage_count"]).sum(),
            ),
        )
        .reset_index()
    )
    stage_agg["frac_past_flexion"] = np.where(
        stage_agg["stage_total"] > 0,
        stage_agg["stage_adv"] / stage_agg["stage_total"],
        np.nan,
    )
    larvae = larvae.merge(
        stage_agg[["cruise", "line", "station", "scientific_name", "frac_past_flexion"]],
        on=["cruise", "line", "station", "scientific_name"],
        how="left",
    )

    # --- LarvaeSizes (count-weighted mean larva size mm) -----------------
    print("  joining LarvaeSizes.csv...")
    sizes = pd.read_csv(
        DATA / "LarvaeSizes.csv",
        usecols=[
            "cruise", "line", "station", "scientific_name",
            "larvae_size", "larvae_count",
        ],
        low_memory=False,
    )
    sizes = sizes.dropna(subset=["larvae_size"])
    sizes["larvae_count"] = sizes["larvae_count"].fillna(1).astype(float)
    sizes["num"] = sizes["larvae_size"].astype(float) * sizes["larvae_count"]
    size_agg = (
        sizes.groupby(["cruise", "line", "station", "scientific_name"])
        .agg(num=("num", "sum"), den=("larvae_count", "sum"))
        .reset_index()
    )
    size_agg["mean_larva_size_mm"] = np.where(
        size_agg["den"] > 0, size_agg["num"] / size_agg["den"], np.nan
    )
    larvae = larvae.merge(
        size_agg[
            ["cruise", "line", "station", "scientific_name", "mean_larva_size_mm"]
        ],
        on=["cruise", "line", "station", "scientific_name"],
        how="left",
    )

    # --- CUFES cruise-level SST / salinity (1996+) -----------------------
    print("  joining Cufes.csv...")
    cufes = pd.read_csv(
        DATA / "Cufes.csv",
        usecols=["cruise", "start_temperature", "start_salinity"],
        low_memory=False,
    )
    cufes["start_temperature"] = pd.to_numeric(cufes["start_temperature"], errors="coerce")
    cufes["start_salinity"] = pd.to_numeric(cufes["start_salinity"], errors="coerce")
    cufes_agg = (
        cufes.groupby("cruise")
        .agg(cruise_sst=("start_temperature", "mean"), cruise_sal=("start_salinity", "mean"))
        .reset_index()
    )
    # Normalize cruise key to string on both sides
    larvae["cruise"] = larvae["cruise"].astype(str)
    cufes_agg["cruise"] = cufes_agg["cruise"].astype(str)
    larvae = larvae.merge(cufes_agg, on="cruise", how="left")

    # --- Derived columns -------------------------------------------------
    larvae["log_matched_eggs"] = np.log1p(larvae["matched_eggs_10m2"].fillna(0))
    larvae["log_volume_sampled"] = np.log1p(
        pd.to_numeric(larvae["volume_sampled"], errors="coerce")
    )
    larvae["standard_haul_factor"] = pd.to_numeric(
        larvae["standard_haul_factor"], errors="coerce"
    )
    larvae["tow_type_code"] = (
        larvae["tow_type"].astype("category").cat.codes.astype("int16").replace(-1, np.nan)
    )

    le = LabelEncoder()
    larvae["species_id"] = le.fit_transform(larvae["scientific_name"].astype(str))

    larvae["latitude"] = larvae["latitude"].astype("float32")
    larvae["longitude"] = larvae["longitude"].astype("float32")
    larvae[TARGET] = np.log1p(larvae["larvae_10m2"].astype(float))

    return larvae, le


# ---------------------------------------------------------------------------
# Training helpers
# ---------------------------------------------------------------------------


def _time_split(df: pd.DataFrame):
    train = df[df["year"] <= TRAIN_MAX_YEAR]
    test = df[df["year"] >= TEST_MIN_YEAR]
    return train, test


def train_mean(train, test):
    X_tr, y_tr = train[FEAT_COLS], train[TARGET]
    X_te, y_te = test[FEAT_COLS], test[TARGET]
    model = xgb.XGBRegressor(
        n_estimators=1200,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=1.0,
        tree_method="hist",
        n_jobs=-1,
        random_state=0,
        early_stopping_rounds=40,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)
    pred_tr, pred_te = model.predict(X_tr), model.predict(X_te)
    return model, {
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
            k: float(v) for k, v in zip(FEAT_COLS, model.feature_importances_)
        },
    }


def train_quantile(train, test, quantile: float):
    X_tr, y_tr = train[FEAT_COLS], train[TARGET]
    X_te, y_te = test[FEAT_COLS], test[TARGET]
    model = xgb.XGBRegressor(
        n_estimators=800,
        max_depth=7,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        tree_method="hist",
        n_jobs=-1,
        random_state=0,
        objective="reg:quantileerror",
        quantile_alpha=quantile,
        early_stopping_rounds=40,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)
    pred_te = model.predict(X_te)
    return model, {
        "quantile": quantile,
        "test": {
            "pinball": float(_pinball_loss(y_te, pred_te, quantile)),
            "coverage_below": float((y_te <= pred_te).mean()),
        },
    }


def _pinball_loss(y, q, tau: float) -> float:
    d = np.asarray(y) - np.asarray(q)
    return float(np.where(d >= 0, tau * d, (tau - 1) * d).mean())


# ---------------------------------------------------------------------------
# Rankers
# ---------------------------------------------------------------------------


def _species_common(larvae: pd.DataFrame) -> pd.Series:
    return (
        larvae.groupby("scientific_name", observed=True)["common_name"]
        .agg(lambda s: s.dropna().astype(str).str.strip().mode().iat[0] if not s.dropna().empty else "")
    )


def approach_h(model, larvae) -> pd.DataFrame:
    earlier = larvae[(larvae["year"] >= EARLIER[0]) & (larvae["year"] <= EARLIER[1])].copy()
    recent = larvae[(larvae["year"] >= RECENT[0]) & (larvae["year"] <= RECENT[1])].copy()
    earlier["pred"] = model.predict(earlier[FEAT_COLS])
    recent["pred"] = model.predict(recent[FEAT_COLS])

    train_n = (
        larvae[larvae["year"] <= TRAIN_MAX_YEAR]
        .groupby("scientific_name", observed=True)
        .size()
        .rename("n_train")
    )
    earlier_mean = earlier.groupby("scientific_name", observed=True)["pred"].mean().rename("H_earlier")
    recent_mean = recent.groupby("scientific_name", observed=True)["pred"].mean().rename("H_recent")
    common = _species_common(larvae).rename("common_name")

    df = pd.concat([train_n, earlier_mean, recent_mean, common], axis=1).reset_index()
    df = df[df["n_train"].fillna(0) >= MIN_TRAIN_OBS]
    df["H_delta"] = df["H_recent"] - df["H_earlier"]
    for col in ["H_recent", "H_delta"]:
        vals = df[col].astype(float)
        sd = vals.std(ddof=0)
        df[col + "_z"] = 0.0 if not sd or not np.isfinite(sd) else (vals - vals.mean()) / sd
    df["H_score"] = df["H_recent_z"] + df["H_delta_z"]
    return df


def approach_a_residuals(model, larvae) -> pd.DataFrame:
    test = larvae[larvae["year"] >= TEST_MIN_YEAR].copy()
    test["pred"] = model.predict(test[FEAT_COLS])
    test["residual"] = test[TARGET] - test["pred"]

    agg = (
        test.groupby("scientific_name", observed=True)
        .agg(
            A_mean_residual=("residual", "mean"),
            A_median_residual=("residual", "median"),
            A_n_test=("residual", "size"),
        )
        .reset_index()
    )
    agg = agg[agg["A_n_test"] >= 5].copy()
    vals = agg["A_mean_residual"].astype(float)
    sd = vals.std(ddof=0)
    agg["A_score"] = 0.0 if not sd or not np.isfinite(sd) else (vals - vals.mean()) / sd
    return agg


def approach_g_quantile(model_q10, model_q90, larvae) -> pd.DataFrame:
    earlier = larvae[(larvae["year"] >= EARLIER[0]) & (larvae["year"] <= EARLIER[1])].copy()
    recent = larvae[(larvae["year"] >= RECENT[0]) & (larvae["year"] <= RECENT[1])].copy()
    earlier["q10"] = model_q10.predict(earlier[FEAT_COLS])
    earlier["q90"] = model_q90.predict(earlier[FEAT_COLS])
    recent["q10"] = model_q10.predict(recent[FEAT_COLS])
    recent["q90"] = model_q90.predict(recent[FEAT_COLS])

    def _agg(df, name):
        return (
            df.groupby("scientific_name", observed=True)[["q10", "q90"]]
            .mean()
            .rename(columns={"q10": f"{name}_q10", "q90": f"{name}_q90"})
        )

    df = pd.concat([_agg(earlier, "earlier"), _agg(recent, "recent")], axis=1).reset_index()
    df["G_q10_delta"] = df["recent_q10"] - df["earlier_q10"]
    df["G_q90_delta"] = df["recent_q90"] - df["earlier_q90"]
    vals = df["G_q10_delta"].astype(float)
    sd = vals.std(ddof=0)
    df["G_score"] = 0.0 if not sd or not np.isfinite(sd) else (vals - vals.mean()) / sd
    return df


# ---------------------------------------------------------------------------
# Plotting
# ---------------------------------------------------------------------------


def plot_ranker_bar(ranked: pd.DataFrame, score_col: str, path: Path, title: str, k: int = 15):
    df = ranked.dropna(subset=[score_col]).sort_values(score_col, ascending=False)
    top = df.head(k).iloc[::-1]
    bottom = df.tail(k)
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    for ax, frame, sub, color in [
        (axes[0], top, f"Top {k}", "#2A9D8F"),
        (axes[1], bottom, f"Bottom {k}", "#E76F51"),
    ]:
        labels = frame["common_name"].where(
            frame["common_name"].astype(str).str.len() > 0, frame["scientific_name"]
        )
        ax.barh(labels, frame[score_col], color=color)
        ax.set_title(f"{title} — {sub}")
        ax.set_xlabel(score_col)
        ax.grid(axis="x", alpha=0.2)
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def plot_approach_scatter(final: pd.DataFrame, path: Path):
    cols = [("H_score", "A_score"), ("H_score", "G_score"), ("A_score", "G_score")]
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    for ax, (x, y) in zip(axes, cols):
        sub = final.dropna(subset=[x, y])
        ax.scatter(sub[x], sub[y], s=10, alpha=0.5, color="#0077B6")
        if len(sub) >= 5:
            r = pearsonr(sub[x], sub[y])
            s = spearmanr(sub[x], sub[y])
            ax.set_title(f"{x} vs {y}  r={r.statistic:.2f}  ρ={s.statistic:.2f}")
        ax.axhline(0, lw=0.5, color="#888"); ax.axvline(0, lw=0.5, color="#888")
        ax.set_xlabel(x); ax.set_ylabel(y); ax.grid(alpha=0.2)
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print("building wide dataset (all CalCOFI CSVs)...")
    larvae, le = build_wide()
    print(
        f"  rows={len(larvae):,}  species={larvae['scientific_name'].nunique()}"
        f"  years={larvae['year'].min()}-{larvae['year'].max()}"
    )
    coverage = {
        "n_rows": int(len(larvae)),
        "n_species": int(larvae["scientific_name"].nunique()),
        "feature_nonnull_frac": {
            c: float(larvae[c].notna().mean()) for c in FEAT_COLS
        },
    }

    train, test = _time_split(larvae)
    print(f"  n_train={len(train):,}  n_test={len(test):,}")

    print("\ntraining wide mean model (Approach H)...")
    model_mean, mean_metrics = train_mean(train, test)
    print(f"  train R²={mean_metrics['train']['r2']:.3f}  test R²={mean_metrics['test']['r2']:.3f}")
    print("  feature importance:")
    for k, v in sorted(mean_metrics["feature_importance"].items(), key=lambda kv: -kv[1]):
        print(f"    {k:>20s}: {v:.3f}")

    print("\ntraining quantile models (Approach G, τ=0.1 and 0.9)...")
    model_q10, metrics_q10 = train_quantile(train, test, 0.1)
    model_q90, metrics_q90 = train_quantile(train, test, 0.9)
    print(
        f"  q10 pinball={metrics_q10['test']['pinball']:.3f} coverage={metrics_q10['test']['coverage_below']:.2f}"
    )
    print(
        f"  q90 pinball={metrics_q90['test']['pinball']:.3f} coverage={metrics_q90['test']['coverage_below']:.2f}"
    )

    print("\nranker H (wide recent vs earlier)...")
    rank_h = approach_h(model_mean, larvae)
    print("ranker A (residual in test window)...")
    rank_a = approach_a_residuals(model_mean, larvae)
    print("ranker G (quantile shift)...")
    rank_g = approach_g_quantile(model_q10, model_q90, larvae)

    final = (
        rank_h.merge(
            rank_a[["scientific_name", "A_mean_residual", "A_median_residual", "A_n_test", "A_score"]],
            on="scientific_name",
            how="left",
        )
        .merge(
            rank_g[["scientific_name", "earlier_q10", "recent_q10", "earlier_q90", "recent_q90",
                    "G_q10_delta", "G_q90_delta", "G_score"]],
            on="scientific_name",
            how="left",
        )
    )

    # A blended score — equal weight across the three, for a single
    # top-line number. Still no handpicking, just a mean of standardised
    # ranks.
    zcols = ["H_score", "A_score", "G_score"]
    z = final[zcols].astype(float)
    final["blended_score"] = z.mean(axis=1, skipna=True)
    final = final.sort_values("blended_score", ascending=False).reset_index(drop=True)
    final["rank"] = np.arange(1, len(final) + 1)

    final.to_csv(TBL / "xgb_advanced_rankings.csv", index=False)
    (JSN / "xgb_advanced_rankings.json").write_text(
        json.dumps(final.replace({np.nan: None}).to_dict(orient="records"), indent=2)
    )

    # Metrics bundle
    summary = {
        "wide_dataset": coverage,
        "time_split": {
            "train_max_year": TRAIN_MAX_YEAR,
            "test_min_year": TEST_MIN_YEAR,
            "earlier_window": list(EARLIER),
            "recent_window": list(RECENT),
            "min_train_obs": MIN_TRAIN_OBS,
        },
        "mean_model": mean_metrics,
        "q10_model": metrics_q10,
        "q90_model": metrics_q90,
        "pairwise_agreement": {},
    }

    for a, b in [("H_score", "A_score"), ("H_score", "G_score"), ("A_score", "G_score")]:
        sub = final[[a, b]].dropna()
        if len(sub) >= 10:
            summary["pairwise_agreement"][f"{a}__{b}"] = {
                "n": int(len(sub)),
                "pearson_r": float(pearsonr(sub[a], sub[b]).statistic),
                "spearman_rho": float(spearmanr(sub[a], sub[b]).statistic),
            }

    (JSN / "xgb_advanced_metrics.json").write_text(json.dumps(summary, indent=2))

    # Plots
    plot_ranker_bar(final, "H_score", FIG / "xgb_adv_H_top_bottom.png",
                    "Approach H — wide recent-vs-earlier")
    plot_ranker_bar(final, "A_score", FIG / "xgb_adv_A_top_bottom.png",
                    "Approach A — residual (actual − predicted) 2019-2023")
    plot_ranker_bar(final, "G_score", FIG / "xgb_adv_G_top_bottom.png",
                    "Approach G — 10th-percentile shift (robust lower bound)")
    plot_approach_scatter(final, FIG / "xgb_adv_approach_scatter.png")

    # Print validation table
    print("\nvalidation (known cases) — all three scores:")
    val_rows = final[final["scientific_name"].isin([s for s, _ in VALIDATION])].copy()
    cols = ["rank", "scientific_name", "common_name", "H_score", "A_score", "G_score", "blended_score",
            "H_delta", "A_mean_residual", "G_q10_delta"]
    print(val_rows[cols].to_string(index=False))

    print("\ntop 10 by blended:")
    print(final.head(10)[["rank","scientific_name","common_name","blended_score","H_score","A_score","G_score"]].to_string(index=False))
    print("\nbottom 10 by blended:")
    print(final.tail(10)[["rank","scientific_name","common_name","blended_score","H_score","A_score","G_score"]].to_string(index=False))

    print("\npairwise agreement:")
    for k, v in summary["pairwise_agreement"].items():
        print(f"  {k}: r={v['pearson_r']:.3f}  ρ={v['spearman_rho']:.3f}  (n={v['n']})")

    print(f"\nwrote to {OUT}")


if __name__ == "__main__":
    main()
