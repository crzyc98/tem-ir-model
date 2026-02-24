"""Filesystem persistence for scenario data."""

import logging
from pathlib import Path
from uuid import UUID

from api.models.scenario import Scenario
from api.services.exceptions import ScenarioNotFoundError, StorageError

logger = logging.getLogger(__name__)


class ScenarioStore:
    """Read/write scenario JSON files under workspace directories."""

    def __init__(self, base_path: Path) -> None:
        self._base_path = base_path
        self._workspaces_dir = base_path / "workspaces"

    def _scenarios_dir(self, workspace_id: UUID) -> Path:
        return self._workspaces_dir / str(workspace_id) / "scenarios"

    def _scenario_file(self, workspace_id: UUID, scenario_id: UUID) -> Path:
        return self._scenarios_dir(workspace_id) / f"{scenario_id}.json"

    def save(self, scenario: Scenario) -> None:
        """Persist a scenario to disk as JSON."""
        try:
            scenarios_dir = self._scenarios_dir(scenario.workspace_id)
            scenarios_dir.mkdir(parents=True, exist_ok=True)
            sc_file = self._scenario_file(scenario.workspace_id, scenario.id)
            sc_file.write_text(scenario.model_dump_json(indent=2))
        except OSError as e:
            raise StorageError(
                f"Failed to save scenario {scenario.id}: {e}"
            ) from e

    def load(self, workspace_id: UUID, scenario_id: UUID) -> Scenario:
        """Load a scenario from disk by ID."""
        sc_file = self._scenario_file(workspace_id, scenario_id)
        if not sc_file.exists():
            raise ScenarioNotFoundError(str(scenario_id), str(workspace_id))
        try:
            return Scenario.model_validate_json(sc_file.read_text())
        except OSError as e:
            raise StorageError(
                f"Failed to read scenario {scenario_id}: {e}"
            ) from e

    def list_all(self, workspace_id: UUID) -> list[Scenario]:
        """Load all scenarios from a workspace's scenarios directory."""
        scenarios: list[Scenario] = []
        scenarios_dir = self._scenarios_dir(workspace_id)
        if not scenarios_dir.exists():
            return scenarios
        for sc_file in sorted(scenarios_dir.iterdir()):
            if not sc_file.is_file() or sc_file.suffix != ".json":
                continue
            try:
                scenarios.append(Scenario.model_validate_json(sc_file.read_text()))
            except Exception:
                logger.warning("Skipping corrupted scenario in %s", sc_file)
        return scenarios

    def delete(self, workspace_id: UUID, scenario_id: UUID) -> None:
        """Remove a scenario file from disk."""
        sc_file = self._scenario_file(workspace_id, scenario_id)
        if not sc_file.exists():
            raise ScenarioNotFoundError(str(scenario_id), str(workspace_id))
        try:
            sc_file.unlink()
        except OSError as e:
            raise StorageError(
                f"Failed to delete scenario {scenario_id}: {e}"
            ) from e

    def exists(self, workspace_id: UUID, scenario_id: UUID) -> bool:
        """Check whether a scenario exists on disk."""
        return self._scenario_file(workspace_id, scenario_id).is_file()

    def list_names(self, workspace_id: UUID) -> list[str]:
        """Return just the names of all scenarios in a workspace."""
        return [s.name for s in self.list_all(workspace_id)]
