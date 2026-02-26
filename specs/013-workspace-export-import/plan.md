# Implementation Plan: Workspace Export and Import

**Branch**: `013-workspace-export-import` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-workspace-export-import/spec.md`

---

## Summary

Add workspace export (download as ZIP archive) and import (upload ZIP to create workspace) to both the workspace list page and workspace settings page. The backend uses Python's stdlib `zipfile` to create/parse archives containing `manifest.json`, `workspace.json`, and per-scenario JSON files. Import supports conflict resolution (rename/replace/skip) via a stateless re-submission pattern. No new dependencies required.

---

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8.2 (frontend)
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4 (backend); React 19, react-router-dom 7.1, Tailwind CSS 3.4, lucide-react 0.469 (frontend)
**Storage**: JSON files on local filesystem at `~/.retiremodel/workspaces/{id}/` (existing)
**Testing**: pytest (backend)
**Target Platform**: Local web application (macOS/Linux); browser-based frontend
**Project Type**: Web application (FastAPI backend + React frontend)
**Performance Goals**: Export completes in < 10 seconds for workspaces with up to 20 scenarios (SC-001)
**Constraints**: No new dependencies; stateless import conflict resolution; no simulation results in archives
**Scale/Scope**: Single-workspace import/export; single user; archives typically < 1 MB

---

## Constitution Check

No constitution file found at `.specify/memory/constitution.md`. Proceeding based on observed project conventions:

- **No new dependencies**: Both export (stdlib `zipfile`) and import (FastAPI `UploadFile`) use existing capabilities. ✅
- **Compute-and-return model preserved**: Export is a read operation; import creates workspace/scenario records via existing store classes. No simulation result persistence added. ✅
- **Consistent storage patterns**: Uses existing `WorkspaceStore.save()` and `ScenarioStore.save()` for the new workspace created during import. ✅
- **Consistent API patterns**: New router follows the same structure as `api/routers/workspaces.py` (prefix, dependency injection via `request.app.state`). ✅
- **Consistent frontend patterns**: File download follows `ResultsDashboardPage.tsx` Excel export pattern. New modal follows `CreateWorkspaceModal.tsx` pattern. ✅

---

## Project Structure

### Documentation (this feature)

```text
specs/013-workspace-export-import/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Architecture decisions
├── data-model.md        # Archive schema + API request/response shapes
├── quickstart.md        # Developer setup and curl examples
├── contracts/
│   └── api.md           # Full REST API contract
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
api/
├── main.py                          # + include workspace_archive router
├── routers/
│   ├── workspace_archive.py         # NEW: export + import endpoints
│   └── ... (existing)
└── services/
    ├── export_import_service.py     # NEW: ZIP build + parse + validate logic
    └── ... (existing)

app/src/
├── services/
│   └── api.ts                       # + exportWorkspace(), importWorkspace()
├── components/
│   ├── ImportWorkspaceModal.tsx     # NEW: file upload + conflict resolution dialog
│   ├── WorkspaceCard.tsx            # + export icon button (alongside delete)
│   └── ... (existing)
└── pages/
    ├── DashboardPage.tsx            # + "Import" button; pass onExport to WorkspaceCard
    └── SettingsPage.tsx             # + Portability section (export + import)
