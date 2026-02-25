"""MonteCarloConfig model — simulation engine configuration."""

from typing import Self

from pydantic import BaseModel, Field, model_validator


class MonteCarloConfig(BaseModel):
    """Configuration for the Monte Carlo simulation engine."""

    seed: int | None = None
    retirement_age: int = Field(default=67, ge=55, le=70)
    planning_age: int = Field(default=93, ge=85, le=100)

    @model_validator(mode="after")
    def validate_age_ordering(self) -> Self:
        if self.planning_age <= self.retirement_age:
            raise ValueError(
                f"planning_age ({self.planning_age}) must be greater than retirement_age ({self.retirement_age})"
            )
        return self
