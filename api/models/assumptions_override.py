"""Partial override models for deep-merge configuration inheritance."""

from pydantic import BaseModel, Field


class AssetClassReturnOverride(BaseModel):
    """Partial override for an asset class return."""

    expected_return: float | None = None
    standard_deviation: float | None = Field(default=None, ge=0.0)


class AssumptionsOverride(BaseModel):
    """Partial override for economic and regulatory assumptions.

    Fields set to None mean 'inherit from base' (no override).
    """

    inflation_rate: float | None = None
    wage_growth_rate: float | None = None
    wage_growth_std: float | None = Field(default=None, ge=0.0)
    equity: AssetClassReturnOverride | None = None
    intl_equity: AssetClassReturnOverride | None = None
    fixed_income: AssetClassReturnOverride | None = None
    cash: AssetClassReturnOverride | None = None
    comp_limit: float | None = Field(default=None, gt=0)
    deferral_limit: float | None = Field(default=None, gt=0)
    additions_limit: float | None = Field(default=None, gt=0)
    catchup_limit: float | None = Field(default=None, gt=0)
    super_catchup_limit: float | None = Field(default=None, gt=0)
    target_replacement_ratio_override: float | None = Field(default=None, ge=0.0, le=1.0)