```

**Structure Decision**: Web application with separate backend (`api/`) and frontend (`app/`) directories matching the existing layout. Feature touches both sides; all changes are additive (new files + targeted edits to existing files).

---

## Phase 0: Research

**Status**: Complete. See [research.md](research.md).

**Decisions summary**:

| Decision | Choice |
|----------|--------|
| Archive format | ZIP with stdlib `zipfile`; no new dependencies |
| Archive layout | `manifest.json` + `workspace.json` + `scenarios/*.json` |
| Import conflict flow | Stateless re-submission: 409 → user selects action → re-upload with query params |
| Export HTTP method | `GET` (read-only, no request body needed) |
| Format versioning | `manifest.format_version = "1"`; reject on mismatch |
| New IDs on import | Yes — fresh UUIDs for workspace and all scenarios |
| Frontend upload | Native `fetch()` + `FormData`; no library |

---

## Phase 1: Design

**Status**: Complete.

- **Data model**: [data-model.md](data-model.md) — archive structure, manifest schema, API request/response shapes, validation rules, entity relationships
- **API contracts**: [contracts/api.md](contracts/api.md) — full REST contract for `GET /export` and `POST /import`
- **Quickstart**: [quickstart.md](quickstart.md) — developer setup, curl examples, key patterns

---

## Implementation Steps

### Step 1: Backend service — `api/services/export_import_service.py`

**New file**. Contains two public functions:

**`build_workspace_archive(workspace_id, workspace_store, scenario_store) -> bytes`**
- Load workspace via `workspace_store.load(workspace_id)`
- Load all scenarios via `scenario_store.list_all(workspace_id)`
- Build ZIP in memory with `io.BytesIO()` + `zipfile.ZipFile`
- Write `manifest.json` (format_version, app, exported_at, source_workspace_id, workspace_name, client_name, scenario_count)
- Write `workspace.json` (full `workspace.model_dump_json(indent=2)`)
- Write `scenarios/{scenario.id}.json` for each scenario
- Return `bytes`

**`parse_and_validate_archive(zip_bytes) -> ArchiveContents`**
- Verify file is a ZIP (`zipfile.is_zipfile()`)
- Extract and parse `manifest.json`; validate `app == "retiremodel"` and `format_version == "1"`
- Extract and parse `workspace.json` → `Workspace.model_validate_json()`
- Count `scenarios/*.json` files; validate count matches `manifest.scenario_count`
- Parse each scenario file → `Scenario.model_validate_json()`
- Return dataclass `ArchiveContents(manifest, workspace, scenarios)`
- Raise `ArchiveValidationError(error_type, detail)` on any validation failure

**`create_workspace_from_archive(archive_contents, workspace_store, scenario_store, new_name=None) -> Workspace`**
- Assign new UUID4 to workspace; set new `created_at`/`updated_at`
- Apply `new_name` if provided (overrides archive's `workspace_name`)
- Save via `workspace_store.save(new_workspace)`
- For each scenario: assign new UUID4, set `workspace_id = new_workspace.id`, clear `last_run_at`, save via `scenario_store.save()`
- Return the new `Workspace`

**`replace_workspace_from_archive(archive_contents, existing_workspace_id, workspace_store, scenario_store) -> Workspace`**
- Delete all existing scenarios for `existing_workspace_id`
- Overwrite existing workspace (keep original `id`, update other fields from archive)
- Re-create all scenarios with new UUIDs under the existing workspace ID
- Return updated `Workspace`

---

### Step 2: Backend router — `api/routers/workspace_archive.py`

**New file**. Two endpoints:

**`GET /api/v1/workspaces/{workspace_id}/export`**
```
- Call build_workspace_archive(workspace_id, ...)
- On WorkspaceNotFoundError → 404
- Return StreamingResponse(io.BytesIO(zip_bytes),
    media_type="application/zip",
    headers={"Content-Disposition": f'attachment; filename="{sanitized_name}_export.zip"'})
```

**`POST /api/v1/workspaces/import`**
```
- file: UploadFile (required)
- on_conflict: Optional[Literal["rename", "replace", "skip"]] = Query(None)
- new_name: Optional[str] = Query(None)

Flow:
  1. Read zip_bytes = await file.read()
  2. archive = parse_and_validate_archive(zip_bytes)
     → on ArchiveValidationError: raise HTTPException(422, detail=e.detail, ...)
  3. Check for existing workspace with same name
     → if conflict and on_conflict is None: raise HTTPException(409, ...)
     → if conflict and on_conflict == "skip": return {"action": "skipped", ...}
     → if conflict and on_conflict == "replace": replace_workspace_from_archive(...)
     → if conflict and on_conflict == "rename":
         validate new_name provided and doesn't conflict
         create_workspace_from_archive(..., new_name=new_name)
     → if no conflict: create_workspace_from_archive(...)
  4. Return 201 with ImportResult JSON
```

---

### Step 3: Wire router — `api/main.py`

Add to existing router includes:
```python
from api.routers import workspace_archive
app.include_router(workspace_archive.router, prefix="/api/v1")
```

---

### Step 4: Frontend API functions — `app/src/services/api.ts`

Add two functions:

```typescript
export async function exportWorkspace(workspaceId: string): Promise<Blob>
// GET /api/v1/workspaces/{workspaceId}/export
// Returns response.blob()

export async function importWorkspace(
  file: File,
  options?: { onConflict?: 'rename' | 'replace' | 'skip'; newName?: string }
): Promise<ImportResult>
// POST /api/v1/workspaces/import (multipart/form-data)
// Throws ImportConflictError (status 409) with conflict details
// Throws Error on 422 with error message
```

Add TypeScript interfaces:
```typescript
interface ImportResult {
  action: 'created' | 'replaced' | 'skipped'
  workspace_id?: string
  workspace_name?: string
  scenario_count?: number
}

class ImportConflictError extends Error {
  conflict_type: 'name_conflict'
  archive_workspace_name: string
  archive_client_name: string
  existing_workspace_id: string
}
```

---

### Step 5: New component — `app/src/components/ImportWorkspaceModal.tsx`

**Props**: `{ isOpen: boolean; onClose: () => void; onImported: (workspace: ImportResult) => void }`

**State machine**:
```
idle → uploading → success
               ↘ conflict → resolving (rename | replace | skip)
               ↘ error (invalid archive)
```

**Conflict resolution UI**:
- Three option buttons: "Rename", "Replace", "Skip"
- If "Rename" selected: show text input for new name; re-submit with `?on_conflict=rename&new_name=...`
- If "Replace" selected: show confirmation warning ("This will permanently overwrite…"); re-submit with `?on_conflict=replace`
- If "Skip" selected: close modal, no state change

**File input**:
```html
<input type="file" accept=".zip" onChange={handleFileChange} />
```

Cache the selected `File` in state so it can be re-submitted during conflict resolution without requiring the user to re-select.

**Styling**: Follow `CreateWorkspaceModal.tsx` pattern (modal overlay, white card, form buttons).

---

### Step 6: Update `WorkspaceCard.tsx`

Add `onExport: () => void` to props interface.

Add an export icon button in the top-right corner alongside the existing `Trash2` delete button:
```tsx
<button onClick={(e) => { e.stopPropagation(); onExport(); }} aria-label="Export workspace">
  <Download className="h-4 w-4" />
</button>
```

Keep the delete button; both buttons sit in the top-right of the card.

---

### Step 7: Update `DashboardPage.tsx`

1. Add `isImportModalOpen` state and `ImportWorkspaceModal` usage.
2. Add "Import" button in the header action bar (alongside existing "New Workspace" button):
   ```tsx
   <button onClick={() => setIsImportModalOpen(true)}>
     <Upload className="h-4 w-4" /> Import
   </button>
   ```
3. Pass `onExport` handler to each `WorkspaceCard`:
   ```typescript
   const handleExport = async (ws: WorkspaceSummary) => {
     const blob = await exportWorkspace(ws.id)
     const url = URL.createObjectURL(blob)
     const a = document.createElement('a')
     a.href = url
     a.download = `${ws.client_name}_export.zip`
     document.body.appendChild(a)
     a.click()
     document.body.removeChild(a)
     URL.revokeObjectURL(url)
   }
   ```
4. On successful import: call `refreshWorkspaces()` and optionally navigate to new workspace.

---

### Step 8: Update `SettingsPage.tsx`

Add a "Portability" section near the bottom of the settings page (before or after the existing personas section):

```
┌─ Portability ─────────────────────────────────────────────────┐
│ Export this workspace as a portable archive file.             │
│ [Export Workspace ↓]                                          │
│                                                               │
│ Import a workspace archive to create a new workspace.         │
│ [Import Workspace ↑]                                          │
└───────────────────────────────────────────────────────────────┘
```

- "Export Workspace" button: calls `exportWorkspace(activeWorkspace.id)` and triggers download.
- "Import Workspace" button: opens `ImportWorkspaceModal`.

---

## Test Plan

### Backend unit tests (pytest)

| Test | Description |
|------|-------------|
| `test_build_archive_with_scenarios` | Export workspace with 2 scenarios; verify ZIP contents and manifest fields |
| `test_build_archive_empty_workspace` | Export workspace with 0 scenarios; verify manifest.scenario_count == 0 |
| `test_parse_valid_archive` | Parse a well-formed archive; verify all fields extracted correctly |
| `test_parse_not_a_zip` | Pass random bytes; expect `ArchiveValidationError(error_type="invalid_archive")` |
| `test_parse_missing_manifest` | ZIP without manifest.json; expect `error_type="missing_manifest"` |
| `test_parse_wrong_app` | manifest.app != "retiremodel"; expect `error_type="wrong_app"` |
| `test_parse_wrong_format_version` | manifest.format_version == "2"; expect `error_type="unsupported_format_version"` |
| `test_parse_scenario_count_mismatch` | 2 scenarios in ZIP, manifest says 3; expect `error_type="scenario_count_mismatch"` |
| `test_import_no_conflict` | Import archive with non-conflicting name; verify workspace + scenarios created with new UUIDs |
| `test_import_conflict_no_resolution` | Import conflicting name without `on_conflict`; expect 409 |
| `test_import_conflict_rename` | `on_conflict=rename&new_name=...`; verify new workspace created under new name |
| `test_import_conflict_replace` | `on_conflict=replace`; verify existing workspace overwritten |
| `test_import_conflict_skip` | `on_conflict=skip`; verify 200 with action=skipped, no workspace created |
| `test_export_not_found` | Export non-existent workspace_id; expect 404 |
| `test_round_trip` | Export workspace → import archive → verify metadata and scenario names match |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Large workspace ZIP takes > 10 seconds | Unlikely at ≤ 20 scenarios (all in-memory JSON). If needed, add streaming ZIP generation. |
| User navigates away during import | Frontend: keep `File` reference in state; modal stays open during upload. No server-side cleanup needed (stateless). |
| Archive with duplicate scenario IDs | Each scenario gets a fresh UUID on import; internal archive IDs are discarded. No collision possible. |
| `replace` accidentally destroys workspace | FR-019 requires a warning before replace executes. Implemented in the modal confirmation step. |
| Rename loops if user keeps entering conflicting names | Backend re-validates on each rename attempt and returns 409 if still conflicts; frontend loops the rename input. |
