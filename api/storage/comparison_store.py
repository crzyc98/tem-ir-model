"""Filesystem persistence for plan comparison data."""

import logging
from pathlib import Path
from uuid import UUID

from api.models.comparison import PlanComparison
from api.services.exceptions import ComparisonNotFoundError, StorageError

logger = logging.getLogger(__name__)


class ComparisonStore:
    """Read/write comparison JSON files under workspace directories."""

    def __init__(self, base_path: Path) -> None:
        self._base_path = base_path
        self._workspaces_dir = base_path / "workspaces"

    def _comparisons_dir(self, workspace_id: UUID) -> Path:
        return self._workspaces_dir / str(workspace_id) / "comparisons"

    def _comparison_file(self, workspace_id: UUID, comparison_id: UUID) -> Path:
        return self._comparisons_dir(workspace_id) / f"{comparison_id}.json"

    def save(self, comparison: PlanComparison) -> None:
        """Persist a comparison to disk as JSON."""
        try:
            comparisons_dir = self._comparisons_dir(comparison.workspace_id)
            comparisons_dir.mkdir(parents=True, exist_ok=True)
            cmp_file = self._comparison_file(comparison.workspace_id, comparison.id)
            cmp_file.write_text(comparison.model_dump_json(indent=2))
        except OSError as e:
            raise StorageError(
                f"Failed to save comparison {comparison.id}: {e}"
            ) from e

    def load(self, workspace_id: UUID, comparison_id: UUID) -> PlanComparison:
        """Load a comparison from disk by ID."""
        cmp_file = self._comparison_file(workspace_id, comparison_id)
        if not cmp_file.exists():
            raise ComparisonNotFoundError(str(comparison_id), str(workspace_id))
        try:
            return PlanComparison.model_validate_json(cmp_file.read_text())
        except OSError as e:
            raise StorageError(
                f"Failed to read comparison {comparison_id}: {e}"
            ) from e

    def list_all(self, workspace_id: UUID) -> list[PlanComparison]:
        """Load all comparisons from a workspace's comparisons directory."""
        comparisons: list[PlanComparison] = []
        comparisons_dir = self._comparisons_dir(workspace_id)
        if not comparisons_dir.exists():
            return comparisons
        for cmp_file in sorted(comparisons_dir.iterdir()):
            if not cmp_file.is_file() or cmp_file.suffix != ".json":
                continue
            try:
                comparisons.append(PlanComparison.model_validate_json(cmp_file.read_text()))
            except Exception:
                logger.warning("Skipping corrupted comparison in %s", cmp_file)
        return comparisons

    def delete(self, workspace_id: UUID, comparison_id: UUID) -> None:
        """Remove a comparison file from disk."""
        cmp_file = self._comparison_file(workspace_id, comparison_id)
        if not cmp_file.exists():
            raise ComparisonNotFoundError(str(comparison_id), str(workspace_id))
        try:
            cmp_file.unlink()
        except OSError as e:
            raise StorageError(
                f"Failed to delete comparison {comparison_id}: {e}"
            ) from e

    def exists(self, workspace_id: UUID, comparison_id: UUID) -> bool:
        """Check whether a comparison exists on disk."""
        return self._comparison_file(workspace_id, comparison_id).is_file()
