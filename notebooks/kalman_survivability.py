"""State-space (Kalman) survivability on annual catch size.

Motivation
----------
Per-tow larvae density is extremely noisy — zero-inflated, seasonal,
station-biased, and confounded by sampling effort. Regression models
bottom out around R² 0.54 (XGB) because that noise is *irreducible* at
the tow level.

The right tool for a noisy time series is a **state-space model**. We
aggregate every year's tows into a single effort-standardised
"catch size" signal per species, then fit a **local linear trend
Kalman filter** that explicitly separates:

* a **latent level** μ_t (the true population size each year),
* a **latent slope** β_t (the trend), and
* **observation noise** ε_t (sampling / weather / gear variance).

The smoother borrows strength across adjacent years, so a single bad
survey year doesn't dominate the trend estimate the way it would in a
per-tow regression.

Observation
-----------
For each (species, year) we compute::

    y_t = log1p( mean(larvae_10m²) across all tows in year t )

using only years with ≥ MIN_TOWS_PER_YEAR tows (to filter sparse
coverage). This is the closest CalCOFI analog to a fisheries-style
effort-standardised "catch per unit effort" (CPUE) series.

Model
-----
statsmodels' ``UnobservedComponents`` with ``level='local linear trend'``:

    μ_t = μ_{t-1} + β_{t-1} + η_t          η_t ~ N(0, σ²_level)
    β_t = β_{t-1} + ζ_t                    ζ_t ~ N(0, σ²_slope)
    y_t = μ_t + ε_t                        ε_t ~ N(0, σ²_obs)

We extract four survivability signals per species:

* ``current_level``   — smoothed μ at the most recent year
* ``recent_slope``    — mean of smoothed β over the last 10 years
* ``slope_se``        — stderr of that mean (uncertainty)
* ``signal_ratio``    — var(smoothed μ) / (var(smoothed μ) + σ²_obs).
                        Close to 0 ⇒ nothing but noise; close to 1 ⇒
                        a real trend exists.

Outputs
-------
- ``outputs/tables/kalman_survivability.csv``  per-species features
- ``outputs/figures/kalman_anchor_trajectories.png`` 4 anchor species
- ``outputs/figures/kalman_vs_xgb_scatter.png``     Kalman vs XGB score
"""
from __future__ import annotations

import os
import sys
import warnings
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ.setdefault("MPLCONFIGDIR", str(HERE.parent / ".venv" / ".mplcache"))
sys.path.insert(0, str(HERE))
from output_paths import FIG, TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from statsmodels.tsa.statespace.structural import UnobservedComponents

DATA = HERE.parent / "data"
LARVAE_CSV = DATA / "Larvae.csv"
XGB_RANKINGS = TBL / "xgb_bottle_rankings.csv"

MIN_TOWS_PER_YEAR = 20      # annual mean needs decent sample size
MIN_YEARS = 15              # species needs ≥ 15 years of coverage
MIN_TOTAL_CATCH = 500       # and at least 500 total larvae counted
RECENT_SLOPE_YEARS = 10     # "trend" = mean slope over last 10 years

ANCHORS = [
    "Engraulis mordax",        # Northern anchovy (healthy, cyclical)
    "Sardinops sagax",         # Pacific sardine (collapsed)
    "Merluccius productus",    # Pacific hake (stable, commercial)
    "Trachurus symmetricus",   # Jack mackerel (variable)
]


# ---------------------------------------------------------------------------
# Build annual CPUE series
# ---------------------------------------------------------------------------


