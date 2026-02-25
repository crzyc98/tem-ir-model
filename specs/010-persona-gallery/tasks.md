# Tasks: Persona Gallery

**Input**: Design documents from `/specs/010-persona-gallery/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `api/` at repository root (Python/FastAPI)
- **Frontend**: `app/src/` at repository root (TypeScript/React/Vite)

---

## Phase 1: Setup

**Purpose**: No new project initialization needed — this feature extends an existing codebase. Phase intentionally empty.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend model changes and API extensions that ALL user stories depend on. Frontend type updates and API service functions.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Add `hidden: bool = False` field to Persona model and relax `salary` constraint from `gt=0` to `ge=0` in `api/models/persona.py`
- [x] T002 [P] Add `max_length=12` validator on `personas` field in `api/models/workspace.py` using Pydantic field constraint
- [x] T003 [P] Add `hidden: boolean` field to Persona interface in `app/src/types/persona.ts`
- [x] T004 Add `personas: list[Persona] | None = None` field to `WorkspaceUpdate` schema and handle personas replacement in `update_workspace` endpoint in `api/routers/workspaces.py`
- [x] T005 Update `update_workspace` method in `api/services/workspace_service.py` to replace the personas list when `personas` is provided in the update payload, refreshing `updated_at`
- [x] T006 Add `reset_personas` endpoint (`POST /workspaces/{workspace_id}/personas/reset`) in `api/routers/workspaces.py` that restores default personas via `default_personas()` and returns the updated workspace
- [x] T007 Add `reset_personas` method to `WorkspaceService` in `api/services/workspace_service.py` that replaces workspace personas with `default_personas()` and saves
- [x] T008 [P] Add `updateWorkspacePersonas(workspaceId, personas)` and `resetWorkspacePersonas(workspaceId)` functions to `app/src/services/api.ts` following existing fetch + error handling patterns

**Checkpoint**: Backend accepts persona updates via PATCH and reset via POST. Frontend can call both endpoints. All user stories can now proceed.

---

## Phase 3: User Story 1 — View Persona Gallery (Priority: P1) MVP

**Goal**: Display all workspace personas as a responsive grid of cards showing name, label, age, salary, deferral rate, and current balance. Hidden personas appear visually distinct. Empty state handled.

**Independent Test**: Navigate to `/personas` with an active workspace — 8 default persona cards are displayed in a grid with correct formatted data. Hidden personas appear dimmed. Empty workspace shows empty state message.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create `PersonaCard` component in display mode only in `app/src/components/PersonaCard.tsx` — renders name, label, age, salary (formatted as $X,XXX), deferral rate (as X%), current balance (formatted as $X,XXX), allocation summary ("TDF YYYY" or "XX/XX/XX"), Social Security badge (checkmark/X icon), and hidden badge with reduced opacity styling. Include action menu placeholder (three-dot button, no handlers yet).
- [x] T010 [P] [US1] Create `PersonaGallery` component in `app/src/components/PersonaGallery.tsx` — renders responsive grid (1 col mobile, 2 cols md, 3 cols lg) of PersonaCard components. Accept personas array and callback props per component contract.
- [x] T011 [US1] Replace stub in `app/src/pages/PersonaModelingPage.tsx` with full page implementation — load workspace via `getWorkspace(workspaceId)` using `useOutletContext<LayoutContext>()` for active workspace, manage `personas` state, `editingPersonaId` state, `loading`/`saving` states, render gallery header (title + "X of 12" count), and PersonaGallery component. Include empty state with "No personas" message and "Reset to Defaults" prompt when personas array is empty.
- [x] T012 [US1] Add warning banner to `app/src/pages/PersonaModelingPage.tsx` that displays "No active personas — simulations require at least one active persona" when all personas have `hidden: true`

**Checkpoint**: User Story 1 complete — gallery displays all personas with correct formatting, hidden distinction, and empty/warning states. Independently testable by navigating to `/personas`.

---

## Phase 4: User Story 2 — Inline Edit Persona Fields (Priority: P2)

**Goal**: Clicking a persona card opens an inline editor with form fields for name, label, age, salary, deferral rate, and current balance. Real-time validation. Save persists to workspace. Cancel discards changes.

**Independent Test**: Click a persona card — editor opens with pre-filled values. Change salary to a valid value, save — card shows updated value, persists after reload. Enter invalid deferral rate (150%) — validation error shown, save blocked. Click cancel — original values restored.

### Implementation for User Story 2

- [x] T013 [US2] Add edit mode to `PersonaCard` in `app/src/components/PersonaCard.tsx` — when `isEditing` is true, render form fields: name (text input), label (text input), age (number input, 18–80), salary (currency input, >= 0), deferral rate (percentage input, 0–100%), current balance (currency input, >= 0). Include real-time validation with inline error messages per field. Add Save button (disabled when validation errors present) and Cancel button.
- [x] T014 [US2] Wire save and cancel handlers in `app/src/pages/PersonaModelingPage.tsx` — `onSave` updates local personas array with edited persona, calls `updateWorkspacePersonas()` API function, and exits edit mode on success. `onCancel` resets `editingPersonaId` to null. `onEdit` sets `editingPersonaId` to clicked persona's ID (closing any other open editor).
- [x] T015 [US2] Connect action menu "Edit" button in `PersonaCard` display mode to trigger `onEdit` callback, transitioning the card to edit mode in `app/src/components/PersonaCard.tsx`

**Checkpoint**: User Story 2 complete — inline editing works end-to-end with validation and persistence. Independently testable by clicking cards and modifying fields.

---

## Phase 5: User Story 3 — Add, Delete, Hide, and Reset Personas (Priority: P3)

**Goal**: Users can add new personas (up to 12), delete permanently (with confirmation), hide/unhide from simulations, and reset to workspace defaults (with confirmation). 12-persona limit enforced.

**Independent Test**: Click "Add Persona" — new card appears in edit mode with defaults. Hide a persona — card dims. Unhide — restored. Delete with confirmation — card removed. Reset to defaults with confirmation — 8 original personas restored. At 12 personas, Add button disabled.

### Implementation for User Story 3

- [x] T016 [US3] Add "Add Persona" button to gallery header in `app/src/pages/PersonaModelingPage.tsx` — creates a new persona with default values (generated UUID, "New Persona" name, "Custom" label, age 30, salary $50,000, deferral 6%, balance $0, TDF 2060 allocation, SS enabled, hidden false), appends to personas array, calls `updateWorkspacePersonas()`, and opens the new card in edit mode. Disable button and show "Maximum 12 personas" message when count reaches 12.
- [x] T017 [US3] Add hide/unhide functionality — wire `onToggleHidden` in `app/src/pages/PersonaModelingPage.tsx` to toggle the persona's `hidden` field in the local array and call `updateWorkspacePersonas()`. Wire action menu "Hide"/"Unhide" button in `PersonaCard` display mode in `app/src/components/PersonaCard.tsx`.
- [x] T018 [US3] Add delete functionality — wire `onDelete` in `app/src/pages/PersonaModelingPage.tsx` to show `ConfirmDialog` ("Are you sure you want to delete this persona? This cannot be undone."), on confirm remove persona from array and call `updateWorkspacePersonas()`. Wire action menu "Delete" button in `PersonaCard` in `app/src/components/PersonaCard.tsx`.
- [x] T019 [US3] Add "Reset to Defaults" button to gallery header in `app/src/pages/PersonaModelingPage.tsx` — shows `ConfirmDialog` ("Reset all personas to workspace defaults? Custom personas will be removed."), on confirm calls `resetWorkspacePersonas()` API function, refreshes local personas state from response, and closes any open editor.

**Checkpoint**: User Story 3 complete — full persona lifecycle management (add, delete, hide, reset) with confirmations and limit enforcement. Independently testable.

---

## Phase 6: User Story 4 — Configure Asset Allocation with Donut Chart (Priority: P4)

**Goal**: Each persona's inline editor includes an allocation section with two modes: target-date fund vintage selector (2025–2070, 5-year increments) or custom stock/bond/cash percentage split with a live donut chart. Percentages must sum to 100%.

**Independent Test**: Open a persona editor — switch to Target-Date mode, select 2055 vintage, save. Reopen — TDF 2055 shown. Switch to Custom, set 60/30/10, donut chart updates live. Save and reopen — custom allocation and chart displayed correctly. Enter 50/30/10 (=90%) — validation error shown.

### Implementation for User Story 4

- [x] T020 [P] [US4] Create `AllocationDonutChart` component in `app/src/components/AllocationDonutChart.tsx` — render a recharts `PieChart` with `innerRadius` to create donut effect (~150x150px). Three segments: Stock (blue-500), Bond (green-500), Cash (amber-500). Include legend with percentage labels. Accept `stockPct`, `bondPct`, `cashPct` as props (0–1 scale). Update in real time as props change.
- [x] T021 [P] [US4] Create `AllocationEditor` component in `app/src/components/AllocationEditor.tsx` — render radio toggle between "Target-Date Fund" and "Custom" modes. Target-Date mode: dropdown select with vintage years 2025, 2030, 2035, ..., 2070. Custom mode: three number inputs for stock/bond/cash percentages (displayed as 0–100 in UI, converted to 0–1 for model) plus `AllocationDonutChart`. Validate custom percentages sum to 100% (display error if not). Call `onChange` with updated `AssetAllocation` object on every change.
- [x] T022 [US4] Integrate `AllocationEditor` into `PersonaCard` edit mode in `app/src/components/PersonaCard.tsx` — add below demographic fields, pass current allocation and onChange handler. Include allocation validation errors in the card's overall validation state (block save if allocation invalid).

**Checkpoint**: User Story 4 complete — asset allocation fully configurable with live donut chart preview. Independently testable by editing any persona's allocation.

---

## Phase 7: User Story 5 — Social Security Toggle (Priority: P5)

**Goal**: Each persona has a Social Security toggle visible in display mode (badge) and editable in edit mode (toggle switch). Toggle state persists.

**Independent Test**: View a persona card — SS badge shows current state (checkmark or X). Open editor — toggle SS on/off. Save — badge reflects new state. Reload — state persists.

### Implementation for User Story 5

- [x] T023 [US5] Add Social Security toggle switch to `PersonaCard` edit mode in `app/src/components/PersonaCard.tsx` — render a toggle/switch input for `include_social_security` below the allocation editor. On toggle, update local form state. Value included in save payload.
- [x] T024 [US5] Ensure Social Security badge in `PersonaCard` display mode in `app/src/components/PersonaCard.tsx` reflects the `include_social_security` field — show a checkmark icon when true, X icon when false, with "Social Security" label.

**Checkpoint**: User Story 5 complete — Social Security toggle works in both display and edit modes with persistence. All 5 user stories now independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, responsive layout tuning, and final validation.

- [x] T025 Handle edge case: close open inline editor when "Reset to Defaults" is triggered in `app/src/pages/PersonaModelingPage.tsx`
- [x] T026 Handle edge case: prevent deleting the last persona or show warning that simulations require at least one persona in `app/src/pages/PersonaModelingPage.tsx`
- [x] T027 Verify responsive grid layout accommodates 1–12 personas across mobile, tablet, and desktop breakpoints in `app/src/components/PersonaGallery.tsx`
- [ ] T028 Run quickstart.md verification steps (all 10 items) end-to-end against running backend and frontend

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Empty — existing project
- **Foundational (Phase 2)**: BLOCKS all user stories. T001–T003 can run in parallel (different files). T004 depends on T001 (persona model). T005 depends on T004 (schema). T006–T007 can parallel with T004–T005. T008 depends on T003 (types).
- **User Stories (Phase 3–7)**: All depend on Phase 2 completion
  - US1 (Phase 3): No dependency on other stories
  - US2 (Phase 4): Depends on US1 (needs PersonaCard display mode)
  - US3 (Phase 5): Depends on US2 (needs save/cancel wiring)
  - US4 (Phase 6): Depends on US2 (needs PersonaCard edit mode)
  - US5 (Phase 7): Depends on US2 (needs PersonaCard edit mode)
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 2 (Foundational)
    │
    ▼
US1 (View Gallery) ──────► US2 (Inline Edit) ──┬──► US3 (Add/Delete/Hide/Reset)
                                                 ├──► US4 (Allocation + Donut)
                                                 └──► US5 (Social Security Toggle)
                                                          │
                                                          ▼
                                                    Phase 8 (Polish)
```

