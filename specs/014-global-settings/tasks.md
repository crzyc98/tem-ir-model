# Tasks: Global Settings Page

**Input**: Design documents from `/specs/014-global-settings/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in every description

---

## Phase 1: Setup

No new project initialization required — this feature extends the existing FastAPI + React application. No new dependencies: `pyyaml>=6.0` is already in `api/requirements.txt`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend model, store, and TypeScript types that ALL user story phases depend on. No user story work begins until this phase is complete.

**⚠️ CRITICAL**: All phases 3–6 depend on this phase being complete.

- [x] T001 Add `ss_taxable_max: float = Field(default=176_100, gt=0)` field to the IRS limits block in `api/models/assumptions.py`
- [x] T002 Create `api/models/global_defaults.py` with `GlobalDefaults` Pydantic model (all 13 fields: inflation_rate, salary_real_growth_rate, 6 IRS limits, target_replacement_ratio_mode, target_replacement_ratio_override, retirement_age, planning_age, ss_claiming_age), `SYSTEM_DEFAULTS` dict, and cross-field `model_validator`s (planning_age > retirement_age; flat_percentage mode requires override)
- [x] T003 Create `api/storage/global_defaults_store.py` with `GlobalDefaultsStore` class: `__init__(base_path)`, `load()` (yaml.safe_load with fallback to `GlobalDefaults()` on missing/corrupted file), `save(defaults)` (yaml.safe_dump), `reset()` (unlink file, return `GlobalDefaults()`)
- [x] T004 [P] Create `app/src/types/global-settings.ts` with `ReplacementRatioMode` type, `GlobalSettings` interface (all 13 fields), `SYSTEM_DEFAULTS` const, and `NUM_SIMULATIONS = 250` const
- [x] T005 Update `api/main.py`: import `GlobalDefaultsStore` and `global_settings_router`; instantiate `defaults_store = GlobalDefaultsStore(bp)`; set `application.state.global_defaults_store = defaults_store`; register router with `api_router.include_router(global_settings_router, prefix="/global-settings")`

**Checkpoint**: `GlobalDefaults`, `GlobalDefaultsStore`, and TS types exist — user story implementation can begin.

---

## Phase 3: User Story 1 — Configure Economic & IRS Defaults (Priority: P1) 🎯 MVP

**Goal**: Users can view and edit all economic assumptions (inflation rate, salary real growth rate) and IRS limits (6 fields) on the Global Settings page, save them to `~/.retiremodel/global_defaults.yaml`, and have those values automatically pre-populate new workspaces.

**Independent Test**: Navigate to `/global-settings`, change inflation rate to 3.0%, click Save. Verify `~/.retiremodel/global_defaults.yaml` contains `inflation_rate: 0.03`. Create a new workspace; verify `base_config.inflation_rate == 0.03` in the workspace JSON.

### Implementation — US1 Backend

- [x] T006 [US1] Create `api/routers/global_settings.py` with `APIRouter(tags=["global-settings"])`, `_get_store(request)` helper, `GET /` endpoint (`get_global_settings` → `store.load()`), and `PUT /` endpoint (`save_global_settings(body: GlobalDefaults)` → `store.save(body)`)
- [x] T007 [US1] Update `api/services/workspace_service.py`: add `global_defaults: GlobalDefaults | None = None` param to `create_workspace()`; build `base_config = Assumptions(inflation_rate=d.inflation_rate, salary_real_growth_rate=d.salary_real_growth_rate, comp_limit=d.comp_limit, deferral_limit=d.deferral_limit, additions_limit=d.additions_limit, catchup_limit=d.catchup_limit, super_catchup_limit=d.super_catchup_limit, ss_taxable_max=d.ss_taxable_max, target_replacement_ratio_override=d.target_replacement_ratio_override if d.target_replacement_ratio_mode == "flat_percentage" else None)`; build `monte_carlo_config = MonteCarloConfig(retirement_age=d.retirement_age, planning_age=d.planning_age)`; build personas via `[p.model_copy(update={"ss_claiming_age": d.ss_claiming_age}) for p in default_personas()]`
- [x] T008 [US1] Update `api/routers/workspaces.py` `create_workspace` endpoint: add `from api.storage.global_defaults_store import GlobalDefaultsStore`; load `global_defaults = request.app.state.global_defaults_store.load()`; pass to `service.create_workspace(..., global_defaults=global_defaults)`

### Implementation — US1 Frontend

- [x] T009 [P] [US1] Add `getGlobalSettings()` and `saveGlobalSettings(settings: GlobalSettings)` to `app/src/services/api.ts` (GET `/api/v1/global-settings` and PUT `/api/v1/global-settings`)
- [x] T010 [US1] Create `app/src/pages/GlobalSettingsPage.tsx` with: `useState<GlobalSettings | null>`, `loading`/`saving`/`saved`/`isDirty`/`error` state; `useEffect` calling `getGlobalSettings()` on mount; `handleSave()` calling `saveGlobalSettings()`; header with "Global Settings" title, disabled-when-clean "Save Changes" button, 3s "Saved" checkmark; "Economic & IRS Assumptions" card with Economic sub-section (Inflation Rate %, Salary Real Growth Rate % with tooltip "nominal ≈ 4.0% at default inflation"), IRS Limits sub-section (6 currency inputs: Compensation, Deferral, Additions, Catch-up 50+, Super Catch-up 60–63, SS Taxable Maximum); reuse `PercentInput` and `CurrencyInput` patterns from `app/src/pages/SettingsPage.tsx`
- [x] T011 [US1] Add `/global-settings` route in `app/src/App.tsx`: import `GlobalSettingsPage`; add `<Route path="/global-settings" element={<GlobalSettingsPage />} />` inside the Layout route
- [x] T012 [US1] Add Global Settings nav link in `app/src/components/Sidebar.tsx`: import `Globe` from `lucide-react`; add `{ kind: 'link', label: 'Global Settings', icon: Globe, to: '/global-settings' }` entry after the existing Settings link

### Tests — US1

- [x] T013 [P] [US1] Create `tests/test_global_settings.py` with `GlobalDefaultsStore` unit tests: `test_load_returns_defaults_when_no_file` (no YAML → returns `GlobalDefaults()`), `test_save_and_reload` (save modified inflation_rate; reload; verify), `test_corrupted_yaml_falls_back_to_defaults` (write invalid YAML; load() returns `GlobalDefaults()`)
- [x] T014 [P] [US1] Add endpoint + workspace seeding tests to `tests/test_global_settings.py`: `test_get_endpoint_returns_200` (GET `/api/v1/global-settings` → 200 + valid shape), `test_put_endpoint_saves_and_returns` (PUT with modified inflation_rate → 200; verify file written), `test_create_workspace_uses_global_defaults` (set inflation_rate=0.03 in store; POST `/api/v1/workspaces`; verify `workspace.base_config.inflation_rate == 0.03`)

**Checkpoint**: GET/PUT `/api/v1/global-settings` works; new workspaces are seeded with economic + IRS defaults; `/global-settings` page is navigable with Economic & IRS section fully functional.

---

## Phase 4: User Story 2 — Configure Target Replacement Ratio Mode (Priority: P2)

**Goal**: Users can switch the replacement ratio mode between "Use income-based lookup table" (default) and "Override with flat percentage applied to all personas," save the selection, and have new workspaces use the chosen mode.

**Independent Test**: On `/global-settings`, select "Override with flat percentage," enter 80%, click Save. Create a new workspace; verify `base_config.target_replacement_ratio_override == 0.80`. Switch back to "Use income-based lookup table," save. Create another workspace; verify `target_replacement_ratio_override is null`.

### Implementation — US2 Frontend

- [x] T015 [US2] Add "Target Replacement Ratio" sub-section to the "Economic & IRS Assumptions" card in `app/src/pages/GlobalSettingsPage.tsx`: two radio options ("Use income-based lookup table" / "Override with flat percentage applied to all personas"); when flat_percentage selected, show a `PercentInput` for the override value (initialize to 0.80 when first switching to flat mode if override is null); when switching back to lookup_table, set `target_replacement_ratio_override` to null in state

### Tests — US2

- [x] T016 [P] [US2] Add replacement ratio validation tests to `tests/test_global_settings.py`: `test_put_flat_mode_without_override_returns_422` (PUT with `target_replacement_ratio_mode="flat_percentage"` and `target_replacement_ratio_override=null` → 422), `test_create_workspace_flat_ratio_mode` (store with flat_percentage + 0.75 override; create workspace; verify `base_config.target_replacement_ratio_override == 0.75`), `test_create_workspace_lookup_mode_clears_override` (store with lookup_table; create workspace; verify `base_config.target_replacement_ratio_override is None`)

**Checkpoint**: Mode selector renders on Global Settings page; flat percentage input appears conditionally; both modes propagate correctly to new workspaces.

---

## Phase 5: User Story 3 — Configure Simulation Configuration Defaults (Priority: P2)

**Goal**: Users can configure the default retirement age, planning age, and Social Security claiming age for new workspaces, and see the fixed simulation count (250) displayed as read-only.

**Independent Test**: On `/global-settings`, change Planning Age to 95, click Save. Create a new workspace; verify `monte_carlo_config.planning_age == 95`. Confirm "Number of Simulations: 250" is visible and non-editable on the page.

### Implementation — US3 Frontend

- [x] T017 [US3] Add "Simulation Configuration" card to `app/src/pages/GlobalSettingsPage.tsx`: three integer inputs (Retirement Age min=55/max=70, Planning Age min=85/max=100, Social Security Claiming Age min=62/max=70); read-only display row: "Number of Simulations" with value "250" styled as a disabled input and a helper text "(fixed by scenario matrix architecture — not configurable)"

### Tests — US3

- [x] T018 [P] [US3] Add simulation defaults tests to `tests/test_global_settings.py`: `test_put_invalid_planning_age_lte_retirement_returns_422` (PUT with planning_age=67, retirement_age=67 → 422), `test_create_workspace_applies_ss_claiming_age` (store with ss_claiming_age=65; create workspace; verify all personas have `ss_claiming_age == 65`), `test_create_workspace_applies_retirement_and_planning_age` (store with retirement_age=65, planning_age=95; create workspace; verify `monte_carlo_config.retirement_age == 65` and `monte_carlo_config.planning_age == 95`)

**Checkpoint**: Simulation Configuration section renders with all three editable age fields and read-only "250" display; age values propagate to new workspace `monte_carlo_config` and all default personas.

---

## Phase 6: User Story 4 — Restore System Defaults (Priority: P3)

**Goal**: Users can reset all global settings to hardcoded system defaults with one click (with confirmation), without affecting any existing workspaces.

**Independent Test**: Save custom inflation_rate=0.04. Click "Restore System Defaults," confirm. Verify all fields display system defaults (inflation_rate=2.5%). Verify `~/.retiremodel/global_defaults.yaml` is deleted. Open an existing workspace; verify its assumptions are unchanged.

### Implementation — US4 Backend

- [x] T019 [US4] Add `POST /restore` endpoint to `api/routers/global_settings.py`: `restore_global_settings(request: Request) → GlobalDefaults`; calls `store.reset()` and returns the result

### Implementation — US4 Frontend

- [x] T020 [P] [US4] Add `restoreGlobalSettings()` to `app/src/services/api.ts` (POST `/api/v1/global-settings/restore`, returns `GlobalSettings`)
- [x] T021 [US4] Add restore functionality to `app/src/pages/GlobalSettingsPage.tsx`: `showRestoreConfirm: boolean` state; "Restore System Defaults" button (outline/danger style, placed in header alongside Save button); on click → set `showRestoreConfirm(true)`; render inline confirmation dialog (matching the `ConfirmDialog` style from `app/src/components/ConfirmDialog.tsx`): "This will reset all global settings to system defaults. Existing workspaces are not affected."; on confirm → call `restoreGlobalSettings()`, update form state with returned defaults, set `isDirty(false)`; on cancel → close dialog with no changes

### Tests — US4

- [x] T022 [P] [US4] Add restore tests to `tests/test_global_settings.py`: `test_reset_deletes_file_and_returns_defaults` (`GlobalDefaultsStore.save()` then `reset()`: file deleted, returns `GlobalDefaults()`), `test_restore_endpoint_returns_system_defaults` (save custom settings; POST `/api/v1/global-settings/restore` → 200; response matches `GlobalDefaults().model_dump()`; GET after restore also returns defaults)

**Checkpoint**: Restore button triggers confirmation dialog; confirmed restore resets all form fields to system defaults and deletes the YAML file; existing workspaces are untouched.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T023 [P] Add inline validation feedback to `app/src/pages/GlobalSettingsPage.tsx`: client-side validation before calling `saveGlobalSettings()` — planning_age must exceed retirement_age (show inline error); ss_claiming_age must be 62–70; all limit fields must be positive; display server 422 validation errors in a top-level error banner
- [ ] T024 Run end-to-end validation from `specs/014-global-settings/quickstart.md`: start backend + frontend; execute all curl examples; create workspace after each settings change; verify workspace JSON; confirm restore flow

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Requires Phase 2 complete (GlobalDefaults model + store + TS types + main.py wiring)
- **US2 (Phase 4)**: Requires Phase 2 complete — **independent of US1** (backend validation already in model; only adds frontend UI and tests)
- **US3 (Phase 5)**: Requires Phase 2 complete — **independent of US1/US2** (workspace seeding already in T007; only adds frontend section and tests)
- **US4 (Phase 6)**: Requires T005 (router registered in main.py) — otherwise independent
- **Polish (Phase 7)**: Requires all desired stories complete

### User Story Dependencies

- **US1 (P1)**: Depends only on Phase 2. No other story dependency.
- **US2 (P2)**: Depends only on Phase 2 (model validation already there). Backend is complete from Phase 2; only frontend and tests are added.
- **US3 (P2)**: Depends only on Phase 2 + T007 (workspace_service update in US1 backend). Shares priority P2 with US2.
- **US4 (P3)**: Depends on T006 (router file) — adds POST /restore endpoint to it.

### Within Each User Story

- Backend tasks (T006–T008) before endpoint tests (T013–T014)
- Frontend API client (T009) before page component (T010)
- Route (T011) and sidebar (T012) after page component exists
- US1 checkpoint verified before starting US2/US3

### Parallel Opportunities

- T004 (TS types) runs in parallel with T001–T003 (backend model + store)
- T013 and T014 (US1 tests) run in parallel — different test functions
- T009 (api.ts additions for US1) runs in parallel with T006–T008 (backend)
- T011 and T012 (route + sidebar) run in parallel after T010 (page exists)
- T016 (US2 tests) runs in parallel with T015 (US2 frontend)
- T018 (US3 tests) runs in parallel with T017 (US3 frontend)
- T020 (api.ts restore fn) runs in parallel with T019 (backend restore endpoint)
- T022 (US4 tests) runs in parallel with T021 (US4 frontend)

---

## Parallel Execution Examples

### Phase 2 — Foundational

```text
Parallel group A (backend model + store):
  T001: Add ss_taxable_max to api/models/assumptions.py
  T002: Create api/models/global_defaults.py
  T003: Create api/storage/global_defaults_store.py

