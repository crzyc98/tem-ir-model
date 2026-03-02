"""Business logic for running workforce analysis (all personas × multiple scenarios)."""

from __future__ import annotations

from uuid import UUID

import numpy as np

from api.models.workforce_analysis import (
    PersonaEmployerCost,
    WorkforceAggregate,
    WorkforceAnalyzeRequest,
    WorkforceAnalyzeResponse,
    WorkforceScenarioResult,
)
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.persona import Persona
from api.services.config_resolver import resolve_config
from api.services.exceptions import WorkspaceNotFoundError
from api.services.scenario_matrix_loader import NUM_SCENARIOS
from api.services.simulation_engine import SimulationEngine
from api.storage.scenario_store import ScenarioStore
from api.storage.workspace_store import WorkspaceStore


class WorkforceAnalysisService:
    """Orchestrates running workforce analysis across all non-hidden personas."""

    def __init__(
        self,
        workspace_store: WorkspaceStore,
        scenario_store: ScenarioStore,
    ) -> None:
        self._workspace_store = workspace_store
        self._scenario_store = scenario_store

    def run_analysis(
        self,
        workspace_id: UUID,
        request: WorkforceAnalyzeRequest,
    ) -> WorkforceAnalyzeResponse:
        """Run simulations for all non-hidden personas across each selected scenario."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        workspace = self._workspace_store.load(workspace_id)
        mc = workspace.monte_carlo_config

        visible_personas = [p for p in workspace.personas if not p.hidden]
        if not visible_personas:
            raise ValueError("No visible personas in workspace")

        results: list[WorkforceScenarioResult] = []
        for scenario_id in request.scenario_ids:
            scenario = self._scenario_store.load(workspace_id, scenario_id)
            effective = resolve_config(workspace.base_config, scenario.overrides)

            engine = SimulationEngine(
                assumptions=effective,
                plan_design=scenario.plan_design,
                config=mc,
            )
            persona_results = engine.run(visible_personas)

            employer_costs = [
                _compute_employer_cost(p, persona_results[i], mc)
                for i, p in enumerate(visible_personas)
            ]

            aggregate = _compute_aggregate(persona_results, employer_costs)

            results.append(
                WorkforceScenarioResult(
                    scenario_id=scenario.id,
                    scenario_name=scenario.name,
                    persona_results=persona_results,
                    employer_costs=employer_costs,
                    aggregate=aggregate,
                )
            )

        return WorkforceAnalyzeResponse(
            workspace_id=workspace_id,
            scenario_ids=request.scenario_ids,
            results=results,
            retirement_age=mc.retirement_age,
            planning_age=mc.planning_age,
            num_simulations=NUM_SCENARIOS,
            seed=mc.seed,
        )


def _compute_employer_cost(
    persona: Persona,
    persona_result,
    mc: MonteCarloConfig,
) -> PersonaEmployerCost:
    """Compute annualised and cumulative employer cost for a single persona result."""
    years_to_retirement = max(mc.retirement_age - persona.age, 1)
    employer_cost_annual = persona_result.total_employer_contributions / years_to_retirement
    employer_cost_cumulative = persona_result.total_employer_contributions
    return PersonaEmployerCost(
        persona_id=persona.id,
        employer_cost_annual=round(employer_cost_annual, 2),
        employer_cost_cumulative=round(employer_cost_cumulative, 2),
    )


def _compute_aggregate(
    persona_results,
    employer_costs: list[PersonaEmployerCost],
) -> WorkforceAggregate:
    """Compute aggregate workforce statistics for a single scenario."""
    if not persona_results:
        return WorkforceAggregate(pct_on_track=0.0, median_ir=None, avg_employer_cost_annual=0.0)

    on_track_count = sum(1 for r in persona_results if r.pos_assessment == "On Track")
    pct_on_track = on_track_count / len(persona_results)

    irs = [
        r.income_replacement_ratio.p50
        for r in persona_results
        if r.income_replacement_ratio is not None
    ]
    median_ir = float(np.median(irs)) if irs else None

    avg_employer_cost_annual = (
        sum(c.employer_cost_annual for c in employer_costs) / len(employer_costs)
        if employer_costs
        else 0.0
    )

    return WorkforceAggregate(
        pct_on_track=pct_on_track,
        median_ir=median_ir,
        avg_employer_cost_annual=round(avg_employer_cost_annual, 2),
    )
