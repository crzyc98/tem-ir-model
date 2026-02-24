"""Custom exceptions for the workspace service layer."""


class WorkspaceNotFoundError(Exception):
    """Raised when a workspace ID does not exist."""

    def __init__(self, workspace_id: str) -> None:
        self.workspace_id = workspace_id
        super().__init__(f"Workspace {workspace_id} not found")


class StorageError(Exception):
    """Raised when a filesystem I/O operation fails."""