Parallel group B (frontend types — independent files):
  T004: Create app/src/types/global-settings.ts

Sequential after A:
  T005: Wire GlobalDefaultsStore in api/main.py
```

### Phase 3 — US1 MVP

```text
Parallel group A (backend + frontend API client):
  T006: Create api/routers/global_settings.py
  T007: Update api/services/workspace_service.py
  T009: Add getGlobalSettings/saveGlobalSettings to api.ts

Sequential after T006:
  T008: Update api/routers/workspaces.py (depends on T006 router existing)

Sequential after T009:
  T010: Create GlobalSettingsPage.tsx
  → T011: Add route in App.tsx  (parallel with T012)
  → T012: Add nav in Sidebar.tsx (parallel with T011)

Parallel tests (after all T006–T012):
  T013: Store unit tests
  T014: Endpoint + workspace seeding tests
```

### Phases 4–5 — US2 + US3 (can run concurrently)

```text
Developer A (US2):
  T015: Add replacement ratio section to GlobalSettingsPage.tsx
  T016: Add replacement ratio tests

Developer B (US3):
  T017: Add simulation config section to GlobalSettingsPage.tsx
  T018: Add simulation defaults tests
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001–T005)
2. Complete Phase 3: US1 backend (T006–T008)
3. Complete Phase 3: US1 frontend (T009–T012)
4. Complete Phase 3: US1 tests (T013–T014)
5. **STOP and VALIDATE**: Navigate to `/global-settings`, edit economic/IRS values, save, create workspace, verify seeding
6. Demo: the page is functional, new workspaces respect global defaults

