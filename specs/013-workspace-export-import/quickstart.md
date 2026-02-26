# Developer Quickstart: Workspace Export and Import

**Feature**: 013-workspace-export-import
**Date**: 2026-02-25

---

## Overview

This feature adds two capabilities:
1. **Export** — download a workspace (metadata + base config + all scenarios) as a ZIP archive.
2. **Import** — upload a ZIP archive to create a new workspace, with conflict resolution if a name collision occurs.

No new dependencies are required. The backend uses Python's stdlib `zipfile` module. The frontend uses native `fetch()` with `FormData`.

---

## Backend

### New Files

| File | Purpose |
|------|---------|
| `api/services/export_import_service.py` | Business logic for building the ZIP and parsing/validating imports |
| `api/routers/workspace_archive.py` | FastAPI route handlers for export and import endpoints |

### Modified Files

| File | Change |
|------|--------|
| `api/main.py` | Include `workspace_archive` router |

### Key Patterns

**Export**: Follows the Excel export pattern in `api/services/excel_export_service.py` — build bytes in memory with `io.BytesIO()`, return `StreamingResponse`.

**Import**: Uses FastAPI's `UploadFile` for multipart file upload. Query params (`on_conflict`, `new_name`) control conflict resolution on re-submission.

**Storage**: Reuses `WorkspaceStore` and `ScenarioStore` from `api/storage/` — no new storage classes needed.

### Running the Backend

```bash
cd api
uvicorn main:app --reload
```

Test export:
```bash
curl -o workspace_export.zip http://localhost:8000/api/v1/workspaces/{workspace_id}/export
```

Test import:
```bash
curl -X POST http://localhost:8000/api/v1/workspaces/import \
  -F "file=@workspace_export.zip"
```

Test import with conflict resolution (rename):
```bash
curl -X POST "http://localhost:8000/api/v1/workspaces/import?on_conflict=rename&new_name=My+Renamed+Workspace" \
  -F "file=@workspace_export.zip"
```

---

## Frontend

### New Files

| File | Purpose |
|------|---------|
| `app/src/components/ImportWorkspaceModal.tsx` | Modal: file input + conflict resolution dialog |

### Modified Files

| File | Change |
|------|--------|
| `app/src/services/api.ts` | Add `exportWorkspace()` and `importWorkspace()` functions |
| `app/src/pages/DashboardPage.tsx` | Add "Import" button; pass `onExport` handler to `WorkspaceCard` |
| `app/src/components/WorkspaceCard.tsx` | Add export icon button (alongside existing delete button) |
| `app/src/pages/SettingsPage.tsx` | Add Portability section with export + import actions |

### API Functions

```typescript
// Export: triggers file download
export async function exportWorkspace(workspaceId: string): Promise<Blob>

// Import: upload file, optional conflict resolution
export async function importWorkspace(
  file: File,
  options?: { onConflict?: 'rename' | 'replace' | 'skip'; newName?: string }
): Promise<ImportResult>

// Types
interface ImportResult {
  action: 'created' | 'replaced' | 'skipped'
  workspace_id?: string
  workspace_name?: string
  scenario_count?: number
}

interface ImportConflictError {
  conflict_type: 'name_conflict'
  archive_workspace_name: string
  archive_client_name: string
  existing_workspace_id: string
}
```

### Download Trigger Pattern (matches existing Excel export)

```typescript
const blob = await exportWorkspace(workspaceId)
const url = URL.createObjectURL(blob)
const a = document.createElement('a')
a.href = url
a.download = `${workspace.client_name}_export.zip`
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url)
```

### ImportWorkspaceModal Flow

```
[Open modal]
  → File input (<input type="file" accept=".zip">)
  → User selects file
  → Submit → POST /api/v1/workspaces/import
      → 201: success, close modal, refreshWorkspaces()
      → 409: show conflict resolution UI
          → Rename: text input for new name → re-submit with ?on_conflict=rename&new_name=...
          → Replace: confirm destructive action → re-submit with ?on_conflict=replace
          → Skip: close modal, no changes
      → 422: show error message
```

---

## Running Tests

```bash
cd api
pytest tests/
```

Key test scenarios to cover:
- Export a workspace with 0 scenarios
- Export a workspace with multiple scenarios
- Import a valid archive (no conflict)
- Import with name conflict → rename
- Import with name conflict → replace
- Import with name conflict → skip
- Import corrupted ZIP → 422 with error_type
- Import ZIP missing manifest.json → 422
- Import ZIP with wrong app or format_version → 422
- Import ZIP where scenario_count mismatches → 422

---

## Archive Format Reference

```
{client_name}_export.zip
├── manifest.json           # {"format_version": "1", "app": "retiremodel", ...}
├── workspace.json          # Full Workspace JSON (id/timestamps discarded on import)
└── scenarios/
    ├── {scenario_id}.json  # Full Scenario JSON (id/workspace_id/timestamps regenerated)
    └── ...
```

See `data-model.md` for full field definitions and validation rules.
