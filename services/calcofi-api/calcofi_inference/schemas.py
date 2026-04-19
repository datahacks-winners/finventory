from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class PredictBinRequest(BaseModel):
    """One row of binned bottle–larvae–cast features (keys match training columns)."""

    features: dict[str, Any] = Field(
        ...,
        description="Column name → value for a single (species, bin) prediction row.",
    )


class PredictBinResponse(BaseModel):
    model: str
    log1p_mean_larvae_10m2: float


class TimesFMForecastRequest(BaseModel):
    """Univariate log1p(CPUE) history (annual or binned), same units as training."""

    history: list[float] = Field(..., min_length=1)
    horizon: int = Field(5, ge=1, le=256)
    variant: str = Field(
        "binned_5yr",
        description="'binned_5yr' | 'annual' — only affects default horizon hints in docs",
    )


class TimesFMForecastResponse(BaseModel):
    model: str
    point_forecast: list[float]
    variant: str
