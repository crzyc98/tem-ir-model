"""Workspace model — top-level organizational container."""

from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from api.models.assumptions import Assumptions
from api.models.base import _utc_now
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.persona import Persona


class Workspace(BaseModel):
    """Top-level organizational container for retirement plan modeling."""

    id: UUID = Field(default_factory=uuid4)
    name: str
    client_name: str
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
    base_config: Assumptions = Field(default_factory=Assumptions)
    personas: list[Persona] = Field(default_factory=list, max_length=12)
    monte_carlo_config: MonteCarloConfig = Field(default_factory=MonteCarloConfig)
