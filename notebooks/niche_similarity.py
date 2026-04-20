"""Per-species environmental niche centroids for location-aware
recommendations.

Each species' **niche centroid** is the density-weighted mean of its
environmental feature vector (bottle env + month + lat/lng) across all
of its historical observations. At query time the buyer's
``(lat, lng, date [+ optional live env])`` is z-scored the same way and
every species gets three interpretable similarity scores:

* **cos_01**: ``(cos(query, species) + 1) / 2``
  → [0, 1].  0.5 = orthogonal niche, 1 = exact direction match.
* **rbf**: ``exp(-‖z(query) - z(species)‖² / (2σ²))``
  → (0, 1].  1 = exact match; σ = √(n_features).
* **euclidean**: raw z-scored Euclidean distance (lower is better).

None of these are a survivability signal — a collapsing species whose
*historical* niche happens to match the current ocean (e.g. Pacific
sardine) will still score high. The intended use is to COMPOSE niche
match with the XGBoost survivability score::

    final = rank(cos_01 * sigmoid(F_xgb_blended))

This script:

1. Builds centroids from the bottle-enriched Larvae dataset, weighted
   by ``log1p(larvae_10m²)`` so the centroid tracks where each species
   is most abundant, not where it was merely sampled.
2. Z-scores everything globally and saves scaler parameters so the
   app backend can transform queries identically.
3. Demonstrates the score at three query points (an anchovy-niche
   query, a sardine-niche query, and a random recent test-period
   cast) and validates the sanity check: anchovy scores high at its
   own niche, sardine at its own, etc.
4. Shows the composed ``niche × survivability`` ranking vs.
   ``niche-only`` and ``survivability-only`` for each query.

Outputs::

    notebooks/outputs/niche_centroids.parquet   species × features (z-scored)
    notebooks/outputs/json/niche_scaler.json    mean / std for each feature
    notebooks/outputs/niche_demo.md             demo queries, top 10 species each
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ.setdefault("MPLCONFIGDIR", str(HERE.parent / ".venv" / ".mplcache"))
sys.path.insert(0, str(HERE))
from output_paths import JSN, OUT, TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

DATA = HERE.parent / "data"
BOTTLE_PARQUET = OUT / "larvae_bottle_enriched.parquet"
XGB_RANKINGS = TBL / "xgb_bottle_rankings.csv"

MIN_PRESENCE_OBS = 30  # species must be observed ≥30 times
MIN_DENSITY = 0.0      # presence = larvae_10m² > 0

# Features that define the *niche*. Built from the joined
# larvae + bottle + cast table (`outputs/larvae_bottle_enriched.parquet`).
#
# Three feature groups:
#   - bot_*  : upper-ocean chemistry from the Bottle database
#              (SST, salinity, density, O2, chlorophyll, MLD, stratification,
#              nitrate). Fills in at ~50% coverage; we skip NaNs per row.
#   - cast_* : weather-at-cast readings (wind, barometer, air temp). These
#              are the features a buyer's phone / marine-weather API can
#              actually supply at query time, which is the whole point of
#              the niche-match layer.
#   - spatio-temporal: latitude, longitude, month_sin, month_cos.
#
# Wind direction is circular, so we decompose it into `cast_wind_sin` and
# `cast_wind_cos` in `load_data()` before any averaging.
#
# Excluded on purpose: tow_type, volume_sampled, haul_factor (sampling
# artefacts), species_id (the label), egg-match / larva-size (consequences
# of presence, not habitat).
NICHE_NUM = [
    # --- upper-ocean chemistry from the Bottle database ----------------
    "bot_sst_100m", "bot_sal_100m", "bot_sigma_100m",
    "bot_o2_100m", "bot_chla_100m", "bot_chla_int",
    "bot_mld_05", "bot_strat_dT", "bot_no3_100m",
    # --- weather-at-cast (from the Cast table) -------------------------
    "cast_wind_spd", "cast_wind_sin", "cast_wind_cos",
    "cast_barom", "cast_dry_t",
    # --- spatio-temporal ----------------------------------------------
    "latitude", "longitude",
    "month_sin", "month_cos",
]


# ---------------------------------------------------------------------------
# Build the niche centroid table
# ---------------------------------------------------------------------------


def load_data() -> pd.DataFrame:
    if not BOTTLE_PARQUET.exists():
        raise FileNotFoundError(
            f"{BOTTLE_PARQUET} missing. Run notebooks/enrich_with_bottle.py first."
        )
    print("loading bottle-enriched Larvae parquet...")
    df = pd.read_parquet(BOTTLE_PARQUET)
    df = df.dropna(subset=["larvae_10m2", "latitude", "longitude",
                            "scientific_name", "time"])
    df["time"] = pd.to_datetime(df["time"], errors="coerce", utc=True)
    df = df.dropna(subset=["time"])
    df["month"] = df["time"].dt.month
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0)
    df["larvae_10m2"] = pd.to_numeric(df["larvae_10m2"], errors="coerce")
    df = df[df["larvae_10m2"] >= 0].copy()

    # Decompose circular wind direction (0-360°) into sin/cos. Rows missing
    # cast_wind_dir propagate NaN, which the weighted-mean skip-NaN logic
    # handles correctly downstream.
    if "cast_wind_dir" in df.columns:
        rad = np.deg2rad(pd.to_numeric(df["cast_wind_dir"], errors="coerce"))
        df["cast_wind_sin"] = np.sin(rad)
        df["cast_wind_cos"] = np.cos(rad)
    else:
        df["cast_wind_sin"] = np.nan
        df["cast_wind_cos"] = np.nan

    for c in NICHE_NUM:
        if c not in df.columns:
            df[c] = np.nan
        df[c] = pd.to_numeric(df[c], errors="coerce")
    print(f"  {len(df):,} rows, {df['scientific_name'].nunique():,} species")

    cov = df[NICHE_NUM].notna().mean().mul(100).round(1)
    print("  feature coverage (% non-null):")
    for c in NICHE_NUM:
        print(f"    {c:<18s}: {cov[c]:5.1f}%")
    return df


def fit_scaler(df: pd.DataFrame) -> pd.DataFrame:
    """Global mean / std per feature, computed on all rows (NaN-skipped).

    Returns a two-row DataFrame with ``mean`` and ``std``.
    """
    mean = df[NICHE_NUM].mean(skipna=True)
    std = df[NICHE_NUM].std(skipna=True).replace(0, np.nan)
    scaler = pd.DataFrame({"mean": mean, "std": std})
    return scaler


def zscore(df: pd.DataFrame, scaler: pd.DataFrame) -> pd.DataFrame:
    return (df[NICHE_NUM] - scaler["mean"]) / scaler["std"]


def build_centroids(df: pd.DataFrame, scaler: pd.DataFrame) -> pd.DataFrame:
    """Density-weighted z-scored centroid per species.

    Weight = log1p(larvae_10m²). NaN features are skipped per-column
    per-species (weighted partial averages).
    """
    presence = df[df["larvae_10m2"] > MIN_DENSITY].copy()
    counts = presence.groupby("scientific_name", observed=True).size()
    keep = counts[counts >= MIN_PRESENCE_OBS].index
    presence = presence[presence["scientific_name"].isin(keep)].copy()
    print(f"  {len(keep):,} species with ≥{MIN_PRESENCE_OBS} presence rows")

    zrows = zscore(presence, scaler)
    presence["w"] = np.log1p(presence["larvae_10m2"])

    def _wmean(g: pd.DataFrame) -> pd.Series:
        w = g["w"].to_numpy()
        out = {}
        for col in NICHE_NUM:
            v = g[col].to_numpy()  # z-scored
            m = np.isfinite(v) & np.isfinite(w) & (w > 0)
            if not m.any():
                out[col] = np.nan
            else:
                out[col] = float(np.average(v[m], weights=w[m]))
        out["n_presence"] = int(len(g))
        out["sum_w"] = float(w.sum())
        return pd.Series(out)

    zrows_w = pd.concat([zrows, presence[["scientific_name", "w"]]], axis=1)
    centroids = (zrows_w.groupby("scientific_name", observed=True)
                 .apply(_wmean, include_groups=False))

    common = (df.groupby("scientific_name", observed=True)["common_name"]
              .agg(lambda s: s.dropna().astype(str).mode().iat[0]
                   if not s.dropna().empty else ""))
    centroids["common_name"] = common.reindex(centroids.index)
    return centroids


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def score(query_raw: dict, centroids: pd.DataFrame,
          scaler: pd.DataFrame) -> pd.DataFrame:
    """Score every species for a query point.

    ``query_raw`` is a ``{feature_name: value}`` dict in raw units.
    Missing features are z-scored to 0 (i.e. treated as global average).
    """
    q_raw = pd.Series(query_raw).reindex(NICHE_NUM)
    q_z = (q_raw - scaler["mean"]) / scaler["std"]
    q_z = q_z.fillna(0.0).to_numpy()

    C = centroids[NICHE_NUM].to_numpy()
    # Per-row: skip NaN species-features by using nanmean-style dot product
    mask = np.isfinite(C)
    C_filled = np.where(mask, C, 0.0)

    # Cosine on the non-NaN components of each row vs. query
    dot = C_filled @ q_z
    norm_C = np.sqrt((C_filled ** 2).sum(axis=1))
    norm_q = np.linalg.norm(q_z)
    denom = norm_C * max(norm_q, 1e-9)
    cos = np.where(denom > 0, dot / denom, 0.0)

    # Euclidean (z-scored)
    diff = np.where(mask, C - q_z, 0.0)
    eucl = np.sqrt((diff ** 2).sum(axis=1))

    sigma = np.sqrt(len(NICHE_NUM))
    rbf = np.exp(-(eucl ** 2) / (2 * sigma ** 2))

    out = pd.DataFrame({
        "cos": cos,
        "cos_01": (cos + 1) / 2,
        "euclidean": eucl,
        "rbf": rbf,
        "n_presence": centroids["n_presence"].astype(int).values,
        "common_name": centroids["common_name"].values,
    }, index=centroids.index)
    return out


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------


def nearest_cast_query(df: pd.DataFrame, lat: float, lng: float,
                        year: int, month: int) -> dict:
    """Build a query vector from the nearest historical cast (demo stand-in
    for a live weather/ocean API)."""
    sub = df.dropna(subset=["bot_sst_100m", "bot_sal_100m"]).copy()
    sub = sub[sub["time"].dt.year == year]
    if len(sub) < 50:
        sub = df.dropna(subset=["bot_sst_100m", "bot_sal_100m"]).copy()
    pts = np.radians(sub[["latitude", "longitude"]].to_numpy())
    tree = BallTree(pts, metric="haversine")
    qp = np.radians([[lat, lng]])
    _, idx = tree.query(qp, k=1)
    row = sub.iloc[int(idx[0, 0])]
    q = {c: float(row[c]) for c in NICHE_NUM
         if c in row.index and pd.notna(row[c])}
    q["latitude"] = lat
    q["longitude"] = lng
    q["month_sin"] = float(np.sin(2 * np.pi * month / 12.0))
    q["month_cos"] = float(np.cos(2 * np.pi * month / 12.0))
    return q


def species_centroid_as_query(centroids: pd.DataFrame,
                               scaler: pd.DataFrame,
                               species: str) -> dict:
    """Invert z-score on a species' centroid to get a 'typical habitat'
    query for that species. Useful for sanity checks."""
    row = centroids.loc[species, NICHE_NUM]
    raw = row * scaler["std"] + scaler["mean"]
    return raw.dropna().to_dict()


# ---------------------------------------------------------------------------
# Composite scoring: niche × survivability
# ---------------------------------------------------------------------------


def load_survivability() -> pd.Series:
    if not XGB_RANKINGS.exists():
        return pd.Series(dtype=float, name="F_xgb_blended")
    r = pd.read_csv(XGB_RANKINGS)
    return r.set_index("scientific_name")["blended_score"].rename("F_xgb_blended")


def _sigmoid(x: pd.Series) -> pd.Series:
    x = x.astype(float)
    med = x.median()
    mad = np.median(np.abs(x - med)) or 1.0
    z = (x - med) / (1.4826 * mad)
    return 1 / (1 + np.exp(-z))


def compose(niche: pd.DataFrame, surviv: pd.Series) -> pd.DataFrame:
    """`final = cos_01 * sigmoid(F_xgb_blended)` (both in [0, 1])."""
    out = niche.join(surviv, how="left")
    out["surv_01"] = _sigmoid(out["F_xgb_blended"].fillna(out["F_xgb_blended"].median()))
    out["final"] = out["cos_01"] * out["surv_01"]
    return out


# ---------------------------------------------------------------------------
# Demo
# ---------------------------------------------------------------------------


QUERIES = [
    # (name, lat, lng, year, month, note)
    ("SF Bay, April 2023",        37.8,  -122.5, 2023, 4,
     "Cool California Current water during spring upwelling"),
    ("San Diego Bight, October 2023", 32.7, -117.3, 2023, 10,
     "Warmer southern California water, late summer"),
    ("Oregon shelf, July 2022",   44.0,  -124.5, 2022, 7,
     "Cold Oregon upwelling in mid-summer"),
]


def _format_top(df: pd.DataFrame, n: int = 10,
                 sort_col: str = "cos_01") -> str:
    rows = df.sort_values(sort_col, ascending=False).head(n)
    lines = []
    fmt_hdr = f"  {'rank':>4s}  {'score':>6s}  {'cos_01':>6s}  {'rbf':>5s}  {'surv':>6s}  {'species':<36s}  common_name"
    lines.append(fmt_hdr)
    lines.append("  " + "-" * (len(fmt_hdr) - 2))
    for i, (sci, r) in enumerate(rows.iterrows(), 1):
        surv = r.get("surv_01")
        surv_s = f"{surv:.3f}" if pd.notna(surv) else "  n/a "
        score = r.get(sort_col, np.nan)
        lines.append(
            f"  {i:>4d}  {score:>6.3f}  {r['cos_01']:>6.3f}  "
            f"{r['rbf']:>5.3f}  {surv_s:>6s}  {sci:<36s}  {r.get('common_name', '') or ''}"
        )
    return "\n".join(lines)


def main():
    df = load_data()
    scaler = fit_scaler(df)
    print("\nscaler (global mean / std per feature):")
    print(scaler.to_string(float_format=lambda v: f"{v:8.3f}"))

    print("\nbuilding density-weighted niche centroids...")
    centroids = build_centroids(df, scaler)
    print(f"  centroid matrix: {centroids.shape}")
    centroids.to_parquet(OUT / "niche_centroids.parquet")
    scaler.to_json(JSN / "niche_scaler.json", indent=2)

    surviv = load_survivability()
    if not surviv.empty:
        print(f"  loaded F_xgb_blended for {len(surviv):,} species "
              "(for niche × survivability composite)")

    # Sanity check: at each anchor species' own niche, does it self-score near 1?
    print("\n--- sanity check: score each anchor species at its OWN niche ---")
    anchors = ["Engraulis mordax", "Sardinops sagax",
               "Merluccius productus", "Trachurus symmetricus"]
    for sp in anchors:
        if sp not in centroids.index:
            continue
        q = species_centroid_as_query(centroids, scaler, sp)
        s = score(q, centroids, scaler)
        rank = s["cos_01"].rank(ascending=False, method="min").loc[sp]
        rank_rbf = s["rbf"].rank(ascending=False, method="min").loc[sp]
        print(f"  {sp:<28s} self-rank (cos_01): #{int(rank):<3d}    "
              f"self-rank (rbf): #{int(rank_rbf)}")

    # Three real-world demo queries
    md_blocks = ["# Niche-similarity demo queries\n"]
    md_blocks.append("For each query we enrich the user's `(lat, lng, year, month)` by\n"
                     "finding the **nearest historical cast** and copying its bottle env\n"
                     "features. In production the app would call an API (NOAA ERDDAP,\n"
                     "Copernicus, etc.) for live data.\n")
    for name, lat, lng, year, month, note in QUERIES:
        print(f"\n--- query: {name} ---")
        print(f"  ({lat}, {lng}) in {year}-{month:02d}  ({note})")
        q = nearest_cast_query(df, lat, lng, year, month)
        print("  query vector (raw, after nearest-cast enrichment):")
        for k, v in q.items():
            print(f"    {k:>18s}: {v:.3f}")

        s = score(q, centroids, scaler)
        comp = compose(s, surviv) if not surviv.empty else s.assign(final=s["cos_01"])

        print("\n  top 10 by niche match (cos_01 only):")
        print(_format_top(comp, n=10, sort_col="cos_01"))

        if not surviv.empty:
            print("\n  top 10 by NICHE × SURVIVABILITY (recommended app ranking):")
            print(_format_top(comp, n=10, sort_col="final"))
            print("\n  placement of the anchor species under NICHE × SURVIVABILITY:")
            for sp in anchors:
                if sp not in comp.index:
                    continue
                r = comp.sort_values("final", ascending=False)
                pos = int(r.index.get_loc(sp)) + 1
                row = comp.loc[sp]
                print(f"    #{pos:>3d}  {sp:<26s}  cos_01={row['cos_01']:.3f}  "
                      f"surv_01={row['surv_01']:.3f}  final={row['final']:.3f}")

        md_blocks.append(f"\n## {name}\n")
        md_blocks.append(f"**Location:** `({lat}, {lng})`    **When:** {year}-{month:02d}  ")
        md_blocks.append(f"*{note}*\n")
        md_blocks.append("**Query vector (after nearest-cast enrichment):**")
        md_blocks.append("")
        md_blocks.append("| feature | value |")
        md_blocks.append("|---|---:|")
        for k, v in q.items():
            md_blocks.append(f"| `{k}` | {v:.3f} |")
        md_blocks.append("\n**Top 10 by niche match (cos_01):**\n")
        md_blocks.append("| rank | cos_01 | rbf | surv_01 | species | common |")
        md_blocks.append("|---:|---:|---:|---:|---|---|")
        top = comp.sort_values("cos_01", ascending=False).head(10)
        for i, (sci, row) in enumerate(top.iterrows(), 1):
            surv = row.get("surv_01")
            surv_s = f"{surv:.3f}" if pd.notna(surv) else "n/a"
            md_blocks.append(f"| {i} | {row['cos_01']:.3f} | {row['rbf']:.3f} "
                             f"| {surv_s} | *{sci}* | {row.get('common_name', '') or ''} |")

        if not surviv.empty:
            md_blocks.append("\n**Top 10 by niche × survivability (recommended):**\n")
            md_blocks.append("| rank | final | cos_01 | surv_01 | species | common |")
            md_blocks.append("|---:|---:|---:|---:|---|---|")
            top = comp.sort_values("final", ascending=False).head(10)
            for i, (sci, row) in enumerate(top.iterrows(), 1):
                md_blocks.append(f"| {i} | {row['final']:.3f} | {row['cos_01']:.3f} "
                                 f"| {row['surv_01']:.3f} | *{sci}* | {row.get('common_name', '') or ''} |")

    (OUT / "niche_demo.md").write_text("\n".join(md_blocks))
    print(f"\nwrote {OUT/'niche_centroids.parquet'}")
    print(f"wrote {JSN/'niche_scaler.json'}")
    print(f"wrote {OUT/'niche_demo.md'}")


if __name__ == "__main__":
    main()
