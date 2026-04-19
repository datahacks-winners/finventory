"""Zero-shot TimesFM forecasts on annual CalCOFI larvae CPUE.

Uses the same annual aggregation as ``kalman_survivability.py``::
  y_t = log1p(mean(larvae_10m²) per year, only years with ≥20 tows)

We **hold out** the last ``HOLDOUT_YEARS`` calendar years per species,
feed all prior values to TimesFM 2.5 (`google/timesfm-2.5-200m-pytorch`),
and report MAE / RMSE against the held-out truth (interpolation-filled
annual grid — same caveat as any sparse survey).

Upstream: https://github.com/google-research/timesfm

Outputs (see ``output_paths.py``):
  - ``tables/timesfm_holdout_metrics.csv``
  - ``json/timesfm_holdout_summary.json``
  - ``figures/timesfm_anchor_forecasts.png``

Optional checkpoint for ``calcofi-api``::

    --save-model [--save-model-dir DIR]

  Writes ``timesfm_state.pt`` + ``timesfm_manifest.json`` after ``compile()`` (same pretrained weights as binned script).

Requires: ``pip install -e vendor/timesfm[torch]`` (see repo README).
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

# Reuse annual CPUE builder from Kalman script (same thresholds).
sys.path.insert(0, str(HERE))
from kalman_survivability import ANCHORS, load_annual_cpue  # noqa: E402
from output_paths import FIG, JSN, OUT, TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

HOLDOUT_YEARS = 5
MIN_CONTEXT = 30  # need enough history before holdout for a meaningful forecast
MAX_CONTEXT = 1024  # TimesFM 2.5 default context cap (annual series is shorter)


def save_timesfm_checkpoint(
    model,
    *,
    torch_module,
    dest_dir: Path,
    holdout_years: int,
    max_context: int,
) -> tuple[Path, Path]:
    """Persist compiled TimesFM weights + manifest for ``calcofi_inference`` runtime."""
    dest_dir = dest_dir.resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)
    state_path = dest_dir / "timesfm_state.pt"
    manifest_path = dest_dir / "timesfm_manifest.json"

    inner = getattr(model, "model", None)
    if inner is None or not hasattr(inner, "state_dict"):
        raise RuntimeError(
            "TimesFM wrapper has no .model submodule with state_dict() — cannot checkpoint."
        )
    torch_module.save(inner.state_dict(), str(state_path))

    fc = {
        "max_context": min(max_context, 1024),
        "max_horizon": max(holdout_years, 256),
        "normalize_inputs": True,
        "use_continuous_quantile_head": True,
        "force_flip_invariance": True,
        "infer_is_positive": True,
        "fix_quantile_crossing": True,
        "per_core_batch_size": 8,
    }
    manifest = {
        "hf_model_id": "google/timesfm-2.5-200m-pytorch",
        "forecast_config": fc,
        "notes": (
            "Exported from notebooks/timesfm_larvae_forecast.py after compile(); "
            "weights match HF pretrained (same checkpoint as binned export)."
        ),
        "series": "annual",
        "holdout_years": holdout_years,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"\n  [checkpoint] wrote {state_path}")
    print(f"  [checkpoint] wrote {manifest_path}")
    return state_path, manifest_path


def dense_annual_series(
    annual: pd.DataFrame, species: str
) -> tuple[np.ndarray, np.ndarray]:
    """Return (years, y) with linear interpolation on interior gaps."""
    g = annual[annual["scientific_name"] == species].sort_values("year")
    if g.empty:
        raise ValueError(f"No rows for {species}")
    y0, y1 = int(g["year"].min()), int(g["year"].max())
    full_years = np.arange(y0, y1 + 1, dtype=np.int64)
    y_map = g.set_index("year")["y"].reindex(full_years)
    y_map = y_map.interpolate(method="linear", limit_area="inside")
    y_map = y_map.bfill().ffill()
    y = y_map.astype(np.float64).values
    return full_years, y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--save-model",
        action="store_true",
        help="Write timesfm_state.pt + timesfm_manifest.json for services/calcofi-api (after compile)",
    )
    ap.add_argument(
        "--save-model-dir",
        type=Path,
        default=None,
        help="Checkpoint directory (default: <repo>/services/calcofi-api/models)",
    )
    args = ap.parse_args()

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

    annual = load_annual_cpue()
    print("\nLoading TimesFM 2.5 from Hugging Face (first run downloads weights)...")
    model = timesfm.TimesFM_2p5_200M_torch.from_pretrained(
        "google/timesfm-2.5-200m-pytorch"
    )
    model.compile(
        timesfm.ForecastConfig(
            max_context=min(MAX_CONTEXT, 1024),
            max_horizon=max(HOLDOUT_YEARS, 256),
            normalize_inputs=True,
            use_continuous_quantile_head=True,
            force_flip_invariance=True,
            infer_is_positive=True,
            fix_quantile_crossing=True,
            per_core_batch_size=8,
        )
    )

    if args.save_model:
        ckpt_dir = args.save_model_dir
        if ckpt_dir is None:
            ckpt_dir = ROOT / "services" / "calcofi-api" / "models"
        save_timesfm_checkpoint(
            model,
            torch_module=torch,
            dest_dir=ckpt_dir,
            holdout_years=HOLDOUT_YEARS,
            max_context=MAX_CONTEXT,
        )

    rows = []
    plot_specs: list[tuple[str, np.ndarray, np.ndarray, np.ndarray, np.ndarray]] = []

    for sp in ANCHORS:
        try:
            years, y = dense_annual_series(annual, sp)
        except ValueError:
            print(f"  [skip] {sp}: no annual rows")
            continue

        if len(y) <= MIN_CONTEXT + HOLDOUT_YEARS:
            print(f"  [skip] {sp}: series too short ({len(y)} yrs)")
            continue

        y_train = y[:-HOLDOUT_YEARS].astype(np.float32)
        y_hold = y[-HOLDOUT_YEARS:].astype(np.float64)
        train_years = years[:-HOLDOUT_YEARS]
        hold_years = years[-HOLDOUT_YEARS:]

        if len(y_train) > MAX_CONTEXT:
            y_train = y_train[-MAX_CONTEXT:]
            train_years = train_years[-MAX_CONTEXT:]

        inputs = [y_train]
        point, quantiles = model.forecast(horizon=HOLDOUT_YEARS, inputs=inputs)
        pred = np.asarray(point[0], dtype=np.float64)
        q = np.asarray(quantiles[0], dtype=np.float64)  # (horizon, n_q)

        mae = float(np.mean(np.abs(pred - y_hold)))
        rmse = float(np.sqrt(np.mean((pred - y_hold) ** 2)))

        # Naive baseline: repeat last training value (random-walk / persistence).
        naive = np.full(HOLDOUT_YEARS, y_train[-1], dtype=np.float64)
        mae_naive = float(np.mean(np.abs(naive - y_hold)))

        rows.append(
            {
                "scientific_name": sp,
                "n_train": len(y_train),
                "holdout_start": int(hold_years[0]),
                "holdout_end": int(hold_years[-1]),
                "mae_timesfm": mae,
                "rmse_timesfm": rmse,
                "mae_naive_persist": mae_naive,
            }
        )
        print(
            f"  {sp[:32]:<32}  MAE(TFM)={mae:.4f}  MAE(naive)={mae_naive:.4f}  "
            f"holdout {hold_years[0]}–{hold_years[-1]}"
        )

        # Quantile bands: indices from timesfm-forecasting/scripts/forecast_csv.py
        lo = q[:, 1] if q.shape[1] > 1 else pred
        hi = q[:, 9] if q.shape[1] > 9 else pred
        plot_specs.append((sp, train_years, y_train.astype(float), hold_years, y_hold, pred, lo, hi))

    if not rows:
        print("No species could be evaluated.", file=sys.stderr)
        raise SystemExit(2)

    pd.DataFrame(rows).to_csv(TBL / "timesfm_holdout_metrics.csv", index=False)
    with open(JSN / "timesfm_holdout_summary.json", "w") as f:
        json.dump({"holdout_years": HOLDOUT_YEARS, "species": rows}, f, indent=2)

    # Plot anchors
    n = len(plot_specs)
    fig, axes = plt.subplots(2, 2, figsize=(11, 8), sharex=False)
    axes = axes.ravel()
    for ax, pack in zip(axes, plot_specs):
        sp, ty, ytr, hy, yho, pred, lo, hi = pack
        ax.plot(ty, ytr, "o-", color="#555", ms=3, lw=1, label="history (train)")
        ax.plot(hy, yho, "s-", color="#2ca02c", ms=5, lw=2, label="held-out actual")
        ax.plot(hy, pred, "^-", color="#d62728", ms=4, lw=2, label="TimesFM point")
        ax.fill_between(hy, lo, hi, color="#d62728", alpha=0.15, label="10–90%")
        ax.set_title(sp[:40])
        ax.set_xlabel("year")
        ax.set_ylabel("log1p(mean larvae / 10m²)")
        ax.legend(loc="best", fontsize=7)
        ax.grid(alpha=0.3)
    for k in range(n, 4):
        axes[k].axis("off")
    fig.suptitle(
        f"TimesFM 2.5 holdout: last {HOLDOUT_YEARS} years "
        f"(annual CalCOFI CPUE)",
        fontsize=12,
    )
    fig.tight_layout()
    fig.savefig(FIG / "timesfm_anchor_forecasts.png", dpi=140, bbox_inches="tight")
    plt.close(fig)

    print(f"\nwrote {TBL / 'timesfm_holdout_metrics.csv'}")
    print(f"wrote {JSN / 'timesfm_holdout_summary.json'}")
    print(f"wrote {FIG / 'timesfm_anchor_forecasts.png'}")


if __name__ == "__main__":
    main()
