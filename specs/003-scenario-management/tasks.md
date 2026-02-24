# Tasks: Scenario Management

**Input**: Design documents from `/specs/003-scenario-management/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/scenarios.md

**Tests**: Not explicitly requested in the spec — test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **API source**: `api/` at repository root
- **Tests**: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared models and exceptions that all user stories depend on

- [x] T001 [P] Add `ScenarioNotFoundError` exception to `api/services/exceptions.py`. Follow the existing `WorkspaceNotFoundError` pattern: accept both `scenario_id: str` and `workspace_id: str` in the constructor, store both as attributes, and produce message `"Scenario {scenario_id} not found in workspace {workspace_id}"`.

- [x] T002 [P] Create `IrsLimitWarning` Pydantic model in `api/models/irs_warning.py`. Fields per data-model.md: `type` (Literal `"employer_additions_limit"` | `"employee_deferral_limit"`), `message` (str), `persona_id` (UUID | None), `persona_name` (str | None), `limit_name` (str), `limit_value` (float), `computed_value` (float), `year` (int | None). Export from `api/models/__init__.py`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core persistence and validation infrastructure that MUST be complete before ANY user story can be implemented

**Depends on**: Phase 1 complete

- [x] T003 [P] Create `ScenarioStore` persistence layer in `api/storage/scenario_store.py`. Follow the `WorkspaceStore` pattern. Constructor takes a `base_path: Path` (same base as workspace store). Storage layout: `{base_path}/workspaces/{workspace_id}/scenarios/{scenario_id}.json`. Implement methods: `save(scenario: Scenario)` — serialize to JSON and write file, creating `scenarios/` dir if needed; `load(workspace_id: UUID, scenario_id: UUID) -> Scenario` — read and deserialize, raise `ScenarioNotFoundError` if missing; `list_all(workspace_id: UUID) -> list[Scenario]` — load all scenario JSON files from workspace's `scenarios/` dir, skip corrupted files with warning (log like `WorkspaceStore`); `delete(workspace_id: UUID, scenario_id: UUID)` — remove file, raise `ScenarioNotFoundError` if missing; `exists(workspace_id: UUID, scenario_id: UUID) -> bool` — check file existence; `list_names(workspace_id: UUID) -> list[str]` — return just scenario names (used by duplicate naming logic). Use `model_dump_json(indent=2)` and `model_validate_json()` for serialization.

- [x] T004 [P] Implement IRS limit validator in `api/services/irs_validator.py`. Create a stateless function `validate_irs_limits(plan_design: PlanDesign, personas: list[Persona], effective_assumptions: Assumptions, retirement_age: int = 67) -> list[IrsLimitWarning]`. Two checks per research.md: (1) **Employer-side**: compute max employer match = `sum(tier.match_rate * tier.on_first_pct * comp_limit)` across all match tiers, plus max core = `core_contribution_pct * comp_limit`. If total exceeds `additions_limit`, emit warning with `type="employer_additions_limit"`. (2) **Employee-side**: for each persona, start from `persona.deferral_rate`. If `plan_design.auto_escalation_enabled`, project forward `+auto_escalation_rate` per year up to `auto_escalation_cap`. For each projected year, compute `deferral_rate * min(persona.salary, comp_limit)` and compare against applicable limit for persona's age that year: age < 50 → `deferral_limit`; age 50–59 or 64+ → `deferral_limit + catchup_limit`; age 60–63 → `deferral_limit + super_catchup_limit`. Stop projection at `retirement_age` or when rate reaches cap. Emit warning per persona per violating year with `type="employee_deferral_limit"`. IRS limits are held constant (2026 values from `effective_assumptions`).

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Create and Retrieve a Scenario (Priority: P1) MVP

**Goal**: Users can create a scenario with a plan design within a workspace, and retrieve it by ID with resolved effective assumptions and IRS validation warnings.

**Independent Test**: POST a create request with scenario name + plan design for an existing workspace, then GET the scenario by ID and verify all fields match, effective_assumptions are resolved, and IRS warnings are present when applicable.

### Implementation for User Story 1

- [x] T005 [US1] Implement `ScenarioService` with `create_scenario` and `get_scenario` methods in `api/services/scenario_service.py`. Constructor takes `workspace_store: WorkspaceStore` and `scenario_store: ScenarioStore`. `create_scenario(workspace_id: UUID, name: str, plan_design: PlanDesign, description: str | None, overrides: AssumptionsOverride | None) -> tuple[Scenario, list[IrsLimitWarning]]`: verify workspace exists via `workspace_store.exists()` (raise `WorkspaceNotFoundError` if not), create `Scenario` instance with `workspace_id`, generate UUID/timestamps, save via `scenario_store.save()`, load workspace to get `base_config` and `personas`, call `resolve_config(base_config, overrides)` for effective assumptions, call `validate_irs_limits(plan_design, personas, effective_assumptions, workspace.monte_carlo_config.retirement_age)`, return scenario + warnings. `get_scenario(workspace_id: UUID, scenario_id: UUID) -> tuple[Scenario, Assumptions, list[IrsLimitWarning]]`: verify workspace exists, load scenario via `scenario_store.load()`, load workspace, resolve effective assumptions, run IRS validation, return scenario + effective_assumptions + warnings.

- [x] T006 [US1] Create scenarios router in `api/routers/scenarios.py`. Define request/response schemas per data-model.md and contracts/scenarios.md: `ScenarioCreate` (name: str with non-empty validator, description: str | None, plan_design: PlanDesign, overrides: AssumptionsOverride | None), `ScenarioResponse` (id, workspace_id, name, description, plan_design, overrides, effective_assumptions: Assumptions, created_at, updated_at, last_run_at, warnings: list[IrsLimitWarning]). Create `router = APIRouter()`. Add helper `_get_service(request: Request) -> ScenarioService` that extracts `workspace_store` and creates `ScenarioStore` (use same base path from `workspace_store._base_path`). Implement `POST ""` (status 201) — call `service.create_scenario()`, build `ScenarioResponse`. Implement `GET "/{scenario_id}"` — call `service.get_scenario()`, build `ScenarioResponse`. Both catch `WorkspaceNotFoundError` and `ScenarioNotFoundError` → 404.

- [x] T007 [US1] Register scenarios router in `api/main.py`. Import the scenarios router. Add it to `api_router` with prefix `/workspaces/{workspace_id}/scenarios` so the full path is `/api/v1/workspaces/{workspace_id}/scenarios`. Follow the existing pattern used for the workspaces router.

**Checkpoint**: MVP complete — create and retrieve scenarios with IRS warnings and resolved assumptions

---

## Phase 4: User Story 2 — List Scenarios Within a Workspace (Priority: P1)

**Goal**: Users can list all scenarios in a workspace with summary information, sorted by last modified date (newest first).

**Independent Test**: Create multiple scenarios in a workspace, then GET the list endpoint and verify all are returned with correct summary fields and sorted by `updated_at` descending.

**Depends on**: Phase 3 (US1) for creating scenarios to list

### Implementation for User Story 2

- [x] T008 [US2] Add `list_scenarios` method to `ScenarioService` in `api/services/scenario_service.py`. `list_scenarios(workspace_id: UUID) -> list[Scenario]`: verify workspace exists, call `scenario_store.list_all(workspace_id)`, sort by `updated_at` descending (newest first), return sorted list.

- [x] T009 [US2] Add `ScenarioSummary` schema and GET list endpoint to `api/routers/scenarios.py`. `ScenarioSummary`: id (UUID), name (str), description (str | None), created_at (datetime), updated_at (datetime). Implement `GET ""` (response_model=list[ScenarioSummary]) — call `service.list_scenarios()`, convert each Scenario to ScenarioSummary. Catch `WorkspaceNotFoundError` → 404.

**Checkpoint**: Users can list and browse scenarios within a workspace

---

## Phase 5: User Story 3 — Update a Scenario (Priority: P2)

**Goal**: Users can partially update a scenario's name, description, plan design, or assumption overrides. System re-validates against IRS limits and returns updated scenario with warnings.

**Independent Test**: Create a scenario, PATCH it with a new plan design (e.g., add a match tier), then GET it and verify changes persisted, `updated_at` refreshed, and IRS warnings recomputed.

**Depends on**: Phase 3 (US1) for creating a scenario to update

### Implementation for User Story 3

- [x] T010 [US3] Add `update_scenario` method to `ScenarioService` in `api/services/scenario_service.py`. `update_scenario(workspace_id: UUID, scenario_id: UUID, updates: dict) -> tuple[Scenario, Assumptions, list[IrsLimitWarning]]`: verify workspace exists, load scenario, apply partial updates using `model_copy(update=...)` pattern from `WorkspaceService.update_workspace()` — only fields present in `updates` dict are changed. If `plan_design` is set, replace entirely (not deep-merged). If `overrides` is set, replace entirely. Refresh `updated_at` timestamp. Save, resolve effective assumptions, run IRS validation, return updated scenario + effective_assumptions + warnings.

- [x] T011 [US3] Add `ScenarioUpdate` schema and PATCH endpoint to `api/routers/scenarios.py`. `ScenarioUpdate`: name (str | None with non-empty validator when set), description (str | None), plan_design (PlanDesign | None), overrides (AssumptionsOverride | None). Implement `PATCH "/{scenario_id}"` — extract `updates = body.model_dump(exclude_unset=True)`, call `service.update_scenario()`, build `ScenarioResponse`. Catch `WorkspaceNotFoundError` and `ScenarioNotFoundError` → 404.

**Checkpoint**: Users can iteratively refine plan designs with re-validated IRS warnings

---

## Phase 6: User Story 4 — Duplicate a Scenario (Priority: P2)

**Goal**: Users can duplicate a scenario to create a variant quickly. The copy gets a derived name ("[Name] (Copy)", "(Copy 2)", etc.), a new ID, and fresh timestamps. `last_run_at` resets to null.

**Independent Test**: Create a scenario with a detailed plan design, POST to the duplicate endpoint, verify the copy has a different ID, derived name, identical plan_design and overrides, and modifying the copy doesn't affect the original.

**Depends on**: Phase 3 (US1) for creating a scenario to duplicate

### Implementation for User Story 4

- [x] T012 [US4] Add `duplicate_scenario` method to `ScenarioService` in `api/services/scenario_service.py`. `duplicate_scenario(workspace_id: UUID, scenario_id: UUID) -> tuple[Scenario, Assumptions, list[IrsLimitWarning]]`: verify workspace exists, load source scenario. Generate derived name: get all scenario names via `scenario_store.list_names(workspace_id)`, check for `"{name} (Copy)"` — if taken, find highest N in `"{name} (Copy N)"` pattern and use N+1. Create new `Scenario` with `model_copy(deep=True)` of source, then override: new UUID, derived name, new timestamps, `last_run_at=None`, same `workspace_id`. Save new scenario. Resolve effective assumptions, run IRS validation, return new scenario + effective_assumptions + warnings.

- [x] T013 [US4] Add `POST "/{scenario_id}/duplicate"` endpoint to `api/routers/scenarios.py`. Status 201. No request body. Call `service.duplicate_scenario()`, build `ScenarioResponse`. Catch `WorkspaceNotFoundError` and `ScenarioNotFoundError` → 404.

**Checkpoint**: Users can quickly create scenario variants for "what-if" analysis

---

## Phase 7: User Story 5 — Delete a Scenario (Priority: P3)

**Goal**: Users can permanently delete a scenario from a workspace.

**Independent Test**: Create a scenario, DELETE it by ID, verify it no longer appears in the list endpoint and GET returns 404.

**Depends on**: Phase 3 (US1) for creating a scenario to delete

### Implementation for User Story 5

- [x] T014 [US5] Add `delete_scenario` method to `ScenarioService` in `api/services/scenario_service.py`. `delete_scenario(workspace_id: UUID, scenario_id: UUID) -> None`: verify workspace exists, call `scenario_store.delete(workspace_id, scenario_id)` which raises `ScenarioNotFoundError` if missing.

- [x] T015 [US5] Add `DELETE "/{scenario_id}"` endpoint to `api/routers/scenarios.py`. Status 204, return `Response(status_code=204)`. Catch `WorkspaceNotFoundError` and `ScenarioNotFoundError` → 404.

**Checkpoint**: Full CRUD + duplicate lifecycle complete

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation and edge case coverage

- [x] T016 Run full CRUD + duplicate flow per `specs/003-scenario-management/quickstart.md` — create workspace, create scenario, list, get, duplicate, update duplicate, delete original. Verify all responses match contracts/scenarios.md shapes.

- [x] T017 Verify edge case handling: create scenario with zero match tiers and zero core contribution (should succeed), create with duplicate name (should succeed), update with escalation cap < enroll rate (should reject with 422), duplicate when copy name already exists (should increment), verify IRS warnings appear for both employer-side and employee-side violations.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — first user story, establishes the router/service pattern
- **US2 (Phase 4)**: Depends on Phase 3 (needs scenarios to exist to list them)
- **US3 (Phase 5)**: Depends on Phase 3 (needs scenarios to update)
- **US4 (Phase 6)**: Depends on Phase 3 (needs scenarios to duplicate)
- **US5 (Phase 7)**: Depends on Phase 3 (needs scenarios to delete)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: BLOCKS US2, US3, US4, US5 — establishes service/router structure
- **US2 (P1)**: Independent of US3, US4, US5 — only reads
- **US3 (P2)**: Independent of US2, US4, US5 — only modifies existing scenarios
- **US4 (P2)**: Independent of US2, US3, US5 — creates new from existing
- **US5 (P3)**: Independent of US2, US3, US4 — only deletes

### Within Each User Story

- Service method before router endpoint (endpoint imports service)
- Router registration (T007) after router is created

### Parallel Opportunities

**Phase 1**: T001 and T002 are fully parallel (different files, no cross-deps)

**Phase 2**: T003 and T004 are fully parallel (different files)

**After US1 is complete**: US2, US3, US4, US5 can proceed in parallel since they modify different methods in the same files. If single-agent sequential execution, recommended order: US2 → US3 → US4 → US5 (priority order).

---

## Parallel Example: Phase 1 + Phase 2

```text
# Phase 1 — launch in parallel:
Task: T001 "Add ScenarioNotFoundError to api/services/exceptions.py"
Task: T002 "Create IrsLimitWarning model in api/models/irs_warning.py"

