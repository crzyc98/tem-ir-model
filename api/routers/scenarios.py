"""Scenario REST API endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, field_validator

from api.models.assumptions import Assumptions
from api.models.assumptions_override import AssumptionsOverride
from api.models.irs_warning import IrsLimitWarning
from api.models.plan_design import PlanDesign
from api.services.exceptions import ScenarioNotFoundError, WorkspaceNotFoundError
from api.services.scenario_service import ScenarioService
from api.storage.scenario_store import ScenarioStore

router = APIRouter()


# --- Request / Response Schemas ---


class ScenarioCreate(BaseModel):
    """Request body for creating a scenario."""

    name: str
    description: str | None = None
    plan_design: PlanDesign
    overrides: AssumptionsOverride | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("name must not be empty")
        return v


class ScenarioUpdate(BaseModel):
    """Request body for partial scenario updates."""

    name: str | None = None
    description: str | None = None
    plan_design: PlanDesign | None = None
    overrides: AssumptionsOverride | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty_when_set(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("name must not be empty")
        return v


class ScenarioSummary(BaseModel):
    """Summary view of a scenario for list responses."""

    id: UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class ScenarioResponse(BaseModel):
    """Full scenario data plus computed fields."""

    id: UUID
    workspace_id: UUID
    name: str
    description: str | None
    plan_design: PlanDesign
    overrides: AssumptionsOverride | None
    effective_assumptions: Assumptions
    created_at: datetime
    updated_at: datetime
    last_run_at: datetime | None
    warnings: list[IrsLimitWarning]


# --- Dependency helpers ---


def _get_service(request: Request) -> ScenarioService:
    workspace_store = request.app.state.workspace_store
    scenario_store = ScenarioStore(workspace_store._base_path)
    return ScenarioService(workspace_store, scenario_store)


# --- Endpoints ---


@router.post("", status_code=201, response_model=ScenarioResponse)
async def create_scenario(
    workspace_id: UUID, body: ScenarioCreate, request: Request
) -> ScenarioResponse:
    """Create a new scenario within a workspace."""
    service = _get_service(request)
    try:
        scenario, warnings = service.create_scenario(
            workspace_id=workspace_id,
            name=body.name,
            plan_design=body.plan_design,
            description=body.description,
            overrides=body.overrides,
        )
        workspace = request.app.state.workspace_store.load(workspace_id)
        from api.services.config_resolver import resolve_config

        effective = resolve_config(workspace.base_config, scenario.overrides)
        return ScenarioResponse(
            id=scenario.id,
            workspace_id=scenario.workspace_id,
            name=scenario.name,
            description=scenario.description,
            plan_design=scenario.plan_design,
            overrides=scenario.overrides,
            effective_assumptions=effective,
            created_at=scenario.created_at,
            updated_at=scenario.updated_at,
            last_run_at=scenario.last_run_at,
            warnings=warnings,
        )
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )


@router.get("", response_model=list[ScenarioSummary])
async def list_scenarios(
    workspace_id: UUID, request: Request
) -> list[ScenarioSummary]:
    """List all scenarios in a workspace (summary view)."""
    service = _get_service(request)
    try:
        scenarios = service.list_scenarios(workspace_id)
        return [
            ScenarioSummary(
                id=s.id,
                name=s.name,
                description=s.description,
                created_at=s.created_at,
                updated_at=s.updated_at,
            )
            for s in scenarios
        ]
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )


@router.get("/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    workspace_id: UUID, scenario_id: UUID, request: Request
) -> ScenarioResponse:
    """Retrieve a single scenario with resolved assumptions."""
    service = _get_service(request)
    try:
        scenario, effective, warnings = service.get_scenario(
            workspace_id, scenario_id
        )
        return ScenarioResponse(
            id=scenario.id,
            workspace_id=scenario.workspace_id,
            name=scenario.name,
            description=scenario.description,
            plan_design=scenario.plan_design,
            overrides=scenario.overrides,
            effective_assumptions=effective,
            created_at=scenario.created_at,
            updated_at=scenario.updated_at,
            last_run_at=scenario.last_run_at,
            warnings=warnings,
        )
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
    except ScenarioNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario {scenario_id} not found in workspace {workspace_id}",
        )


@router.patch("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    workspace_id: UUID,
    scenario_id: UUID,
    body: ScenarioUpdate,
    request: Request,
) -> ScenarioResponse:
    """Partially update a scenario."""
    service = _get_service(request)
    try:
        updates = body.model_dump(exclude_unset=True)
        scenario, effective, warnings = service.update_scenario(
            workspace_id, scenario_id, updates
        )
        return ScenarioResponse(
            id=scenario.id,
            workspace_id=scenario.workspace_id,
            name=scenario.name,
            description=scenario.description,
            plan_design=scenario.plan_design,
            overrides=scenario.overrides,
            effective_assumptions=effective,
            created_at=scenario.created_at,
            updated_at=scenario.updated_at,
            last_run_at=scenario.last_run_at,
            warnings=warnings,
        )
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
    except ScenarioNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario {scenario_id} not found in workspace {workspace_id}",
        )


@router.delete("/{scenario_id}", status_code=204)
async def delete_scenario(
    workspace_id: UUID, scenario_id: UUID, request: Request
) -> Response:
    """Delete a scenario."""
    service = _get_service(request)
    try:
        service.delete_scenario(workspace_id, scenario_id)
        return Response(status_code=204)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
    except ScenarioNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario {scenario_id} not found in workspace {workspace_id}",
        )


@router.post("/{scenario_id}/duplicate", status_code=201, response_model=ScenarioResponse)
async def duplicate_scenario(
    workspace_id: UUID, scenario_id: UUID, request: Request
) -> ScenarioResponse:
    """Duplicate a scenario."""
    service = _get_service(request)
    try:
        scenario, effective, warnings = service.duplicate_scenario(
            workspace_id, scenario_id
        )
        return ScenarioResponse(
            id=scenario.id,
            workspace_id=scenario.workspace_id,
            name=scenario.name,
            description=scenario.description,
            plan_design=scenario.plan_design,
            overrides=scenario.overrides,
            effective_assumptions=effective,
            created_at=scenario.created_at,
            updated_at=scenario.updated_at,
            last_run_at=scenario.last_run_at,
            warnings=warnings,
        )
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
    except ScenarioNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Scenario {scenario_id} not found in workspace {workspace_id}",
        )
