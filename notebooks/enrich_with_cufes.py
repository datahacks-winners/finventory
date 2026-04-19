"""Enrich every row of ``data/Larvae.csv`` with the nearest CUFES
environmental reading, joining on ``(latitude, longitude, time)``
rather than on ``cruise``.

For each larva tow we find the CUFES sample that minimises a combined
spatial + temporal distance, subject to two hard windows:

* spatial:  ``|Δposition| ≤ MAX_KM``  (haversine)
* temporal: ``|Δt|        ≤ MAX_DAYS``

If no CUFES sample falls inside both windows the larva row keeps NaN
environmental features (XGBoost tolerates NaN natively, so downstream
models are unaffected).

Why lat/lng/time and not cruise?
--------------------------------
Cruise-level matching (``xgb_advanced.py``) attaches the **mean SST of
the whole cruise** to every larva tow in that cruise — dozens of tows
spanning ~2 weeks and hundreds of km all share the same SST value, so
the feature is coarse. This script instead attaches the **closest
actual CUFES sample** to each tow, so SST and salinity become
per-station, not per-cruise. CUFES coverage is 1996+, so pre-1996
larvae rows are intentionally left NaN.

Outputs
-------
``notebooks/outputs/larvae_env_enriched.parquet``
    full larvae table + ``env_sst``, ``env_sal``, ``env_wind_speed``,
    ``env_wind_dir``, ``env_pump_speed``, ``env_sample_depth``,
    ``env_match_km``, ``env_match_days``, ``env_match_type``.

``notebooks/outputs/cufes_enrichment_report.json``
    diagnostics: match rate by decade, median (km, days) of matches,
    histogram of distances.

Run::

    .venv/bin/python notebooks/enrich_with_cufes.py
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from output_paths import JSN, OUT, TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

DATA = HERE.parent / "data"

EARTH_R_KM = 6371.0088
MAX_KM = 100.0          # spatial tolerance
MAX_DAYS = 14.0         # temporal tolerance
K_CANDIDATES = 40       # #nearest spatial candidates to screen per larva
# Combined distance weights (only used to pick a winner among
# candidates that satisfy both hard windows). 1 day ≈ 7.1 km penalty.
KM_PER_DAY = 7.14


# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------


def load_cufes_env() -> pd.DataFrame:
    """One row per unique CUFES sample event, with averaged env features."""
    cufes = pd.read_csv(
        DATA / "Cufes.csv",
        usecols=[
            "cruise", "sample_number", "time",
            "start_latitude", "start_longitude",
            "start_temperature", "stop_temperature",
            "start_salinity", "stop_salinity",
            "start_wind_speed", "stop_wind_speed",
            "start_wind_direction", "stop_wind_direction",
            "start_pump_speed", "stop_pump_speed",
        ],
        low_memory=False,
    )
    cufes["time"] = pd.to_datetime(cufes["time"], errors="coerce", utc=True)
    cufes = cufes.dropna(subset=["time", "start_latitude", "start_longitude"]).copy()

    # Average any start/stop pair; returns NaN only if both are NaN.
    def _pair_mean(col_start: str, col_stop: str) -> pd.Series:
        a = pd.to_numeric(cufes[col_start], errors="coerce")
        b = pd.to_numeric(cufes[col_stop], errors="coerce")
        return pd.concat([a, b], axis=1).mean(axis=1)

    env = pd.DataFrame({
        "cruise": cufes["cruise"].astype(str),
        "sample_number": cufes["sample_number"],
        "time": cufes["time"],
        "latitude": pd.to_numeric(cufes["start_latitude"], errors="coerce"),
        "longitude": pd.to_numeric(cufes["start_longitude"], errors="coerce"),
        "env_sst": _pair_mean("start_temperature", "stop_temperature"),
        "env_sal": _pair_mean("start_salinity", "stop_salinity"),
        "env_wind_speed": _pair_mean("start_wind_speed", "stop_wind_speed"),
        "env_wind_dir": _pair_mean("start_wind_direction", "stop_wind_direction"),
        "env_pump_speed": _pair_mean("start_pump_speed", "stop_pump_speed"),
    })
    env = env.dropna(subset=["latitude", "longitude"]).reset_index(drop=True)
    # Drop fully-uninformative rows (all env cols NaN)
    env_cols = ["env_sst", "env_sal", "env_wind_speed", "env_wind_dir", "env_pump_speed"]
    env = env[env[env_cols].notna().any(axis=1)].reset_index(drop=True)
    return env


def load_larvae() -> pd.DataFrame:
    larvae = pd.read_csv(
        DATA / "Larvae.csv",
        low_memory=False,
    )
    larvae["time"] = pd.to_datetime(larvae["time"], errors="coerce", utc=True)
    return larvae


# ---------------------------------------------------------------------------
# Matcher
# ---------------------------------------------------------------------------


def enrich(larvae: pd.DataFrame, env: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Attach env columns to each larvae row using nearest neighbor in (km, days)."""

    rad_env = np.radians(env[["latitude", "longitude"]].to_numpy())
    tree = BallTree(rad_env, metric="haversine")

    has_pos = larvae[["latitude", "longitude", "time"]].notna().all(axis=1)
    valid_idx = np.flatnonzero(has_pos.to_numpy())
    coords_rad = np.radians(
        larvae.loc[has_pos, ["latitude", "longitude"]].to_numpy()
    )
    larvae_times = (
        larvae.loc[has_pos, "time"].dt.tz_convert("UTC").dt.tz_localize(None)
        .to_numpy().astype("datetime64[ns]")
    )

    n_valid = len(valid_idx)
    print(f"  querying BallTree for {n_valid:,} larvae rows (K={K_CANDIDATES})...")

    # k-nearest spatial neighbors
    dist_rad, idx_knn = tree.query(coords_rad, k=K_CANDIDATES)
    dist_km = dist_rad * EARTH_R_KM

    # time deltas in days for each candidate
    env_times = (
        env["time"].dt.tz_convert("UTC").dt.tz_localize(None)
        .to_numpy().astype("datetime64[ns]")
    )
    cand_times = env_times[idx_knn]  # (n_valid, K)
    dt_days = np.abs(
        (larvae_times[:, None] - cand_times) / np.timedelta64(1, "D")
    ).astype(float)

    # hard windows
    ok = (dist_km <= MAX_KM) & (dt_days <= MAX_DAYS)

    # combined score (km equivalent); only for ranking the ok candidates
    combined = dist_km + KM_PER_DAY * dt_days
    combined[~ok] = np.inf

    best_cand = np.argmin(combined, axis=1)
    best_row = np.arange(n_valid)
    best_ok = np.isfinite(combined[best_row, best_cand])
    matched_env_idx = np.where(best_ok, idx_knn[best_row, best_cand], -1)
    matched_km = np.where(best_ok, dist_km[best_row, best_cand], np.nan)
    matched_days = np.where(best_ok, dt_days[best_row, best_cand], np.nan)

    # Build output columns aligned to original larvae index. Numeric
    # cols use float NaN; identifier cols use object NaN so we can
    # later assign strings without a dtype clash.
    out = larvae.copy()
    numeric_cols = [
        "env_sst", "env_sal", "env_wind_speed", "env_wind_dir",
        "env_pump_speed", "env_match_km", "env_match_days",
    ]
    object_cols = ["env_match_cruise", "env_match_sample_number"]
    for c in numeric_cols:
        out[c] = np.nan
    for c in object_cols:
        out[c] = pd.Series([pd.NA] * len(out), dtype="object")
    out["env_match_type"] = pd.Series(
        ["no_match"] * len(out), dtype="object"
    )

    # Index into env for matched rows
    matched_mask = matched_env_idx >= 0
    env_rows = env.iloc[matched_env_idx[matched_mask]].reset_index(drop=True)

    row_positions = valid_idx[matched_mask]
    out.loc[out.index[row_positions], "env_sst"] = env_rows["env_sst"].to_numpy()
    out.loc[out.index[row_positions], "env_sal"] = env_rows["env_sal"].to_numpy()
    out.loc[out.index[row_positions], "env_wind_speed"] = env_rows["env_wind_speed"].to_numpy()
    out.loc[out.index[row_positions], "env_wind_dir"] = env_rows["env_wind_dir"].to_numpy()
    out.loc[out.index[row_positions], "env_pump_speed"] = env_rows["env_pump_speed"].to_numpy()
    out.loc[out.index[row_positions], "env_match_cruise"] = env_rows["cruise"].to_numpy()
    out.loc[out.index[row_positions], "env_match_sample_number"] = env_rows["sample_number"].to_numpy()
    out.loc[out.index[row_positions], "env_match_km"] = matched_km[matched_mask]
    out.loc[out.index[row_positions], "env_match_days"] = matched_days[matched_mask]
    out.loc[out.index[row_positions], "env_match_type"] = np.where(
        matched_days[matched_mask] <= 2, "same_day",
        np.where(matched_days[matched_mask] <= 7, "same_week", "same_fortnight"),
    )

    # Diagnostics
    report = _report(out, env)
    return out, report


