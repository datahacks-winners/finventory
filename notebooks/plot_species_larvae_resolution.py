"""Fine-grained time series: log1p(mean larvae_10m²) vs time for one species.

Annual means are convenient for forecasting, but they hide within-year
variation. This script aggregates at **calendar month** (finest scale
that is still interpretable from `Larvae.csv`'s timestamps without plotting
individual tows).

Also draws **annual** mean trace for comparison (bold step/line).

Non-overlapping **multi-year bins** (aligned to the species’ first survey
year): mean `larvae_10m²` across all tows whose calendar year falls in each
bin, then `log1p`. Default overlay: **2-year** and **5-year** bins (x at
mid-year of each bin).

The **left** y-axis is ``log1p(mean larvae / 10 m²)``; the **right** axis is
the **same geometry** with ticks labelled as ``expm1(left)`` — i.e. raw mean
larvae per 10 m² (linear scale).

Usage::

    .venv/bin/python notebooks/plot_species_larvae_resolution.py
    .venv/bin/python notebooks/plot_species_larvae_resolution.py \\
        --species "Sardinops sagax" --min-tows-month 3

Outputs ``notebooks/outputs/figures/larvae_<sanitized>_log1p_resolution.png``.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".venv" / ".mplcache"))

sys.path.insert(0, str(HERE))
from output_paths import FIG, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

import matplotlib

matplotlib.use("Agg")
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

DATA = ROOT / "data"
LARVAE_CSV = DATA / "Larvae.csv"

DEFAULT_SPECIES = "Engraulis mordax"


def slug(s: str) -> str:
    return re.sub(r"[^\w]+", "_", s.strip()).strip("_")


def multiyear_bin_table(df: pd.DataFrame, y0: int, span: int) -> pd.DataFrame:
    """Mean density per non-overlapping span-year bin; x = mid-calendar year."""
    bk = (df["year"].astype(int) - y0) // span
    b = (
        df.assign(_bk=bk)
        .groupby("_bk", observed=True)
        .agg(
            mean_density=("larvae_10m2", "mean"),
            n_tows=("larvae_10m2", "size"),
            ylo=("year", "min"),
            yhi=("year", "max"),
        )
        .reset_index(drop=True)
    )
    b["mid_year"] = (
        (b["ylo"].astype(int) + b["yhi"].astype(int)) // 2
    ).astype(int)
    b["plot_date"] = pd.to_datetime(
        dict(year=b["mid_year"], month=7, day=15)
    )
    b["log1p_mean"] = np.log1p(b["mean_density"])
    return b.sort_values("plot_date")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--species", default=DEFAULT_SPECIES, help="scientific_name")
    p.add_argument(
        "--min-tows-month",
        type=int,
        default=1,
        help="drop months with fewer than this many tows (default: 1)",
    )
    p.add_argument("--width", type=float, default=22.0, help="figure width inches")
    p.add_argument("--height", type=float, default=6.5, help="figure height inches")
    args = p.parse_args()

    OUT.mkdir(exist_ok=True)

    print(f"loading {LARVAE_CSV.name} for '{args.species}'...")
    df = pd.read_csv(
        LARVAE_CSV,
        usecols=["scientific_name", "time", "larvae_10m2"],
        low_memory=False,
    )
    df = df[df["scientific_name"] == args.species].copy()
    if df.empty:
        raise SystemExit(f"No rows for species '{args.species}'")

    df["time"] = pd.to_datetime(df["time"], errors="coerce", utc=True)
    df["larvae_10m2"] = pd.to_numeric(df["larvae_10m2"], errors="coerce")
    df = df.dropna(subset=["time", "larvae_10m2"])
    df = df[df["larvae_10m2"] >= 0]

    tplot = df["time"].dt.tz_convert(None)  # naive UTC wall times — Period wants no tz
    df["year"] = tplot.dt.year
    df["month_period"] = tplot.dt.to_period("M")

    monthly = (
        df.groupby("month_period", observed=True)
        .agg(mean_density=("larvae_10m2", "mean"), n_tows=("larvae_10m2", "size"))
        .reset_index()
    )
    monthly = monthly[monthly["n_tows"] >= args.min_tows_month].copy()
    monthly["period_start"] = monthly["month_period"].dt.to_timestamp(how="start")
    monthly["log1p_mean"] = np.log1p(monthly["mean_density"])

    annual = (
        df.groupby("year", observed=True)
        .agg(mean_density=("larvae_10m2", "mean"), n_tows=("larvae_10m2", "size"))
        .reset_index()
        .sort_values("year")
    )
    annual["log1p_mean"] = np.log1p(annual["mean_density"])
    annual["year_date"] = pd.to_datetime(
        dict(year=annual["year"].astype(int), month=7, day=15)
    )

    yr0 = int(df["year"].min())
    bin2 = multiyear_bin_table(df, yr0, 2)
    bin5 = multiyear_bin_table(df, yr0, 5)

    fig, ax = plt.subplots(figsize=(args.width, args.height))

    ax.scatter(
        monthly["period_start"],
        monthly["log1p_mean"],
        s=28,
        c=np.minimum(monthly["n_tows"], 80),
        cmap="viridis",
        alpha=0.85,
        edgecolors="white",
        linewidths=0.3,
        label=f"Monthly mean (≥{args.min_tows_month} tow/month)",
        zorder=3,
    )
    cbar = plt.colorbar(ax.collections[0], ax=ax, shrink=0.55, pad=0.01)
    cbar.set_label("tows in month (capped at color scale)")

    ax.plot(
        annual["year_date"],
        annual["log1p_mean"],
        color="#c0392b",
        lw=2.4,
        marker="o",
        markersize=4,
        alpha=0.95,
        label="Annual mean (all tows in year)",
        zorder=4,
    )

    ax.plot(
        bin2["plot_date"],
        bin2["log1p_mean"],
        color="#e67e22",
        lw=2.2,
        marker="s",
        markersize=5,
        alpha=0.95,
        label=f"Non-overlapping {2}-year bin mean",
        zorder=5,
    )
    ax.plot(
        bin5["plot_date"],
        bin5["log1p_mean"],
        color="#1e8449",
        lw=2.8,
        marker="^",
        markersize=6,
        alpha=0.95,
        label=f"Non-overlapping {5}-year bin mean",
        zorder=6,
    )

    yr1 = int(df["year"].max())
    ax.set_xlim(
        pd.Timestamp(f"{yr0}-01-01", tz="UTC"),
        pd.Timestamp(f"{yr1}-12-31", tz="UTC"),
    )
    ax.set_xlabel("Date (calendar month buckets)")
    ax.set_ylabel(
        r"$\log\left(1 + \mathrm{mean\ larvae\ /\ 10m^2}\right)$  (left scale)"
    )
    # Right scale: same y positions in data space, but tick labels = expm1(left)
    secax = ax.secondary_yaxis("right", functions=(np.expm1, np.log1p))
    secax.set_ylabel(r"Mean larvae / 10 m$^2$  (right scale = $\mathrm{expm1}$ of left)")

    ax.set_title(
        f"{args.species}\n"
        f"{len(monthly)} months with ≥{args.min_tows_month} tow(s); "
        f"{len(df):,} tows total; years {yr0}–{yr1}; "
        f"{len(bin2)}×2-yr bins, {len(bin5)}×5-yr bins (non-overlapping, anchored {yr0})",
        fontsize=11,
    )
    ax.grid(True, alpha=0.35, linestyle="--")
    ax.legend(loc="upper left", framealpha=0.92, fontsize=8, ncol=2)

    ax.xaxis.set_major_locator(mdates.YearLocator(5))
    ax.xaxis.set_minor_locator(mdates.YearLocator(1))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
    fig.autofmt_xdate()

    fig.tight_layout()
    outp = FIG / f"larvae_{slug(args.species)}_log1p_resolution.png"
    fig.savefig(outp, dpi=160, bbox_inches="tight")
    plt.close(fig)

    print(f"wrote {outp}")
    print(
        "Bins: 2-yr and 5-yr are non-overlapping blocks of calendar years "
        f"starting at first year present ({yr0}); each point is log1p(mean "
        "larvae_10m² over all tows in those years). Monthly remains the finest "
        "aggregation shown."
    )


if __name__ == "__main__":
    main()
