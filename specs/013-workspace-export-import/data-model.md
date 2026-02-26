# Data Model: Workspace Export and Import

**Feature**: 013-workspace-export-import
**Date**: 2026-02-25

---

## Archive Structure (On-Disk / Wire Format)

This feature introduces a portable ZIP archive format. The structure mirrors the existing filesystem layout exactly.

```
{workspace_client_name}_export.zip
├── manifest.json
├── workspace.json
└── scenarios/
    ├── {scenario_id}.json
    └── {scenario_id}.json   (one per scenario)
```

---

## manifest.json

Embedded in every export archive. Validated first during import.

```json
{
  "format_version": "1",
  "app": "retiremodel",
  "exported_at": "2026-02-25T12:00:00Z",
  "source_workspace_id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_name": "Acme Corp Retirement Plan",
  "client_name": "Acme Corp",
  "scenario_count": 3
}
```

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format_version` | string | yes | Must be `"1"` for this version. Import is rejected if mismatched. |
| `app` | string | yes | Must be `"retiremodel"`. Guards against importing non-workspace ZIPs. |
| `exported_at` | ISO-8601 datetime | yes | Timestamp when the archive was created. |
| `source_workspace_id` | UUID string | yes | ID of the workspace at export time. Discarded on import (new ID assigned). |
| `workspace_name` | string | yes | Used to detect naming conflicts on import. |
| `client_name` | string | yes | Human-readable label shown in conflict resolution dialog. |
| `scenario_count` | integer ≥ 0 | yes | Must match the number of `.json` files in `scenarios/`. Used for integrity check. |

---

## workspace.json (inside archive)

Full serialization of the existing `Workspace` Pydantic model — same format as the on-disk file at `~/.retiremodel/workspaces/{id}/workspace.json`. No new fields.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "...",
  "client_name": "...",
  "created_at": "...",
  "updated_at": "...",
  "base_config": { ... },
  "personas": [ ... ],
  "monte_carlo_config": { ... }
}
```

**Import behavior**: The `id`, `created_at`, and `updated_at` fields from the archive are discarded. New values are assigned:
- `id`: fresh UUID4
- `created_at`: current UTC timestamp
- `updated_at`: current UTC timestamp

---

## scenarios/{scenario_id}.json (inside archive)

Full serialization of each `Scenario` Pydantic model — same format as `~/.retiremodel/workspaces/{workspace_id}/scenarios/{scenario_id}.json`. One file per scenario.

```json
{
  "id": "...",
  "workspace_id": "...",
  "name": "...",
  "description": "...",
  "plan_design": { ... },
  "overrides": null,
  "created_at": "...",
  "updated_at": "...",
  "last_run_at": null
}
```

**Import behavior**: `id`, `workspace_id`, `created_at`, `updated_at`, `last_run_at` from the archive are discarded:
- `id`: fresh UUID4
- `workspace_id`: new workspace UUID from import
- `created_at`/`updated_at`: current UTC timestamp
- `last_run_at`: set to `null` (simulation results are not included in archives)

---

## API Request/Response Schemas

### Export Response

`GET /api/v1/workspaces/{workspace_id}/export`

Binary response (ZIP file). No JSON schema — raw bytes.

**Headers**:
```
Content-Type: application/zip
Content-Disposition: attachment; filename="{sanitized_client_name}_export.zip"
```

---

### Import Request

`POST /api/v1/workspaces/import`

**Content-Type**: `multipart/form-data`

**Form fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File (.zip) | yes | The workspace archive file to import. |

**Query parameters**:

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `on_conflict` | `rename`, `replace`, `skip` | none | Conflict resolution action. Only present on re-submission after a 409. |
| `new_name` | string | none | New workspace name. Required when `on_conflict=rename`. |

---

### Import Response (201 Created — success)

```json
{
  "workspace_id": "new-uuid-here",
  "workspace_name": "Acme Corp Retirement Plan",
  "client_name": "Acme Corp",
  "scenario_count": 3,
  "action": "created"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `workspace_id` | UUID string | The newly created workspace's ID. |
| `workspace_name` | string | Name of the created workspace. |
| `client_name` | string | Client label of the created workspace. |
| `scenario_count` | integer | Number of scenarios restored. |
| `action` | `"created"` \| `"replaced"` | What happened: new workspace created, or existing replaced. |

---

### Import Response (200 OK — skipped)

```json
{
  "action": "skipped",
  "reason": "User chose to skip due to naming conflict"
}
```

---

### Import Response (409 Conflict — name collision detected)

```json
{
  "detail": "A workspace named 'Acme Corp Retirement Plan' already exists.",
  "conflict_type": "name_conflict",
  "archive_workspace_name": "Acme Corp Retirement Plan",
  "archive_client_name": "Acme Corp",
  "existing_workspace_id": "existing-uuid-here"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `detail` | string | Human-readable conflict description. |
| `conflict_type` | `"name_conflict"` | Machine-readable conflict classifier. |
| `archive_workspace_name` | string | The workspace name from the archive. |
| `archive_client_name` | string | The client name from the archive. |
| `existing_workspace_id` | UUID string | ID of the conflicting workspace already on disk. |

---

### Import Response (422 Unprocessable Entity — invalid archive)

Standard FastAPI validation error, augmented:

```json
{
  "detail": "Invalid archive: missing manifest.json",
  "error_type": "invalid_archive"
}
```

Common `error_type` values:

| Value | Cause |
|-------|-------|
| `"invalid_archive"` | Not a ZIP file, or ZIP is corrupted |
| `"missing_manifest"` | `manifest.json` not found in archive |
| `"invalid_manifest"` | `manifest.json` is malformed or has wrong `format_version`/`app` |
| `"wrong_app"` | `manifest.app != "retiremodel"` |
| `"unsupported_format_version"` | `manifest.format_version` is not `"1"` |
| `"missing_workspace"` | `workspace.json` not found in archive |
| `"invalid_workspace"` | `workspace.json` fails Pydantic validation |
| `"scenario_count_mismatch"` | Number of scenario files doesn't match `manifest.scenario_count` |
| `"invalid_scenario"` | A scenario file fails Pydantic validation |

---

## Entity Relationships

```
WorkspaceArchive (ZIP file)
├── has 1   ArchiveManifest (manifest.json)
├── has 1   Workspace snapshot (workspace.json)
└── has 0+  Scenario snapshots (scenarios/*.json)

On import:
  WorkspaceArchive ──creates──> Workspace (new UUID)
                   ──creates──> Scenario × N (new UUIDs, new workspace_id)
```

---

## Key Validation Rules

1. Uploaded file must be a valid ZIP (magic bytes check or `zipfile.is_zipfile()`).
2. `manifest.json` must exist at the ZIP root.
3. `manifest.app` must equal `"retiremodel"`.
4. `manifest.format_version` must equal `"1"`.
5. `workspace.json` must exist at the ZIP root.
6. Number of `scenarios/*.json` files must equal `manifest.scenario_count`.
7. `workspace.json` and all scenario files must pass Pydantic model validation.
8. On rename conflict resolution, the provided `new_name` must not conflict with any existing workspace name.
