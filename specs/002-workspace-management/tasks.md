# Tasks: Workspace Management

**Input**: Design documents from `/specs/002-workspace-management/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create package structure and shared utilities for the new layers

- [x] T001 Create api/services/__init__.py and api/storage/__init__.py package directories with empty init files
- [x] T002 [P] Create custom exception classes (WorkspaceNotFoundError, StorageError) in api/services/exceptions.py per research.md error handling decision

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: File persistence layer and app configuration that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement WorkspaceStore in api/storage/workspace_store.py with configurable base_path (default Path.home() / ".retiremodel"), auto-creating directory structure. Methods: save(workspace), load(workspace_id) -> Workspace, list_all() -> list[Workspace], delete(workspace_id), exists(workspace_id) -> bool. Use Pydantic model_dump_json() / model_validate_json() for serialization. Raise StorageError on I/O failures, WorkspaceNotFoundError when ID not found. File layout: {base_path}/workspaces/{workspace_id}/workspace.json
- [x] T004 [P] Update api/main.py to make base_path configurable — replace hardcoded WORKSPACES_DIR with a path that can be overridden via constructor injection on the storage layer. Keep Path.home() / ".retiremodel" as the default. Preserve existing lifespan directory creation behavior.

**Checkpoint**: Storage layer ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Create and Retrieve a Workspace (Priority: P1) MVP

**Goal**: A user can create a workspace with a client name and retrieve it by ID. New workspaces auto-populate with default assumptions, 8 default personas, and default Monte Carlo config.

**Independent Test**: POST a workspace with client_name "Acme Corp", then GET it by the returned ID. Verify UUID, client_name, 8 personas, default assumptions, and timestamps are all present and correct.

### Implementation for User Story 1

- [x] T005 [P] [US1] Create WorkspaceCreate request schema in api/routers/workspaces.py — fields: client_name (str, required, non-empty after strip), name (str | None, defaults to client_name). Use Pydantic BaseModel with field validators per contracts/workspace-api.md
- [x] T006 [US1] Implement WorkspaceService in api/services/workspace_service.py with create_workspace(request: WorkspaceCreate) -> Workspace and get_workspace(workspace_id: UUID) -> Workspace methods. create_workspace must: generate UUID, populate 8 default personas via default_personas() factory from api/models/defaults, set default Assumptions and MonteCarloConfig, set created_at/updated_at timestamps, persist via WorkspaceStore.save(). get_workspace must: load via WorkspaceStore.load(), raise WorkspaceNotFoundError if not found.
- [x] T007 [US1] Implement POST /api/v1/workspaces (201 Created, returns full Workspace) and GET /api/v1/workspaces/{workspace_id} (200 OK, returns full Workspace; 404 on not found) endpoints in api/routers/workspaces.py. Map WorkspaceNotFoundError to 404 HTTPException. Wire WorkspaceService as dependency.
- [x] T008 [US1] Register workspace router in api/main.py — import router from api.routers.workspaces and include it on the api_router with prefix "/workspaces". Wire WorkspaceStore instance into the app's dependency injection (via lifespan state or app.state).

**Checkpoint**: POST + GET endpoints working. Creating a workspace returns all defaults including 8 personas. Retrieving by ID returns matching data.

---

## Phase 4: User Story 2 - List Workspaces (Priority: P1)

**Goal**: A user can list all workspaces with summary information (ID, name, client_name, timestamps) without loading full workspace data.

**Independent Test**: Create 3 workspaces with different client names, then GET /workspaces. Verify all 3 returned with correct IDs and client names. Also verify empty list when no workspaces exist.

### Implementation for User Story 2

- [x] T009 [P] [US2] Create WorkspaceSummary response schema in api/routers/workspaces.py — fields: id (UUID), name (str), client_name (str), created_at (datetime), updated_at (datetime). Per contracts/workspace-api.md list endpoint response format.
- [x] T010 [US2] Add list_workspaces() -> list[WorkspaceSummary] method to WorkspaceService in api/services/workspace_service.py. Load all workspaces via WorkspaceStore.list_all() and map each to WorkspaceSummary. Handle corrupted workspace files gracefully per edge case (skip with error log, don't fail entire list).
- [x] T011 [US2] Implement GET /api/v1/workspaces list endpoint in api/routers/workspaces.py — returns list[WorkspaceSummary] (200 OK). Returns empty list [] when no workspaces exist.

**Checkpoint**: List endpoint returns summary for all workspaces. Empty list for fresh install. Corrupted files don't crash the listing.

---

## Phase 5: User Story 3 - Update Workspace Configuration (Priority: P2)

**Goal**: A user can partially update a workspace's name, client_name, and/or base assumptions. Only provided fields change. Nested assumption fields are deep-merged (e.g., updating equity.expected_return preserves equity.standard_deviation).

**Independent Test**: Create a workspace, PATCH with {"client_name": "New Name", "base_config": {"inflation_rate": 0.03}}. Verify client_name changed, inflation_rate changed, all other assumptions unchanged, updated_at refreshed.

### Implementation for User Story 3

- [x] T012 [P] [US3] Create AssetClassReturnOverride and AssumptionsOverride models in api/models/assumptions_override.py per data-model.md. All fields Optional[T] = None. AssetClassReturnOverride: expected_return (float | None), standard_deviation (float | None, ge=0.0 when set). AssumptionsOverride: mirrors Assumptions fields but all optional, uses AssetClassReturnOverride for nested asset class fields.
- [x] T013 [P] [US3] Create WorkspaceUpdate request schema in api/routers/workspaces.py — fields: name (str | None), client_name (str | None, non-empty when set), base_config (AssumptionsOverride | None). Per contracts/workspace-api.md PATCH endpoint.
- [x] T014 [US3] Implement resolve_config(base: Assumptions, overrides: AssumptionsOverride | None) -> Assumptions function in api/services/config_resolver.py. If overrides is None, return base unchanged. For each field: if override value is not None, use it; else use base value. For nested AssetClassReturn fields: recurse — if AssetClassReturnOverride is not None, merge its non-None fields with the base AssetClassReturn. Return a fully validated Assumptions instance. Per research.md deep-merge decision.
- [x] T015 [US3] Add update_workspace(workspace_id: UUID, update: WorkspaceUpdate) -> Workspace method to WorkspaceService in api/services/workspace_service.py. Load existing workspace, apply name/client_name if set (use model_dump(exclude_unset=True) pattern), deep-merge base_config via resolve_config if set, refresh updated_at timestamp, persist via WorkspaceStore.save(). Raise WorkspaceNotFoundError if ID not found.
- [x] T016 [US3] Implement PATCH /api/v1/workspaces/{workspace_id} endpoint in api/routers/workspaces.py — accepts WorkspaceUpdate body, returns full updated Workspace (200 OK). Map WorkspaceNotFoundError to 404.

**Checkpoint**: PATCH endpoint handles partial name/client_name updates and deep-merged base_config updates. Nested assumption fields merge correctly without losing sibling values.

---

## Phase 6: User Story 4 - Delete a Workspace (Priority: P2)

**Goal**: A user can delete a workspace by ID, removing the workspace directory and all contained files (including any future scenario data) from disk.

**Independent Test**: Create a workspace, note its ID, DELETE it. Verify 204 response. Verify GET returns 404. Verify workspace directory no longer exists on disk.

### Implementation for User Story 4

- [x] T017 [US4] Add delete_workspace(workspace_id: UUID) method to WorkspaceService in api/services/workspace_service.py. Verify workspace exists (raise WorkspaceNotFoundError if not), then delegate to WorkspaceStore.delete() which removes the entire workspace directory (shutil.rmtree).
- [x] T018 [US4] Implement DELETE /api/v1/workspaces/{workspace_id} endpoint in api/routers/workspaces.py — returns 204 No Content on success. Map WorkspaceNotFoundError to 404.

**Checkpoint**: Delete removes workspace from disk. GET and LIST no longer include it. Deleting non-existent workspace returns 404.

---

## Phase 7: User Story 5 - Configuration Inheritance for Scenarios (Priority: P2)

**Goal**: The configuration inheritance mechanism is in place so that scenarios can deep-merge their assumption overrides with the workspace base config. The resolve_config function (built in US3) handles this. The Scenario model is updated to use AssumptionsOverride for its overrides field.

**Independent Test**: Create a workspace with default assumptions. Call resolve_config with a partial AssumptionsOverride (e.g., only inflation_rate=0.035). Verify result has overridden inflation and all other fields from workspace base. Also test nested override (e.g., equity.expected_return only) preserves sibling fields.

### Implementation for User Story 5

- [x] T019 [US5] Update Scenario.overrides field type from Assumptions | None to AssumptionsOverride | None in api/models/scenario.py. Update the import to use AssumptionsOverride from api.models.assumptions_override. This enables scenarios to express partial overrides instead of requiring a full Assumptions instance.
- [x] T020 [US5] Update api/models/__init__.py to export AssumptionsOverride and AssetClassReturnOverride from the public models API. Add both to the __all__ list.

**Checkpoint**: Scenario model accepts partial overrides. resolve_config correctly merges scenario overrides with workspace base config for all field types including nested AssetClassReturn fields.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [x] T021 [P] Run ruff check on all new files (api/services/, api/storage/, api/routers/workspaces.py, api/models/assumptions_override.py) and fix any linting issues
- [x] T022 Validate quickstart.md scenarios work end-to-end — start the server, execute the curl commands from specs/002-workspace-management/quickstart.md, verify expected responses

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — first user story
- **US2 (Phase 4)**: Depends on US1 (shares WorkspaceService file and router file)
- **US3 (Phase 5)**: Depends on US2 (shares WorkspaceService file and router file)
- **US4 (Phase 6)**: Depends on US3 (shares WorkspaceService file and router file)
- **US5 (Phase 7)**: Depends on US3 (uses AssumptionsOverride models and resolve_config from Phase 5)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Setup → Foundational → US1 → US2 → US3 → US4
                                       ↘ US5
                                    US4 + US5 → Polish
```