### Incremental Delivery

1. Phases 2 + 3 → **MVP**: Global Settings page with Economic & IRS section working
2. Phase 4 (US2) → Add replacement ratio mode selector
3. Phase 5 (US3) → Add simulation configuration section with read-only simulation count
4. Phase 6 (US4) → Add Restore System Defaults capability
5. Phase 7 → Polish and end-to-end validation

### Single-Developer Order (Priority Sequence)

T001 → T002 → T003 → T005 → T006 → T007 → T008 → [T004, T009 parallel] → T010 → [T011, T012 parallel] → [T013, T014 parallel] → T015 → T016 → T017 → T018 → T019 → [T020, T021 parallel] → T022 → T023 → T024

---

## Notes

- **[P]** tasks modify different files with no overlapping state — safe to run concurrently
- **[US?]** labels map tasks to spec.md user stories for traceability
- The `GlobalSettingsPage.tsx` is built incrementally across US1 (economic section), US2 (replacement ratio), US3 (simulation section), US4 (restore button) — each phase adds a new UI block; the component file itself is touched in T010, T015, T017, T021, T023
- `SettingsPage.tsx` patterns (PercentInput, CurrencyInput, dirty-state tracking, save button, error banner) should be reused directly — no new UI primitives needed
- All backend tests go in a single `tests/test_global_settings.py` file, built across phases; within each phase the new test functions can be written in parallel with the frontend work
- The `target_replacement_ratio_override` field already exists in `Assumptions` (with `float | None` default) — only `ss_taxable_max` is a genuinely new field in that model
