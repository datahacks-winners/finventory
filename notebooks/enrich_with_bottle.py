"""Enrich Larvae.csv with the CalCOFI Bottle/Cast database.

Bottle database (``194903-202105_Bottle.csv`` + ``194903-202105_Cast.csv``)
has:
* the same ``cruise`` format (YYYYMM) as Larvae.csv,
* the same CalCOFI ``line/station`` grid as Larvae.csv,
so the join is an **exact** merge on ``(cruise, line, station)`` — no
haversine radius needed.

The script produces three classes of env features per cast:

Per-cast **upper-ocean means** (0-100 m), the feature that drives most
ichthyoplankton habitat papers:
    bot_sst_100m, bot_sal_100m, bot_sigma_100m, bot_o2_100m,
    bot_chla_100m, bot_po4_100m, bot_no3_100m, bot_sio3_100m

Per-cast **ecology-derived** features (what larva biology actually
depends on):
    bot_mld_05      mixed-layer depth (metres where T drops 0.5°C below surface)
    bot_strat_dT    T(0-25 m) - T(75-100 m)  (thermal stratification)
    bot_chla_max    max chlorophyll in 0-100 m
    bot_chla_int    trapezoidal 0-100 m integrated chlorophyll (food stock)
    bot_o2_min_200  minimum O2 in 0-200 m  (hypoxia exposure)
    bot_nitracline  shallowest depth where NO3 > 1 uM (upwelling proxy)

Per-cast **Cast table metadata** (weather + Secchi + surface met):
    cast_wind_spd, cast_wind_dir, cast_barom, cast_dry_t,
    cast_wet_t, cast_wave_ht, cast_secchi

Outputs
-------
``notebooks/outputs/larvae_bottle_enriched.parquet``
    every Larvae row + every bottle/cast feature above (NaN for rows
    without a matching cast).

``notebooks/outputs/larvae_bottle_keys.parquet``
    thin (cruise, line, station, species) → env feature view for
    downstream joins.

``notebooks/outputs/bottle_enrichment_report.json``
    match rate by decade, feature coverage, depth-stratum counts.

Run::

    .venv/bin/python notebooks/enrich_with_bottle.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from output_paths import JSN, OUT, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

DATA = HERE.parent / "data"

BOTTLE_DIR = (
    DATA
    / "CalCOFI_Database_194903-202105_csv_16October2023"
    / "CalCOFI_Database_194903-202105_csv_16October2023"
)
CAST_CSV = BOTTLE_DIR / "194903-202105_Cast.csv"
BOTTLE_CSV = BOTTLE_DIR / "194903-202105_Bottle.csv"


# ---------------------------------------------------------------------------
# Cast: cruise, line, station, time, lat, lng, weather
# ---------------------------------------------------------------------------


CAST_COLS = [
    "Cst_Cnt", "Cruise", "Sta_ID", "Date", "Time", "Year", "Month",
    "Lat_Dec", "Lon_Dec",
    "Wind_Spd", "Wind_Dir", "Barometer", "Dry_T", "Wet_T",
    "Wave_Ht", "Wave_Prd", "Wave_Dir", "Secchi", "Cloud_Amt", "Visibility",
    "Ship_Code", "Data_Type",
]


def load_cast() -> pd.DataFrame:
    print("loading Cast.csv...")
    cast = pd.read_csv(CAST_CSV, usecols=CAST_COLS, low_memory=False, encoding="latin-1")
    cast["cruise"] = cast["Cruise"].astype(str)
    parts = cast["Sta_ID"].astype(str).str.split(" ", n=1, expand=True)
    cast["line"] = pd.to_numeric(parts[0], errors="coerce")
    cast["station"] = pd.to_numeric(parts[1], errors="coerce")
    cast = cast.dropna(subset=["line", "station"])

    # Try to combine Date + Time; fall back to Date only if Time is missing
    dt = cast["Date"].astype(str).str.strip() + " " + cast["Time"].astype(str).str.strip().replace("nan", "")
    cast["cast_time"] = pd.to_datetime(dt, errors="coerce", utc=True)

    rename = {
        "Lat_Dec": "cast_lat", "Lon_Dec": "cast_lng",
        "Wind_Spd": "cast_wind_spd", "Wind_Dir": "cast_wind_dir",
        "Barometer": "cast_barom", "Dry_T": "cast_dry_t", "Wet_T": "cast_wet_t",
        "Wave_Ht": "cast_wave_ht", "Wave_Prd": "cast_wave_prd", "Wave_Dir": "cast_wave_dir",
        "Secchi": "cast_secchi", "Cloud_Amt": "cast_cloud", "Visibility": "cast_vis",
        "Ship_Code": "cast_ship_code", "Data_Type": "cast_data_type",
    }
    cast = cast.rename(columns=rename)
    for c in rename.values():
        if c in cast.columns and cast[c].dtype == object:
            cast[c] = pd.to_numeric(cast[c], errors="coerce")
    keep = [
        "Cst_Cnt", "cruise", "line", "station", "cast_time", "cast_lat", "cast_lng",
        "cast_wind_spd", "cast_wind_dir", "cast_barom",
        "cast_dry_t", "cast_wet_t", "cast_wave_ht", "cast_wave_prd",
        "cast_wave_dir", "cast_secchi", "cast_cloud", "cast_vis",
    ]
    cast = cast[keep].copy()
    print(f"  {len(cast):,} casts  ({cast['cast_time'].dt.year.min()}-{cast['cast_time'].dt.year.max()})")
    return cast


# ---------------------------------------------------------------------------
# Bottle: aggregate per cast
# ---------------------------------------------------------------------------


BOTTLE_COLS = [
    "Cst_Cnt", "Btl_Cnt", "Depthm",
    "T_degC", "Salnty", "STheta", "O2ml_L", "Oxy_\u00b5mol/Kg",
    "ChlorA", "Phaeop",
    "PO4uM", "SiO3uM", "NO2uM", "NO3uM", "NH3uM",
]


def load_bottle() -> pd.DataFrame:
    print("loading Bottle.csv...")
    bottle = pd.read_csv(
        BOTTLE_CSV, usecols=BOTTLE_COLS, low_memory=False, encoding="latin-1"
    )
    bottle = bottle.rename(columns={"Oxy_\u00b5mol/Kg": "Oxy_umol_kg"})
    num_cols = [
        "Depthm", "T_degC", "Salnty", "STheta", "O2ml_L", "Oxy_umol_kg",
        "ChlorA", "Phaeop", "PO4uM", "SiO3uM", "NO2uM", "NO3uM", "NH3uM",
    ]
    for c in num_cols:
        bottle[c] = pd.to_numeric(bottle[c], errors="coerce")
    bottle = bottle.dropna(subset=["Cst_Cnt", "Depthm"])
    print(f"  {len(bottle):,} bottles (after dropping null depth/Cst_Cnt)")
    return bottle


def _trapz_integral(depth: np.ndarray, value: np.ndarray, zmax: float) -> float:
    """∫ value dz from 0 to zmax, using only bottles with non-null value."""
    mask = np.isfinite(depth) & np.isfinite(value) & (depth <= zmax)
    d, v = depth[mask], value[mask]
    if len(d) < 2:
        return np.nan
    order = np.argsort(d)
    trap = getattr(np, "trapezoid", None) or np.trapz
    return float(trap(v[order], d[order]))


def _mixed_layer_depth(depth: np.ndarray, t: np.ndarray, threshold: float = 0.5) -> float:
    """Depth where T drops `threshold` °C below the shallowest value."""
    mask = np.isfinite(depth) & np.isfinite(t)
    d, temp = depth[mask], t[mask]
    if len(d) < 2:
        return np.nan
    order = np.argsort(d)
    d, temp = d[order], temp[order]
    t_surface = temp[0]
    drops = np.where(temp <= t_surface - threshold)[0]
    return float(d[drops[0]]) if len(drops) else float(d[-1])


def aggregate_bottle(bottle: pd.DataFrame) -> pd.DataFrame:
    """Per-cast aggregate features from the Niskin bottles."""
    print("aggregating bottle → per-cast env features...")

    # --- 0-100 m mean (upper-ocean means) ----------------------------------
    upper = bottle[bottle["Depthm"] <= 100]
    mean_cols = {
        "T_degC": "bot_sst_100m",
        "Salnty": "bot_sal_100m",
        "STheta": "bot_sigma_100m",
        "O2ml_L": "bot_o2_100m",
        "ChlorA": "bot_chla_100m",
        "PO4uM":  "bot_po4_100m",
        "NO3uM":  "bot_no3_100m",
        "SiO3uM": "bot_sio3_100m",
        "NO2uM":  "bot_no2_100m",
    }
    agg_mean = (
        upper.groupby("Cst_Cnt")[list(mean_cols)].mean()
        .rename(columns=mean_cols)
        .reset_index()
    )

    # --- derived ecology features (per cast) -------------------------------
    print("  computing per-cast derived features (MLD, stratification, integrals)...")
    upper_sorted = bottle.sort_values(["Cst_Cnt", "Depthm"])

    def _derive(sub: pd.DataFrame) -> pd.Series:
        d = sub["Depthm"].to_numpy()
        t = sub["T_degC"].to_numpy()
        chla = sub["ChlorA"].to_numpy()
        o2 = sub["O2ml_L"].to_numpy()
        no3 = sub["NO3uM"].to_numpy()

        # surface / thermocline temperatures
        shallow = sub[sub["Depthm"] <= 25]["T_degC"].mean()
        deep = sub[(sub["Depthm"] >= 75) & (sub["Depthm"] <= 100)]["T_degC"].mean()

        # nitracline: shallowest depth where NO3 > 1 uM
        mask = np.isfinite(d) & np.isfinite(no3) & (no3 > 1.0) & (d <= 500)
        nitracline = float(d[mask].min()) if mask.any() else np.nan

        # oxygen minimum in 0-200 m
        m = np.isfinite(d) & np.isfinite(o2) & (d <= 200)
        o2_min = float(np.nanmin(o2[m])) if m.any() else np.nan

        chla_max = float(np.nanmax(chla[(d <= 100) & np.isfinite(chla)])) if np.any(np.isfinite(chla[d <= 100])) else np.nan
        chla_int = _trapz_integral(d, chla, 100)
        mld = _mixed_layer_depth(d, t)

        return pd.Series({
            "bot_mld_05": mld,
            "bot_strat_dT": shallow - deep if pd.notna(shallow) and pd.notna(deep) else np.nan,
            "bot_chla_max": chla_max,
            "bot_chla_int": chla_int,
            "bot_o2_min_200": o2_min,
            "bot_nitracline": nitracline,
            "bot_n_bottles_100m": float((d <= 100).sum()),
        })

    derived = upper_sorted.groupby("Cst_Cnt").apply(_derive, include_groups=False).reset_index()

    per_cast = agg_mean.merge(derived, on="Cst_Cnt", how="outer")
    print(f"  {len(per_cast):,} casts with ≥1 env aggregate")
    return per_cast


# ---------------------------------------------------------------------------
# Join to Larvae
# ---------------------------------------------------------------------------


def join_to_larvae(cast: pd.DataFrame, per_cast: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    print("joining cast metadata + bottle features → Larvae.csv...")
    cast_env = cast.merge(per_cast, on="Cst_Cnt", how="left")

    # Some (cruise, line, station) combos have multiple casts (e.g. repeats).
    # Reduce to one row per (cruise, line, station) by mean for numerics and
    # first for categoricals / time.
    num_cols = [c for c in cast_env.columns
                if cast_env[c].dtype.kind in "biufc" and c not in ("line", "station", "Cst_Cnt")]
    first_cols = [c for c in cast_env.columns
                  if c not in num_cols + ["cruise", "line", "station", "Cst_Cnt"]]
    grp = cast_env.groupby(["cruise", "line", "station"], as_index=False)
    agg = grp[num_cols].mean()
    firsts = grp[first_cols].first()
    cast_env_unique = agg.merge(firsts, on=["cruise", "line", "station"])

    print(f"  unique (cruise, line, station) keys in bottle env: {len(cast_env_unique):,}")

    larvae = pd.read_csv(DATA / "Larvae.csv", low_memory=False)
    larvae["cruise"] = larvae["cruise"].astype(str)
    larvae["time"] = pd.to_datetime(larvae["time"], errors="coerce", utc=True)

    enriched = larvae.merge(
        cast_env_unique, on=["cruise", "line", "station"], how="left", indicator=True
    )

    report = _report(enriched)
    enriched = enriched.drop(columns=["_merge"])
    return enriched, report


def _report(enriched: pd.DataFrame) -> dict:
    total = len(enriched)
    matched_mask = enriched["_merge"] == "both"
    matched = int(matched_mask.sum())
    by_decade = {}
    has_t = enriched["time"].notna()
    dec = (enriched.loc[has_t, "time"].dt.year // 10 * 10).astype(int)
    for d, sub in enriched.loc[has_t].groupby(dec):
        by_decade[int(d)] = {
            "n": int(len(sub)),
            "match_rate": float((sub["_merge"] == "both").mean()),
        }

    env_cols = [c for c in enriched.columns if c.startswith(("bot_", "cast_"))]
    coverage_matched = {
        c: float(enriched.loc[matched_mask, c].notna().mean()) for c in env_cols
    }
    coverage_all = {
        c: float(enriched[c].notna().mean()) for c in env_cols
    }
    return {
        "n_larvae_rows": total,
        "n_matched": matched,
        "overall_match_rate": matched / total,
        "match_rate_by_decade": by_decade,
        "feature_coverage_among_matched_rows": coverage_matched,
        "feature_coverage_all_rows": coverage_all,
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    cast = load_cast()
    bottle = load_bottle()
    per_cast = aggregate_bottle(bottle)
    enriched, report = join_to_larvae(cast, per_cast)

    print("\nmatch diagnostics:")
    print(f"  overall match rate: {report['overall_match_rate']:.1%}  "
          f"({report['n_matched']:,}/{report['n_larvae_rows']:,} rows)")
    print("  match rate by decade:")
    for d in sorted(report["match_rate_by_decade"]):
        row = report["match_rate_by_decade"][d]
        print(f"    {d}s: {row['n']:>7,} rows  →  {row['match_rate']:6.1%}")
    print("  feature coverage (rows with a cast match):")
    for k, v in sorted(
        report["feature_coverage_among_matched_rows"].items(),
        key=lambda kv: -kv[1],
    ):
        print(f"    {k:>22s}: {v:.1%}")

    out_parquet = OUT / "larvae_bottle_enriched.parquet"
    print(f"\nwriting {out_parquet}...")
    enriched.to_parquet(out_parquet, index=False, compression="snappy")

    # thin key file
    thin_cols = (
        ["cruise", "line", "station", "time", "latitude", "longitude",
         "scientific_name"]
        + [c for c in enriched.columns if c.startswith(("bot_", "cast_"))]
    )
    enriched[thin_cols].to_parquet(OUT / "larvae_bottle_keys.parquet", index=False)
    (JSN / "bottle_enrichment_report.json").write_text(
        json.dumps(report, indent=2, default=str)
    )
    print("wrote larvae_bottle_keys.parquet + bottle_enrichment_report.json")


if __name__ == "__main__":
    main()
