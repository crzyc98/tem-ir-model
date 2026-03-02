"""Comparison models for plan design comparison."""

from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from api.models.base import _utc_now
from api.models.simulation_result import PersonaSimulationResult


class ScenarioComparisonResult(BaseModel):
    """Simulation results for a single scenario in a comparison."""

    scenario_id: UUID
    scenario_name: str
    persona_result: PersonaSimulationResult
    employer_cost_annual: float
    employer_cost_cumulative: float
    deferral_rate_for_80pct_ir: float | None


class PlanComparison(BaseModel):
    """A persisted plan comparison across multiple scenarios for a single persona."""

    id: UUID = Field(default_factory=uuid4)
    workspace_id: UUID
    persona_id: UUID
    persona_name: str
    scenario_ids: list[UUID] = Field(min_length=2, max_length=8)
    results: list[ScenarioComparisonResult]
    num_simulations: int
    seed: int | None
    retirement_age: int
    planning_age: int
    created_at: datetime = Field(default_factory=_utc_now)
