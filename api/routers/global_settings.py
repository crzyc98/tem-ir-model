"""Global settings REST API endpoints."""

from fastapi import APIRouter, Request

from api.models.global_defaults import GlobalDefaults
from api.storage.global_defaults_store import GlobalDefaultsStore

router = APIRouter(tags=["global-settings"])


def _get_store(request: Request) -> GlobalDefaultsStore:
    return request.app.state.global_defaults_store


@router.get("", response_model=GlobalDefaults)
async def get_global_settings(request: Request) -> GlobalDefaults:
    """Return current global defaults (system defaults if no config file exists)."""
    return _get_store(request).load()


@router.put("", response_model=GlobalDefaults)
async def save_global_settings(body: GlobalDefaults, request: Request) -> GlobalDefaults:
    """Save updated global defaults and return the saved record."""
    return _get_store(request).save(body)


@router.post("/restore", response_model=GlobalDefaults)
async def restore_global_settings(request: Request) -> GlobalDefaults:
    """Reset all global defaults to hardcoded system defaults."""
    return _get_store(request).reset()
