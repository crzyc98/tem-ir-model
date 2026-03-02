"""Workforce analysis REST API endpoint."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Request

from api.models.workforce_analysis import WorkforceAnalyzeRequest, WorkforceAnalyzeResponse
from api.services.exceptions import ScenarioNotFoundError, WorkspaceNotFoundError
from api.services.workforce_analysis_service import WorkforceAnalysisService
from api.storage.scenario_store import ScenarioStore

router = APIRouter()


def _get_service(request: Request) -> WorkforceAnalysisService:
    workspace_store = request.app.state.workspace_store
    scenario_store = ScenarioStore(workspace_store._base_path)
    return WorkforceAnalysisService(workspace_store, scenario_store)


@router.post(
    "/workspaces/{workspace_id}/analyze",
    response_model=WorkforceAnalyzeResponse,
    status_code=201,
    tags=["workforce-analysis"],
)
async def analyze_workforce(
    workspace_id: UUID,
    body: WorkforceAnalyzeRequest,
    request: Request,
) -> WorkforceAnalyzeResponse:
    """Run a workforce analysis across all non-hidden personas for the selected scenarios."""
    service = _get_service(request)
    try:
        return service.run_analysis(workspace_id, body)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )
    except ScenarioNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
