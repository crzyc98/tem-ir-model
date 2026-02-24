"""Business logic for workspace CRUD operations."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from api.models.base import _utc_now
from api.models.defaults import default_personas
from api.models.workspace import Workspace
from api.services.config_resolver import resolve_config
from api.storage.workspace_store import WorkspaceStore

if TYPE_CHECKING:
    from api.routers.workspaces import WorkspaceUpdate


class WorkspaceService:
    """Orchestrates workspace creation, retrieval, updates, and deletion."""

    def __init__(self, store: WorkspaceStore) -> None:
        self._store = store

    def create_workspace(self, client_name: str, name: str | None = None) -> Workspace:
        """Create a new workspace with default personas and assumptions."""
        now = _utc_now()
        workspace = Workspace(
            name=name or client_name,
            client_name=client_name,
            personas=default_personas(),
            created_at=now,
            updated_at=now,
        )
        self._store.save(workspace)
        return workspace

    def get_workspace(self, workspace_id: UUID) -> Workspace:
        """Load a workspace by ID. Raises WorkspaceNotFoundError if missing."""
        return self._store.load(workspace_id)

    def list_workspaces(self) -> list[Workspace]:
        """Return all workspaces (corrupted files are skipped with a warning)."""
        return self._store.list_all()

    def update_workspace(
        self, workspace_id: UUID, update: WorkspaceUpdate
    ) -> Workspace:
        """Apply a partial update to a workspace.

        Raises WorkspaceNotFoundError if the workspace does not exist.
        """
        workspace = self._store.load(workspace_id)

        # Apply top-level scalar fields that were explicitly sent
        updates = update.model_dump(exclude_unset=True)
        if "name" in updates:
            workspace = workspace.model_copy(update={"name": updates["name"]})
        if "client_name" in updates:
            workspace = workspace.model_copy(
                update={"client_name": updates["client_name"]}
            )

        # Deep-merge base_config if provided
        if update.base_config is not None:
            merged = resolve_config(workspace.base_config, update.base_config)
            workspace = workspace.model_copy(update={"base_config": merged})

        # Refresh updated_at
        workspace = workspace.model_copy(update={"updated_at": _utc_now()})
        self._store.save(workspace)
        return workspace

    def delete_workspace(self, workspace_id: UUID) -> None:
        """Delete a workspace by ID.

        Raises WorkspaceNotFoundError if the workspace does not exist.
        """
        self._store.delete(workspace_id)