# Phase 2 — after Phase 1 completes, launch in parallel:
Task: T003 "Create ScenarioStore in api/storage/scenario_store.py"
Task: T004 "Implement IRS validator in api/services/irs_validator.py"
```

## Parallel Example: User Stories 2–5 (after US1)

```text
# After Phase 3 (US1) checkpoint passes — all can start in parallel:
Task: T008+T009 "US2: List scenarios (service + endpoint)"
Task: T010+T011 "US3: Update scenario (service + endpoint)"
Task: T012+T013 "US4: Duplicate scenario (service + endpoint)"
Task: T014+T015 "US5: Delete scenario (service + endpoint)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: US1 Create + Retrieve (T005–T007)
4. **STOP and VALIDATE**: POST a scenario, GET it back, verify effective_assumptions and IRS warnings
5. MVP is deployable — users can create and inspect plan designs

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Add US1 → Test independently → Deploy (MVP)
3. Add US2 → Test list endpoint → Deploy
4. Add US3 → Test update flow → Deploy
5. Add US4 → Test duplicate flow → Deploy
6. Add US5 → Test delete flow → Deploy
7. Polish → Full validation → Release

---

## Notes

- [P] tasks = different files, no dependencies within that phase
- [USn] label maps task to specific user story for traceability
- No test tasks included — tests were not explicitly requested in the spec
- All existing models (Scenario, PlanDesign, Assumptions, Persona, etc.) are unchanged
- Only 2 existing files are modified: `api/main.py` (router registration) and `api/services/exceptions.py` (new exception)
- 4 new files created: `api/routers/scenarios.py`, `api/services/scenario_service.py`, `api/services/irs_validator.py`, `api/storage/scenario_store.py`
- 1 new model file: `api/models/irs_warning.py`
