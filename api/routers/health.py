"""Health check router."""

from fastapi import APIRouter

router = APIRouter()

API_VERSION = "0.1.0"


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Return service health status."""
    return {"status": "healthy", "version": API_VERSION}
