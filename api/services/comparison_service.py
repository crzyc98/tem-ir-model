"""Business logic for running and persisting plan comparisons."""

from __future__ import annotations

from uuid import UUID

from api.models.comparison import PlanComparison, ScenarioComparisonResult
from api.models.monte_carlo_config import MonteCarloConfig
from api.models.persona import Persona
from api.models.scenario import Scenario
from api.services.config_resolver import resolve_config
from api.services.exceptions import WorkspaceNotFoundError
from api.services.scenario_matrix_loader import NUM_SCENARIOS
from api.services.simulation_engine import SimulationEngine
from api.storage.comparison_store import ComparisonStore
from api.storage.scenario_store import ScenarioStore
from api.storage.workspace_store import WorkspaceStore


class ComparisonService:
    """Orchestrates running and persisting plan comparisons."""

    def __init__(
        self,
        workspace_store: WorkspaceStore,
        scenario_store: ScenarioStore,
        comparison_store: ComparisonStore,
    ) -> None:
        self._workspace_store = workspace_store
        self._scenario_store = scenario_store
        self._comparison_store = comparison_store

    def run_comparison(
        self,
        workspace_id: UUID,
        scenario_ids: list[UUID],
        persona_id: UUID,
    ) -> PlanComparison:
        """Run a comparison across multiple scenarios for a single persona."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        workspace = self._workspace_store.load(workspace_id)
        mc = workspace.monte_carlo_config

        # Find the persona by ID
        persona = next(
            (p for p in workspace.personas if p.id == persona_id), None
        )
        if persona is None:
            raise ValueError(f"Persona {persona_id} not found in workspace {workspace_id}")

        results: list[ScenarioComparisonResult] = []
        for scenario_id in scenario_ids:
            scenario = self._scenario_store.load(workspace_id, scenario_id)
            effective = resolve_config(workspace.base_config, scenario.overrides)

            engine = SimulationEngine(
                assumptions=effective,
                plan_design=scenario.plan_design,
                config=mc,
            )
            persona_result = engine.run([persona])[0]

            years_to_retirement = max(mc.retirement_age - persona.age, 1)
            employer_cost_annual = (
                persona_result.total_employer_contributions / years_to_retirement
            )
            employer_cost_cumulative = persona_result.total_employer_contributions

            deferral_rate = _bisect_deferral_for_80pct_ir(
                persona, scenario, effective, mc
            )

            results.append(
                ScenarioComparisonResult(
                    scenario_id=scenario.id,
                    scenario_name=scenario.name,
                    persona_result=persona_result,
                    employer_cost_annual=round(employer_cost_annual, 2),
                    employer_cost_cumulative=round(employer_cost_cumulative, 2),
                    deferral_rate_for_80pct_ir=deferral_rate,
                )
            )

        comparison = PlanComparison(
            workspace_id=workspace_id,
            persona_id=persona_id,
            persona_name=persona.name,
            scenario_ids=scenario_ids,
            results=results,
            num_simulations=NUM_SCENARIOS,
            seed=mc.seed,
            retirement_age=mc.retirement_age,
            planning_age=mc.planning_age,
        )
        self._comparison_store.save(comparison)
        return comparison

    def list_comparisons(self, workspace_id: UUID) -> list[PlanComparison]:
        """List all comparisons in a workspace, sorted by created_at descending."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        comparisons = self._comparison_store.list_all(workspace_id)
        comparisons.sort(key=lambda c: c.created_at, reverse=True)
        return comparisons

    def get_comparison(
        self, workspace_id: UUID, comparison_id: UUID
    ) -> PlanComparison:
        """Load a single comparison."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        return self._comparison_store.load(workspace_id, comparison_id)

    def delete_comparison(
        self, workspace_id: UUID, comparison_id: UUID
    ) -> None:
        """Delete a comparison from a workspace."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        self._comparison_store.delete(workspace_id, comparison_id)


def _bisect_deferral_for_80pct_ir(
    persona: Persona,
    scenario: Scenario,
    effective,
    config: MonteCarloConfig,
) -> float | None:
    """Find the minimum deferral rate (0–20%) that achieves p50 IR >= 80%.

    Returns None if 20% deferral still falls below 80% income replacement.
    """
    def _get_p50_ir(deferral_rate: float) -> float:
        cloned = persona.model_copy(update={"deferral_rate": deferral_rate})
        engine = SimulationEngine(
            assumptions=effective,
            plan_design=scenario.plan_design,
            config=config,
        )
        result = engine.run([cloned])[0]
        if result.income_replacement_ratio is None:
            return 0.0
        return result.income_replacement_ratio.p50

    # Quick check at max rate
    if _get_p50_ir(0.20) < 0.80:
        return None

    # Bisect over [0.0, 0.20] for 12 iterations
    lo, hi = 0.0, 0.20
    for _ in range(12):
        mid = (lo + hi) / 2.0
        if _get_p50_ir(mid) >= 0.80:
            hi = mid
        else:
            lo = mid

    return round(hi, 4)
