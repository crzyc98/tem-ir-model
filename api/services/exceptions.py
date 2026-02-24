"""Custom exceptions for the workspace service layer."""


class WorkspaceNotFoundError(Exception):
    """Raised when a workspace ID does not exist."""

    def __init__(self, workspace_id: str) -> None:
        self.workspace_id = workspace_id
        super().__init__(f"Workspace {workspace_id} not found")


class ScenarioNotFoundError(Exception):
    """Raised when a scenario ID does not exist within a workspace."""

    def __init__(self, scenario_id: str, workspace_id: str) -> None:
        self.scenario_id = scenario_id
        self.workspace_id = workspace_id
        super().__init__(
            f"Scenario {scenario_id} not found in workspace {workspace_id}"
        )


class StorageError(Exception):
    """Raised when a filesystem I/O operation fails."""
