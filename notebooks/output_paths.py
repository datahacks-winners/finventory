"""Shared paths under ``notebooks/outputs/``.

- ``OUT`` — Parquet, Markdown, and misc at repo root under ``outputs/``.
- ``JSN`` — JSON metrics / summaries (often gitignored with other artefacts).
- ``FIG`` — PNG figures (gitignored).
- ``TBL`` — CSV tables (gitignored).

Import from notebook scripts after ``sys.path.insert(0, HERE)``::

    from output_paths import OUT, FIG, TBL, JSN, ensure_output_dirs
    ensure_output_dirs()
"""
from __future__ import annotations

from pathlib import Path

_HERE = Path(__file__).resolve().parent
OUT = _HERE / "outputs"
FIG = OUT / "figures"
TBL = OUT / "tables"
JSN = OUT / "json"


def ensure_output_dirs() -> None:
    for p in (OUT, FIG, TBL, JSN):
        p.mkdir(parents=True, exist_ok=True)
