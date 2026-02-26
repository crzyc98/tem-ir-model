"""Assumptions model — economic and regulatory assumptions with 2026 IRS defaults."""

from pydantic import BaseModel, Field

from api.models.asset_class_return import AssetClassReturn


class Assumptions(BaseModel):
    """Economic and regulatory assumptions for simulation."""

    inflation_rate: float = 0.025
    # wage_growth_rate and asset-class returns are stored as NOMINAL rates (industry
    # convention). The simulation engine converts to real via the Fisher formula:
    #   r_real = (1 + r_nominal) / (1 + inflation_rate) - 1
    wage_growth_rate: float = 0.03
    wage_growth_std: float = Field(default=0.02, ge=0.0)
    # salary_real_growth_rate: policy rate used solely for projecting the IR denominator
    # (final salary just before retirement). Kept separate from simulated real wage growth.
    salary_real_growth_rate: float = Field(default=0.015, ge=0.0)
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

    # ── IRS Annual Limits ────────────────────────────────────────────────────────
    # Update every October when IRS announces next-year COLA adjustments.
    # Source: IRS Notice published ~Oct each year (e.g., Notice 2025-70 for 2026).
    # Plan year: 2026
    deferral_limit: float = Field(default=23_500, gt=0)       # §402(g) base limit
    catchup_limit: float = Field(default=7_500, gt=0)          # §402(g) age 50+ catch-up
    super_catchup_limit: float = Field(default=11_250, gt=0)   # SECURE 2.0 age 60–63
    additions_limit: float = Field(default=70_000, gt=0)       # §415(c) total additions
    comp_limit: float = Field(default=345_000, gt=0)           # §401(a)(17) comp cap
    ss_taxable_max: float = Field(default=176_100, gt=0)       # SS wage base (current-year taxable maximum)
    target_replacement_ratio_override: float | None = Field(default=None, ge=0.0, le=1.0)
