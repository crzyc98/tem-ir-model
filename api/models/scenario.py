"""Scenario model — a specific plan design configuration within a workspace."""

from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from api.models.assumptions_override import AssumptionsOverride
from api.models.base import _utc_now
from api.models.plan_design import PlanDesign


class Scenario(BaseModel):
    """A specific plan design configuration within a workspace."""

    id: UUID = Field(default_factory=uuid4)
    workspace_id: UUID
    name: str
    description: str | None = None
    plan_design: PlanDesign
    overrides: AssumptionsOverride | None = None
    created_at: datetime = Field(default_factory=_utc_now)
    updated_at: datetime = Field(default_factory=_utc_now)
    last_run_at: datetime | None = None
