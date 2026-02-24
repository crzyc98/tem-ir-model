"""Filesystem persistence for workspace data."""

import logging
import shutil
from pathlib import Path
from uuid import UUID

from api.models.workspace import Workspace
from api.services.exceptions import StorageError, WorkspaceNotFoundError

logger = logging.getLogger(__name__)


class WorkspaceStore:
    """Read/write workspace JSON files under a configurable base path."""

    def __init__(self, base_path: Path | None = None) -> None:
        self._base_path = base_path or (Path.home() / ".retiremodel")
        self._workspaces_dir = self._base_path / "workspaces"

    def _workspace_dir(self, workspace_id: UUID) -> Path:
        return self._workspaces_dir / str(workspace_id)

    def _workspace_file(self, workspace_id: UUID) -> Path:
        return self._workspace_dir(workspace_id) / "workspace.json"

    def ensure_directories(self) -> None:
        """Create the base workspaces directory if it doesn't exist."""
        self._workspaces_dir.mkdir(parents=True, exist_ok=True)

    def save(self, workspace: Workspace) -> None:
        """Persist a workspace to disk as JSON."""
        try:
            ws_dir = self._workspace_dir(workspace.id)
            ws_dir.mkdir(parents=True, exist_ok=True)
            ws_file = self._workspace_file(workspace.id)
            ws_file.write_text(workspace.model_dump_json(indent=2))
        except OSError as e:
            raise StorageError(f"Failed to save workspace {workspace.id}: {e}") from e

    def load(self, workspace_id: UUID) -> Workspace:
        """Load a workspace from disk by ID."""
        ws_file = self._workspace_file(workspace_id)
        if not ws_file.exists():
            raise WorkspaceNotFoundError(str(workspace_id))
        try:
            return Workspace.model_validate_json(ws_file.read_text())
        except OSError as e:
            raise StorageError(
                f"Failed to read workspace {workspace_id}: {e}"
            ) from e

    def list_all(self) -> list[Workspace]:
        """Load all workspaces from disk."""
        workspaces: list[Workspace] = []
        if not self._workspaces_dir.exists():
            return workspaces
        for ws_dir in sorted(self._workspaces_dir.iterdir()):
            ws_file = ws_dir / "workspace.json"
            if not ws_file.is_file():
                continue
            try:
                workspaces.append(Workspace.model_validate_json(ws_file.read_text()))
            except Exception:
                logger.warning("Skipping corrupted workspace in %s", ws_dir)
        return workspaces

    def delete(self, workspace_id: UUID) -> None:
        """Remove a workspace directory and all its contents."""
        ws_dir = self._workspace_dir(workspace_id)
        if not ws_dir.exists():
            raise WorkspaceNotFoundError(str(workspace_id))
        try:
            shutil.rmtree(ws_dir)
        except OSError as e:
            raise StorageError(
                f"Failed to delete workspace {workspace_id}: {e}"
            ) from e

    def exists(self, workspace_id: UUID) -> bool:
        """Check whether a workspace exists on disk."""
        return self._workspace_file(workspace_id).is_file()