- **US1 (P1)**: First story after Foundational — establishes service + router + wiring
- **US2 (P1)**: Adds list method and endpoint to files created in US1
- **US3 (P2)**: Adds override models, deep-merge utility, and update endpoint
- **US4 (P2)**: Adds delete method and endpoint — can run in parallel with US5
- **US5 (P2)**: Updates Scenario model and exports — can run in parallel with US4

### Within Each User Story

- Schemas/models before services
- Services before endpoints
- Endpoints before wiring/registration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1**: T001 and T002 in parallel (different files)
- **Phase 2**: T003 and T004 in parallel (different files)
- **Phase 3**: T005 can run ahead (schema only, no deps on service)
- **Phase 4**: T009 can run ahead (schema only)
- **Phase 5**: T012 and T013 in parallel (different files — models vs router schema)
- **Phase 6 + 7**: US4 and US5 can run in parallel (different files, no shared dependencies)
- **Phase 8**: T021 can run in parallel with T022

---

## Parallel Example: User Story 3

```bash
# Launch override models and update schema in parallel:
Task: "Create AssumptionsOverride models in api/models/assumptions_override.py"
Task: "Create WorkspaceUpdate schema in api/routers/workspaces.py"

# Then sequentially:
Task: "Implement resolve_config in api/services/config_resolver.py"
Task: "Add update_workspace to WorkspaceService in api/services/workspace_service.py"
Task: "Implement PATCH endpoint in api/routers/workspaces.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (storage layer)
3. Complete Phase 3: User Story 1 (create + get)
4. **STOP and VALIDATE**: POST a workspace, GET it back, verify defaults
5. Deploy/demo if ready — users can create and view workspaces

### Incremental Delivery

1. Setup + Foundational → Storage layer ready
2. Add US1 (create + get) → Test independently → Deploy (MVP!)
3. Add US2 (list) → Test independently → Deploy
4. Add US3 (update + deep-merge) → Test independently → Deploy
5. Add US4 (delete) + US5 (inheritance) in parallel → Test → Deploy
6. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- No test tasks generated (tests not explicitly requested in spec)
- The WorkspaceStore is built fully in Phase 2 because all stories depend on it
- resolve_config is built in US3 (first consumer) and reused by US5
- All new files go under existing api/ package per plan.md structure decision
