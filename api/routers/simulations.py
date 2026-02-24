"""Simulation REST API endpoint."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from api.models.base import _utc_now
from api.models.simulation_result import SimulationResponse
from api.services.config_resolver import resolve_config
from api.services.exceptions import ScenarioNotFoundError, WorkspaceNotFoundError
from api.services.simulation_engine import SimulationEngine
from api.storage.scenario_store import ScenarioStore

router = APIRouter()


# --- Request Schema ---


class SimulationRequest(BaseModel):
    """Optional overrides for a simulation run."""

    num_simulations: int | None = Field(default=None, ge=1, le=10000)
    seed: int | None = None


# --- Endpoint ---


@router.post("/simulate", response_model=SimulationResponse)
async def run_simulation(
    workspace_id: UUID,
    scenario_id: UUID,
    request: Request,
    body: SimulationRequest | None = None,
) -> SimulationResponse:
    """Run a Monte Carlo simulation for a scenario."""
    workspace_store = request.app.state.workspace_store
    scenario_store = ScenarioStore(workspace_store._base_path)

    try:
        workspace = workspace_store.load(workspace_id)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )

    try:
        scenario = scenario_store.load(workspace_id, scenario_id)
    except ScenarioNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario {scenario_id} not found in workspace {workspace_id}",
        )

    # Resolve effective assumptions (FR-019)
    effective = resolve_config(workspace.base_config, scenario.overrides)

    # Merge request overrides onto workspace MonteCarloConfig defaults
    mc = workspace.monte_carlo_config
    if body is not None:
        num_simulations = body.num_simulations if body.num_simulations is not None else mc.num_simulations
        seed = body.seed if body.seed is not None else mc.seed
    else:
        num_simulations = mc.num_simulations
        seed = mc.seed

    config = mc.model_copy(
        update={"num_simulations": num_simulations, "seed": seed}
    )

    # Run simulation
    engine = SimulationEngine(
        assumptions=effective,
        plan_design=scenario.plan_design,
        config=config,
    )
    persona_results = engine.run(workspace.personas)

    # Update last_run_at (FR-021)
    updated_scenario = scenario.model_copy(update={"last_run_at": _utc_now()})
    scenario_store.save(updated_scenario)

    return SimulationResponse(
        scenario_id=scenario.id,
        num_simulations=config.num_simulations,
        seed=config.seed,
        retirement_age=config.retirement_age,
        planning_age=config.planning_age,
        personas=persona_results,
    )
