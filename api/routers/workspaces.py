"""Workspace REST API endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, field_validator

from api.models.assumptions_override import AssumptionsOverride
from api.models.persona import Persona
from api.models.workspace import Workspace
from api.services.exceptions import WorkspaceNotFoundError
from api.services.workspace_service import WorkspaceService
from api.storage.workspace_store import WorkspaceStore

router = APIRouter()


# --- Request / Response Schemas ---


class WorkspaceCreate(BaseModel):
    """Request body for creating a workspace."""

    client_name: str
    name: str | None = None

    @field_validator("client_name")
    @classmethod
    def client_name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("client_name must not be empty")
        return v


class WorkspaceSummary(BaseModel):
    """Summary view of a workspace for list responses."""

    id: UUID
    name: str
    client_name: str
    created_at: datetime
    updated_at: datetime


class WorkspaceUpdate(BaseModel):
    """Request body for partial workspace updates."""

    name: str | None = None
    client_name: str | None = None
    base_config: AssumptionsOverride | None = None
    personas: list[Persona] | None = None

    @field_validator("client_name")
    @classmethod
    def client_name_not_empty_when_set(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("client_name must not be empty")
        return v


# --- Dependency helpers ---


def _get_service(request: Request) -> WorkspaceService:
    store: WorkspaceStore = request.app.state.workspace_store
    return WorkspaceService(store)


# --- Endpoints ---


@router.post("", status_code=201, response_model=Workspace)
async def create_workspace(body: WorkspaceCreate, request: Request) -> Workspace:
    """Create a new workspace with default assumptions and personas."""
    service = _get_service(request)
    return service.create_workspace(client_name=body.client_name, name=body.name)


@router.get("", response_model=list[WorkspaceSummary])
async def list_workspaces(request: Request) -> list[WorkspaceSummary]:
    """List all workspaces (summary view)."""
    service = _get_service(request)
    workspaces = service.list_workspaces()
    return [
        WorkspaceSummary(
            id=ws.id,
            name=ws.name,
            client_name=ws.client_name,
            created_at=ws.created_at,
            updated_at=ws.updated_at,
        )
        for ws in workspaces
    ]


@router.get("/{workspace_id}", response_model=Workspace)
async def get_workspace(workspace_id: UUID, request: Request) -> Workspace:
    """Retrieve a workspace by ID."""
    service = _get_service(request)
    try:
        return service.get_workspace(workspace_id)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )


@router.patch("/{workspace_id}", response_model=Workspace)
async def update_workspace(
    workspace_id: UUID, body: WorkspaceUpdate, request: Request
) -> Workspace:
    """Partially update a workspace."""
    service = _get_service(request)
    try:
        return service.update_workspace(workspace_id, body)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )


@router.post("/{workspace_id}/personas/reset", response_model=Workspace)
async def reset_personas(workspace_id: UUID, request: Request) -> Workspace:
    """Reset workspace personas to defaults."""
    service = _get_service(request)
    try:
        return service.reset_personas(workspace_id)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )


@router.delete("/{workspace_id}", status_code=204)
async def delete_workspace(workspace_id: UUID, request: Request) -> Response:
    """Delete a workspace and all its contents."""
    service = _get_service(request)
    try:
        service.delete_workspace(workspace_id)
        return Response(status_code=204)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
