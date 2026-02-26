"""Workspace archive export and import service."""

from __future__ import annotations

import io
import json
import re
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from api.models.base import _utc_now
from api.models.scenario import Scenario
from api.models.workspace import Workspace
from api.storage.scenario_store import ScenarioStore
from api.storage.workspace_store import WorkspaceStore

# ── Constants ────────────────────────────────────────────────────────────────

_ARCHIVE_APP = "retiremodel"
_ARCHIVE_FORMAT_VERSION = "1"


# ── Shared types ─────────────────────────────────────────────────────────────


class ArchiveValidationError(Exception):
    """Raised when an uploaded archive fails structural or content validation."""

    def __init__(self, error_type: str, detail: str) -> None:
        super().__init__(detail)
        self.error_type = error_type
        self.detail = detail


@dataclass
class ArchiveContents:
    """Parsed and validated contents of a workspace archive."""

    manifest: dict
    workspace: Workspace
    scenarios: list[Scenario]


# ── Filename helper ───────────────────────────────────────────────────────────


def sanitize_filename(name: str) -> str:
    """Return a filesystem-safe filename segment.

    Keeps alphanumerics, hyphens, and underscores; replaces spaces with
    underscores; collapses repeated underscores; strips leading/trailing
    underscores.  Falls back to "workspace" for empty input.
    """
    name = re.sub(r"[^\w\s-]", "", name)
    name = re.sub(r"\s+", "_", name)
    name = re.sub(r"_+", "_", name)
    return name.strip("_") or "workspace"


# ── Export ────────────────────────────────────────────────────────────────────


def build_workspace_archive(
    workspace_id: UUID,
    workspace_store: WorkspaceStore,
    scenario_store: ScenarioStore,
) -> bytes:
    """Build a ZIP archive for a workspace and return raw bytes.

    Archive layout::

        manifest.json
        workspace.json
        scenarios/{scenario_id}.json

    Raises ``WorkspaceNotFoundError`` if the workspace does not exist.
    """
    workspace = workspace_store.load(workspace_id)
    scenarios = scenario_store.list_all(workspace_id)

    manifest = {
        "format_version": _ARCHIVE_FORMAT_VERSION,
        "app": _ARCHIVE_APP,
        "exported_at": datetime.now(UTC).isoformat(),
        "source_workspace_id": str(workspace.id),
        "workspace_name": workspace.name,
        "client_name": workspace.client_name,
        "scenario_count": len(scenarios),
    }

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))
        zf.writestr("workspace.json", workspace.model_dump_json(indent=2))
        for scenario in scenarios:
            zf.writestr(
                f"scenarios/{scenario.id}.json",
                scenario.model_dump_json(indent=2),
            )

    return buf.getvalue()


# ── Import — validation ───────────────────────────────────────────────────────


def parse_and_validate_archive(zip_bytes: bytes) -> ArchiveContents:
    """Parse and validate a workspace archive from raw bytes.

    Returns a populated :class:`ArchiveContents` on success.
    Raises :class:`ArchiveValidationError` on any validation failure.
    """
    buf = io.BytesIO(zip_bytes)

    # 1. Verify it's actually a ZIP
    if not zipfile.is_zipfile(buf):
        raise ArchiveValidationError(
            "invalid_archive",
            "Uploaded file is not a valid ZIP archive.",
        )
    buf.seek(0)

    with zipfile.ZipFile(buf, mode="r") as zf:
        names = set(zf.namelist())

        # 2. Manifest presence and structure
        if "manifest.json" not in names:
            raise ArchiveValidationError(
                "missing_manifest",
                "Archive is missing manifest.json.",
            )
        try:
            manifest = json.loads(zf.read("manifest.json"))
        except (json.JSONDecodeError, KeyError) as exc:
            raise ArchiveValidationError(
                "invalid_manifest",
                f"manifest.json is malformed: {exc}",
            ) from exc

        if not isinstance(manifest, dict):
            raise ArchiveValidationError(
                "invalid_manifest",
                "manifest.json must be a JSON object.",
            )

        if manifest.get("app") != _ARCHIVE_APP:
            raise ArchiveValidationError(
                "wrong_app",
                f"Archive is not a retiremodel workspace (app={manifest.get('app')!r}).",
            )

        if manifest.get("format_version") != _ARCHIVE_FORMAT_VERSION:
            raise ArchiveValidationError(
                "unsupported_format_version",
                f"Unsupported archive format version: {manifest.get('format_version')!r}. Expected '1'.",
            )

        # 3. Workspace file
        if "workspace.json" not in names:
            raise ArchiveValidationError(
                "missing_workspace",
                "Archive is missing workspace.json.",
            )
        try:
            workspace = Workspace.model_validate_json(zf.read("workspace.json"))
        except Exception as exc:
            raise ArchiveValidationError(
                "invalid_workspace",
                f"workspace.json failed validation: {exc}",
            ) from exc

        # 4. Scenarios — count and content
        scenario_files = sorted(
            n for n in names if n.startswith("scenarios/") and n.endswith(".json")
        )
        expected_count = manifest.get("scenario_count", 0)
        if len(scenario_files) != expected_count:
            raise ArchiveValidationError(
                "scenario_count_mismatch",
                f"Archive declares {expected_count} scenario(s) but contains {len(scenario_files)}.",
            )

        scenarios: list[Scenario] = []
        for sc_name in scenario_files:
            try:
                scenarios.append(Scenario.model_validate_json(zf.read(sc_name)))
            except Exception as exc:
                raise ArchiveValidationError(
                    "invalid_scenario",
                    f"{sc_name} failed validation: {exc}",
                ) from exc

    return ArchiveContents(manifest=manifest, workspace=workspace, scenarios=scenarios)


