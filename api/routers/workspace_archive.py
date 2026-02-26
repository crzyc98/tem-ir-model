"""Workspace archive export and import endpoints."""

from __future__ import annotations

import io
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from api.services.exceptions import WorkspaceNotFoundError
from api.services.export_import_service import (
    ArchiveValidationError,
    build_workspace_archive,
    create_workspace_from_archive,
    parse_and_validate_archive,
    replace_workspace_from_archive,
    sanitize_filename,
)
from api.storage.scenario_store import ScenarioStore

router = APIRouter(tags=["workspaces"])


# ── Response schemas ──────────────────────────────────────────────────────────


class ImportResult(BaseModel):
    workspace_id: str
    workspace_name: str
    client_name: str
    scenario_count: int
    action: Literal["created", "replaced"]


# ── Helpers ───────────────────────────────────────────────────────────────────


def _scenario_store(request: Request) -> ScenarioStore:
    return ScenarioStore(request.app.state.workspace_store._base_path)


def _find_conflict(workspace_name: str, request: Request) -> str | None:
    """Return existing workspace ID (str) if a workspace with the same name exists."""
    existing = request.app.state.workspace_store.list_all()
    for ws in existing:
        if ws.name.strip().lower() == workspace_name.strip().lower():
            return str(ws.id)
    return None


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("/workspaces/{workspace_id}/export")
async def export_workspace(workspace_id: UUID, request: Request) -> StreamingResponse:
    """Download a workspace as a portable ZIP archive.

    The archive contains manifest.json, workspace.json, and one JSON file
    per scenario.  Simulation results are not included.
    """
    workspace_store = request.app.state.workspace_store
    scenario_store = _scenario_store(request)

    try:
        zip_bytes = build_workspace_archive(workspace_id, workspace_store, scenario_store)
    except WorkspaceNotFoundError:
        raise HTTPException(status_code=404, detail=f"Workspace {workspace_id} not found")

    workspace = workspace_store.load(workspace_id)
    filename = f"{sanitize_filename(workspace.client_name)}_export.zip"

    return StreamingResponse(
        io.BytesIO(zip_bytes),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/workspaces/import", status_code=201, response_model=None)
async def import_workspace(
    request: Request,
    file: UploadFile,
    on_conflict: Annotated[
        Literal["rename", "replace", "skip"] | None,
        Query(description="Conflict resolution action when a workspace with the same name exists"),
    ] = None,
    new_name: Annotated[
        str | None,
        Query(description="New workspace name; required when on_conflict=rename"),
    ] = None,
) -> ImportResult | JSONResponse:
    """Import a workspace from a ZIP archive.

    **First upload** (no ``on_conflict`` param):
    - Returns **201** with the new workspace on success.
    - Returns **409** with conflict details if a workspace with the same name exists.
    - Returns **422** if the archive is invalid or corrupted.

    **Re-submit with conflict resolution** (``on_conflict`` query param):
    - ``rename``: Creates workspace under ``new_name`` (must be provided and unique).
    - ``replace``: Overwrites the existing workspace.
    - ``skip``: Returns 200 with ``{action: "skipped"}``; no workspace is created.
    """
    workspace_store = request.app.state.workspace_store
    scenario_store = _scenario_store(request)

    # 1. Read and validate the archive
    zip_bytes = await file.read()
    try:
        archive = parse_and_validate_archive(zip_bytes)
    except ArchiveValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail={"detail": exc.detail, "error_type": exc.error_type},
        )

    archive_workspace_name = archive.workspace.name
    archive_client_name = archive.workspace.client_name

    # 2. Detect naming conflict
    existing_id = _find_conflict(archive_workspace_name, request)

    if existing_id and on_conflict is None:
        raise HTTPException(
            status_code=409,
            detail={
                "detail": f"A workspace named '{archive_workspace_name}' already exists.",
                "conflict_type": "name_conflict",
                "archive_workspace_name": archive_workspace_name,
                "archive_client_name": archive_client_name,
                "existing_workspace_id": existing_id,
            },
        )

    # 3. Handle conflict resolution
    if existing_id and on_conflict == "skip":
        return JSONResponse(
            status_code=200,
            content={"action": "skipped", "reason": "User chose to skip due to naming conflict"},
        )

    if existing_id and on_conflict == "replace":
        new_ws = replace_workspace_from_archive(
            archive, UUID(existing_id), workspace_store, scenario_store
        )
        return ImportResult(
            workspace_id=str(new_ws.id),
            workspace_name=new_ws.name,
            client_name=new_ws.client_name,
            scenario_count=len(archive.scenarios),
            action="replaced",
        )

    if existing_id and on_conflict == "rename":
        if not new_name or not new_name.strip():
            raise HTTPException(
                status_code=422,
                detail={
                    "detail": "new_name is required when on_conflict=rename.",
                    "error_type": "missing_new_name",
                },
            )
        # Check if the rename target also conflicts
        rename_conflict_id = _find_conflict(new_name.strip(), request)
        if rename_conflict_id:
            raise HTTPException(
                status_code=409,
                detail={
                    "detail": f"A workspace named '{new_name.strip()}' already exists.",
                    "conflict_type": "name_conflict",
                    "archive_workspace_name": new_name.strip(),
                    "archive_client_name": archive_client_name,
                    "existing_workspace_id": rename_conflict_id,
                },
            )
        new_ws = create_workspace_from_archive(
            archive, workspace_store, scenario_store, new_name=new_name.strip()
        )
        return ImportResult(
            workspace_id=str(new_ws.id),
            workspace_name=new_ws.name,
            client_name=new_ws.client_name,
            scenario_count=len(archive.scenarios),
            action="created",
        )

    # 4. No conflict — create workspace directly
    new_ws = create_workspace_from_archive(archive, workspace_store, scenario_store)
    return ImportResult(
        workspace_id=str(new_ws.id),
        workspace_name=new_ws.name,
        client_name=new_ws.client_name,
        scenario_count=len(archive.scenarios),
        action="created",
    )