def load_annual_cpue() -> pd.DataFrame:
    """Return (species, year, y, n_tows) where y = log1p(mean larvae_10m²)."""
    print(f"loading {LARVAE_CSV.name}...")
    df = pd.read_csv(
        LARVAE_CSV,
        usecols=["scientific_name", "common_name", "time", "larvae_10m2"],
        low_memory=False,
    )
    df["time"] = pd.to_datetime(df["time"], errors="coerce", utc=True)
    df = df.dropna(subset=["time", "scientific_name", "larvae_10m2"])
    df["larvae_10m2"] = pd.to_numeric(df["larvae_10m2"], errors="coerce")
    df = df.dropna(subset=["larvae_10m2"])
    df = df[df["larvae_10m2"] >= 0].copy()
    df["year"] = df["time"].dt.year

    print(f"  {len(df):,} rows, {df['scientific_name'].nunique():,} species")

    annual = (df.groupby(["scientific_name", "year"], observed=True)
              .agg(mean_density=("larvae_10m2", "mean"),
                    n_tows=("larvae_10m2", "size"),
                    total_catch=("larvae_10m2", "sum"))
              .reset_index())
    annual = annual[annual["n_tows"] >= MIN_TOWS_PER_YEAR]
    annual["y"] = np.log1p(annual["mean_density"])

    counts = annual.groupby("scientific_name").agg(
        years=("year", "nunique"),
        total=("total_catch", "sum"),
    )
    keep = counts[(counts["years"] >= MIN_YEARS) &
                  (counts["total"] >= MIN_TOTAL_CATCH)].index
    annual = annual[annual["scientific_name"].isin(keep)].copy()

    common = (df.groupby("scientific_name", observed=True)["common_name"]
              .agg(lambda s: s.dropna().astype(str).mode().iat[0]
                   if not s.dropna().empty else ""))
    annual = annual.merge(common.rename("common_name"),
                          left_on="scientific_name", right_index=True, how="left")
    print(f"  {annual['scientific_name'].nunique():,} species with "
          f"≥{MIN_YEARS} yrs & ≥{MIN_TOTAL_CATCH} total catch")
    print(f"  {len(annual):,} (species, year) rows")
    return annual


# ---------------------------------------------------------------------------
# Fit Kalman per species
# ---------------------------------------------------------------------------


def _fit_one(series: pd.Series):
    """Return (smoothed_level, smoothed_slope, obs_var, level_var, slope_var,
    smoothed_cov)."""
    years = series.index.to_numpy()
    y = series.to_numpy(dtype=float)

    y_full = pd.Series(y, index=years).reindex(
        np.arange(years.min(), years.max() + 1)
    )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        mod = UnobservedComponents(y_full.values, level="local linear trend")
        res = mod.fit(disp=False, maxiter=200)

    sm = res.smoothed_state      # (k_states, n)
    cov = res.smoothed_state_cov # (k_states, k_states, n)
    return {
        "years": y_full.index.to_numpy(),
        "y": y_full.values,
        "level": sm[0],
        "slope": sm[1],
        "level_var_t": cov[0, 0],
        "slope_var_t": cov[1, 1],
        "obs_var": float(res.params[-1]) if hasattr(res, "params") else np.nan,
        "aic": float(res.aic),
        "llf": float(res.llf),
    }


