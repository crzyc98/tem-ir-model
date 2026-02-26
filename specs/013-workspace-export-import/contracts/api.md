# API Contracts: Workspace Export and Import

**Feature**: 013-workspace-export-import
**Date**: 2026-02-25
**Base URL**: `/api/v1`

---

## Export Workspace

Downloads the entire workspace as a portable ZIP archive.

### Request

```
GET /api/v1/workspaces/{workspace_id}/export
```

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | UUID | ID of the workspace to export |

**Headers**: None required (no auth, standard dev setup)

---

### Response: 200 OK

```
Content-Type: application/zip
Content-Disposition: attachment; filename="{client_name}_export.zip"
Body: <binary ZIP file>
```

The ZIP contains:
- `manifest.json` — archive metadata and format version
- `workspace.json` — full workspace serialization
- `scenarios/{id}.json` — one file per scenario (may be zero files)

---

### Response: 404 Not Found

```json
{
  "detail": "Workspace {workspace_id} not found"
}
```

---

## Import Workspace

Uploads a workspace archive and creates a new workspace. Supports conflict resolution on re-submission.

### Request

```
POST /api/v1/workspaces/import
Content-Type: multipart/form-data
```

**Form Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | yes | A `.zip` workspace archive |

**Query Parameters** (only on re-submission after 409):

| Parameter | Values | Required | Description |
|-----------|--------|----------|-------------|
| `on_conflict` | `rename` \| `replace` \| `skip` | conditional | Conflict resolution action. Must be present if archive name conflicts with an existing workspace. |
| `new_name` | string | conditional | Required when `on_conflict=rename`. The new name for the imported workspace. Must not conflict with any existing workspace name. |

---

### Response: 201 Created — Import succeeded (no conflict or after `rename`/`replace`)

```json
{
  "workspace_id": "a1b2c3d4-...",
  "workspace_name": "Acme Corp Retirement Plan",
  "client_name": "Acme Corp",
  "scenario_count": 3,
  "action": "created"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `workspace_id` | string (UUID) | Newly assigned workspace ID |
| `workspace_name` | string | Name of the created/replaced workspace |
| `client_name` | string | Client label |
| `scenario_count` | integer | Number of scenarios restored |
| `action` | `"created"` \| `"replaced"` | Whether a new workspace was created or an existing one was overwritten |

---

### Response: 200 OK — Import skipped (`on_conflict=skip`)

```json
{
  "action": "skipped",
  "reason": "User chose to skip due to naming conflict"
}
```

---

### Response: 409 Conflict — Name collision detected (no `on_conflict` param)

```json
{
  "detail": "A workspace named 'Acme Corp Retirement Plan' already exists.",
  "conflict_type": "name_conflict",
  "archive_workspace_name": "Acme Corp Retirement Plan",
  "archive_client_name": "Acme Corp",
  "existing_workspace_id": "9f4e2a1b-..."
}
```

The frontend uses this response to render the conflict resolution dialog. The user's choice drives the re-submission query params.

---

### Response: 422 Unprocessable Entity — Archive is invalid

```json
{
  "detail": "Invalid archive: missing manifest.json",
  "error_type": "invalid_archive"
}
```

**`error_type` values**:

| Value | Meaning |
|-------|---------|
| `"invalid_archive"` | File is not a ZIP or is corrupted |
| `"missing_manifest"` | `manifest.json` absent from archive root |
| `"invalid_manifest"` | `manifest.json` is malformed JSON |
| `"wrong_app"` | `manifest.app` is not `"retiremodel"` |
| `"unsupported_format_version"` | `manifest.format_version` is not `"1"` |
| `"missing_workspace"` | `workspace.json` absent from archive root |
| `"invalid_workspace"` | `workspace.json` fails model validation |
| `"scenario_count_mismatch"` | Scenario file count ≠ `manifest.scenario_count` |
| `"invalid_scenario"` | A scenario file fails model validation |

---

### Response: 422 Unprocessable Entity — `new_name` conflict (on `on_conflict=rename`)

```json
{
  "detail": "A workspace named 'New Name' already exists.",
  "conflict_type": "name_conflict",
  "archive_workspace_name": "New Name",
  "archive_client_name": "Acme Corp",
  "existing_workspace_id": "..."
}
```

The frontend loops the rename dialog until the user provides a non-conflicting name or selects a different action.

---

## Summary of Status Codes

| Endpoint | Status | Meaning |
|----------|--------|---------|
| GET /export | 200 | ZIP file downloaded |
| GET /export | 404 | Workspace not found |
| POST /import | 201 | Workspace created or replaced |
| POST /import | 200 | Import skipped by user |
| POST /import | 409 | Name conflict — re-submit with `on_conflict` |
| POST /import | 422 | Archive invalid — user must select a different file |

---

## Frontend Integration Notes

**Export download trigger** (matches Excel export pattern):
```typescript
const blob = await exportWorkspace(workspaceId)         // fetch blob
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `${workspace.client_name}_export.zip`
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url)
```

**Import upload** (multipart, re-uses cached File on conflict):
```typescript
const formData = new FormData()
formData.append('file', file)
const url = new URL('/api/v1/workspaces/import', window.location.origin)
if (onConflict) url.searchParams.set('on_conflict', onConflict)
if (newName) url.searchParams.set('new_name', newName)

const response = await fetch(url.toString(), { method: 'POST', body: formData })
```
