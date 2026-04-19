"""Train the wide XGBoost using the CalCOFI **Bottle database** env
features from ``enrich_with_bottle.py``.

Head-to-head against:
    1. baseline (cruise-level CUFES, the xgb_advanced.py default)
    2. env-join sparse (per-tow CUFES, NaN-padded, from xgb_advanced_envjoin.py)
    3. bottle sparse       [NEW] — train on ALL rows, NaN where no bottle match
    4. bottle matched-only [NEW] — train on only the 56% of rows with bottle env

All three learned rankers (H mean-density, A residual, G quantile) are
produced on top of whichever of (3) / (4) wins test R².

Run::

    .venv/bin/python notebooks/enrich_with_bottle.py        # produces the parquet
    .venv/bin/python notebooks/xgb_advanced_bottlejoin.py
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
BOTTLE_PARQUET = OUT / "larvae_bottle_enriched.parquet"
CUFES_PARQUET = OUT / "larvae_env_enriched.parquet"

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

# Feature sets -----------------------------------------------------------

FEAT_COMMON = [
    "year", "month_sin", "month_cos", "latitude", "longitude", "species_id",
    "tow_type_code", "log_volume_sampled", "standard_haul_factor",
    "log_matched_eggs", "frac_past_flexion", "mean_larva_size_mm",
]

FEAT_COLS_BASELINE = FEAT_COMMON + ["cruise_sst", "cruise_sal"]

FEAT_COLS_BOTTLE = FEAT_COMMON + [
    # upper-ocean means
    "bot_sst_100m", "bot_sal_100m", "bot_sigma_100m", "bot_o2_100m",
    "bot_chla_100m", "bot_po4_100m", "bot_no3_100m", "bot_sio3_100m",
    # derived ecology features
    "bot_mld_05", "bot_strat_dT", "bot_chla_max", "bot_chla_int",
    "bot_o2_min_200", "bot_nitracline",
    # cast-table met (Cast.csv weather)
    "cast_wind_spd", "cast_wind_dir", "cast_barom",
    "cast_dry_t", "cast_wet_t", "cast_secchi",
]

TARGET = "y"


# ---------------------------------------------------------------------------
# Shared prep
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
    print("  joining Eggs/LarvaeStages/LarvaeSizes...")
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


def _add_cruise_env(larvae: pd.DataFrame) -> pd.DataFrame:
    cufes = pd.read_csv(
        DATA / "Cufes.csv",
        usecols=["cruise", "start_temperature", "start_salinity"],
        low_memory=False,
    )
    cufes["cruise"] = cufes["cruise"].astype(str)
    cufes["start_temperature"] = pd.to_numeric(cufes["start_temperature"], errors="coerce")
    cufes["start_salinity"] = pd.to_numeric(cufes["start_salinity"], errors="coerce")
    agg = (
        cufes.groupby("cruise").agg(
            cruise_sst=("start_temperature", "mean"),
            cruise_sal=("start_salinity", "mean"),
        ).reset_index()
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


def build_baseline():
    print("=== BASELINE (cruise-level CUFES) ===")
    larvae = pd.read_csv(
        DATA / "Larvae.csv",
        usecols=["cruise", "time", "latitude", "longitude", "line", "station",
                 "tow_type", "volume_sampled", "standard_haul_factor",
                 "scientific_name", "common_name", "larvae_count", "larvae_10m2"],
        low_memory=False,
    )
    larvae = _prepare_base(larvae)
    larvae = _join_eggs_stages_sizes(larvae)
    larvae = _add_cruise_env(larvae)
    larvae, _ = _add_derived(larvae)
    return larvae


def build_bottle():
    print("=== BOTTLE (per-cast CalCOFI bottle database) ===")
    if not BOTTLE_PARQUET.exists():
        raise FileNotFoundError(
            f"{BOTTLE_PARQUET} missing. Run notebooks/enrich_with_bottle.py first."
        )
    larvae = pd.read_parquet(BOTTLE_PARQUET)
    larvae = _prepare_base(larvae)
    larvae = _join_eggs_stages_sizes(larvae)
    # numeric coerce for bottle/cast columns
    for c in FEAT_COLS_BOTTLE:
        if c in larvae.columns and c not in ("year", "month_sin", "month_cos",
                                              "latitude", "longitude"):
            larvae[c] = pd.to_numeric(larvae[c], errors="coerce")
    larvae, _ = _add_derived(larvae)
    # "matched to a bottle cast" flag
    larvae["has_bottle"] = larvae["bot_sst_100m"].notna() | larvae["bot_sal_100m"].notna()
    return larvae


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------


def _time_split(df):
    return df[df["year"] <= TRAIN_MAX_YEAR], df[df["year"] >= TEST_MIN_YEAR]


def train_mean(train, test, feat_cols, tag: str):
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
    metrics = {
        "tag": tag,
        "n_train": int(len(train)), "n_test": int(len(test)),
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
        "feature_importance": {k: float(v)
                               for k, v in zip(feat_cols, model.feature_importances_)},
    }
    print(f"  {tag:<32s}  n_train={len(train):>7,} n_test={len(test):>6,} "
          f"train R²={metrics['train']['r2']:.4f} test R²={metrics['test']['r2']:.4f}")
    return model, metrics


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
    return model, {
        "quantile": quantile,
        "test": {
            "pinball": float(np.where(d >= 0, quantile * d, (quantile - 1) * d).mean()),
            "coverage_below": float((y_te <= pred_te).mean()),
        },
    }


# ---------------------------------------------------------------------------
# Rankers (identical to xgb_advanced.py)
# ---------------------------------------------------------------------------


def _species_common(larvae):
    return (
        larvae.groupby("scientific_name", observed=True)["common_name"]
        .agg(lambda s: s.dropna().astype(str).str.strip().mode().iat[0]
             if not s.dropna().empty else "")
    )


def approach_h(model, larvae, feat_cols):
    earlier = larvae[(larvae["year"] >= EARLIER[0]) & (larvae["year"] <= EARLIER[1])].copy()
    recent = larvae[(larvae["year"] >= RECENT[0]) & (larvae["year"] <= RECENT[1])].copy()
    earlier["pred"] = model.predict(earlier[feat_cols])
    recent["pred"] = model.predict(recent[feat_cols])
    train_n = (larvae[larvae["year"] <= TRAIN_MAX_YEAR]
               .groupby("scientific_name", observed=True).size().rename("n_train"))
    earlier_mean = earlier.groupby("scientific_name", observed=True)["pred"].mean().rename("H_earlier")
    recent_mean = recent.groupby("scientific_name", observed=True)["pred"].mean().rename("H_recent")
    common = _species_common(larvae).rename("common_name")
    df = pd.concat([train_n, earlier_mean, recent_mean, common], axis=1).reset_index()
    df = df[df["n_train"].fillna(0) >= MIN_TRAIN_OBS]
    df["H_delta"] = df["H_recent"] - df["H_earlier"]
    for col in ["H_recent", "H_delta"]:
        vals = df[col].astype(float); sd = vals.std(ddof=0)
        df[col + "_z"] = 0.0 if not sd or not np.isfinite(sd) else (vals - vals.mean()) / sd
    df["H_score"] = df["H_recent_z"] + df["H_delta_z"]
    return df


def approach_a(model, larvae, feat_cols):
    test = larvae[larvae["year"] >= TEST_MIN_YEAR].copy()
    test["pred"] = model.predict(test[feat_cols])
    test["residual"] = test[TARGET] - test["pred"]
    agg = (test.groupby("scientific_name", observed=True)
           .agg(A_mean_residual=("residual", "mean"),
                A_median_residual=("residual", "median"),
                A_n_test=("residual", "size")).reset_index())
    agg = agg[agg["A_n_test"] >= 5].copy()
    vals = agg["A_mean_residual"].astype(float); sd = vals.std(ddof=0)
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
        return (df.groupby("scientific_name", observed=True)[["q10", "q90"]]
                .mean().rename(columns={"q10": f"{name}_q10", "q90": f"{name}_q90"}))

    df = pd.concat([_agg(earlier, "earlier"), _agg(recent, "recent")], axis=1).reset_index()
    df["G_q10_delta"] = df["recent_q10"] - df["earlier_q10"]
    df["G_q90_delta"] = df["recent_q90"] - df["earlier_q90"]
    vals = df["G_q10_delta"].astype(float); sd = vals.std(ddof=0)
    df["G_score"] = 0.0 if not sd or not np.isfinite(sd) else (vals - vals.mean()) / sd
    return df


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------


def plot_bar(ranked, score_col, path, title, k=15):
    df = ranked.dropna(subset=[score_col]).sort_values(score_col, ascending=False)
    top = df.head(k).iloc[::-1]; bottom = df.tail(k)
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    for ax, frame, sub, color in [
        (axes[0], top, f"Top {k}", "#2A9D8F"),
        (axes[1], bottom, f"Bottom {k}", "#E76F51"),
    ]:
        labels = frame["common_name"].where(
            frame["common_name"].astype(str).str.len() > 0, frame["scientific_name"]
        )
        ax.barh(labels, frame[score_col], color=color)
        ax.set_title(f"{title} — {sub}"); ax.set_xlabel(score_col); ax.grid(axis="x", alpha=0.2)
    fig.tight_layout(); fig.savefig(path, dpi=130); plt.close(fig)


def plot_r2_bar(all_metrics: dict, path):
    labels = ["train R²", "test R²"]
    x = np.arange(len(labels))
    w = 0.18
    colors = ["#6C8EBF", "#F4A261", "#E76F51", "#2A9D8F", "#5C4A8C"]
    fig, ax = plt.subplots(figsize=(11, 5.5))
    for i, (name, m) in enumerate(all_metrics.items()):
        vals = [m["train"]["r2"], m["test"]["r2"]]
        pos = x + (i - (len(all_metrics) - 1) / 2) * w
        ax.bar(pos, vals, w, label=name, color=colors[i % len(colors)])
        for xi, v in zip(pos, vals):
            ax.text(xi, v + 0.005, f"{v:.3f}", ha="center", fontsize=8)
    ax.set_xticks(x); ax.set_xticklabels(labels)
    ax.set_ylabel("R²")
    ax.set_title("XGBoost R²: cruise-level → per-tow CUFES → CalCOFI bottle database")
    ax.legend(fontsize=8); ax.grid(axis="y", alpha=0.2)
    fig.tight_layout(); fig.savefig(path, dpi=130); plt.close(fig)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    # (1) Baseline ----------------------------------------------------------
    baseline_df = build_baseline()
    b_train, b_test = _time_split(baseline_df)
    _, baseline_metrics = train_mean(b_train, b_test, FEAT_COLS_BASELINE,
                                      "baseline (cruise-level CUFES)")

    # (2) Env-join sparse (from CUFES parquet, for comparison) --------------
    envjoin_metrics = None
    if CUFES_PARQUET.exists():
        print("\nre-training env-join sparse for comparison...")
        from_df = pd.read_parquet(CUFES_PARQUET)
        from_df = _prepare_base(from_df)
        from_df = _join_eggs_stages_sizes(from_df)
        for c in ["env_sst", "env_sal", "env_wind_speed",
                  "env_match_km", "env_match_days"]:
            from_df[c] = pd.to_numeric(from_df[c], errors="coerce")
        from_df, _ = _add_derived(from_df)
        FEAT_COLS_ENVJOIN = FEAT_COMMON + [
            "env_sst", "env_sal", "env_wind_speed",
            "env_match_km", "env_match_days",
        ]
        e_train, e_test = _time_split(from_df)
        _, envjoin_metrics = train_mean(e_train, e_test, FEAT_COLS_ENVJOIN,
                                         "env-join sparse (per-tow CUFES)")

    # (3) Bottle sparse -----------------------------------------------------
    bottle_df = build_bottle()
    bt_train, bt_test = _time_split(bottle_df)
    cov_sparse = {c: float(bottle_df[c].notna().mean()) for c in FEAT_COLS_BOTTLE
                  if c.startswith(("bot_", "cast_"))}
    print("\nbottle feature coverage (full dataset):")
    for k, v in sorted(cov_sparse.items(), key=lambda kv: -kv[1]):
        print(f"    {k:>22s}: {v:.1%}")

    print()
    model_sparse, bottle_sparse_metrics = train_mean(
        bt_train, bt_test, FEAT_COLS_BOTTLE, "bottle sparse (NaN-padded)"
    )

    # (4) Bottle matched-only ----------------------------------------------
    matched = bottle_df[bottle_df["has_bottle"]].copy()
    m_train, m_test = _time_split(matched)
    print()
    model_matched, bottle_matched_metrics = train_mean(
        m_train, m_test, FEAT_COLS_BOTTLE, "bottle matched-only (100% env)"
    )

    # Pick the winning sparse/matched variant for rankers
    winning = "sparse" if (
        bottle_sparse_metrics["test"]["r2"] >= bottle_matched_metrics["test"]["r2"]
    ) else "matched"
    winning_model = model_sparse if winning == "sparse" else model_matched
    winning_frame = bottle_df  # predict over all rows either way
    winning_train = bt_train if winning == "sparse" else m_train
    winning_test = bt_test if winning == "sparse" else m_test
    print(f"\nwinning bottle config: {winning}")

    # Quantile models on the winner
    print("  training quantile models (τ=0.1, τ=0.9)...")
    model_q10, m_q10 = train_quantile(winning_train, winning_test, FEAT_COLS_BOTTLE, 0.1)
    model_q90, m_q90 = train_quantile(winning_train, winning_test, FEAT_COLS_BOTTLE, 0.9)
    print(f"  q10 pinball={m_q10['test']['pinball']:.3f} cov={m_q10['test']['coverage_below']:.2f}")
    print(f"  q90 pinball={m_q90['test']['pinball']:.3f} cov={m_q90['test']['coverage_below']:.2f}")

    # Head-to-head summary
    all_metrics = {"baseline": baseline_metrics}
    if envjoin_metrics is not None:
        all_metrics["envjoin-sparse"] = envjoin_metrics
    all_metrics["bottle-sparse"] = bottle_sparse_metrics
    all_metrics["bottle-matched"] = bottle_matched_metrics

    print("\n=== HEAD-TO-HEAD ===")
    print(f"  {'configuration':<35s}  {'n_train':>10s}  {'n_test':>8s}  "
          f"{'train R²':>10s}  {'test R²':>9s}  {'ΔR²':>8s}")
    for name, m in all_metrics.items():
        dr = m["test"]["r2"] - baseline_metrics["test"]["r2"]
        print(f"  {m['tag']:<35s}  {m['n_train']:>10,}  {m['n_test']:>8,}  "
              f"{m['train']['r2']:>10.4f}  {m['test']['r2']:>9.4f}  {dr:>+8.4f}")

    # Feature importance (bottle sparse)
    print("\n  top-15 features (bottle sparse):")
    imp = sorted(bottle_sparse_metrics["feature_importance"].items(),
                 key=lambda kv: -kv[1])[:15]
    for k, v in imp:
        print(f"    {k:>22s}: {v:.3f}")

    # Rankers
    print(f"\nbuilding rankers on bottle-{winning} model (predictions over all rows)...")
    rank_h = approach_h(winning_model, winning_frame, FEAT_COLS_BOTTLE)
    rank_a = approach_a(winning_model, winning_frame, FEAT_COLS_BOTTLE)
    rank_g = approach_g(model_q10, model_q90, winning_frame, FEAT_COLS_BOTTLE)

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

    final.to_csv(TBL / "xgb_bottle_rankings.csv", index=False)
    (JSN / "xgb_bottle_rankings.json").write_text(
        json.dumps(final.replace({np.nan: None}).to_dict(orient="records"), indent=2)
    )
    summary = {
        "metrics": all_metrics,
        "winning_config": winning,
        "bottle_feature_coverage": cov_sparse,
        "feature_cols_baseline": FEAT_COLS_BASELINE,
        "feature_cols_bottle": FEAT_COLS_BOTTLE,
        "quantile_q10": m_q10, "quantile_q90": m_q90,
    }
    (JSN / "xgb_bottle_metrics.json").write_text(json.dumps(summary, indent=2))

    plot_bar(final, "H_score", FIG / "xgb_bottle_H_top_bottom.png",
             "Bottle-join H — mean predicted log-density")
    plot_bar(final, "A_score", FIG / "xgb_bottle_A_top_bottom.png",
             "Bottle-join A — residual 2019-2023")
    plot_bar(final, "G_score", FIG / "xgb_bottle_G_top_bottom.png",
             "Bottle-join G — 10th-percentile shift")
    plot_r2_bar(all_metrics, FIG / "xgb_bottle_r2_compare.png")

    val = final[final["scientific_name"].isin([s for s, _ in VALIDATION])]
    cols = ["rank", "scientific_name", "common_name",
            "H_score", "A_score", "G_score", "blended_score"]
    print("\nvalidation on four known species:")
    print(val[cols].to_string(index=False))

    print(f"\nwrote outputs to {OUT}")


if __name__ == "__main__":
    main()
