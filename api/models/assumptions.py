"""Assumptions model — economic and regulatory assumptions with 2026 IRS defaults."""

from pydantic import BaseModel, Field

from api.models.asset_class_return import AssetClassReturn


class Assumptions(BaseModel):
    """Economic and regulatory assumptions for simulation."""

    inflation_rate: float = 0.025
    wage_growth_rate: float = 0.03
    wage_growth_std: float = Field(default=0.02, ge=0.0)
    equity: AssetClassReturn = AssetClassReturn(
        expected_return=0.075, standard_deviation=0.17
    )
    intl_equity: AssetClassReturn = AssetClassReturn(
        expected_return=0.07, standard_deviation=0.19
    )
    fixed_income: AssetClassReturn = AssetClassReturn(
        expected_return=0.04, standard_deviation=0.055
    )
    cash: AssetClassReturn = AssetClassReturn(
        expected_return=0.03, standard_deviation=0.01
    )
    comp_limit: float = Field(default=345_000, gt=0)
    deferral_limit: float = Field(default=23_500, gt=0)
    additions_limit: float = Field(default=70_000, gt=0)
    catchup_limit: float = Field(default=7_500, gt=0)
    super_catchup_limit: float = Field(default=11_250, gt=0)