# ── Import — workspace creation ───────────────────────────────────────────────


def create_workspace_from_archive(
    archive: ArchiveContents,
    workspace_store: WorkspaceStore,
    scenario_store: ScenarioStore,
    new_name: str | None = None,
) -> Workspace:
    """Create a new workspace from validated archive contents.

    All IDs are regenerated, timestamps are reset to now, and
    ``last_run_at`` is cleared on every scenario.

    Args:
        archive: Validated archive contents.
        workspace_store: Store to persist the new workspace.
        scenario_store: Store to persist the new scenarios.
        new_name: Override for the workspace name (for rename resolution).

    Returns:
        The newly created :class:`Workspace`.
    """
    now = _utc_now()
    src = archive.workspace

    new_workspace = src.model_copy(
        update={
            "id": uuid4(),
            "name": new_name if new_name is not None else src.name,
            "created_at": now,
            "updated_at": now,
        }
    )
    workspace_store.save(new_workspace)

    for src_scenario in archive.scenarios:
        new_scenario = src_scenario.model_copy(
            update={
                "id": uuid4(),
                "workspace_id": new_workspace.id,
                "created_at": now,
                "updated_at": now,
                "last_run_at": None,
            }
        )
        scenario_store.save(new_scenario)

    return new_workspace


def replace_workspace_from_archive(
    archive: ArchiveContents,
    existing_workspace_id: UUID,
    workspace_store: WorkspaceStore,
    scenario_store: ScenarioStore,
) -> Workspace:
    """Replace an existing workspace with archive contents, keeping the original ID.

    Deletes all existing scenarios, overwrites the workspace record (preserving
    the original UUID), and re-creates scenarios with new UUIDs.

    Args:
        archive: Validated archive contents.
        existing_workspace_id: UUID of the workspace to overwrite.
        workspace_store: Store to persist the updated workspace.
        scenario_store: Store to manage existing and new scenarios.

    Returns:
        The updated :class:`Workspace`.
    """
    now = _utc_now()
    src = archive.workspace

    # Delete all existing scenarios
    for sc in scenario_store.list_all(existing_workspace_id):
        scenario_store.delete(existing_workspace_id, sc.id)

    # Overwrite workspace record, keeping the original ID
    updated_workspace = src.model_copy(
        update={
            "id": existing_workspace_id,
            "created_at": now,
            "updated_at": now,
        }
    )
    workspace_store.save(updated_workspace)

    # Re-create scenarios under the existing workspace ID with new UUIDs
    for src_scenario in archive.scenarios:
        new_scenario = src_scenario.model_copy(
            update={
                "id": uuid4(),
                "workspace_id": existing_workspace_id,
                "created_at": now,
                "updated_at": now,
                "last_run_at": None,
            }
        )
        scenario_store.save(new_scenario)

    return updated_workspace
