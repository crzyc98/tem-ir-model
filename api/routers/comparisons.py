"""Plan comparison REST API endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from api.models.comparison import PlanComparison
from api.services.comparison_service import ComparisonService
from api.services.exceptions import (
    ComparisonNotFoundError,
    WorkspaceNotFoundError,
)
from api.storage.comparison_store import ComparisonStore
from api.storage.scenario_store import ScenarioStore

router = APIRouter()


class ComparisonRequest(BaseModel):
    """Request body for running a plan comparison."""

    scenario_ids: list[UUID] = Field(min_length=2, max_length=8)
    persona_id: UUID


def _get_service(request: Request) -> ComparisonService:
    workspace_store = request.app.state.workspace_store
    scenario_store = ScenarioStore(workspace_store._base_path)
    comparison_store = ComparisonStore(workspace_store._base_path)
    return ComparisonService(workspace_store, scenario_store, comparison_store)


@router.post("", response_model=PlanComparison, status_code=201)
async def run_comparison(
    workspace_id: UUID,
    body: ComparisonRequest,
    request: Request,
) -> PlanComparison:
    """Run a plan comparison across multiple scenarios for a single persona."""
    service = _get_service(request)
    try:
        return service.run_comparison(
            workspace_id, body.scenario_ids, body.persona_id
        )
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("", response_model=list[PlanComparison])
async def list_comparisons(
    workspace_id: UUID,
    request: Request,
) -> list[PlanComparison]:
    """List all saved comparisons in a workspace."""
    service = _get_service(request)
    try:
        return service.list_comparisons(workspace_id)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )


@router.get("/{comparison_id}", response_model=PlanComparison)
async def get_comparison(
    workspace_id: UUID,
    comparison_id: UUID,
    request: Request,
) -> PlanComparison:
    """Get a single saved comparison."""
    service = _get_service(request)
    try:
        return service.get_comparison(workspace_id, comparison_id)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
    except ComparisonNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Comparison {comparison_id} not found in workspace {workspace_id}",
        )


@router.delete("/{comparison_id}", status_code=204)
async def delete_comparison(
    workspace_id: UUID,
    comparison_id: UUID,
    request: Request,
) -> None:
    """Delete a saved comparison."""
    service = _get_service(request)
    try:
        service.delete_comparison(workspace_id, comparison_id)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
    except ComparisonNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Comparison {comparison_id} not found in workspace {workspace_id}",
        )
