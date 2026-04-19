"""Quick EDA: profile the CalCOFI bottle/cast database and estimate
join coverage against Larvae.csv.
"""
from __future__ import annotations

import os
from pathlib import Path

os.environ.setdefault("MPLCONFIGDIR", str(Path(__file__).resolve().parents[1] / ".venv" / ".mplcache"))

import numpy as np
import pandas as pd

DATA = Path(__file__).resolve().parents[1] / "data"
BOTTLE_DIR = DATA / "CalCOFI_Database_194903-202105_csv_16October2023" / "CalCOFI_Database_194903-202105_csv_16October2023"
CAST_CSV = BOTTLE_DIR / "194903-202105_Cast.csv"
BOTTLE_CSV = BOTTLE_DIR / "194903-202105_Bottle.csv"


def profile_cast():
    print("=== Cast table ===")
    cast = pd.read_csv(CAST_CSV, low_memory=False)
    print(f"  rows: {len(cast):,}")
    print(f"  years: {cast['Year'].min()} – {cast['Year'].max()}")
    print(f"  unique cruises: {cast['Cruise'].nunique()}")
    print(f"  unique Sta_ID:  {cast['Sta_ID'].nunique()}")
    print(f"  lat range: {cast['Lat_Dec'].min():.2f} to {cast['Lat_Dec'].max():.2f}")
    print(f"  lng range: {cast['Lon_Dec'].min():.2f} to {cast['Lon_Dec'].max():.2f}")
    # Sample Sta_ID format
    print(f"  sample Sta_ID values: {list(cast['Sta_ID'].head(5))}")
    print(f"  sample Cruise values: {list(cast['Cruise'].head(5))}")
    # Weather coverage
    wx = ["Wind_Spd", "Wind_Dir", "Barometer", "Wave_Ht", "Secchi", "Dry_T", "Wet_T"]
    print("  weather / met coverage:")
    for c in wx:
        if c in cast.columns:
            print(f"    {c:<10s}: {cast[c].notna().mean():.1%}")
    return cast


def profile_bottle():
    print("\n=== Bottle table (streaming) ===")
    # Measure key chemistry columns
    chem = ["T_degC", "Salnty", "O2ml_L", "Oxy_\u00b5mol/Kg", "STheta",
            "ChlorA", "Phaeop", "PO4uM", "SiO3uM", "NO2uM", "NO3uM",
            "NH3uM", "pH1", "pH2", "DIC1", "TA1"]

    reader = pd.read_csv(BOTTLE_CSV, low_memory=False, chunksize=200_000,
                          encoding="latin-1")
    total = 0
    nonnull = {c: 0 for c in chem}
    depth_hist = np.zeros(20)  # bins of 50m up to 1000m+
    for chunk in reader:
        total += len(chunk)
        for c in chem:
            if c in chunk.columns:
                nonnull[c] += int(chunk[c].notna().sum())
        d = pd.to_numeric(chunk["Depthm"], errors="coerce")
        depth_hist += np.histogram(d.fillna(-1), bins=np.arange(0, 1050, 50))[0]

    print(f"  rows: {total:,}")
    print("  non-null coverage per parameter:")
    for c, n in nonnull.items():
        print(f"    {c:<18s}: {n/total:.1%}")

    print("  depth distribution (bins of 50 m):")
    for i, n in enumerate(depth_hist):
        if n > 0:
            print(f"    {i*50:>4d}-{(i+1)*50:<4d} m : {int(n):>8,d}")


def estimate_join_coverage(cast: pd.DataFrame):
    print("\n=== Join-key coverage vs Larvae.csv ===")
    cast = cast.copy()
    cast["cruise"] = cast["Cruise"].astype(str)
    # Sta_ID is "054.0 056.0" → split into line, station (floats)
    parts = cast["Sta_ID"].astype(str).str.split(" ", n=1, expand=True)
    cast["line"] = pd.to_numeric(parts[0], errors="coerce")
    cast["station"] = pd.to_numeric(parts[1], errors="coerce")
    cast_keys = cast[["cruise", "line", "station"]].drop_duplicates()
    print(f"  unique (cruise, line, station) in Cast: {len(cast_keys):,}")

    larvae = pd.read_csv(
        DATA / "Larvae.csv",
        usecols=["cruise", "line", "station", "time"],
        low_memory=False,
    )
    larvae["cruise"] = larvae["cruise"].astype(str)
    larvae_keys = larvae[["cruise", "line", "station"]].drop_duplicates()
    print(f"  unique (cruise, line, station) in Larvae: {len(larvae_keys):,}")

    merged = larvae_keys.merge(cast_keys, on=["cruise", "line", "station"], how="left", indicator=True)
    hit = (merged["_merge"] == "both").sum()
    miss = (merged["_merge"] == "left_only").sum()
    print(f"  larvae station-events with a Cast match:   {hit:,}  ({hit/len(merged):.1%})")
    print(f"  larvae station-events without a Cast match: {miss:,}  ({miss/len(merged):.1%})")

    # Row-level join rate
    full = larvae.merge(cast_keys, on=["cruise", "line", "station"], how="left", indicator=True)
    row_hit = (full["_merge"] == "both").sum()
    print(f"  larvae ROWS with a Cast match:             {row_hit:,}  ({row_hit/len(full):.1%})")

    print("  row-level join rate by decade:")
    full["decade"] = (pd.to_datetime(full["time"], errors="coerce", utc=True).dt.year // 10 * 10).astype("Int64")
    for d, sub in full.groupby("decade"):
        if pd.isna(d):
            continue
        r = (sub["_merge"] == "both").mean()
        print(f"    {int(d)}s: {len(sub):>7,d} rows  →  match rate {r:>6.1%}")


if __name__ == "__main__":
    import sys
    only = sys.argv[1] if len(sys.argv) > 1 else "all"
    if only in ("all", "cast"):
        cast = profile_cast()
        estimate_join_coverage(cast)
    if only in ("all", "bottle"):
        profile_bottle()
