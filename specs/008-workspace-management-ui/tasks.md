# Tasks: Workspace Management UI

**Input**: Design documents from `/specs/008-workspace-management-ui/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Types & Utilities)

**Purpose**: Create all TypeScript type definitions and utility functions. These mirror backend Pydantic models and are prerequisites for every page and component.

- [X] T001 [P] Create assumptions types (AssetClassReturn, Assumptions, AssetClassReturnOverride, AssumptionsOverride) in `app/src/types/assumptions.ts` per data-model.md. All fields match backend `api/models/assumptions.py` and `api/models/assumptions_override.py`. Include AssetClassReturn with expected_return and standard_deviation, full Assumptions with 2026 IRS defaults, and all override variants with `| null` for optional fields.

- [X] T002 [P] Create persona types (TargetDateAllocation, CustomAllocation, AssetAllocation discriminated union, Persona) in `app/src/types/persona.ts` per data-model.md. Match backend `api/models/persona.py` and `api/models/asset_allocation.py`. AssetAllocation is a discriminated union on `type` field: `"target_date" | "custom"`. Persona includes id, name, label, age (18–80), tenure_years (0–60), salary (>0), deferral_rate (0–1), current_balance (>=0), allocation, include_social_security, ss_claiming_age (62–70).

- [X] T003 [P] Create plan design types (MatchTier, ImmediateVesting, CliffVesting, GradedVesting, VestingSchedule discriminated union, CoreContributionTier, PlanDesign) in `app/src/types/plan-design.ts` per data-model.md. Match backend `api/models/plan_design.py`. VestingSchedule is discriminated on `type`: `"immediate" | "cliff" | "graded"`. GradedVesting.schedule is `Record<string, number>` (JSON keys are strings). PlanDesign has all fields with defaults matching backend: match_tiers (max 3), auto_enroll_rate (0.06), auto_escalation_cap (0.10), etc.

- [X] T004 [P] Create scenario types (IrsLimitWarning, ScenarioSummary, ScenarioResponse, ScenarioCreate, ScenarioUpdate) in `app/src/types/scenario.ts` per data-model.md. Import PlanDesign from plan-design.ts, Assumptions and AssumptionsOverride from assumptions.ts. ScenarioResponse includes computed fields: effective_assumptions (Assumptions) and warnings (IrsLimitWarning[]). ScenarioCreate requires name and plan_design; ScenarioUpdate has all fields optional.

- [X] T005 [P] Extend workspace types in `app/src/types/workspace.ts`: add full Workspace interface (id, name, client_name, created_at, updated_at, base_config: Assumptions, personas: Persona[], monte_carlo_config: MonteCarloConfig), MonteCarloConfig interface, WorkspaceCreate (client_name required, name optional), WorkspaceUpdate (name, client_name, base_config as AssumptionsOverride — all optional). Modify LayoutContext: setActiveWorkspace accepts `WorkspaceSummary | null`, add `refreshWorkspaces: () => Promise<void>`. Import Assumptions and AssumptionsOverride from assumptions.ts, Persona from persona.ts. Keep existing WorkspaceSummary, HealthStatus unchanged.

- [X] T006 [P] Create plan design summary utility in `app/src/utils/plan-design-summary.ts`. Export `formatPlanDesignSummary(pd: PlanDesign) => { matchFormula: string, autoEnrollRate: string, coreContribution: string }`. Logic: matchFormula renders match tiers as human-readable strings (e.g., "100% on first 6%", "100% on first 3%, 50% on next 2%", or "No match" when empty). autoEnrollRate renders as "6% auto-enroll" or "Auto-enroll off". coreContribution renders as "3% core" or "Age/service tiers" (when core_age_service_tiers is non-null) or "No core". Create `app/src/utils/` directory first.

---

## Phase 2: Foundational (API Service + Shared Components + Routing)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Expand API service in `app/src/services/api.ts` with all CRUD functions per contracts/api-client.md. Add: `createWorkspace(data: WorkspaceCreate): Promise<Workspace>` (POST), `getWorkspace(workspaceId: string): Promise<Workspace>` (GET), `updateWorkspace(workspaceId: string, data: WorkspaceUpdate): Promise<Workspace>` (PATCH), `deleteWorkspace(workspaceId: string): Promise<void>` (DELETE), `listScenarios(workspaceId: string): Promise<ScenarioSummary[]>` (GET), `getScenario(workspaceId: string, scenarioId: string): Promise<ScenarioResponse>` (GET), `createScenario(workspaceId: string, data: ScenarioCreate): Promise<ScenarioResponse>` (POST), `updateScenario(workspaceId: string, scenarioId: string, data: ScenarioUpdate): Promise<ScenarioResponse>` (PATCH), `deleteScenario(workspaceId: string, scenarioId: string): Promise<void>` (DELETE), `duplicateScenario(workspaceId: string, scenarioId: string): Promise<ScenarioResponse>` (POST to /duplicate). Follow existing fetch() + throw Error pattern. POST/PATCH must set Content-Type: application/json header and JSON.stringify the body. DELETE functions check for 204 (no JSON parse). Import all types from the new type files.

- [X] T008 [P] Create reusable ConfirmDialog component in `app/src/components/ConfirmDialog.tsx`. Props: `isOpen: boolean`, `title: string`, `message: string`, `confirmLabel?: string` (default "Delete"), `cancelLabel?: string` (default "Cancel"), `onConfirm: () => void`, `onCancel: () => void`, `isLoading?: boolean`. Renders a centered modal overlay with backdrop, title, message, and two buttons. Confirm button shows a spinner and is disabled when isLoading is true. Cancel button is also disabled when isLoading. Use Tailwind classes matching the existing card style (rounded-xl, shadow-sm). Confirm button uses red color (bg-red-600) for destructive actions. Clicking backdrop calls onCancel.

- [X] T009 Modify `app/src/components/Layout.tsx` to support the new LayoutContext. Convert fetchWorkspaces into a stable callback that returns a Promise (for `refreshWorkspaces` in context). Update setActiveWorkspace to accept `WorkspaceSummary | null` (for deletion clearing). Add refreshWorkspaces to the context object passed to `<Outlet context={...}>`. The sidebar props remain unchanged. When workspaces are re-fetched after a deletion, if the deleted workspace was active, set activeWorkspace to the first remaining workspace or null.

- [X] T010 Modify `app/src/App.tsx` to add two new routes: `<Route path="/scenarios/new" element={<ScenarioCreatePage />} />` and `<Route path="/scenarios/:scenarioId" element={<ScenarioEditPage />} />`. Add imports for ScenarioCreatePage and ScenarioEditPage. Place these routes BEFORE the existing `/scenarios` route to ensure they match first (React Router matches first-match). These pages will be created in Phase 6 (US4) — for now, import them as empty stub components or conditionally import.

**Checkpoint**: Foundation ready — all types, API functions, shared components, and routes are in place. User story implementation can now begin.

---

## Phase 3: User Story 1 — View Workspace Dashboard (Priority: P1) MVP

**Goal**: Replace the dashboard stub with a grid of workspace cards showing client name, scenario count, and last-modified date. Cards are clickable (navigate to scenario list), sortable by recency, and include a delete action with confirmation.

**Independent Test**: Create 2–3 workspaces via backend API (curl POST), navigate to `/dashboard`, verify cards render with correct data, click a card to navigate to scenarios, delete a workspace via the card action.

### Implementation for User Story 1

- [X] T011 [P] [US1] Create WorkspaceCard component in `app/src/components/WorkspaceCard.tsx`. Props: `workspace: WorkspaceSummary`, `scenarioCount: number | null` (null = still loading), `onClick: () => void`, `onDelete: () => void`. Renders a card (rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer) showing: client_name as primary text (text-lg font-semibold), workspace name as secondary (text-sm text-gray-500), scenario count with a small FolderOpen icon (show animated pulse placeholder when null, "—" on error), last-modified date formatted as relative time (e.g., "2 hours ago") or short date. Include a delete button (Trash2 icon from lucide-react) positioned top-right, which calls onDelete and stops event propagation (prevent card click). The entire card is clickable via onClick.

- [X] T012 [US1] Replace DashboardPage stub in `app/src/pages/DashboardPage.tsx`. Get `activeWorkspace`, `workspaces`, `setActiveWorkspace`, and `refreshWorkspaces` from `useOutletContext<LayoutContext>()`. Use `useNavigate()` from react-router-dom. Fetch scenario counts for all workspaces in parallel using `Promise.allSettled(workspaces.map(ws => listScenarios(ws.id)))` — store as `Record<string, number | null>`. Render: (1) page header "Workspaces" with a "New Workspace" button (Plus icon, styled as primary brand button — bg-brand-500 text-white rounded-lg px-4 py-2); (2) if no workspaces, show empty state card with FolderOpen icon and "No workspaces yet" message plus "Create your first workspace" CTA button; (3) if workspaces exist, render a responsive grid (grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4) of WorkspaceCard components, sorted by updated_at descending. Card onClick: call setActiveWorkspace(ws) and navigate('/scenarios'). Card onDelete: open ConfirmDialog, on confirm call deleteWorkspace(ws.id) then refreshWorkspaces(), if deleted workspace was active set activeWorkspace to null. Show loading state while fetching. Show error banner with retry if listWorkspaces fails. Disable the "New Workspace" button (its handler will be wired in US2).

- [X] T013 [US1] Wire workspace deletion confirmation into DashboardPage. Add local state: `deletingWorkspace: WorkspaceSummary | null` and `isDeleting: boolean`. When card onDelete fires, set deletingWorkspace to that workspace. Render ConfirmDialog with title "Delete Workspace", message "Are you sure you want to delete '{workspace.client_name}'? This will permanently remove all scenarios within this workspace.", confirmLabel "Delete". On confirm: set isDeleting=true, call deleteWorkspace(deletingWorkspace.id), then refreshWorkspaces(), then clear deletingWorkspace. If the deleted workspace was the active one, call setActiveWorkspace(null). Handle errors by showing an inline error message. On cancel: clear deletingWorkspace.

**Checkpoint**: Dashboard shows workspace cards with scenario counts, sorted by recency. Clicking a card navigates to scenarios. Deleting a workspace works with confirmation. Empty state shown when no workspaces exist. The "New Workspace" button is visible but the modal is not yet built (US2).

---

## Phase 4: User Story 2 — Create a New Workspace (Priority: P1) MVP

**Goal**: Add workspace creation via a modal dialog from the dashboard. Client name required, optional base assumptions customization.

**Independent Test**: Click "New Workspace" on dashboard, enter client name, submit, verify new card appears. Try submitting empty name — verify validation. Expand optional settings, change inflation rate, submit — verify workspace created with custom rate.

### Implementation for User Story 2

- [X] T014 [P] [US2] Create CreateWorkspaceModal component in `app/src/components/CreateWorkspaceModal.tsx`. Props: `isOpen: boolean`, `onClose: () => void`, `onCreated: (workspace: Workspace) => void`. Renders a centered modal overlay (similar style to ConfirmDialog). Form fields: client_name (text input, required, with "Client Name" label), an expandable "Customize Assumptions" accordion section (collapsed by default). The accordion reveals: inflation_rate (number input, step 0.001, label "Inflation Rate"), wage_growth_rate (number, step 0.001), and the 5 IRS limits (comp_limit, deferral_limit, additions_limit, catchup_limit, super_catchup_limit as currency inputs). Display rates as percentages (multiply by 100 for display, divide by 100 for submission). Validate client_name is non-empty (show inline error). On submit: call createWorkspace() with WorkspaceCreate payload (only include non-default assumption values). Show spinner on submit button, disable while in-flight (FR-017). On success: call onCreated with the returned Workspace, then onClose. On API error: show inline error message. On cancel/backdrop click: close modal (warn if form is dirty).

- [X] T015 [US2] Wire CreateWorkspaceModal into DashboardPage in `app/src/pages/DashboardPage.tsx`. Add local state `isCreateModalOpen: boolean`. The "New Workspace" button onClick sets isCreateModalOpen=true. Render `<CreateWorkspaceModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onCreated={handleWorkspaceCreated} />`. The handleWorkspaceCreated callback: calls refreshWorkspaces(), then setActiveWorkspace(newWorkspaceSummary) to auto-select the new workspace (FR-006), then navigate to /scenarios.

**Checkpoint**: Full workspace lifecycle works: create via modal → view on dashboard → click to navigate → delete with confirmation. This is the MVP — stop here for initial validation.

---

## Phase 5: User Story 3 — View Scenario List Within a Workspace (Priority: P2)

**Goal**: Replace the scenarios page stub with a card list showing each scenario's plan design summary, with empty state handling.

**Independent Test**: Create a workspace with 2–3 scenarios via backend API, navigate to `/scenarios`, verify cards show name, plan design summary (match formula, auto-enroll rate, core contribution), and dates.

### Implementation for User Story 3

- [X] T016 [P] [US3] Create ScenarioCard component in `app/src/components/ScenarioCard.tsx`. Props: `scenario: ScenarioSummary`, `planDesignSummary: { matchFormula: string, autoEnrollRate: string, coreContribution: string } | null` (null when full scenario not yet loaded), `onClick: () => void`, `onDuplicate: () => void`, `onDelete: () => void`. Renders a card (rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer). Content: scenario name (text-lg font-semibold), description if present (text-sm text-gray-500, truncated to 2 lines), plan design summary rendered as 3 small badges/pills (e.g., "100% on first 6%" | "6% auto-enroll" | "3% core") — show skeleton placeholders when null. Footer: updated_at as relative time. Action buttons row: Duplicate (Copy icon) and Delete (Trash2 icon), both with stop propagation. The entire card body area is clickable via onClick.

- [X] T017 [US3] Replace ScenariosPage stub in `app/src/pages/ScenariosPage.tsx`. Get `activeWorkspace` from `useOutletContext<LayoutContext>()`. If no activeWorkspace, show a message "Select a workspace to view scenarios" with a link back to /dashboard. Otherwise: fetch scenarios using listScenarios(activeWorkspace.id). For plan design summaries, fetch each scenario's full data using getScenario() in parallel — extract plan_design and pass through formatPlanDesignSummary(). Render: (1) page header "Scenarios" with workspace name subtitle and a "New Scenario" button (Plus icon, primary brand style, links to /scenarios/new); (2) if no scenarios, show empty state card with "No scenarios yet" and "Create your first scenario" CTA linking to /scenarios/new; (3) if scenarios exist, render a responsive grid of ScenarioCard components. Handle loading (skeleton cards), error (inline error with retry). Re-fetch scenario list when activeWorkspace changes (useEffect dependency).

- [X] T018 [US3] Wire scenario count fetching optimization. Currently DashboardPage and ScenariosPage both call listScenarios. For the scenario list page, the initial listScenarios() call returns ScenarioSummary[] (without plan_design). To get plan design summaries, dispatch parallel getScenario() calls for each scenario. Store full scenario responses in state as `Record<string, ScenarioResponse>`. Pass the formatted summary to each ScenarioCard. If a getScenario call fails for a single scenario, show "—" for that card's summary (graceful degradation). Ensure scenario list re-fetches when navigating back from create/edit pages.

**Checkpoint**: Scenario list shows cards with plan design summaries. Empty state works. Cards are clickable (onClick handler is present but navigation to edit page requires US4). Duplicate/delete buttons are visible but handlers will be wired in US4.

---

## Phase 6: User Story 4 — Create, Edit, Duplicate, and Delete Scenarios (Priority: P2)

**Goal**: Build the full scenario CRUD: dedicated create page with PlanDesignForm, edit page for existing scenarios, duplicate action, delete with confirmation.

**Independent Test**: Create a scenario via the create page, verify it appears in the list. Click to open edit page, modify auto-enroll rate, save, verify card updates. Duplicate a scenario, verify copy appears. Delete a scenario with confirmation.

### Implementation for User Story 4

- [X] T019 [US4] Create PlanDesignForm component in `app/src/components/PlanDesignForm.tsx`. Props: `initialValues?: PlanDesign` (for edit mode; omit for create with defaults), `onSubmit: (pd: PlanDesign) => void`, `onCancel: () => void`, `isSubmitting: boolean`. Renders a multi-section form. **Section 1 — Plan Name**: text input for name (required). **Section 2 — Employer Match**: dynamic list of match tiers (max 3) — each tier has match_rate (%) and on_first_pct (%) inputs; add/remove tier buttons. Match vesting selector: radio buttons for immediate/cliff/graded; cliff shows years input (1–6); graded shows a key-value editor for schedule. Match eligibility months (0–12 slider or number input). **Section 3 — Core Contribution**: core_contribution_pct (%) input. Optional core_age_service_tiers toggle — when enabled, shows a tier list (max 5) with min_age, max_age, min_service, max_service, contribution_pct. Core vesting selector (same pattern as match vesting). Core eligibility months. **Section 4 — Auto-Enrollment**: auto_enroll_enabled toggle. When enabled: auto_enroll_rate (%) input, auto_escalation_enabled toggle, auto_escalation_rate (%), auto_escalation_cap (%). **Validation**: all percentage fields 0–100 (stored as 0–1), match_rate and on_first_pct within 0–1, cap >= enroll rate when both enabled (FR-015, cross-field validation per edge case). Display rates as percentages (×100) in UI, convert to decimals (÷100) on submit. Show inline validation errors. Default values match PlanDesign defaults from data-model.md. Submit button disabled when isSubmitting or validation errors exist.

- [X] T020 [US4] Create ScenarioCreatePage in `app/src/pages/ScenarioCreatePage.tsx`. Get `activeWorkspace` from `useOutletContext<LayoutContext>()`. If no activeWorkspace, redirect to /dashboard. Render: page header "New Scenario" with breadcrumb (Scenarios > New Scenario), scenario name input, optional description textarea, and `<PlanDesignForm />` with default values. On submit: call createScenario(activeWorkspace.id, { name, description, plan_design }) with the form data. Show loading state on submit button. On success: navigate to /scenarios (the list page). On validation error (422): show inline errors. On 404 (workspace deleted): show error and redirect to /dashboard. Use `useBlocker` from react-router-dom to warn about unsaved changes if form is dirty (FR-016).

- [X] T021 [US4] Create ScenarioEditPage in `app/src/pages/ScenarioEditPage.tsx`. Get `activeWorkspace` from `useOutletContext<LayoutContext>()`. Get `scenarioId` from `useParams()`. Fetch full scenario via getScenario(activeWorkspace.id, scenarioId) on mount. Show loading skeleton while fetching. If 404: show "Scenario not found" message with link back to /scenarios. Render: page header with scenario name (editable), description textarea, and `<PlanDesignForm initialValues={scenario.plan_design} />`. On submit: call updateScenario(activeWorkspace.id, scenarioId, { name, description, plan_design }). On success: navigate back to /scenarios. Show IRS limit warnings from the response if any (render as amber alert banners). Use `useBlocker` for unsaved changes warning.

- [X] T022 [US4] Wire duplicate and delete actions into ScenariosPage in `app/src/pages/ScenariosPage.tsx`. **Duplicate**: ScenarioCard onDuplicate calls duplicateScenario(activeWorkspace.id, scenario.id), then re-fetches the scenario list. Show loading state on the card being duplicated. **Delete**: ScenarioCard onDelete opens ConfirmDialog with title "Delete Scenario", message "Are you sure you want to delete '{scenario.name}'? This action cannot be undone.", confirmLabel "Delete". On confirm: call deleteScenario(activeWorkspace.id, scenario.id), re-fetch list. Handle errors inline. Add local state for `duplicatingId: string | null` and `deletingScenario: ScenarioSummary | null`. ScenarioCard onClick: navigate(`/scenarios/${scenario.id}`).

**Checkpoint**: Full scenario lifecycle: create → view in list → click to edit → save changes → duplicate → delete. All CRUD operations work end-to-end with proper validation, loading states, and error handling.

---

## Phase 7: User Story 5 — Edit Workspace Settings (Priority: P3)

**Goal**: Replace the settings stub with a full editing page for base assumptions and persona attributes.

**Independent Test**: Navigate to /settings, verify assumptions are pre-filled from workspace base_config. Change inflation rate, save, reload — verify change persisted. Edit a persona's salary, save, reload — verify change persisted. Make changes and try to navigate away — verify unsaved changes warning.

### Implementation for User Story 5

- [X] T023 [US5] Replace SettingsPage stub in `app/src/pages/SettingsPage.tsx`. Get `activeWorkspace` and `refreshWorkspaces` from `useOutletContext<LayoutContext>()`. If no activeWorkspace, show "Select a workspace" with link to /dashboard. Fetch full workspace via getWorkspace(activeWorkspace.id) on mount to get base_config and personas. **Section 1 — Base Assumptions**: form with grouped inputs: Economic (inflation_rate, wage_growth_rate, wage_growth_std), Asset Returns (equity, intl_equity, fixed_income, cash — each with expected_return and standard_deviation sub-fields), IRS Limits (comp_limit, deferral_limit, additions_limit, catchup_limit, super_catchup_limit). Display rates as percentages, IRS limits as currency. **Section 2 — Personas**: table/card list of the 8 existing personas (read persona list from workspace.personas). Each persona is an expandable/inline-editable row showing name, label, age, tenure_years, salary, deferral_rate, current_balance, allocation type, include_social_security, ss_claiming_age. Edit-in-place for each field. Allocation type: toggle between "target_date" (vintage year input) and "custom" (stock/bond/cash percentages that must sum to 100%). **Validation (FR-015)**: non-negative rates, salary > 0, allocation sums to 100% (±1%), age 18–80, tenure 0–60, deferral 0–100%, ss_claiming_age 62–70. Show inline errors. **Save**: single "Save Changes" button at bottom. On click: build WorkspaceUpdate with base_config as AssumptionsOverride (only changed fields) and include full personas array. Call updateWorkspace(). On success: show brief success indicator, refresh workspace data. On error: show inline error. **Unsaved changes (FR-016)**: track dirty state by comparing current form values to last-saved values. Use `useBlocker` to block navigation when dirty.

- [X] T024 [US5] Handle persona editing details within SettingsPage. For each persona row: use controlled inputs for all fields. The allocation field should conditionally render based on type: if "target_date", show a number input for vintage year (>= current year); if "custom", show 3 percentage inputs (stock, bond, cash) with a live total indicator and validation that they sum to 100% (±1%). When switching allocation type, reset the sub-fields to defaults (target_date: vintage = current year + 30; custom: 60/30/10 split). The persona name and label fields are editable text inputs. No add/remove persona capability (FR-014: edit only). Ensure all persona changes are included in the single save action (T023).

**Checkpoint**: Settings page allows full editing of base assumptions and persona attributes. Changes persist through save and page reload. Unsaved changes warning works.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T025 Verify TypeScript compilation across all new and modified files by running `npx tsc --noEmit` from `app/` directory. Fix any type errors, missing imports, or incompatible interfaces. Ensure all imports between the new type files, api.ts, components, and pages resolve correctly.

- [X] T026 Audit all pages and components for consistent error handling per FR-018 and FR-019. Verify: (1) every API call has try/catch with error state displayed as an inline alert (red border, text-red-600); (2) 404 responses from workspace-level calls redirect to /dashboard with a brief "Workspace not found" message; (3) network errors show "Something went wrong" with a "Retry" button that re-fires the original request; (4) all action buttons disable during in-flight requests (FR-017). Check DashboardPage, ScenariosPage, ScenarioCreatePage, ScenarioEditPage, SettingsPage, CreateWorkspaceModal.

- [X] T027 Run quickstart.md validation: start backend (`uvicorn api.main:app --port 8000`), start frontend (`npm run dev` from app/), walk through the full manual verification flow from quickstart.md. Verify: dashboard → create workspace → click card → create scenario → edit scenario → duplicate scenario → delete scenario → settings → delete workspace. Fix any issues found during the walkthrough.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. All T001–T006 are parallel (different files).
- **Foundational (Phase 2)**: Depends on Phase 1 (types must exist for API imports). T007 depends on all type files. T008 is standalone (no type dependencies). T009 depends on T005 (LayoutContext changes). T010 is standalone.
- **User Story 1 (Phase 3)**: Depends on Phase 2 (needs api.ts functions, ConfirmDialog, LayoutContext).
- **User Story 2 (Phase 4)**: Depends on Phase 3 (wires into DashboardPage).
- **User Story 3 (Phase 5)**: Depends on Phase 2. Independent of US1/US2 (different page).
- **User Story 4 (Phase 6)**: Depends on Phase 5 (wires into ScenariosPage).
- **User Story 5 (Phase 7)**: Depends on Phase 2. Independent of US1–US4 (different page).
- **Polish (Phase 8)**: Depends on all user stories being complete.

### User Story Dependencies

```text
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational)
    │
    ├──────────────────────────┐──────────────────────┐
    ▼                          ▼                      ▼
