"""Social Security benefit estimate models."""

from uuid import UUID

from pydantic import BaseModel, Field


class SSBenefitEstimate(BaseModel):
    """Result of a Social Security benefit estimation for a single persona."""

    persona_id: UUID
    persona_name: str
    claiming_age: int = Field(ge=62, le=70)
    monthly_benefit_today: float = Field(ge=0)
    annual_benefit_today: float = Field(ge=0)
    pia_monthly: float = Field(ge=0)
    claiming_adjustment_factor: float
    aime: int = Field(ge=0)


class SSEstimateRequest(BaseModel):
    """Optional filter for the SS estimate endpoint."""

    persona_ids: list[UUID] | None = None


class SSEstimateResponse(BaseModel):
    """Top-level response for the standalone SS estimate endpoint."""

    workspace_id: UUID
    estimates: list[SSBenefitEstimate]