def kalman_per_species(annual: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    features = []
    trajectories = {}
    species = annual["scientific_name"].unique()
    print(f"\nfitting Kalman LLT for {len(species)} species...")

    for i, sp in enumerate(species):
        g = annual[annual["scientific_name"] == sp].sort_values("year")
        if g["year"].nunique() < MIN_YEARS:
            continue
        s = g.set_index("year")["y"]
        try:
            f = _fit_one(s)
        except Exception as exc:  # pragma: no cover — bad convergence
            print(f"  [skip] {sp}: {exc}")
            continue

        level = f["level"]
        slope = f["slope"]
        obs_var = f["obs_var"]

        recent = min(RECENT_SLOPE_YEARS, len(slope))
        recent_slope = float(np.mean(slope[-recent:]))
        recent_slope_se = float(
            np.sqrt(np.mean(f["slope_var_t"][-recent:]))
        )

        # Trend confidence: how many SE's is the slope away from zero?
        # t_stat > ~1 ⇒ real trend; ~0 ⇒ flat within noise.
        t_stat = abs(recent_slope) / max(recent_slope_se, 1e-9)
        # Convert to a weight in [0, 1]. At t_stat=1 weight≈0.5, t_stat>2 ≈0.9.
        trend_confidence = t_stat / (1.0 + t_stat)

        features.append({
            "scientific_name": sp,
            "common_name": g["common_name"].iloc[0],
            "n_years": int(g["year"].nunique()),
            "current_level": float(level[-1]),
            "recent_slope": recent_slope,
            "recent_slope_se": recent_slope_se,
            "trend_t_stat": t_stat,
            "trend_confidence": trend_confidence,
            "obs_var": obs_var,
            "aic": f["aic"],
        })
        trajectories[sp] = f

        if (i + 1) % 25 == 0:
            print(f"  fit {i + 1}/{len(species)}")

    feat = pd.DataFrame(features).set_index("scientific_name")
    print(f"  done: {len(feat)} species fit successfully")
    return feat, trajectories


# ---------------------------------------------------------------------------
# Scoring: convert Kalman features → survivability score
# ---------------------------------------------------------------------------


def _zscale(s: pd.Series) -> pd.Series:
    """Robust z-score via median / MAD → sigmoid → [0, 1]."""
    med = s.median()
    mad = np.median(np.abs(s - med)) or 1.0
    z = (s - med) / (1.4826 * mad)
    return 1 / (1 + np.exp(-z))


def kalman_score(feat: pd.DataFrame) -> pd.DataFrame:
    """Combine level + slope into a [0, 1] survivability score.

    No hand-picked weights. Each signal is mapped to [0, 1] via
    median/MAD → sigmoid, then combined geometrically. The slope
    component is shrunk toward 0.5 by ``trend_confidence`` =
    ``t / (1 + t)`` so species whose recent slope is indistinguishable
    from zero contribute a neutral 0.5 rather than a noisy direction.
    """
    out = feat.copy()
    out["level_01"] = _zscale(out["current_level"])
    out["slope_01_raw"] = _zscale(out["recent_slope"])
    w = out["trend_confidence"].clip(0, 1)
    out["slope_01"] = w * out["slope_01_raw"] + (1 - w) * 0.5
    out["kalman_score"] = np.sqrt(
        out["level_01"].clip(1e-6) * out["slope_01"].clip(1e-6)
    )
    return out


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------


def plot_anchor_trajectories(trajectories: dict, outpath: Path):
    fig, axes = plt.subplots(2, 2, figsize=(12, 8), sharex=False)
    axes = axes.ravel()
    for ax, sp in zip(axes, ANCHORS):
        if sp not in trajectories:
            ax.set_title(f"{sp}\n(no Kalman fit)")
            ax.axis("off")
            continue
        f = trajectories[sp]
        years = f["years"]
        y = f["y"]
        level = f["level"]
        level_sd = np.sqrt(np.maximum(f["level_var_t"], 0))
        ax.plot(years, y, "o", color="#666", alpha=0.6,
                markersize=4, label="observed log1p CPUE")
        ax.plot(years, level, "-", color="#1f77b4", lw=2,
                label="Kalman-smoothed level")
        ax.fill_between(years, level - 1.96 * level_sd, level + 1.96 * level_sd,
                         color="#1f77b4", alpha=0.2, label="95% CI")
        ax.set_title(sp)
        ax.set_xlabel("year")
        ax.set_ylabel("log1p(mean larvae_10m²)")
        ax.grid(alpha=0.3)
        ax.legend(loc="best", fontsize=8)
    fig.suptitle("Kalman local-linear-trend smoother on annual CPUE",
                 fontsize=13)
    fig.tight_layout()
    fig.savefig(outpath, dpi=140, bbox_inches="tight")
    plt.close(fig)


def plot_kalman_vs_xgb(scored: pd.DataFrame, xgb: pd.Series, outpath: Path):
    common = scored.index.intersection(xgb.index)
    if common.empty:
        return
    s_k = scored.loc[common, "kalman_score"]
    s_x = xgb.loc[common]
    rho, _ = spearmanr(s_k, s_x)

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.scatter(s_x, s_k, alpha=0.5, s=20, color="#1f77b4",
                edgecolor="white", linewidth=0.3)
    for sp in ANCHORS:
        if sp in common:
            ax.annotate(
                sp.split()[-1],
                (s_x.loc[sp], s_k.loc[sp]),
                fontsize=8, xytext=(4, 4), textcoords="offset points",
                color="#c0392b",
            )
            ax.scatter(s_x.loc[sp], s_k.loc[sp], s=60,
                       facecolor="none", edgecolor="#c0392b", linewidth=1.5)
    ax.set_xlabel("XGB blended survivability score")
    ax.set_ylabel("Kalman survivability score")
    ax.set_title(f"Kalman vs XGB survivability  (Spearman ρ = {rho:.3f},  "
                 f"n = {len(common)})")
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(outpath, dpi=140, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    annual = load_annual_cpue()
    feat, traj = kalman_per_species(annual)

    scored = kalman_score(feat)
    scored.to_csv(TBL / "kalman_survivability.csv")
    print(f"\nwrote {TBL/'kalman_survivability.csv'}  "
          f"({len(scored)} species)")

    # Anchor species summary
    print("\nanchor species (Kalman results):")
    print(f"  {'species':<28s}  {'n_yrs':>5s}  {'level':>7s}  "
          f"{'slope':>8s}  {'slope_se':>8s}  {'t':>5s}  {'conf':>5s}  "
          f"{'score':>6s}")
    for sp in ANCHORS:
        if sp not in scored.index:
            continue
        r = scored.loc[sp]
        print(f"  {sp:<28s}  {r['n_years']:>5.0f}  {r['current_level']:>7.3f}  "
              f"{r['recent_slope']:>+8.4f}  {r['recent_slope_se']:>8.4f}  "
              f"{r['trend_t_stat']:>5.2f}  {r['trend_confidence']:>5.2f}  "
              f"{r['kalman_score']:>6.3f}")

    # Compare to XGB
    if XGB_RANKINGS.exists():
        xgb = (pd.read_csv(XGB_RANKINGS)
               .set_index("scientific_name")["blended_score"])
        both = (pd.concat([scored["kalman_score"].rename("k"),
                            xgb.rename("x")], axis=1, join="inner")
                .dropna())
        if not both.empty:
            rho, p = spearmanr(both["k"], both["x"])
            print(f"\nSpearman ρ( Kalman score , XGB blended ) = {rho:+.3f}   "
                  f"(p={p:.2g}, n={len(both)})")
        plot_kalman_vs_xgb(scored, xgb, FIG / "kalman_vs_xgb_scatter.png")
        print(f"wrote {FIG/'kalman_vs_xgb_scatter.png'}")

    plot_anchor_trajectories(traj, FIG / "kalman_anchor_trajectories.png")
    print(f"wrote {FIG/'kalman_anchor_trajectories.png'}")

    # Top / bottom 10 by Kalman survivability
    print("\ntop 10 by Kalman survivability (healthy + trending up):")
    top = scored.sort_values("kalman_score", ascending=False).head(10)
    for i, (sp, r) in enumerate(top.iterrows(), 1):
        print(f"  {i:>2d}. {r['kalman_score']:.3f}  "
              f"slope={r['recent_slope']:+.4f}  conf={r['trend_confidence']:.2f}  "
              f"{sp}  ({r['common_name']})")

    print("\nbottom 10 by Kalman survivability:")
    bot = scored.sort_values("kalman_score", ascending=True).head(10)
    for i, (sp, r) in enumerate(bot.iterrows(), 1):
        print(f"  {i:>2d}. {r['kalman_score']:.3f}  "
              f"slope={r['recent_slope']:+.4f}  conf={r['trend_confidence']:.2f}  "
              f"{sp}  ({r['common_name']})")


if __name__ == "__main__":
    main()
