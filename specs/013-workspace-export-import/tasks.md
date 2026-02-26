# Tasks: Workspace Export and Import

**Input**: Design documents from `/specs/013-workspace-export-import/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api.md ✓, quickstart.md ✓

**Tests**: Not explicitly requested in spec — no test tasks generated.

**Organization**: Tasks are grouped by user story. US1 (export) and US2 (import basic) and US3 (conflict resolution) can each be demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new service and router files; wire the router into the app. No user story work can begin until T003 completes.

- [x] T001 Create `api/services/export_import_service.py` with `ArchiveValidationError(Exception)` (fields: `error_type: str`, `detail: str`) and `ArchiveContents` dataclass (fields: `manifest: dict`, `workspace: Workspace`, `scenarios: list[Scenario]`)
- [x] T002 [P] Create `api/routers/workspace_archive.py` with a FastAPI `APIRouter(tags=["workspaces"])` and two placeholder route stubs: `GET /workspaces/{workspace_id}/export` and `POST /workspaces/import`
- [x] T003 Register `workspace_archive.router` in `api/main.py` with `prefix="/api/v1"` alongside existing routers

**Checkpoint**: Backend starts without errors; `GET /api/v1/workspaces/{id}/export` and `POST /api/v1/workspaces/import` return 501 or placeholder responses.

---

## Phase 2: Foundational (Blocking Prerequisites)

No additional blocking foundational tasks. The shared types (T001) and router registration (T003) are the only prerequisites. User story work begins immediately after Phase 1.

---

## Phase 3: User Story 1 — Export Workspace to Portable Archive (Priority: P1) 🎯 MVP

**Goal**: Users can download any workspace as a ZIP archive from the workspace list page and workspace settings page.

**Independent Test**: Create a workspace with at least one scenario. Click "Export" from the workspace list card. Verify a `.zip` file downloads. Unzip and confirm `manifest.json`, `workspace.json`, and `scenarios/{id}.json` are present with correct content. Repeat from Settings page.

### Implementation

- [x] T004 [P] [US1] Implement `build_workspace_archive(workspace_id, workspace_store, scenario_store) -> bytes` in `api/services/export_import_service.py` — loads workspace + all scenarios, builds a ZIP in `io.BytesIO` containing `manifest.json` (format_version, app, exported_at, source_workspace_id, workspace_name, client_name, scenario_count), `workspace.json`, and `scenarios/{scenario_id}.json` for each scenario; returns raw bytes
- [x] T005 [US1] Implement `GET /api/v1/workspaces/{workspace_id}/export` in `api/routers/workspace_archive.py` — calls `build_workspace_archive`, returns `StreamingResponse(io.BytesIO(zip_bytes), media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{sanitized_name}_export.zip"'})`; raises HTTP 404 on `WorkspaceNotFoundError`
- [x] T006 [P] [US1] Add `exportWorkspace(workspaceId: string): Promise<Blob>` to `app/src/services/api.ts` — `GET /api/v1/workspaces/{workspaceId}/export`, returns `response.blob()`
- [x] T007 [P] [US1] Add `onExport: () => void` prop and export `Download` icon button to `app/src/components/WorkspaceCard.tsx` — sits alongside the existing `Trash2` delete button in the top-right; calls `e.stopPropagation()` before `onExport()`
- [x] T008 [US1] Add export handler and "Import" button placeholder to `app/src/pages/DashboardPage.tsx` — implement `handleExport(ws: WorkspaceSummary)` that calls `exportWorkspace`, builds a blob URL, clicks a temporary `<a>` element with `download="${ws.client_name}_export.zip"`, then revokes the URL; pass handler to each `WorkspaceCard` as `onExport`
- [x] T009 [US1] Add "Portability" section to `app/src/pages/SettingsPage.tsx` with an "Export Workspace" button — button calls `exportWorkspace(activeWorkspace.id)` and triggers the same blob download pattern; section positioned after the existing settings content

**Checkpoint**: Export works end-to-end from both workspace list and settings. ZIP opens correctly and contains valid JSON files.

---

## Phase 4: User Story 2 — Import Workspace from Archive (Priority: P2)

**Goal**: Users can upload a workspace ZIP archive to create a new workspace. Invalid archives are rejected with a clear error. Successful import creates a workspace with all scenarios restored.

**Independent Test**: Export a workspace to get a valid archive. Click "Import" from the workspace list. Upload the archive file. Verify a new workspace appears in the list with the same name, scenarios, and metadata (minus simulation run timestamps). Upload a corrupted file and confirm a descriptive error appears without creating any workspace.

### Implementation

- [x] T010 [P] [US2] Implement `parse_and_validate_archive(zip_bytes: bytes) -> ArchiveContents` in `api/services/export_import_service.py` — raises `ArchiveValidationError` for: not-a-zip, missing `manifest.json`, malformed JSON, `app != "retiremodel"`, `format_version != "1"`, missing `workspace.json`, invalid workspace JSON (Pydantic), scenario count mismatch, invalid scenario JSON; on success returns populated `ArchiveContents`
- [x] T011 [P] [US2] Implement `create_workspace_from_archive(archive: ArchiveContents, workspace_store, scenario_store, new_name=None) -> Workspace` in `api/services/export_import_service.py` — assigns new UUID4 to workspace and all scenarios; sets `created_at`/`updated_at` to current UTC; applies `new_name` override if provided; sets `last_run_at = None` on all scenarios; saves via existing store classes; returns new `Workspace`
- [x] T012 [US2] Implement `POST /api/v1/workspaces/import` in `api/routers/workspace_archive.py` — accepts `UploadFile`; reads bytes; calls `parse_and_validate_archive` (HTTP 422 with `error_type` on `ArchiveValidationError`); checks for existing workspace with same `workspace_name` via `workspace_store.list_all()` name match; if no conflict: calls `create_workspace_from_archive`, returns 201 JSON `{workspace_id, workspace_name, client_name, scenario_count, action: "created"}`; conflict detection (HTTP 409 with conflict payload) added in Phase 5
- [x] T013 [P] [US2] Add `importWorkspace(file: File, options?)` function, `ImportResult` interface, and `ImportConflictError` class to `app/src/services/api.ts` — builds `FormData` with `file` field; constructs URL with `on_conflict`/`new_name` query params when provided; throws `ImportConflictError` (with conflict fields) on HTTP 409; throws `Error` with `detail` on HTTP 422; returns `ImportResult` on success
- [x] T014 [US2] Create `app/src/components/ImportWorkspaceModal.tsx` — props: `{ isOpen, onClose, onImported }` — renders a modal (matching `CreateWorkspaceModal` style) with a `<input type="file" accept=".zip">` field, submit button, loading state, and error display; on success calls `onImported(result)` and closes; conflict state left as placeholder (shows generic "conflict detected" message) — full conflict UI added in Phase 5
- [x] T015 [US2] Wire `ImportWorkspaceModal` into `app/src/pages/DashboardPage.tsx` — add `isImportModalOpen` state; add "Import" button (with `Upload` icon from lucide-react) in the action bar alongside "New Workspace"; `onImported` handler calls `refreshWorkspaces()` then navigates to `/scenarios` with new workspace set as active
- [x] T016 [US2] Add "Import Workspace" button to the Portability section in `app/src/pages/SettingsPage.tsx` — button opens `ImportWorkspaceModal`; on success calls `refreshWorkspaces()`

**Checkpoint**: Round-trip works — export a workspace, import the archive, verify the new workspace appears with all scenarios. Invalid uploads show descriptive errors.

---

## Phase 5: User Story 3 — Resolve Naming Conflicts on Import (Priority: P3)

**Goal**: When importing an archive whose workspace name already exists, users are presented with three options — rename, replace, or skip — and each path resolves cleanly.

**Independent Test**: Export a workspace. Without deleting it, import the same archive. Verify the conflict resolution dialog appears. Test each path: (a) rename → new workspace appears under new name; (b) replace → existing workspace is overwritten (confirm warning shown first); (c) skip → no workspace created, user returned to previous state. Attempt rename with a name that also conflicts → system re-prompts.

### Implementation

- [x] T017 [US3] Implement `replace_workspace_from_archive(archive: ArchiveContents, existing_workspace_id: UUID, workspace_store, scenario_store) -> Workspace` in `api/services/export_import_service.py` — deletes all existing scenarios for `existing_workspace_id` via `scenario_store`; overwrites workspace record keeping original `id` but updating all other fields from archive; re-creates all scenarios with new UUIDs under the existing workspace ID; returns updated `Workspace`
- [x] T018 [US3] Extend `POST /api/v1/workspaces/import` in `api/routers/workspace_archive.py` — when conflict detected and `on_conflict` is `None` → HTTP 409 with `{detail, conflict_type, archive_workspace_name, archive_client_name, existing_workspace_id}`; when `on_conflict="skip"` → HTTP 200 `{action: "skipped"}`; when `on_conflict="replace"` → call `replace_workspace_from_archive`, return 201 `{..., action: "replaced"}`; when `on_conflict="rename"` → validate `new_name` provided and not conflicting (re-raise 409 if still conflicts), call `create_workspace_from_archive(..., new_name=new_name)`, return 201
- [x] T019 [US3] Extend `app/src/components/ImportWorkspaceModal.tsx` with full conflict resolution UI — when `importWorkspace` throws `ImportConflictError`: transition to `conflict` state showing workspace name and three option buttons ("Rename", "Replace", "Skip"); "Rename" shows a text input for new name and re-submits with `on_conflict=rename&new_name=...`; "Replace" shows a destructive-action confirmation warning then re-submits with `on_conflict=replace`; "Skip" calls `onClose()`; if rename re-submit returns another 409 (new name also conflicts), keep rename input visible with inline validation error; cache original `File` in state across all re-submissions

**Checkpoint**: All three conflict resolution paths work. Replace warning is shown. Rename loops correctly on secondary conflicts.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improve error visibility, robustness, and UX across all stories.

- [x] T020 [P] Add per-workspace export loading state and error feedback in `app/src/pages/DashboardPage.tsx` — track `exportingWorkspaceId: string | null` state; show a spinner or disabled state on the exporting card's export button; on failure show an error banner matching the existing error display pattern
- [x] T021 [P] Add export error handling to Portability section in `app/src/pages/SettingsPage.tsx` — show inline error message if `exportWorkspace` rejects; dismiss on retry
- [x] T022 [P] Add filename sanitization helper in `api/services/export_import_service.py` — strips characters unsafe for filenames (keep alphanumerics, hyphens, underscores, spaces → replace spaces with underscores); used by the export endpoint for `Content-Disposition` filename
- [x] T023 Run the full round-trip validation described in `specs/013-workspace-export-import/quickstart.md` — export a workspace, import it, verify metadata and scenario names match; attempt each error case (corrupt file, missing manifest, wrong app, conflict paths)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 3 (US1)**: Depends on Phase 1 (T001 for service file, T002-T003 for router)
- **Phase 4 (US2)**: Depends on Phase 1; T012 depends on T010 + T011
- **Phase 5 (US3)**: Depends on Phase 4 (T017 plugs into the import endpoint; T019 extends the modal)
- **Phase 6 (Polish)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 1 only — fully independent
- **US2 (P2)**: Depends on Phase 1; independent of US1 (can start in parallel with US1 after Phase 1)
- **US3 (P3)**: Depends on US2 (extends the import endpoint and modal)

### Within Each User Story

- Backend service function(s) before backend endpoint
- Backend endpoint before frontend API function
- Frontend API function before frontend component/page
- Within backend: parallel functions (same file, different functions) can be authored simultaneously

### Parallel Opportunities

- T001, T002 can run in parallel (different files)
- T004, T006, T007 can run in parallel (different files; T004 = backend service, T006 = api.ts, T007 = WorkspaceCard)
- T010, T011, T013 can run in parallel (T010 + T011 = different functions in service file; T013 = frontend api.ts)
- T020, T021, T022 can all run in parallel (different files)

---

## Parallel Example: User Story 1

```
# After Phase 1 completes, launch all US1 tasks that touch different files:
Task: "Implement build_workspace_archive() in api/services/export_import_service.py"  [T004]
Task: "Add exportWorkspace() to app/src/services/api.ts"                              [T006]
Task: "Add export button to app/src/components/WorkspaceCard.tsx"                     [T007]

# Then sequentially (each depends on above):
Task: "Implement GET /export endpoint in api/routers/workspace_archive.py"            [T005]
Task: "Wire export handler in DashboardPage.tsx"                                      [T008]
Task: "Add Portability section to SettingsPage.tsx"                                   [T009]
```

## Parallel Example: User Story 2

```
# After Phase 1, these three touch different files:
Task: "Implement parse_and_validate_archive() in export_import_service.py"            [T010]
Task: "Implement create_workspace_from_archive() in export_import_service.py"         [T011]
Task: "Add importWorkspace() to app/src/services/api.ts"                              [T013]

# Then sequentially:
Task: "Implement POST /import endpoint in workspace_archive.py"                       [T012]
Task: "Create ImportWorkspaceModal.tsx"                                               [T014]
Task: "Wire ImportWorkspaceModal into DashboardPage.tsx"                              [T015]
Task: "Add Import button to SettingsPage.tsx"                                         [T016]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 3: US1 Export (T004–T009)
3. **STOP and VALIDATE**: Export a workspace, inspect ZIP, confirm contents
4. Demo: users can back up and share workspaces

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phase 3 (US1) → Export works → Demo/deploy
3. Phase 4 (US2) → Basic import works → Demo/deploy
4. Phase 5 (US3) → Conflict resolution works → Demo/deploy
5. Phase 6 → Polish → Release

### Parallel Team Strategy

With two developers after Phase 1:
- Developer A: US1 backend (T004, T005) → US1 frontend (T006, T007, T008, T009)
- Developer B: US2 backend (T010, T011, T012) → US2 frontend (T013, T014, T015, T016)
- Then both converge on US3 (T017, T018, T019) and Polish

---

## Notes

- [P] tasks = touch different files, no blocking inter-dependencies
- [Story] label maps each task to a user story for traceability
- Existing store classes (`WorkspaceStore`, `ScenarioStore`) are used as-is — no new storage layer
- No new dependencies: `zipfile` (stdlib), `io.BytesIO` (already used), native `FormData` (browser)
- The `File` object from `<input type="file">` must be cached in `ImportWorkspaceModal` state to enable re-submission during conflict resolution without forcing the user to re-select
- Commit at each checkpoint (end of US1, US2, US3) so each story can be independently reviewed