def _report(enriched: pd.DataFrame, env: pd.DataFrame) -> dict:
    total = len(enriched)
    matched = enriched["env_match_km"].notna().sum()
    has_time = enriched["time"].notna()
    in_cufes_era = enriched["time"].dt.year >= 1996

    rep = {
        "windows": {"max_km": MAX_KM, "max_days": MAX_DAYS,
                     "km_per_day_penalty": KM_PER_DAY},
        "totals": {
            "n_larvae_rows": int(total),
            "n_matched": int(matched),
            "overall_match_rate": float(matched / total),
            "n_cufes_env_obs": int(len(env)),
            "cufes_year_range": [
                int(env["time"].dt.year.min()),
                int(env["time"].dt.year.max()),
            ],
        },
        "match_rate_1996plus": float(
            enriched.loc[in_cufes_era & has_time, "env_match_km"].notna().mean()
        ),
        "match_rate_pre1996": float(
            enriched.loc[~in_cufes_era & has_time, "env_match_km"].notna().mean()
        ),
        "match_distance_km": {
            "p50": float(np.nanmedian(enriched["env_match_km"])),
            "p90": float(np.nanpercentile(enriched["env_match_km"].dropna(), 90))
            if matched else None,
        },
        "match_days": {
            "p50": float(np.nanmedian(enriched["env_match_days"])),
            "p90": float(np.nanpercentile(enriched["env_match_days"].dropna(), 90))
            if matched else None,
        },
        "match_type_counts": enriched["env_match_type"].value_counts().to_dict(),
        "by_decade": {},
        "env_feature_coverage_on_matched": {
            c: float(enriched.loc[enriched["env_match_km"].notna(), c].notna().mean())
            for c in ["env_sst", "env_sal", "env_wind_speed", "env_wind_dir", "env_pump_speed"]
        },
    }

    dec = (enriched.loc[has_time, "time"].dt.year // 10 * 10).astype(int)
    for d, sub in enriched.loc[has_time].groupby(dec):
        rep["by_decade"][int(d)] = {
            "n": int(len(sub)),
            "match_rate": float(sub["env_match_km"].notna().mean()),
        }
    return rep


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print("loading CUFES env table...")
    env = load_cufes_env()
    print(f"  {len(env):,} unique CUFES sampling events, "
          f"{env['time'].dt.year.min()}-{env['time'].dt.year.max()}")

    print("loading Larvae.csv...")
    larvae = load_larvae()
    print(f"  {len(larvae):,} larvae rows")

    print(f"\nenriching (MAX_KM={MAX_KM}, MAX_DAYS={MAX_DAYS})...")
    enriched, report = enrich(larvae, env)

    print("\nmatch diagnostics:")
    print(f"  overall match rate:  {report['totals']['overall_match_rate']:.1%}")
    print(f"  rate in 1996+ era:   {report['match_rate_1996plus']:.1%}")
    print(f"  rate pre-1996:       {report['match_rate_pre1996']:.1%}")
    print(f"  median match distance: {report['match_distance_km']['p50']:.1f} km")
    print(f"  median time delta:     {report['match_days']['p50']:.1f} days")
    print("  match type counts:")
    for k, v in report["match_type_counts"].items():
        print(f"    {k:>15s}: {v:,}")
    print("  match rate by decade:")
    for d in sorted(report["by_decade"]):
        row = report["by_decade"][d]
        print(f"    {d}s: {row['n']:>7,} rows  →  {row['match_rate']:6.1%}")
    print("  env feature coverage among matched rows:")
    for k, v in report["env_feature_coverage_on_matched"].items():
        print(f"    {k:>14s}: {v:.1%}")

    parquet_path = OUT / "larvae_env_enriched.parquet"
    csv_path = TBL / "larvae_env_enriched.csv.gz"
    print(f"\nwriting {parquet_path}...")
    try:
        enriched.to_parquet(parquet_path, index=False, compression="snappy")
    except Exception as exc:
        print(f"  parquet failed ({exc}); falling back to csv.gz")
        enriched.to_csv(csv_path, index=False, compression="gzip")

    (JSN / "cufes_enrichment_report.json").write_text(
        json.dumps(report, indent=2, default=str)
    )
    print("wrote cufes_enrichment_report.json")

    # Optional: a thin join-key file for downstream joins that don't want
    # to carry the whole Larvae table.
    key_cols = [
        "cruise", "line", "station", "time", "latitude", "longitude",
        "scientific_name",
        "env_sst", "env_sal", "env_wind_speed", "env_wind_dir",
        "env_pump_speed", "env_match_km", "env_match_days", "env_match_type",
    ]
    enriched[key_cols].to_parquet(OUT / "larvae_env_keys.parquet", index=False)
    print("wrote larvae_env_keys.parquet")


if __name__ == "__main__":
    main()
