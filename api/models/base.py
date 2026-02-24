"""Shared utilities for data models."""

from datetime import UTC, datetime


def _utc_now() -> datetime:
    """Return the current UTC datetime."""
    return datetime.now(UTC)
