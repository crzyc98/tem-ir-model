"""CoreContributionTier model — age/service-based core contribution tier."""

from typing import Self

from pydantic import BaseModel, Field, model_validator


class CoreContributionTier(BaseModel):
    """A single tier in an age/service-based core contribution schedule."""

    min_age: int | None = Field(default=None, ge=0)
    max_age: int | None = Field(default=None, ge=0)
    min_service: int | None = Field(default=None, ge=0)
    max_service: int | None = Field(default=None, ge=0)
    contribution_pct: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_bounds(self) -> Self:
        has_age = self.min_age is not None or self.max_age is not None
        has_service = self.min_service is not None or self.max_service is not None
        if not has_age and not has_service:
            raise ValueError(
                "At least one dimension (age or service) must have non-null bounds"
            )
        if (
            self.min_age is not None
            and self.max_age is not None
            and self.min_age >= self.max_age
        ):
            raise ValueError(
                f"min_age ({self.min_age}) must be less than max_age ({self.max_age})"
            )
        if (
            self.min_service is not None
            and self.max_service is not None
            and self.min_service >= self.max_service
        ):
            raise ValueError(
                f"min_service ({self.min_service}) must be less than max_service ({self.max_service})"
            )
        return self
