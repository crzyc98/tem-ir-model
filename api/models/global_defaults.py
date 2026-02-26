"""GlobalDefaults model — application-wide defaults seeded into new workspaces."""

from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

# Hardcoded system defaults — source of truth for "Restore System Defaults".
SYSTEM_DEFAULTS: dict = {
    "inflation_rate": 0.025,
    "salary_real_growth_rate": 0.015,
    "comp_limit": 360_000.0,
    "deferral_limit": 24_500.0,
    "additions_limit": 72_000.0,
    "catchup_limit": 8_000.0,
    "super_catchup_limit": 11_250.0,
    "ss_taxable_max": 184_500.0,
    "target_replacement_ratio_mode": "lookup_table",
    "target_replacement_ratio_override": None,
    "retirement_age": 67,
    "planning_age": 93,
    "ss_claiming_age": 67,
}


class GlobalDefaults(BaseModel):
    """Application-wide defaults persisted to ~/.retiremodel/global_defaults.yaml.

    These values are used to seed the base_config and monte_carlo_config of newly
    created workspaces. Existing workspaces are never modified when these change.
    """

    # ── Economic Assumptions ─────────────────────────────────────────────────
    inflation_rate: float = Field(default=0.025, ge=0.0, le=0.2)
    salary_real_growth_rate: float = Field(default=0.015, ge=0.0, le=0.2)

    # ── IRS Annual Limits ────────────────────────────────────────────────────
    comp_limit: float = Field(default=360_000, gt=0)        # §401(a)(17) compensation cap
    deferral_limit: float = Field(default=24_500, gt=0)     # §402(g) base deferral limit
    additions_limit: float = Field(default=72_000, gt=0)    # §415(c) annual additions limit
    catchup_limit: float = Field(default=8_000, gt=0)       # §402(g) catch-up, age 50+
    super_catchup_limit: float = Field(default=11_250, gt=0)  # SECURE 2.0 super catch-up, 60–63
    ss_taxable_max: float = Field(default=184_500, gt=0)    # SS wage base

    # ── Target Replacement Ratio ─────────────────────────────────────────────
    target_replacement_ratio_mode: Literal["lookup_table", "flat_percentage"] = "lookup_table"
    target_replacement_ratio_override: float | None = Field(default=None, ge=0.0, le=1.0)

    # ── Simulation Configuration ─────────────────────────────────────────────
    retirement_age: int = Field(default=67, ge=55, le=70)
    planning_age: int = Field(default=93, ge=85, le=100)
    ss_claiming_age: int = Field(default=67, ge=62, le=70)

    @model_validator(mode="after")
    def validate_planning_gt_retirement(self) -> Self:
        if self.planning_age <= self.retirement_age:
            raise ValueError(
                f"planning_age ({self.planning_age}) must be greater than "
                f"retirement_age ({self.retirement_age})"
            )
        return self

    @model_validator(mode="after")
    def validate_flat_percentage_override(self) -> Self:
        if (
            self.target_replacement_ratio_mode == "flat_percentage"
            and self.target_replacement_ratio_override is None
        ):
            raise ValueError(
                "target_replacement_ratio_override is required when "
                "target_replacement_ratio_mode is 'flat_percentage'"
            )
        return self
