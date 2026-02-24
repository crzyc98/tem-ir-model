"""AssetAllocation discriminated union — TargetDate or Custom allocation."""

from datetime import UTC, datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, Field, model_validator


class TargetDateAllocation(BaseModel):
    """Target-date fund allocation by vintage year."""

    type: Literal["target_date"] = "target_date"
    target_date_vintage: int

    @model_validator(mode="after")
    def validate_vintage(self) -> Self:
        current_year = datetime.now(UTC).year
        if self.target_date_vintage < current_year:
            raise ValueError(
                f"target_date_vintage ({self.target_date_vintage}) must be >= current year ({current_year})"
            )
        return self


class CustomAllocation(BaseModel):
    """Custom allocation split across stock, bond, and cash."""

    type: Literal["custom"] = "custom"
    stock_pct: float = Field(ge=0.0, le=1.0)
    bond_pct: float = Field(ge=0.0, le=1.0)
    cash_pct: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_sum(self) -> Self:
        total = self.stock_pct + self.bond_pct + self.cash_pct
        if abs(total - 1.0) > 0.01:
            raise ValueError(
                f"stock_pct + bond_pct + cash_pct must sum to 1.0 (±0.01), got {total}"
            )
        return self


AssetAllocation = Annotated[
    TargetDateAllocation | CustomAllocation,
    Field(discriminator="type"),
]
