"""Standalone Social Security estimate endpoint."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request

from api.models.ss_estimator import SSBenefitEstimate, SSEstimateRequest, SSEstimateResponse
from api.services.exceptions import WorkspaceNotFoundError
from api.services.ss_estimator import SocialSecurityEstimator

router = APIRouter()


@router.post("/ss-estimate", response_model=SSEstimateResponse)
async def estimate_social_security(
    workspace_id: UUID,
    request: Request,
    body: SSEstimateRequest | None = None,
) -> SSEstimateResponse:
    """Compute Social Security benefit estimates for workspace personas."""
    workspace_store = request.app.state.workspace_store

    try:
        workspace = workspace_store.load(workspace_id)
    except WorkspaceNotFoundError:
        raise HTTPException(
            status_code=404, detail=f"Workspace {workspace_id} not found"
        )

    assumptions = workspace.base_config
    retirement_age = workspace.monte_carlo_config.retirement_age
    current_year = datetime.now(UTC).year

    # Filter personas if persona_ids provided
    personas = workspace.personas
    if body and body.persona_ids:
        persona_map = {p.id: p for p in personas}
        filtered = []
        for pid in body.persona_ids:
            if pid not in persona_map:
                raise HTTPException(
                    status_code=404,
                    detail=f"Persona {pid} not found in workspace {workspace_id}",
                )
            filtered.append(persona_map[pid])
        personas = filtered

    estimator = SocialSecurityEstimator(assumptions)
    estimates: list[SSBenefitEstimate] = []
    for persona in personas:
        est = estimator.estimate(persona, retirement_age, current_year)
        estimates.append(est)

    return SSEstimateResponse(workspace_id=workspace.id, estimates=estimates)
