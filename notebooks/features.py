"""Per-species feature engineering for the Finventory sustainability ranker.

Input CSVs live in ``<repo>/data/`` and come from the CalCOFI /
EDI ichthyoplankton programs. See ``notebooks/README.md`` for the
definitions of every feature and the target we are trying to measure.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# ---------------------------------------------------------------------------
# Weights for the composite sustainability score. Tweak freely.
# ---------------------------------------------------------------------------
SCORE_WEIGHTS: dict[str, float] = {
    "trend_t": 0.30,
    "survival_ratio_z": 0.20,
    "stage_advance_z": 0.15,
    "recent_density_z": 0.15,
    "ubiquity_z": 0.10,
    "cv_recent_z": -0.10,
}

# Minimum observations in Larvae.csv before a species is scored.
MIN_OBS = 50

# Larva stages considered "advanced" (past flexion).
ADVANCED_STAGES = {"FLEX", "POFX", "PFLX", "POSF", "POST", "TRAN", "TRNS", "TRANS"}

# ---------------------------------------------------------------------------
# Loading helpers
# ---------------------------------------------------------------------------

COMMON_DTYPES = {
    "cruise": "string",
    "ship_code": "category",
    "tow_type": "category",
    "net_location": "category",
    "line": "float32",
    "station": "float32",
    "scientific_name": "string",
    "common_name": "string",
    "calcofi_species_code": "string",
    "itis_tsn": "string",
}


def _read_csv(name: str, usecols: Iterable[str] | None = None) -> pd.DataFrame:
    path = DATA_DIR / name
    df = pd.read_csv(
        path,
        usecols=list(usecols) if usecols else None,
        low_memory=False,
    )
    if "time" in df.columns:
        df["time"] = pd.to_datetime(df["time"], errors="coerce", utc=True)
        df["year"] = df["time"].dt.year.astype("Int16")
    for col, dtype in COMMON_DTYPES.items():
        if col in df.columns:
            try:
                df[col] = df[col].astype(dtype)
            except (ValueError, TypeError):
                pass
    if "common_name" in df.columns:
        df["common_name"] = df["common_name"].str.strip()
    return df


def load_all() -> dict[str, pd.DataFrame]:
    """Load the seven forced CSVs with trimmed column sets."""
    tables: dict[str, pd.DataFrame] = {}
    tables["eggs"] = _read_csv(
        "Eggs.csv",
        usecols=[
            "cruise",
            "time",
            "latitude",
            "longitude",
            "line",
            "station",
            "scientific_name",
            "common_name",
            "egg_count",
            "eggs_10m2",
        ],
    )
    tables["egg_stages"] = _read_csv(
        "EggStages.csv",
        usecols=[
            "cruise",
            "time",
            "line",
            "station",
            "scientific_name",
            "common_name",
            "egg_stage",
            "egg_stage_count",
            "eggs_10m2",
        ],
    )
    tables["larvae"] = _read_csv(
        "Larvae.csv",
        usecols=[
            "cruise",
            "time",
            "latitude",
            "longitude",
            "line",
            "station",
            "scientific_name",
            "common_name",
            "larvae_count",
            "larvae_10m2",
        ],
    )
    tables["larvae_sizes"] = _read_csv(
        "LarvaeSizes.csv",
        usecols=[
            "time",
            "scientific_name",
            "common_name",
            "larvae_size",
            "larvae_count",
        ],
    )
    tables["larvae_stages"] = _read_csv(
        "LarvaeStages.csv",
        usecols=[
            "time",
            "scientific_name",
            "common_name",
            "larvae_stage",
            "larvae_stage_count",
        ],
    )
    tables["cufes"] = _read_csv("Cufes.csv")
    tables["impexp"] = pd.read_csv(DATA_DIR / "power2_impexp.csv")
    return tables


# ---------------------------------------------------------------------------
# Feature helpers
# ---------------------------------------------------------------------------


@dataclass
class TrendFit:
    slope: float
    t_stat: float
    n: int


def _ols_trend(years: np.ndarray, values: np.ndarray) -> TrendFit:
    """Simple OLS slope + t-stat for log-abundance on year."""
    mask = np.isfinite(values) & np.isfinite(years) & (values > 0)
    if mask.sum() < 4:
        return TrendFit(slope=float("nan"), t_stat=float("nan"), n=int(mask.sum()))
    x = years[mask].astype(float)
    y = np.log1p(values[mask])
    x_mean = x.mean()
    xc = x - x_mean
    denom = (xc**2).sum()
    if denom == 0:
        return TrendFit(slope=float("nan"), t_stat=float("nan"), n=int(mask.sum()))
    slope = (xc * (y - y.mean())).sum() / denom
    intercept = y.mean() - slope * x_mean
    y_hat = intercept + slope * x
    resid = y - y_hat
    dof = max(len(y) - 2, 1)
    sigma2 = (resid**2).sum() / dof
    se = math.sqrt(sigma2 / denom) if sigma2 > 0 else float("nan")
    t = slope / se if se and math.isfinite(se) and se > 0 else float("nan")
    return TrendFit(slope=float(slope), t_stat=float(t), n=int(mask.sum()))


def _trend_features(
    df: pd.DataFrame, value_col: str, window_years: int | None = 15
) -> pd.DataFrame:
    """Annual mean density per species, then OLS slope over the last window_years."""
    annual = (
        df.dropna(subset=[value_col, "year"])  # type: ignore[arg-type]
        .assign(**{value_col: lambda d: d[value_col].astype(float)})
        .groupby(["scientific_name", "year"], observed=True)[value_col]
        .mean()
        .reset_index()
    )
    if window_years is not None:
        cutoff = int(annual["year"].max() - window_years)
        annual = annual[annual["year"] >= cutoff]

    rows = []
    for sp, g in annual.groupby("scientific_name", observed=True):
        fit = _ols_trend(g["year"].to_numpy(), g[value_col].to_numpy())
        rows.append(
            {
                "scientific_name": sp,
                "trend_slope": fit.slope,
                "trend_t": fit.t_stat,
                "trend_years": fit.n,
            }
        )
    return pd.DataFrame(rows)


def _abundance_features(df: pd.DataFrame) -> pd.DataFrame:
    cur_year = int(df["year"].max())
    recent = df[df["year"] >= cur_year - 5]
    decade = df[df["year"] >= cur_year - 10]

    g = df.groupby("scientific_name", observed=True)
    base = pd.DataFrame(
        {
            "common_name": g["common_name"].agg(
                lambda s: s.dropna().mode().iat[0] if not s.dropna().empty else ""
            ),
            "n_obs": g.size(),
            "log_mean_density": np.log1p(g["larvae_10m2"].mean()),
        }
    )

    recent_stats = (
        recent.groupby("scientific_name", observed=True)
        .agg(
            recent_density=("larvae_10m2", "mean"),
            ubiquity=(
                "line",
                lambda s: s.astype(str)
                .str.cat(
                    recent.loc[s.index, "station"].astype(str), sep="|", na_rep=""
                )
                .nunique(),
            ),
        )
    )

    def _cv(s: pd.Series) -> float:
        s = s.dropna().astype(float)
        if s.empty or s.mean() == 0:
            return float("nan")
        return float(s.std(ddof=0) / s.mean())

    cv_stats = (
        decade.groupby(["scientific_name", "year"], observed=True)["larvae_10m2"]
        .mean()
        .reset_index()
        .groupby("scientific_name", observed=True)["larvae_10m2"]
        .apply(_cv)
        .rename("cv_recent")
    )

    return (
        base.join(recent_stats, how="left")
        .join(cv_stats, how="left")
        .reset_index()
    )


def _survival_ratio(
    eggs: pd.DataFrame, larvae: pd.DataFrame
) -> pd.DataFrame:
    """Match eggs↔larvae on cruise+line+station+species and compute a ratio."""
    keys = ["cruise", "line", "station", "scientific_name"]
    e = (
        eggs.dropna(subset=keys + ["eggs_10m2"])  # type: ignore[arg-type]
        .groupby(keys, observed=True)["eggs_10m2"]
        .sum()
        .reset_index()
        .rename(columns={"eggs_10m2": "eggs"})
    )
    l = (
        larvae.dropna(subset=keys + ["larvae_10m2"])  # type: ignore[arg-type]
        .groupby(keys, observed=True)["larvae_10m2"]
        .sum()
        .reset_index()
        .rename(columns={"larvae_10m2": "larvae"})
    )
    merged = e.merge(l, on=keys, how="inner")
    merged = merged[(merged["eggs"] > 0)]
    merged["ratio"] = merged["larvae"] / merged["eggs"]
    agg = (
        merged.groupby("scientific_name", observed=True)
        .agg(
            survival_ratio=("ratio", "median"),
            survival_matched_n=("ratio", "size"),
        )
        .reset_index()
    )
    return agg


def _stage_advancement(larvae_stages: pd.DataFrame) -> pd.DataFrame:
    df = larvae_stages.dropna(subset=["larvae_stage", "larvae_stage_count"]).copy()
    if df.empty:
        return pd.DataFrame(
            columns=["scientific_name", "stage_advance_frac", "stage_n"]
        )
    df["stage_clean"] = (
        df["larvae_stage"].astype(str).str.upper().str.strip().str.replace(" ", "")
    )
    df["advanced"] = df["stage_clean"].isin(ADVANCED_STAGES).astype(int)
    cur_year = int(df["year"].max())
    df = df[df["year"] >= cur_year - 10]

    grouped = df.groupby("scientific_name", observed=True)
    total = grouped["larvae_stage_count"].sum()
    adv = grouped.apply(
        lambda g: (g["larvae_stage_count"] * g["advanced"]).sum(), include_groups=False
    )
    out = pd.DataFrame(
        {
            "stage_advance_frac": (adv / total).astype(float),
            "stage_n": total.astype(int),
        }
    ).reset_index()
    return out


def _size_trend(larvae_sizes: pd.DataFrame) -> pd.DataFrame:
    df = larvae_sizes.dropna(subset=["larvae_size", "year"]).copy()
    if df.empty:
        return pd.DataFrame(columns=["scientific_name", "size_trend_mm_per_decade"])
    cur_year = int(df["year"].max())
    df = df[df["year"] >= cur_year - 20]
    # weight by larvae_count so each sampled individual contributes equally
    df["larvae_count"] = df["larvae_count"].fillna(1).astype(float)
    annual = (
        df.assign(
            num=lambda d: d["larvae_size"] * d["larvae_count"],
            den=lambda d: d["larvae_count"],
        )
        .groupby(["scientific_name", "year"], observed=True)[["num", "den"]]
        .sum()
        .reset_index()
    )
    annual["size_mm"] = annual["num"] / annual["den"]

    rows = []
    for sp, g in annual.groupby("scientific_name", observed=True):
        fit = _ols_trend(g["year"].to_numpy(), g["size_mm"].to_numpy())
        rows.append(
            {
                "scientific_name": sp,
                "size_trend_mm_per_decade": fit.slope * 10 if math.isfinite(fit.slope) else float("nan"),
            }
        )
    return pd.DataFrame(rows)


def _cufes_env(cufes: pd.DataFrame) -> pd.DataFrame:
    """Mean SST / salinity at positive egg samples for the 5 CUFES species."""
    species_map = {
        "sardine_eggs": ("Sardinops sagax", "Pacific sardine"),
        "anchovy_eggs": ("Engraulis mordax", "Northern anchovy"),
        "jack_mackerel_eggs": ("Trachurus symmetricus", "Jack mackerel"),
        "hake_eggs": ("Merluccius productus", "Pacific hake"),
        "squid_eggs": ("Loligo opalescens", "Market squid"),
    }
    cols = ["start_temperature", "start_salinity"] + list(species_map)
    df = cufes.copy()
    for c in cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    rows = []
    for col, (sci, common) in species_map.items():
        present = df[df[col].fillna(0) > 0]
        rows.append(
            {
                "scientific_name": sci,
                "common_name": common,
                "pref_sst_c": float(present["start_temperature"].mean()),
                "pref_sal_psu": float(present["start_salinity"].mean()),
                "cufes_positive_samples": int(len(present)),
            }
        )
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


def compute_species_features(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    larvae = tables["larvae"].copy()
    eggs = tables["eggs"].copy()
    stages = tables["larvae_stages"].copy()
    sizes = tables["larvae_sizes"].copy()
    cufes = tables["cufes"].copy()

    trend = _trend_features(larvae, "larvae_10m2", window_years=15)
    abundance = _abundance_features(larvae)
    survival = _survival_ratio(eggs, larvae)
    stage_adv = _stage_advancement(stages)
    size = _size_trend(sizes)
    env = _cufes_env(cufes)

    out = (
        abundance.merge(trend, on="scientific_name", how="left")
        .merge(survival, on="scientific_name", how="left")
        .merge(stage_adv, on="scientific_name", how="left")
        .merge(size, on="scientific_name", how="left")
        .merge(env[["scientific_name", "pref_sst_c", "pref_sal_psu"]], on="scientific_name", how="left")
    )
    out = out[out["n_obs"] >= MIN_OBS].copy()
    return out.reset_index(drop=True)


def _zscore(series: pd.Series) -> pd.Series:
    s = series.astype(float)
    mu = s.mean(skipna=True)
    sd = s.std(ddof=0, skipna=True)
    if not sd or not np.isfinite(sd) or sd == 0:
        return pd.Series(np.zeros(len(s)), index=s.index)
    return (s - mu) / sd


def compute_survivability_score(
    features: pd.DataFrame, weights: dict[str, float] | None = None
) -> pd.DataFrame:
    w = weights or SCORE_WEIGHTS
    df = features.copy()
    df["recent_density_z"] = _zscore(np.log1p(df["recent_density"].fillna(0)))
    df["survival_ratio_z"] = _zscore(np.log1p(df["survival_ratio"].fillna(0)))
    df["stage_advance_z"] = _zscore(df["stage_advance_frac"].fillna(0))
    df["ubiquity_z"] = _zscore(df["ubiquity"].fillna(0))
    df["cv_recent_z"] = _zscore(df["cv_recent"].fillna(df["cv_recent"].median()))
    df["trend_t"] = df["trend_t"].fillna(0)

    score = pd.Series(0.0, index=df.index)
    for col, weight in w.items():
        score = score + df[col].fillna(0) * weight
    df["survivability_score"] = score
    df = df.sort_values("survivability_score", ascending=False).reset_index(drop=True)
    df["rank"] = np.arange(1, len(df) + 1)
    return df
