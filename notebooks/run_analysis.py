"""End-to-end analysis: load CalCOFI CSVs, engineer features, score species,
run validation, emit JSON/CSV + plots to ``notebooks/outputs/``.

Usage (from repo root):

    .venv/bin/python notebooks/run_analysis.py
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

from features import (
    compute_species_features,
    compute_survivability_score,
    load_all,
)

OUT_DIR = OUT

VALIDATION_SPECIES = [
    ("Sardinops sagax", "Pacific sardine"),
    ("Engraulis mordax", "Northern anchovy"),
    ("Merluccius productus", "Pacific hake"),
    ("Trachurus symmetricus", "Jack mackerel"),
]


def profile_datasets(tables: dict[str, pd.DataFrame]) -> str:
    lines = ["# Dataset profile\n"]
    for name, df in tables.items():
        year_min = int(df["year"].min()) if "year" in df.columns and not df["year"].isna().all() else None
        year_max = int(df["year"].max()) if "year" in df.columns and not df["year"].isna().all() else None
        species_n = df["scientific_name"].nunique() if "scientific_name" in df.columns else None
        lines.append(f"## {name}")
        lines.append(f"- rows: {len(df):,}")
        if year_min and year_max:
            lines.append(f"- year range: {year_min}–{year_max}")
        if species_n:
            lines.append(f"- unique species: {species_n:,}")
        lines.append(f"- columns: `{', '.join(df.columns)}`\n")
    return "\n".join(lines)


def plot_validation_series(
    larvae: pd.DataFrame, species: list[tuple[str, str]], out_path: Path
) -> None:
    fig, axes = plt.subplots(
        nrows=len(species), ncols=1, figsize=(10, 2.6 * len(species)), sharex=True
    )
    if len(species) == 1:
        axes = [axes]
    for ax, (sci, common) in zip(axes, species):
        g = larvae[larvae["scientific_name"] == sci]
        annual = (
            g.dropna(subset=["larvae_10m2", "year"])
            .groupby("year")["larvae_10m2"]
            .mean()
        )
        annual = annual[annual.index >= 1970]
        ax.plot(annual.index.astype(int), annual.values, color="#0077B6", lw=1.5)
        ax.set_title(f"{common} ({sci}) — annual mean larvae / 10 m²")
        ax.grid(alpha=0.2)
    axes[-1].set_xlabel("Year")
    fig.tight_layout()
    fig.savefig(out_path, dpi=130)
    plt.close(fig)


def plot_top_bottom(ranked: pd.DataFrame, out_path: Path, k: int = 15) -> None:
    top = ranked.head(k).iloc[::-1]
    bottom = ranked.tail(k)
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    for ax, frame, title, color in [
        (axes[0], top, f"Top {k} — promote", "#2A9D8F"),
        (axes[1], bottom, f"Bottom {k} — deprioritize", "#E76F51"),
    ]:
        labels = frame["common_name"].where(
            frame["common_name"].astype(str).str.len() > 0, frame["scientific_name"]
        )
        ax.barh(labels, frame["survivability_score"], color=color)
        ax.set_title(title)
        ax.set_xlabel("survivability_score (z)")
        ax.grid(axis="x", alpha=0.2)
    fig.tight_layout()
    fig.savefig(out_path, dpi=130)
    plt.close(fig)


def plot_feature_corr(features: pd.DataFrame, out_path: Path) -> None:
    cols = [
        "log_mean_density",
        "recent_density",
        "trend_slope",
        "trend_t",
        "cv_recent",
        "ubiquity",
        "survival_ratio",
        "stage_advance_frac",
        "size_trend_mm_per_decade",
    ]
    cols = [c for c in cols if c in features.columns]
    corr = features[cols].corr(numeric_only=True)
    fig, ax = plt.subplots(figsize=(7, 6))
    im = ax.imshow(corr.values, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(cols)), cols, rotation=60, ha="right", fontsize=8)
    ax.set_yticks(range(len(cols)), cols, fontsize=8)
    for i in range(len(cols)):
        for j in range(len(cols)):
            v = corr.values[i, j]
            if np.isfinite(v):
                ax.text(j, i, f"{v:.2f}", ha="center", va="center", fontsize=7, color="black" if abs(v) < 0.6 else "white")
    ax.set_title("Feature correlation (per-species)")
    fig.colorbar(im, ax=ax, shrink=0.8)
    fig.tight_layout()
    fig.savefig(out_path, dpi=130)
    plt.close(fig)


def toy_ml_ranker(features: pd.DataFrame) -> dict:
    """Supervised sanity check against a hand-labeled Seafood-Watch-style target.

    Labels are 0..1 where 1 = "good to sell", 0 = "avoid". Values are chosen
    from public Seafood Watch / NOAA FishWatch summaries and encode the
    *outcome* we want the CalCOFI-derived features to reproduce. The goal is
    to see which engineered features actually carry signal; this is not a
    production ranker.
    """
    labels = {
        "Engraulis mordax": 0.85,        # Northern anchovy — abundant
        "Merluccius productus": 0.70,    # Pacific hake — managed well
        "Trachurus symmetricus": 0.65,   # Jack mackerel — not overfished
        "Scomber japonicus": 0.60,       # Pacific (chub) mackerel
        "Sardinops sagax": 0.10,         # Pacific sardine — collapsed
        "Sebastes paucispinis": 0.20,    # Bocaccio rockfish — rebuilding
        "Sebastes jordani": 0.50,        # Shortbelly rockfish
        "Loligo opalescens": 0.80,       # Market squid — healthy
        "Citharichthys": 0.55,           # Sanddabs genus
        "Paralichthys californicus": 0.40,  # California halibut
        "Xenistius californiensis": 0.30,
        "Stenobrachius leucopsarus": 0.70,  # northern lampfish — nonfished
    }
    df = features.copy()
    df["label"] = df["scientific_name"].map(labels)
    train = df.dropna(subset=["label"]).copy()
    if len(train) < 6:
        return {"trained": False, "reason": "too few labeled species"}

    feat_cols = [
        "log_mean_density",
        "recent_density",
        "trend_slope",
        "trend_t",
        "cv_recent",
        "ubiquity",
        "survival_ratio",
        "stage_advance_frac",
        "size_trend_mm_per_decade",
    ]
    feat_cols = [c for c in feat_cols if c in train.columns]
    X = train[feat_cols].astype(float).fillna(train[feat_cols].median(numeric_only=True))
    y = train["label"].astype(float)

    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.model_selection import LeaveOneOut
    from sklearn.metrics import mean_absolute_error

    preds = np.zeros(len(train))
    loo = LeaveOneOut()
    for tr, te in loo.split(X):
        m = GradientBoostingRegressor(n_estimators=200, max_depth=2, learning_rate=0.05, random_state=0)
        m.fit(X.iloc[tr], y.iloc[tr])
        preds[te] = m.predict(X.iloc[te])
    mae = float(mean_absolute_error(y, preds))

    model = GradientBoostingRegressor(n_estimators=200, max_depth=2, learning_rate=0.05, random_state=0)
    model.fit(X, y)
    importances = dict(sorted(zip(feat_cols, model.feature_importances_), key=lambda kv: -kv[1]))

    X_all = df[feat_cols].astype(float).fillna(X.median(numeric_only=True))
    df["ml_score"] = model.predict(X_all)

    return {
        "trained": True,
        "labeled_n": len(train),
        "loo_mae": mae,
        "importances": importances,
        "per_species_ml": df[["scientific_name", "common_name", "label", "ml_score"]]
        .sort_values("ml_score", ascending=False)
        .to_dict(orient="records"),
    }


def main() -> None:
    print("loading csvs...")
    tables = load_all()

    profile_md = profile_datasets(tables)
    (OUT_DIR / "dataset_profile.md").write_text(profile_md)
    print(profile_md)

    print("engineering features...")
    features = compute_species_features(tables)
    features.to_csv(TBL / "species_features.csv", index=False)
    print(f"  {len(features)} species passed MIN_OBS filter")

    print("scoring...")
    ranked = compute_survivability_score(features)
    ranked.to_csv(TBL / "species_rankings.csv", index=False)
    (JSN / "species_rankings.json").write_text(
        json.dumps(
            ranked.assign(
                common_name=lambda d: d["common_name"].fillna("").astype(str).str.strip()
            )
            .replace({np.nan: None})
            .to_dict(orient="records"),
            indent=2,
        )
    )

    print("\nTop 10 species:")
    print(ranked.head(10)[["rank", "scientific_name", "common_name", "survivability_score", "trend_t", "recent_density", "survival_ratio"]].to_string(index=False))
    print("\nBottom 10 species:")
    print(ranked.tail(10)[["rank", "scientific_name", "common_name", "survivability_score", "trend_t", "recent_density", "survival_ratio"]].to_string(index=False))

    print("\nValidation (known cases):")
    val = ranked[ranked["scientific_name"].isin([s for s, _ in VALIDATION_SPECIES])]
    print(val[["rank", "scientific_name", "common_name", "survivability_score", "trend_slope", "trend_t", "cv_recent", "recent_density"]].to_string(index=False))

    print("\nplots...")
    plot_validation_series(
        tables["larvae"], VALIDATION_SPECIES, FIG / "validation_timeseries.png"
    )
    plot_top_bottom(ranked, FIG / "top_bottom_scores.png")
    plot_feature_corr(features, FIG / "feature_correlation.png")

    print("\nML sanity check:")
    ml = toy_ml_ranker(features)
    (JSN / "ml_report.json").write_text(json.dumps(ml, indent=2, default=float))
    if ml.get("trained"):
        print(f"  labeled n = {ml['labeled_n']}, LOO MAE = {ml['loo_mae']:.3f}")
        print("  feature importances (sklearn GBR):")
        for k, v in ml["importances"].items():
            print(f"    {k:>30s}: {v:.3f}")
    else:
        print(f"  skipped: {ml.get('reason')}")

    print(f"\nwrote artifacts to {OUT_DIR}")


if __name__ == "__main__":
    main()
