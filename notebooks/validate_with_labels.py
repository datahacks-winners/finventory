"""Validate model-derived survivability against external stock-assessment
labels (NOAA stock status, Seafood Watch, IUCN) curated in
``data/species_labels.csv``.

Answers: "When we have a ground-truth sustainability label (from actual
fisheries scientists), do our model scores agree with it?"

Outputs
-------
- ``outputs/tables/label_validation.csv`` — side-by-side XGB / Kalman / label
- ``outputs/label_validation.md``  — human-readable table
- Spearman correlations printed to stdout
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ.setdefault("MPLCONFIGDIR", str(HERE.parent / ".venv" / ".mplcache"))
sys.path.insert(0, str(HERE))
from output_paths import OUT, TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

DATA = HERE.parent / "data"
LABELS = DATA / "species_labels.csv"
XGB = TBL / "xgb_bottle_rankings.csv"
KALMAN = TBL / "kalman_survivability.csv"


def main():
    labels = pd.read_csv(LABELS)
    xgb = pd.read_csv(XGB)[["scientific_name", "blended_score"]]
    xgb.columns = ["scientific_name", "xgb_score"]
    kal = pd.read_csv(KALMAN)[["scientific_name", "kalman_score",
                                "recent_slope", "trend_confidence"]]
    kal.columns = ["scientific_name", "kalman_score",
                    "kalman_slope", "kalman_conf"]

    df = (labels.merge(xgb, on="scientific_name", how="left")
                .merge(kal, on="scientific_name", how="left"))

    print(f"loaded {len(labels)} external labels; "
          f"{df['xgb_score'].notna().sum()} have XGB score, "
          f"{df['kalman_score'].notna().sum()} have Kalman score\n")

    # Spearman correlations against the external label_score
    for col in ("xgb_score", "kalman_score"):
        sub = df[[col, "label_score"]].dropna()
        if len(sub) < 5:
            print(f"  {col}: n={len(sub)} (too few for correlation)")
            continue
        rho, p = spearmanr(sub[col], sub["label_score"])
        print(f"  Spearman ρ( {col:<14s}, label_score ) = {rho:+.3f}   "
              f"(n={len(sub)}, p={p:.3g})")

    # Do XGB and Kalman agree on labeled species?
    both = df[["xgb_score", "kalman_score"]].dropna()
    if len(both) >= 5:
        rho, p = spearmanr(both["xgb_score"], both["kalman_score"])
        print(f"  Spearman ρ( xgb_score     , kalman_score ) = {rho:+.3f}   "
              f"(n={len(both)}, p={p:.3g})")

    # Side-by-side table sorted by label_score
    view = df.sort_values("label_score", ascending=False).copy()
    view["xgb_score"] = view["xgb_score"].round(3)
    view["kalman_score"] = view["kalman_score"].round(3)
    view["kalman_slope"] = view["kalman_slope"].round(4)
    view["kalman_conf"] = view["kalman_conf"].round(2)
    cols = ["common_name", "noaa_stock_status", "seafood_watch", "iucn_status",
            "label_score", "xgb_score", "kalman_score",
            "kalman_slope", "kalman_conf"]
    print("\nper-species comparison (sorted by external label_score):\n")
    with pd.option_context("display.max_rows", None, "display.width", 160,
                            "display.max_colwidth", 30):
        print(view[cols].to_string(index=False))

    # Normalise XGB blended score to [0, 1] via robust median/MAD sigmoid so
    # it can be averaged with the already-[0,1] Kalman + label scores.
    full_xgb = pd.read_csv(XGB)["blended_score"].dropna()
    med, mad = full_xgb.median(), np.median(np.abs(full_xgb - full_xgb.median())) or 1.0
    view["xgb_01"] = (1 / (1 + np.exp(-(view["xgb_score"] - med)
                                        / (1.4826 * mad)))).round(3)

    def _avg(row):
        parts = [row[c] for c in ("label_score", "xgb_01", "kalman_score")
                 if pd.notna(row[c])]
        return float(np.mean(parts)) if parts else np.nan

    view["final_composite"] = view.apply(_avg, axis=1).round(3)
    view = view.sort_values("final_composite", ascending=False)

    view.to_csv(TBL / "label_validation.csv", index=False)

    md = ["# External-label validation\n",
          "Curated stock-status labels in `data/species_labels.csv` compared",
          "against model-derived scores (XGBoost blended, Kalman).",
          "`xgb_01` = XGB blended score squashed to [0, 1] via robust",
          "median/MAD sigmoid. `final_composite` = mean of available",
          "`label_score`, `xgb_01`, `kalman_score`.\n",
          "| species | common | NOAA | SeafoodWatch | IUCN | label | xgb_01 | kalman | Kslope | conf | composite |",
          "|---|---|---|---|---|---:|---:|---:|---:|---:|---:|"]
    for _, r in view.iterrows():
        xs = f"{r['xgb_01']:.3f}" if pd.notna(r['xgb_01']) else "n/a"
        ks = f"{r['kalman_score']:.3f}" if pd.notna(r['kalman_score']) else "n/a"
        sl = f"{r['kalman_slope']:+.4f}" if pd.notna(r['kalman_slope']) else "n/a"
        cf = f"{r['kalman_conf']:.2f}" if pd.notna(r['kalman_conf']) else "n/a"
        fc = f"{r['final_composite']:.3f}" if pd.notna(r['final_composite']) else "n/a"
        md.append(
            f"| *{r['scientific_name']}* | {r['common_name']} | "
            f"{r['noaa_stock_status']} | {r['seafood_watch']} | "
            f"{r['iucn_status']} | {r['label_score']:.2f} | {xs} | {ks} "
            f"| {sl} | {cf} | **{fc}** |"
        )
    (OUT / "label_validation.md").write_text("\n".join(md))

    print(f"\nwrote {TBL/'label_validation.csv'}")
    print(f"wrote {OUT/'label_validation.md'}")


if __name__ == "__main__":
    main()
