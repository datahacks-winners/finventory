"""Build 5-yr larvae–bottle–cast bins (same as binned_regression_compare) and save CSV.

Requires ``outputs/larvae_bottle_enriched.parquet`` from ``enrich_with_bottle.py``.

Run from repo root::

    .venv/bin/python notebooks/export_species_binned_table.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".venv" / ".mplcache"))
sys.path.insert(0, str(HERE))

from output_paths import TBL, ensure_output_dirs  # noqa: E402

ensure_output_dirs()

from binned_regression_compare import (  # noqa: E402
    aggregate_bins,
    load_bottlejoin_imports,
)


def main() -> None:
    load_bottlejoin_imports()
    import binned_regression_compare as br

    assert br.build_bottle is not None
    df = br.build_bottle()
    yr0 = int(df["year"].min())
    binned = aggregate_bins(df, span=5, yr0=yr0)
    out = TBL / "species_binned.csv"
    binned.to_csv(out, index=False)
    print(f"wrote {out}  rows={len(binned):,}  cols={len(binned.columns)}")


if __name__ == "__main__":
    main()
