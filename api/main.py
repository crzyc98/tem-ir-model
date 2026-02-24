"""RetireModel API - FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter

from api.routers.health import router as health_router
from api.routers.scenarios import router as scenarios_router
from api.routers.simulations import router as simulations_router
from api.routers.ss_estimate import router as ss_estimate_router
from api.routers.workspaces import router as workspaces_router
from api.storage.workspace_store import WorkspaceStore

DEFAULT_BASE_PATH = Path.home() / ".retiremodel"


def create_app(base_path: Path | None = None) -> FastAPI:
    """Create and configure the FastAPI application."""
    store = WorkspaceStore(base_path or DEFAULT_BASE_PATH)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        """Create required directories on startup."""
        store.ensure_directories()
        yield

    application = FastAPI(title="RetireModel API", lifespan=lifespan)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Store the workspace store on app state for dependency injection
    application.state.workspace_store = store

    api_router = APIRouter(prefix="/api/v1")
    api_router.include_router(health_router)
    api_router.include_router(workspaces_router, prefix="/workspaces")
    api_router.include_router(
        scenarios_router,
        prefix="/workspaces/{workspace_id}/scenarios",
    )
    api_router.include_router(
        simulations_router,
        prefix="/workspaces/{workspace_id}/scenarios/{scenario_id}",
    )
    api_router.include_router(
        ss_estimate_router,
        prefix="/workspaces/{workspace_id}",
        tags=["ss-estimate"],
    )
    application.include_router(api_router)

    return application


app = create_app()
