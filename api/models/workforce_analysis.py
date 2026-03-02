"""Models for the workforce analysis (all-persona × multi-scenario) endpoint."""

from uuid import UUID

from pydantic import BaseModel, Field

from api.models.simulation_result import PersonaSimulationResult


class WorkforceAnalyzeRequest(BaseModel):
    """Request body for the workforce analysis endpoint."""

    scenario_ids: list[UUID] = Field(min_length=2, max_length=8)


class PersonaEmployerCost(BaseModel):
    """Employer cost figures for a single persona under a single scenario."""

    persona_id: UUID
    employer_cost_annual: float
    employer_cost_cumulative: float


class WorkforceAggregate(BaseModel):
    """Aggregate statistics for a scenario across all non-hidden personas."""

    pct_on_track: float
    median_ir: float | None
    avg_employer_cost_annual: float


class WorkforceScenarioResult(BaseModel):
    """Simulation results for all non-hidden personas under a single scenario."""

    scenario_id: UUID
    scenario_name: str
    persona_results: list[PersonaSimulationResult]
    employer_costs: list[PersonaEmployerCost]
    aggregate: WorkforceAggregate


class WorkforceAnalyzeResponse(BaseModel):
    """Top-level response returned by the analyze endpoint."""

    workspace_id: UUID
    scenario_ids: list[UUID]
    results: list[WorkforceScenarioResult]
    retirement_age: int
    planning_age: int
    num_simulations: int
    seed: int | None
