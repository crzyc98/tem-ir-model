"""VestingSchedule discriminated union — Immediate, Cliff, or Graded vesting."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field


class ImmediateVesting(BaseModel):
    """Immediate vesting — no waiting period."""

    type: Literal["immediate"] = "immediate"


class CliffVesting(BaseModel):
    """Cliff vesting — fully vested after N years."""

    type: Literal["cliff"] = "cliff"
    years: int = Field(ge=1, le=6)


class GradedVesting(BaseModel):
    """Graded vesting — vested percentage increases over time."""

    type: Literal["graded"] = "graded"
    schedule: dict[int, float]


VestingSchedule = Annotated[
    ImmediateVesting | CliffVesting | GradedVesting,
    Field(discriminator="type"),
]
