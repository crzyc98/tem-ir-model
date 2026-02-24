"""MatchTier model — a single tier in an employer match formula."""

from pydantic import BaseModel, Field


class MatchTier(BaseModel):
    """A single tier in an employer match formula."""

    match_rate: float = Field(ge=0.0, le=1.0)
    on_first_pct: float = Field(ge=0.0, le=1.0)
