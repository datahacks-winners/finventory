"""Variant of ``xgb_advanced.py`` that uses the **per-tow** CUFES
environmental match produced by ``enrich_with_cufes.py`` instead of
the cruise-level aggregate.

Key difference vs. ``xgb_advanced.py``:

    cruise_sst, cruise_sal               (cruise-level, broadcast to all tows)
    →
    env_sst, env_sal, env_wind_speed     (per-tow, matched within 100 km / 14 days)
    env_match_km, env_match_days          (match-quality signals)

Everything else — the Eggs / LarvaeStages / LarvaeSizes joins, the
time-based train/test split, the three rankers (H mean-density,
A residual, G quantile) — is identical, so the test-R² number is a
clean head-to-head with ``xgb_advanced.py``.

Run::

    .venv/bin/python notebooks/enrich_with_cufes.py        # produces the parquet
    .venv/bin/python notebooks/xgb_advanced_envjoin.py     # this script
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
ENRICHED_PATH = OUT / "larvae_env_enriched.parquet"

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

# --- baseline feature set matches xgb_advanced.py ---------------------------
FEAT_COLS_BASELINE = [
    "year", "month_sin", "month_cos", "latitude", "longitude", "species_id",
    "tow_type_code", "log_volume_sampled", "standard_haul_factor",
    "log_matched_eggs", "frac_past_flexion", "mean_larva_size_mm",
    "cruise_sst", "cruise_sal",
]

# --- per-tow variant ---------------------------------------------------------
FEAT_COLS_ENVJOIN = [
    "year", "month_sin", "month_cos", "latitude", "longitude", "species_id",
    "tow_type_code", "log_volume_sampled", "standard_haul_factor",
    "log_matched_eggs", "frac_past_flexion", "mean_larva_size_mm",
    # replaces cruise_sst / cruise_sal / (no-wind-speed)
    "env_sst", "env_sal", "env_wind_speed",
    # the two new match-quality features
    "env_match_km", "env_match_days",
]

TARGET = "y"


# ---------------------------------------------------------------------------
# Data assembly
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
    print("  joining Eggs.csv...")
    eggs = pd.read_csv(
        DATA / "Eggs.csv",
        usecols=["cruise", "line", "station", "scientific_name", "eggs_10m2"],
        low_memory=False,
    )
    eggs["cruise"] = eggs["cruise"].astype(str)
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

    print("  joining LarvaeStages.csv...")
    stages = pd.read_csv(
        DATA / "LarvaeStages.csv",
        usecols=[
            "cruise", "line", "station", "scientific_name",
            "larvae_stage", "larvae_stage_count",
        ],
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

    print("  joining LarvaeSizes.csv...")
    sizes = pd.read_csv(
        DATA / "LarvaeSizes.csv",
        usecols=[
            "cruise", "line", "station", "scientific_name",
            "larvae_size", "larvae_count",
        ],
        low_memory=False,
    )
    sizes["cruise"] = sizes["cruise"].astype(str)
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
        size_agg[["cruise", "line", "station", "scientific_name", "mean_larva_size_mm"]],
        on=["cruise", "line", "station", "scientific_name"],
        how="left",
    )
    return larvae


def _add_cruise_env(larvae: pd.DataFrame) -> pd.DataFrame:
    """Cruise-level CUFES aggregate (baseline, same as xgb_advanced.py)."""
    cufes = pd.read_csv(
        DATA / "Cufes.csv",
        usecols=["cruise", "start_temperature", "start_salinity"],
        low_memory=False,
    )
    cufes["cruise"] = cufes["cruise"].astype(str)
    cufes["start_temperature"] = pd.to_numeric(cufes["start_temperature"], errors="coerce")
    cufes["start_salinity"] = pd.to_numeric(cufes["start_salinity"], errors="coerce")
    agg = (
        cufes.groupby("cruise")
        .agg(cruise_sst=("start_temperature", "mean"),
             cruise_sal=("start_salinity", "mean"))
        .reset_index()
    )
    return larvae.merge(agg, on="cruise", how="left")


def _add_derived(larvae: pd.DataFrame) -> tuple[pd.DataFrame, LabelEncoder]:
    larvae["log_matched_eggs"] = np.log1p(larvae["matched_eggs_10m2"].fillna(0))
    larvae["log_volume_sampled"] = np.log1p(
        pd.to_numeric(larvae["volume_sampled"], errors="coerce")
    )
    larvae["standard_haul_factor"] = pd.to_numeric(
        larvae["standard_haul_factor"], errors="coerce"
    )
    larvae["tow_type_code"] = (
        larvae["tow_type"].astype("category").cat.codes.astype("int16")
    ).replace(-1, np.nan)

    le = LabelEncoder()
    larvae["species_id"] = le.fit_transform(larvae["scientific_name"].astype(str))

    larvae["latitude"] = larvae["latitude"].astype("float32")
    larvae["longitude"] = larvae["longitude"].astype("float32")
    larvae[TARGET] = np.log1p(larvae["larvae_10m2"].astype(float))
    return larvae, le


def build_envjoin():
    """Wide dataset but using the per-tow env match from the enriched parquet."""
    if not ENRICHED_PATH.exists():
        raise FileNotFoundError(
            f"{ENRICHED_PATH} not found. Run `notebooks/enrich_with_cufes.py` first."
        )
    print("reading larvae_env_enriched.parquet (per-tow CUFES match)...")
    larvae = pd.read_parquet(ENRICHED_PATH)
    larvae = _prepare_base(larvae)
    larvae = _join_eggs_stages_sizes(larvae)

    # env columns from the parquet
    for c in ["env_sst", "env_sal", "env_wind_speed", "env_match_km", "env_match_days"]:
        larvae[c] = pd.to_numeric(larvae[c], errors="coerce")

    larvae, le = _add_derived(larvae)
    return larvae, le


def build_baseline():
    """Same source but cruise-level env (for head-to-head)."""
    print("reading Larvae.csv for baseline (cruise-level CUFES)...")
    larvae = pd.read_csv(
        DATA / "Larvae.csv",
        usecols=[
            "cruise", "time", "latitude", "longitude", "line", "station",
            "tow_type", "volume_sampled", "standard_haul_factor",
            "scientific_name", "common_name", "larvae_count", "larvae_10m2",
        ],
        low_memory=False,
    )
    larvae = _prepare_base(larvae)
    larvae = _join_eggs_stages_sizes(larvae)
    larvae = _add_cruise_env(larvae)
    larvae, le = _add_derived(larvae)
    return larvae, le


# ---------------------------------------------------------------------------
# Training helpers (same as xgb_advanced.py)
# ---------------------------------------------------------------------------


def _time_split(df):
    return df[df["year"] <= TRAIN_MAX_YEAR], df[df["year"] >= TEST_MIN_YEAR]


def train_mean(train, test, feat_cols):
    X_tr, y_tr = train[feat_cols], train[TARGET]
    X_te, y_te = test[feat_cols], test[TARGET]
    model = xgb.XGBRegressor(
        n_estimators=1200, max_depth=8, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, reg_lambda=1.0,
        tree_method="hist", n_jobs=-1, random_state=0,
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
            k: float(v) for k, v in zip(feat_cols, model.feature_importances_)
        },
    }


def train_quantile(train, test, feat_cols, quantile: float):
    X_tr, y_tr = train[feat_cols], train[TARGET]
    X_te, y_te = test[feat_cols], test[TARGET]
    model = xgb.XGBRegressor(
        n_estimators=800, max_depth=7, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        tree_method="hist", n_jobs=-1, random_state=0,
        objective="reg:quantileerror", quantile_alpha=quantile,
        early_stopping_rounds=40,
    )
    model.fit(X_tr, y_tr, eval_set=[(X_te, y_te)], verbose=False)
    pred_te = model.predict(X_te)
    d = np.asarray(y_te) - np.asarray(pred_te)
    pinball = float(np.where(d >= 0, quantile * d, (quantile - 1) * d).mean())
    return model, {
        "quantile": quantile,
        "test": {
            "pinball": pinball,
            "coverage_below": float((y_te <= pred_te).mean()),
        },
    }


# ---------------------------------------------------------------------------
# Rankers (same as xgb_advanced.py, parameterised by feat_cols)
# ---------------------------------------------------------------------------


def _species_common(larvae):
    return (
        larvae.groupby("scientific_name", observed=True)["common_name"]
        .agg(lambda s: s.dropna().astype(str).str.strip().mode().iat[0] if not s.dropna().empty else "")
    )


def approach_h(model, larvae, feat_cols):
    earlier = larvae[(larvae["year"] >= EARLIER[0]) & (larvae["year"] <= EARLIER[1])].copy()
    recent = larvae[(larvae["year"] >= RECENT[0]) & (larvae["year"] <= RECENT[1])].copy()
    earlier["pred"] = model.predict(earlier[feat_cols])
    recent["pred"] = model.predict(recent[feat_cols])

    train_n = (
        larvae[larvae["year"] <= TRAIN_MAX_YEAR]
        .groupby("scientific_name", observed=True).size().rename("n_train")
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


def approach_a(model, larvae, feat_cols):
    test = larvae[larvae["year"] >= TEST_MIN_YEAR].copy()
    test["pred"] = model.predict(test[feat_cols])
    test["residual"] = test[TARGET] - test["pred"]
    agg = (
        test.groupby("scientific_name", observed=True)
        .agg(A_mean_residual=("residual", "mean"),
             A_median_residual=("residual", "median"),
             A_n_test=("residual", "size"))
        .reset_index()
    )
    agg = agg[agg["A_n_test"] >= 5].copy()
    vals = agg["A_mean_residual"].astype(float)
    sd = vals.std(ddof=0)
    agg["A_score"] = 0.0 if not sd or not np.isfinite(sd) else (vals - vals.mean()) / sd
    return agg


def approach_g(model_q10, model_q90, larvae, feat_cols):
    earlier = larvae[(larvae["year"] >= EARLIER[0]) & (larvae["year"] <= EARLIER[1])].copy()
    recent = larvae[(larvae["year"] >= RECENT[0]) & (larvae["year"] <= RECENT[1])].copy()
    earlier["q10"] = model_q10.predict(earlier[feat_cols])
    earlier["q90"] = model_q90.predict(earlier[feat_cols])
    recent["q10"] = model_q10.predict(recent[feat_cols])
    recent["q90"] = model_q90.predict(recent[feat_cols])

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


def plot_bar(ranked, score_col, path, title, k=15):
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


def plot_r2_bar(baseline, envjoin, matched, path):
    labels = ["train R²", "test R²"]
    sets = [
        ("cruise-level", baseline, "#6C8EBF"),
        ("env-join sparse", envjoin, "#F4A261"),
        ("env-join matched-only", matched, "#E76F51"),
    ]
    x = np.arange(len(labels))
    w = 0.27
    fig, ax = plt.subplots(figsize=(9, 5))
    for i, (name, m, color) in enumerate(sets):
        vals = [m["train"]["r2"], m["test"]["r2"]]
        pos = x + (i - 1) * w
        ax.bar(pos, vals, w, label=name, color=color)
        for xi, v in zip(pos, vals):
            ax.text(xi, v + 0.005, f"{v:.3f}", ha="center", fontsize=9)
    ax.set_xticks(x); ax.set_xticklabels(labels)
    ax.set_ylabel("R²")
    ax.set_title("XGBoost R²: cruise-level vs per-tow vs matched-only")
    ax.legend(); ax.grid(axis="y", alpha=0.2)
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print("=== BASELINE (cruise-level CUFES) ===")
    baseline_df, _ = build_baseline()
    b_train, b_test = _time_split(baseline_df)
    print(f"  n_train={len(b_train):,}  n_test={len(b_test):,}")
    print("  training baseline model...")
    _, baseline_metrics = train_mean(b_train, b_test, FEAT_COLS_BASELINE)
    print(f"  baseline  train R²={baseline_metrics['train']['r2']:.4f}  "
          f"test R²={baseline_metrics['test']['r2']:.4f}")

    print("\n=== ENV-JOIN sparse (per-tow CUFES match, NaN where no match) ===")
    env_df, _ = build_envjoin()
    e_train, e_test = _time_split(env_df)
    print(f"  n_train={len(e_train):,}  n_test={len(e_test):,}")

    # Coverage of env features on full dataset
    cov = {c: float(env_df[c].notna().mean()) for c in
           ["env_sst", "env_sal", "env_wind_speed", "env_match_km", "env_match_days"]}
    print("  env feature coverage (full dataset):")
    for k, v in cov.items():
        print(f"    {k:>15s}: {v:.1%}")

    print("  training envjoin sparse mean model...")
    model_mean, envjoin_metrics = train_mean(e_train, e_test, FEAT_COLS_ENVJOIN)
    print(f"  envjoin   train R²={envjoin_metrics['train']['r2']:.4f}  "
          f"test R²={envjoin_metrics['test']['r2']:.4f}")

    print("\n=== ENV-JOIN MATCHED-ONLY (100% env coverage) ===")
    matched_df = env_df[env_df["env_match_km"].notna()].copy()
    # also require env_sst and env_sal present (the two we care about most)
    matched_df = matched_df[
        matched_df["env_sst"].notna() & matched_df["env_sal"].notna()
    ].copy()
    m_train, m_test = _time_split(matched_df)
    print(f"  n_rows (matched)      = {len(matched_df):,}")
    print(f"  n_train (matched)     = {len(m_train):,}")
    print(f"  n_test  (matched)     = {len(m_test):,}")
    print(f"  n_species (matched)   = {matched_df['scientific_name'].nunique()}")
    print(f"  year range (matched)  = {int(matched_df['year'].min())}-{int(matched_df['year'].max())}")
    cov_matched = {c: float(matched_df[c].notna().mean()) for c in
                   ["env_sst", "env_sal", "env_wind_speed", "env_match_km", "env_match_days"]}
    print("  env feature coverage (matched-only):")
    for k, v in cov_matched.items():
        print(f"    {k:>15s}: {v:.1%}")

    print("  training matched-only mean model...")
    model_mean_m, matched_metrics = train_mean(m_train, m_test, FEAT_COLS_ENVJOIN)
    print(f"  matched   train R²={matched_metrics['train']['r2']:.4f}  "
          f"test R²={matched_metrics['test']['r2']:.4f}  n_test={len(m_test):,}")

    print("  training matched-only quantile models (τ=0.1, 0.9)...")
    model_q10_m, m_q10_m = train_quantile(m_train, m_test, FEAT_COLS_ENVJOIN, 0.1)
    model_q90_m, m_q90_m = train_quantile(m_train, m_test, FEAT_COLS_ENVJOIN, 0.9)
    print(f"  q10 pinball={m_q10_m['test']['pinball']:.3f} cov={m_q10_m['test']['coverage_below']:.2f}")
    print(f"  q90 pinball={m_q90_m['test']['pinball']:.3f} cov={m_q90_m['test']['coverage_below']:.2f}")

    # For backwards compatibility we still also fit quantile models on the
    # sparse set so the rankers and plots below can reference them.
    print("  training sparse quantile models (τ=0.1, 0.9) for plots...")
    model_q10, m_q10 = train_quantile(e_train, e_test, FEAT_COLS_ENVJOIN, 0.1)
    model_q90, m_q90 = train_quantile(e_train, e_test, FEAT_COLS_ENVJOIN, 0.9)

    print("\n=== HEAD-TO-HEAD ===")
    print(f"  {'configuration':<35s}  {'n_train':>10s}  {'n_test':>8s}  {'train R²':>10s}  {'test R²':>9s}")
    for name, n_tr, n_te, m in [
        ("baseline (cruise-level)", len(b_train), len(b_test), baseline_metrics),
        ("env-join sparse (NaN-padded)", len(e_train), len(e_test), envjoin_metrics),
        ("env-join matched-only (100%)", len(m_train), len(m_test), matched_metrics),
    ]:
        print(f"  {name:<35s}  {n_tr:>10,}  {n_te:>8,}  "
              f"{m['train']['r2']:>10.4f}  {m['test']['r2']:>9.4f}")

    print("\n  feature importance (matched-only):")
    for k, v in sorted(matched_metrics["feature_importance"].items(), key=lambda kv: -kv[1]):
        print(f"    {k:>20s}: {v:.3f}")

    # Rankers built on the matched-only model, but predictions run over
    # the full env_df so every species gets a score (not just matched).
    print("\nbuilding rankers on matched-only model (predictions over all rows)...")
    rank_h = approach_h(model_mean_m, env_df, FEAT_COLS_ENVJOIN)
    rank_a = approach_a(model_mean_m, env_df, FEAT_COLS_ENVJOIN)
    rank_g = approach_g(model_q10_m, model_q90_m, env_df, FEAT_COLS_ENVJOIN)

    final = (
        rank_h.merge(
            rank_a[["scientific_name", "A_mean_residual", "A_median_residual", "A_n_test", "A_score"]],
            on="scientific_name", how="left",
        )
        .merge(
            rank_g[["scientific_name", "earlier_q10", "recent_q10",
                    "earlier_q90", "recent_q90", "G_q10_delta", "G_q90_delta", "G_score"]],
            on="scientific_name", how="left",
        )
    )
    z = final[["H_score", "A_score", "G_score"]].astype(float)
    final["blended_score"] = z.mean(axis=1, skipna=True)
    final = final.sort_values("blended_score", ascending=False).reset_index(drop=True)
    final["rank"] = np.arange(1, len(final) + 1)

    final.to_csv(TBL / "xgb_envjoin_rankings.csv", index=False)
    (JSN / "xgb_envjoin_rankings.json").write_text(
        json.dumps(final.replace({np.nan: None}).to_dict(orient="records"), indent=2)
    )

    summary = {
        "baseline_cruise_level": {
            "metrics": baseline_metrics,
            "n_train": int(len(b_train)),
            "n_test": int(len(b_test)),
        },
        "envjoin_sparse": {
            "metrics": envjoin_metrics,
            "n_train": int(len(e_train)),
            "n_test": int(len(e_test)),
            "env_feature_coverage": cov,
        },
        "envjoin_matched_only": {
            "metrics": matched_metrics,
            "n_train": int(len(m_train)),
            "n_test": int(len(m_test)),
            "n_rows_total": int(len(matched_df)),
            "n_species": int(matched_df["scientific_name"].nunique()),
            "year_range": [int(matched_df["year"].min()), int(matched_df["year"].max())],
            "env_feature_coverage": cov_matched,
            "quantile_models": {"q10": m_q10_m, "q90": m_q90_m},
        },
        "quantile_models_sparse": {"q10": m_q10, "q90": m_q90},
        "feature_cols_baseline": FEAT_COLS_BASELINE,
        "feature_cols_envjoin": FEAT_COLS_ENVJOIN,
    }
    (JSN / "xgb_envjoin_metrics.json").write_text(json.dumps(summary, indent=2))

    # Plots
    plot_bar(final, "H_score", FIG / "xgb_envjoin_H_top_bottom.png",
             "Env-join H — per-tow CUFES")
    plot_bar(final, "A_score", FIG / "xgb_envjoin_A_top_bottom.png",
             "Env-join A — residual 2019-2023")
    plot_bar(final, "G_score", FIG / "xgb_envjoin_G_top_bottom.png",
             "Env-join G — q10 shift")
    plot_r2_bar(baseline_metrics, envjoin_metrics, matched_metrics,
                FIG / "xgb_envjoin_r2_compare.png")

    # Validation print
    print("\nvalidation (known cases) — envjoin scores:")
    val = final[final["scientific_name"].isin([s for s, _ in VALIDATION])]
    cols = ["rank", "scientific_name", "common_name",
            "H_score", "A_score", "G_score", "blended_score"]
    print(val[cols].to_string(index=False))

    print("\ntop 10 by blended:")
    print(final.head(10)[["rank", "scientific_name", "common_name",
                          "blended_score", "H_score", "A_score", "G_score"]].to_string(index=False))

    print(f"\nwrote outputs to {OUT}")


if __name__ == "__main__":
    main()