### Within Each User Story

- Models/types before services/API
- API functions before page/component integration
- Display mode before edit mode
- Core implementation before edge cases

### Parallel Opportunities

**Phase 2** (foundational):
- T001, T002, T003 — all different files, fully parallel
- T006, T007 — can parallel with T004, T005 (different methods/endpoints)
- T008 — can parallel with T006, T007 (frontend vs backend)

**Phase 3** (US1):
- T009, T010 — different component files, fully parallel

**Phase 6** (US4):
- T020, T021 — different component files, fully parallel

**Phase 7** (US5):
- T023, T024 — same file but different modes (edit vs display), sequential

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Batch 1 — all different files, fully parallel:
Task: "Add hidden field and relax salary in api/models/persona.py"          # T001
Task: "Add max_length=12 validator in api/models/workspace.py"              # T002
Task: "Add hidden to Persona interface in app/src/types/persona.ts"         # T003

# Batch 2 — backend API changes (sequential within, parallel with frontend):
Task: "Add personas to WorkspaceUpdate in api/routers/workspaces.py"        # T004
Task: "Update workspace_service.py personas handling"                        # T005
Task: "Add reset endpoint in api/routers/workspaces.py"                     # T006
Task: "Add reset method in workspace_service.py"                             # T007

# Batch 2 (parallel) — frontend API:
Task: "Add persona API functions in app/src/services/api.ts"                # T008
```

## Parallel Example: User Story 1

```bash
# Launch display components in parallel:
Task: "Create PersonaCard display mode in app/src/components/PersonaCard.tsx"       # T009
Task: "Create PersonaGallery grid in app/src/components/PersonaGallery.tsx"         # T010

