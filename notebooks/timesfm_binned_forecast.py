"""Zero-shot TimesFM forecasts on **binned** CalCOFI larvae CPUE (larvae–bottle–cast).

Structural copy of ``timesfm_larvae_forecast.py``: same TimesFM 2.5 loader,
``ForecastConfig``, holdout logic, naive baseline, CSV + anchor plot.

Data source: non-overlapping ``span``-year bins (same as
``binned_regression_compare.py``)::

    bin_start = yr0 + ((year - yr0) // span) * span
    y = log1p(mean(larvae_10m²)) per (species, bin_start)

Per species we sort by ``bin_start``, hold out the last ``HOLDOUT_BINS``
bin values, forecast with TimesFM, compare MAE/RMSE to naive persistence.

Upstream: https://github.com/google-research/timesfm

Outputs (see ``output_paths.py``):

  - ``tables/timesfm_binned_{span}yr_holdout_metrics.csv``
  - ``json/timesfm_binned_{span}yr_holdout_summary.json``
  - ``figures/timesfm_binned_{span}yr_anchor_forecasts.png``

Requires: ``pip install -e vendor/timesfm[torch]``
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".venv" / ".mplcache"))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

sys.path.insert(0, str(HERE))
from kalman_survivability import ANCHORS  # noqa: E402
from output_paths import FIG, JSN, OUT, TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

HOLDOUT_BINS = 5  # last N bin steps held out (same count spirit as annual script’s 5 years)
MIN_CONTEXT_BINS = 8  # need enough bin history before holdout
MAX_CONTEXT = 1024


def load_binned_table(span: int) -> pd.DataFrame:
    """Build the same binned frame as ``binned_regression_compare.aggregate_bins``."""
    import binned_regression_compare as br

    br.load_bottlejoin_imports()
    df = br.build_bottle()
    yr0 = int(df["year"].min())
    return br.aggregate_bins(df, span, yr0)


def dense_bin_series(
    binned: pd.DataFrame, species: str
) -> tuple[np.ndarray, np.ndarray]:
    """Return (bin_start years, y) sorted; no interpolation (only observed bins)."""
    g = binned[binned["scientific_name"] == species].sort_values("bin_start")
    if g.empty:
        raise ValueError(f"No rows for {species}")
    starts = g["bin_start"].to_numpy(dtype=np.int64)
    y = g["y"].to_numpy(dtype=np.float64)
    return starts, y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--span",
        type=int,
        default=5,
        choices=[5, 10],
        help="non-overlapping bin width in calendar years (default: 5)",
    )
    args = ap.parse_args()
    span = args.span

    torch = None
    timesfm = None
    try:
        import torch as _torch
        import timesfm as _timesfm

        torch = _torch
        timesfm = _timesfm
    except ImportError as e:
        print(
            "Missing dependency. Install PyTorch + TimesFM:\n"
            "  pip install torch\n"
            "  pip install -e vendor/timesfm[torch]\n",
            file=sys.stderr,
        )
        raise SystemExit(1) from e

    torch.set_float32_matmul_precision("high")

    print(f"\nBuilding {span}-year binned larvae–bottle table (same as binned_regression_compare)...")
    binned = load_binned_table(span)
    print(f"  rows={len(binned):,}  species={binned['scientific_name'].nunique()}")

    print("\nLoading TimesFM 2.5 from Hugging Face (first run downloads weights)...")
    model = timesfm.TimesFM_2p5_200M_torch.from_pretrained(
        "google/timesfm-2.5-200m-pytorch"
    )
    model.compile(
        timesfm.ForecastConfig(
            max_context=min(MAX_CONTEXT, 1024),
            max_horizon=max(HOLDOUT_BINS, 256),
            normalize_inputs=True,
            use_continuous_quantile_head=True,
            force_flip_invariance=True,
            infer_is_positive=True,
            fix_quantile_crossing=True,
            per_core_batch_size=8,
        )
    )

    rows = []
    plot_specs: list[
        tuple[str, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]
    ] = []

    for sp in ANCHORS:
        try:
            bin_starts, y = dense_bin_series(binned, sp)
        except ValueError:
            print(f"  [skip] {sp}: no binned rows")
            continue

        if len(y) <= MIN_CONTEXT_BINS + HOLDOUT_BINS:
            print(f"  [skip] {sp}: series too short ({len(y)} bins)")
            continue

        y_train = y[:-HOLDOUT_BINS].astype(np.float32)
        y_hold = y[-HOLDOUT_BINS:].astype(np.float64)
        train_starts = bin_starts[:-HOLDOUT_BINS]
        hold_starts = bin_starts[-HOLDOUT_BINS:]

        if len(y_train) > MAX_CONTEXT:
            y_train = y_train[-MAX_CONTEXT:]
            train_starts = train_starts[-MAX_CONTEXT:]

        inputs = [y_train]
        point, quantiles = model.forecast(horizon=HOLDOUT_BINS, inputs=inputs)
        pred = np.asarray(point[0], dtype=np.float64)
        q = np.asarray(quantiles[0], dtype=np.float64)

        mae = float(np.mean(np.abs(pred - y_hold)))
        rmse = float(np.sqrt(np.mean((pred - y_hold) ** 2)))

        naive = np.full(HOLDOUT_BINS, y_train[-1], dtype=np.float64)
        mae_naive = float(np.mean(np.abs(naive - y_hold)))

        rows.append(
            {
                "scientific_name": sp,
                "bin_span_years": span,
                "n_train_bins": len(y_train),
                "holdout_bin_start_first": int(hold_starts[0]),
                "holdout_bin_start_last": int(hold_starts[-1]),
                "mae_timesfm": mae,
                "rmse_timesfm": rmse,
                "mae_naive_persist": mae_naive,
            }
        )
        print(
            f"  {sp[:32]:<32}  MAE(TFM)={mae:.4f}  MAE(naive)={mae_naive:.4f}  "
            f"holdout bins starting {hold_starts[0]}"
        )

        lo = q[:, 1] if q.shape[1] > 1 else pred
        hi = q[:, 9] if q.shape[1] > 9 else pred
        # x-axis for plot: use bin_start as numeric year
        plot_specs.append(
            (
                sp,
                train_starts.astype(float),
                y_train.astype(float),
                hold_starts.astype(float),
                y_hold,
                pred,
                lo,
                hi,
            )
        )

    if not rows:
        print("No species could be evaluated.", file=sys.stderr)
        raise SystemExit(2)

    tag = f"{span}yr"
    csv_path = TBL / f"timesfm_binned_{tag}_holdout_metrics.csv"
    json_path = JSN / f"timesfm_binned_{tag}_holdout_summary.json"
    png_path = FIG / f"timesfm_binned_{tag}_anchor_forecasts.png"

    pd.DataFrame(rows).to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump(
            {
                "bin_span_years": span,
                "holdout_bins": HOLDOUT_BINS,
                "species": rows,
            },
            f,
            indent=2,
        )

    n = len(plot_specs)
    fig, axes = plt.subplots(2, 2, figsize=(11, 8), sharex=False)
    axes = axes.ravel()
    for ax, pack in zip(axes, plot_specs):
        sp, t_bin, ytr, h_bin, yho, pred, lo, hi = pack
        ax.plot(t_bin, ytr, "o-", color="#555", ms=3, lw=1, label="history (train)")
        ax.plot(h_bin, yho, "s-", color="#2ca02c", ms=5, lw=2, label="held-out actual")
        ax.plot(h_bin, pred, "^-", color="#d62728", ms=4, lw=2, label="TimesFM point")
        ax.fill_between(h_bin, lo, hi, color="#d62728", alpha=0.15, label="10–90%")
        ax.set_title(sp[:40])
        ax.set_xlabel(f"bin start year ({span}-yr bins)")
        ax.set_ylabel("log1p(mean larvae / 10m²)")
        ax.legend(loc="best", fontsize=7)
        ax.grid(alpha=0.3)
    for k in range(n, 4):
        axes[k].axis("off")
    fig.suptitle(
        f"TimesFM 2.5 holdout: last {HOLDOUT_BINS} bins ({span}-yr binned CPUE)",
        fontsize=12,
    )
    fig.tight_layout()
    fig.savefig(png_path, dpi=140, bbox_inches="tight")
    plt.close(fig)

    print(f"\nwrote {csv_path}")
    print(f"wrote {json_path}")
    print(f"wrote {png_path}")


if __name__ == "__main__":
    main()
