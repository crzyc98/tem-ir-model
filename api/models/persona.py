"""Persona model — a hypothetical employee profile for simulation."""

from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from api.models.asset_allocation import AssetAllocation


class Persona(BaseModel):
    """A hypothetical employee profile for simulation."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    label: str
    age: int = Field(ge=18, le=80)
    tenure_years: int = Field(ge=0, le=60)
    salary: float = Field(ge=0)
    deferral_rate: float = Field(ge=0.0, le=1.0)
    current_balance: float = Field(ge=0)
    allocation: AssetAllocation
    include_social_security: bool = True
    ss_claiming_age: int = Field(default=67, ge=62, le=70)
    hidden: bool = False
