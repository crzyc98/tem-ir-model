"""Business logic for scenario CRUD operations."""

from __future__ import annotations

import re
from uuid import UUID

from api.models.assumptions import Assumptions
from api.models.base import _utc_now
from api.models.irs_warning import IrsLimitWarning
from api.models.scenario import Scenario
from api.services.config_resolver import resolve_config
from api.services.exceptions import WorkspaceNotFoundError
from api.services.irs_validator import validate_irs_limits
from api.storage.scenario_store import ScenarioStore
from api.storage.workspace_store import WorkspaceStore

from api.models.plan_design import PlanDesign
from api.models.assumptions_override import AssumptionsOverride


class ScenarioService:
    """Orchestrates scenario creation, retrieval, updates, and deletion."""

    def __init__(
        self,
        workspace_store: WorkspaceStore,
        scenario_store: ScenarioStore,
    ) -> None:
        self._workspace_store = workspace_store
        self._scenario_store = scenario_store

    def create_scenario(
        self,
        workspace_id: UUID,
        name: str,
        plan_design: PlanDesign,
        description: str | None = None,
        overrides: AssumptionsOverride | None = None,
    ) -> tuple[Scenario, list[IrsLimitWarning]]:
        """Create a new scenario in a workspace.

        Returns the saved scenario and any IRS limit warnings.
        """
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        now = _utc_now()
        scenario = Scenario(
            workspace_id=workspace_id,
            name=name,
            description=description,
            plan_design=plan_design,
            overrides=overrides,
            created_at=now,
            updated_at=now,
        )
        self._scenario_store.save(scenario)

        workspace = self._workspace_store.load(workspace_id)
        effective = resolve_config(workspace.base_config, overrides)
        warnings = validate_irs_limits(
            plan_design,
            workspace.personas,
            effective,
            workspace.monte_carlo_config.retirement_age,
        )
        return scenario, warnings

    def get_scenario(
        self, workspace_id: UUID, scenario_id: UUID
    ) -> tuple[Scenario, Assumptions, list[IrsLimitWarning]]:
        """Load a scenario with its resolved assumptions and IRS warnings."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        scenario = self._scenario_store.load(workspace_id, scenario_id)
        workspace = self._workspace_store.load(workspace_id)
        effective = resolve_config(workspace.base_config, scenario.overrides)
        warnings = validate_irs_limits(
            scenario.plan_design,
            workspace.personas,
            effective,
            workspace.monte_carlo_config.retirement_age,
        )
        return scenario, effective, warnings

    def list_scenarios(self, workspace_id: UUID) -> list[Scenario]:
        """List all scenarios in a workspace, sorted by updated_at descending."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        scenarios = self._scenario_store.list_all(workspace_id)
        scenarios.sort(key=lambda s: s.updated_at, reverse=True)
        return scenarios

    def update_scenario(
        self, workspace_id: UUID, scenario_id: UUID, updates: dict
    ) -> tuple[Scenario, Assumptions, list[IrsLimitWarning]]:
        """Apply a partial update to a scenario.

        Returns the updated scenario, resolved assumptions, and IRS warnings.
        """
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        scenario = self._scenario_store.load(workspace_id, scenario_id)

        # Convert raw dicts to Pydantic models for nested fields
        if "plan_design" in updates and isinstance(updates["plan_design"], dict):
            updates["plan_design"] = PlanDesign(**updates["plan_design"])
        if "overrides" in updates and isinstance(updates["overrides"], dict):
            updates["overrides"] = AssumptionsOverride(**updates["overrides"])

        scenario = scenario.model_copy(update=updates)
        scenario = scenario.model_copy(update={"updated_at": _utc_now()})
        self._scenario_store.save(scenario)

        workspace = self._workspace_store.load(workspace_id)
        effective = resolve_config(workspace.base_config, scenario.overrides)
        warnings = validate_irs_limits(
            scenario.plan_design,
            workspace.personas,
            effective,
            workspace.monte_carlo_config.retirement_age,
        )
        return scenario, effective, warnings

    def duplicate_scenario(
        self, workspace_id: UUID, scenario_id: UUID
    ) -> tuple[Scenario, Assumptions, list[IrsLimitWarning]]:
        """Duplicate a scenario with a derived name."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        source = self._scenario_store.load(workspace_id, scenario_id)
        derived_name = _derive_copy_name(
            source.name,
            self._scenario_store.list_names(workspace_id),
        )

        now = _utc_now()
        new_scenario = source.model_copy(deep=True)
        new_scenario = new_scenario.model_copy(
            update={
                "id": Scenario.model_fields["id"].default_factory(),
                "name": derived_name,
                "created_at": now,
                "updated_at": now,
                "last_run_at": None,
            }
        )
        self._scenario_store.save(new_scenario)

        workspace = self._workspace_store.load(workspace_id)
        effective = resolve_config(workspace.base_config, new_scenario.overrides)
        warnings = validate_irs_limits(
            new_scenario.plan_design,
            workspace.personas,
            effective,
            workspace.monte_carlo_config.retirement_age,
        )
        return new_scenario, effective, warnings

    def delete_scenario(self, workspace_id: UUID, scenario_id: UUID) -> None:
        """Delete a scenario from a workspace."""
        if not self._workspace_store.exists(workspace_id):
            raise WorkspaceNotFoundError(str(workspace_id))

        self._scenario_store.delete(workspace_id, scenario_id)


def _derive_copy_name(original_name: str, existing_names: list[str]) -> str:
    """Generate a unique copy name: 'X (Copy)', 'X (Copy 2)', etc."""
    candidate = f"{original_name} (Copy)"
    if candidate not in existing_names:
        return candidate

    # Find the highest existing copy number
    pattern = re.compile(re.escape(original_name) + r" \(Copy(?: (\d+))?\)$")
    max_n = 1
    for name in existing_names:
        m = pattern.match(name)
        if m:
            n = int(m.group(1)) if m.group(1) else 1
            max_n = max(max_n, n)

    return f"{original_name} (Copy {max_n + 1})"