Phase 3: US1 (Dashboard)   Phase 5: US3 (Scenario   Phase 7: US5
    │                         List)                   (Settings)
    ▼                          │
Phase 4: US2 (Create WS)      ▼
                            Phase 6: US4 (Scenario
                              CRUD)
                                                      │
    └──────────────────────────┴──────────────────────┘
                               │
                               ▼
                        Phase 8: Polish
```

### Within Each User Story

- Types before API service
- API service before components
- Components before page integration
- Page integration before cross-component wiring

### Parallel Opportunities

- **Phase 1**: All 6 tasks (T001–T006) run in parallel — each creates a separate file
- **Phase 2**: T008 (ConfirmDialog) and T010 (App.tsx routes) can run in parallel with T007 (api.ts)
- **Phase 3**: T011 (WorkspaceCard) can run in parallel with any other Phase 3 prep
- **Phase 3–7**: US1/US2 path and US3/US4 path and US5 can all proceed in parallel after Phase 2
- **Phase 6**: T019 (PlanDesignForm) can start in parallel with T016/T017 (US3) since it's a standalone component

---

## Parallel Example: Phase 1 (All Types)

```bash
# Launch all type file creation tasks together:
Task: "Create assumptions types in app/src/types/assumptions.ts" (T001)
Task: "Create persona types in app/src/types/persona.ts" (T002)
Task: "Create plan design types in app/src/types/plan-design.ts" (T003)
Task: "Create scenario types in app/src/types/scenario.ts" (T004)
Task: "Extend workspace types in app/src/types/workspace.ts" (T005)
Task: "Create plan design summary utility in app/src/utils/plan-design-summary.ts" (T006)
```

## Parallel Example: After Phase 2

```bash
# US1/US2 path and US3/US4 path can proceed simultaneously:
# Developer A: US1 → US2 (Phases 3–4)
# Developer B: US3 → US4 (Phases 5–6)
# Developer C: US5 (Phase 7)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (all types + utility)
2. Complete Phase 2: Foundational (API, ConfirmDialog, Layout, routes)
3. Complete Phase 3: User Story 1 (dashboard with cards)
4. Complete Phase 4: User Story 2 (create workspace modal)
5. **STOP and VALIDATE**: Create workspace → view on dashboard → click to navigate → delete. Full workspace lifecycle works.

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 + US2 → Dashboard lifecycle works → **Deploy/Demo (MVP!)**
3. Add US3 → Scenario list visible → Deploy/Demo
4. Add US4 → Full scenario CRUD → Deploy/Demo
5. Add US5 → Settings editable → Deploy/Demo
6. Polish → Type-check, error audit, walkthrough → Final validation

---

## Notes

- **27 total tasks** across 8 phases
- **0 new npm dependencies** — all work uses existing React 19, react-router-dom 7, Tailwind, lucide-react
- **0 backend changes** — all tasks are frontend-only
- **6 existing files modified**: App.tsx, Layout.tsx, DashboardPage.tsx, ScenariosPage.tsx, SettingsPage.tsx, api.ts, workspace.ts
- **11 new files created**: 4 type files, 1 utility, 4 components, 2 pages
- Commit after each task or phase checkpoint
- Stop at any checkpoint to validate the story independently