# Then wire into page (depends on T009, T010):
Task: "Replace PersonaModelingPage stub in app/src/pages/PersonaModelingPage.tsx"   # T011
Task: "Add warning banner in app/src/pages/PersonaModelingPage.tsx"                 # T012
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001–T008)
2. Complete Phase 3: User Story 1 (T009–T012)
3. **STOP and VALIDATE**: Navigate to `/personas` — 8 cards displayed with correct formatting
4. Demo/review if ready

### Incremental Delivery

1. Phase 2 (Foundational) → Backend ready, types updated
2. US1 (View Gallery) → Cards visible → **MVP!**
3. US2 (Inline Edit) → Cards editable with validation
4. US3 (Add/Delete/Hide/Reset) → Full persona management
5. US4 (Allocation + Donut Chart) → Rich allocation configuration
6. US5 (Social Security Toggle) → Final toggle control
7. Phase 8 (Polish) → Edge cases and verification

Each increment adds value without breaking previous stories.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No tests included (not requested in spec)
- Backend changes are minimal (2 model fields, 1 new endpoint, 1 schema field)
- Frontend is the bulk of the work (4 new components, 1 page rewrite)
- Reuse existing `ConfirmDialog` component for delete and reset confirmations
- Follow `PlanDesignForm.tsx` patterns for validation and form field styling
- Follow existing `api.ts` patterns for new API functions
- All formatting conventions (currency, percentage, allocation summary) defined in component contract
