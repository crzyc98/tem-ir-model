# Tasks: Persona-Scenario Analysis Page

**Input**: Design documents from `/specs/001-persona-scenario-analysis/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not included — no TDD requirement stated in feature specification.

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete sibling tasks)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Data Models & Types)

**Purpose**: Create the foundational Pydantic models (backend) and TypeScript interfaces (frontend) that all subsequent phases depend on. Both tasks touch different files and can run in parallel.

- [x] T001 Create `api/models/workforce_analysis.py` with all five Pydantic v2 models: `WorkforceAnalyzeRequest` (scenario_ids: list[UUID], min_length=2, max_length=8), `PersonaEmployerCost` (persona_id, employer_cost_annual, employer_cost_cumulative), `WorkforceAggregate` (pct_on_track: float, median_ir: float|None, avg_employer_cost_annual: float), `WorkforceScenarioResult` (scenario_id, scenario_name, persona_results: list[PersonaSimulationResult], employer_costs: list[PersonaEmployerCost], aggregate: WorkforceAggregate), `WorkforceAnalyzeResponse` (workspace_id, scenario_ids, results: list[WorkforceScenarioResult], retirement_age, planning_age, num_simulations, seed: int|None) — import `PersonaSimulationResult` from `api.models.simulation_result`

- [x] T002 [P] Create `app/src/types/workforce_analysis.ts` with TypeScript interfaces mirroring all five backend models (WorkforceAnalyzeRequest, PersonaEmployerCost, WorkforceAggregate, WorkforceScenarioResult, WorkforceAnalyzeResponse), plus: `AnalysisMetric` type union (`'income_replacement_ratio' | 'probability_of_success' | 'retirement_balance' | 'employer_cost_annual'`) and `ANALYSIS_METRIC_LABELS` record mapping each metric to its display string — import `PersonaSimulationResult` from `./simulation`

---

## Phase 2: Foundational (Backend Service + Router + API Client)

**Purpose**: Core backend implementation and frontend API call. MUST be complete before any user story frontend work is built. T003 and T004 can start in parallel as soon as Phase 1 completes (they are in different files). T005 depends on T003. T006 depends on T005.

**⚠️ CRITICAL**: No user story implementation can begin until T006 is complete.

- [x] T003 Implement `api/services/workforce_analysis_service.py` with three functions: (1) `run_workforce_analysis(workspace_id: UUID, request: WorkforceAnalyzeRequest) -> WorkforceAnalyzeResponse` — loads workspace (raises FileNotFoundError if missing), filters `visible_personas = [p for p in workspace.personas if not p.hidden]`, raises `ValueError("No visible personas in workspace")` if empty, then for each scenario_id in request.scenario_ids: loads scenario (raises FileNotFoundError if not found in workspace), resolves effective assumptions via `effective_base.apply_overrides(scenario.overrides)`, instantiates `SimulationEngine(effective, scenario.plan_design, mc_config)`, calls `engine.run(visible_personas)` to get persona_results, calls `_compute_employer_cost()` per persona, calls `_compute_aggregate()`, appends `WorkforceScenarioResult`, returns `WorkforceAnalyzeResponse`; (2) `_compute_employer_cost(persona, scenario, effective_assumptions, mc_config) -> PersonaEmployerCost` — follow the exact pattern from `api/services/comparison_service.py` for computing annual and cumulative employer costs; (3) `_compute_aggregate(persona_results, employer_costs) -> WorkforceAggregate` — compute `pct_on_track` as fraction of results where `pos_assessment == "On Track"`, compute `median_ir` using `numpy.median` over `[r.income_replacement_ratio.p50 for r in persona_results if r.income_replacement_ratio]` (None if list empty), compute `avg_employer_cost_annual` as mean of employer_costs

- [x] T004 [P] Add `runWorkforceAnalysis` function to `app/src/services/api.ts` — function signature: `async function runWorkforceAnalysis(workspaceId: string, req: { scenario_ids: string[] }): Promise<WorkforceAnalyzeResponse>` — uses `fetch('/api/v1/workspaces/${workspaceId}/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) })` — on non-ok response throws `new Error(err.detail ?? 'Analysis failed (${res.status})')` — export the function; import `WorkforceAnalyzeResponse` from `../types/workforce_analysis`

- [x] T005 Create `api/routers/workforce_analysis.py` — define `router = APIRouter(tags=["workforce-analysis"])` with one route: `@router.post("/workspaces/{workspace_id}/analyze", response_model=WorkforceAnalyzeResponse, status_code=201)` calling `run_workforce_analysis(workspace_id, request)`, catching `FileNotFoundError` → HTTP 404, `ValueError` → HTTP 400 — import router, models, and service

- [x] T006 Register the new router in `api/main.py` — add `from .routers.workforce_analysis import router as workforce_analysis_router` and `app.include_router(workforce_analysis_router, prefix="/api/v1")` following the same pattern as existing router registrations; verify the endpoint appears in `/openapi.json`

**Checkpoint**: Backend is fully operational. Test with `curl -X POST http://localhost:8000/api/v1/workspaces/{id}/analyze -H "Content-Type: application/json" -d '{"scenario_ids":["id1","id2"]}'` and confirm a 201 response with persona results.

---

## Phase 3: User Story 1 — Select Scenarios and View Cross-Persona Matrix (Priority: P1) 🎯 MVP

**Goal**: A plan designer can navigate to the Analyze page, select 2–8 scenarios, click Run, and see a color-coded matrix of all non-hidden personas × selected scenarios showing income replacement ratio values.

**Independent Test**: Navigate to `/analyze`, select 2 scenarios, click Run, confirm a table appears with one row per non-hidden persona and one column per selected scenario. Cells show IR values color-coded green/yellow/red. Hidden personas do not appear.

- [x] T007 [P] [US1] Create `app/src/components/WorkforceAnalysisSetupPanel.tsx` — props: `scenarios: Scenario[]`, `selectedScenarioIds: string[]`, `onSelectionChange: (ids: string[]) => void`, `visiblePersonaCount: number`, `onRun: () => void`, `loading: boolean` — render: a left-panel (320px wide, matching `ComparisonSetupPanel` layout) with a list of scenario checkboxes each showing a color swatch from `SCENARIO_COLORS[index]` (import from `app/src/utils/chart-colors.ts`) and the scenario name; disable unchecked checkboxes when 8 are already selected; show "Selected: N of 8 max" count; show "Analyzes N visible persona(s)" subtext; render a "Run Analysis" button disabled when `selectedScenarioIds.length < 2 || loading`; show a spinner icon when `loading` is true

- [x] T008 [P] [US1] Create `app/src/components/WorkforceAnalysisMatrix.tsx` — props: `results: WorkforceScenarioResult[]`, `metric: AnalysisMetric`, `confidenceLevel: ConfidenceLevel`, `scenarioColors: string[]` — render: a scrollable table where the first column (140px, sticky left) shows persona names from `results[0].persona_results[].persona_name`, and each subsequent column is a scenario (column header = `result.scenario_name`, truncated to 20 chars with a `title` tooltip showing full name, colored with `scenarioColors[index]`); each body cell calls `getCellValue(personaResult, employerCost, metric, percentileKey)` using `CONFIDENCE_PERCENTILE_MAP[confidenceLevel]` from `app/src/types/simulation.ts`; format currency metrics with `formatCurrency`, percentages with `formatPercent`, show "—" for null; apply Tailwind background color classes based on these thresholds: for IR and PoS: `bg-green-100` if value ≥ 0.80, `bg-yellow-100` if 0.60–0.79, `bg-red-100` if < 0.60; for Retirement Balance: `bg-green-100` if ≥ 500000, `bg-yellow-100` if 200000–499999, `bg-red-100` if < 200000; for Employer Cost: `bg-gray-50` (neutral); implement `getCellValue` helper as described in `specs/001-persona-scenario-analysis/plan.md` Step 9; import formatters from `app/src/utils/formatters.ts`

- [x] T009 [US1] Create `app/src/pages/AnalyzePage.tsx` — use workspace context from Layout outlet (`useOutletContext<OutletContext>()` following the pattern in `ResultsDashboardPage.tsx`); load all scenarios for the active workspace on mount using `listScenarios(activeWorkspace.id)` (existing API function); state: `selectedScenarioIds: string[]` (default []), `analysisResult: WorkforceAnalyzeResponse | null` (default null), `metric: AnalysisMetric` (default `'income_replacement_ratio'`), `confidenceLevel: ConfidenceLevel` (default `'75'`), `loading: boolean` (default false), `error: string | null` (default null); compute `visiblePersonaCount` as `activeWorkspace.personas.filter(p => !p.hidden).length`; compute `scenarioColors` as `selectedScenarioIds.map((_, i) => SCENARIO_COLORS[i])`; `handleRun` calls `runWorkforceAnalysis`, sets loading=true, clears error, on success sets `analysisResult`, on failure sets `error`, always sets loading=false; render: page header "Analyze" with subtitle; error banner if `error` is set; flex-row layout with `WorkforceAnalysisSetupPanel` (left, fixed) and results area (right, flex-1); results area shows: a loading spinner when `loading`; an empty state message "Select 2–8 scenarios and click Run Analysis to compare retirement outcomes across all visible personas." when `!loading && !analysisResult`; when `analysisResult` exists, render only `WorkforceAnalysisMatrix` (metric selector and confidence toggle will be added in US3/US4 phases); empty state for `visiblePersonaCount === 0`: "No visible personas in this workspace. Unhide at least one persona to use Analyze." which also disables the Run button

- [x] T010 [US1] Add the Analyze page route to `app/src/App.tsx` — inside the `<Route element={<Layout />}>` block, add `<Route path="/analyze" element={<AnalyzePage />} />` following the pattern of existing routes; add the import `import AnalyzePage from './pages/AnalyzePage'`

- [x] T011 [US1] Add "Analyze" navigation item to `app/src/components/Sidebar.tsx` — in the `navEntries` array within the "Modeling" section, add `{ kind: 'link', label: 'Analyze', icon: BarChart3, to: '/analyze' }` after the "Plan Comparison" entry; import `BarChart3` from `lucide-react`

**Checkpoint**: Navigate to `/analyze` via the sidebar. Select 2 scenarios. Click Run. A matrix appears with one row per non-hidden persona and one column per selected scenario, showing color-coded IR values. Hidden personas are absent.

---

## Phase 4: User Story 2 — Aggregate Workforce Summary per Scenario (Priority: P2)

**Goal**: After running an analysis, each selected scenario has a summary card above the matrix showing the percentage of personas "On Track," the median income replacement ratio, and the average annual employer cost per participant.

**Independent Test**: Run an analysis with 3 scenarios and 5 personas. Verify that 3 aggregate cards appear above the matrix, each showing pct_on_track, median_ir, and avg_employer_cost_annual values that correctly reflect the persona_results for that scenario.

- [x] T012 [US2] Create `app/src/components/WorkforceAggregateSummary.tsx` — props: `results: WorkforceScenarioResult[]`, `scenarioColors: string[]` — render: a horizontal flex row of cards (one per result), each card with a colored top border (matching `scenarioColors[index]`) and the following content: scenario name (bold, truncated), "% On Track: {(aggregate.pct_on_track * 100).toFixed(0)}%", "Median IR: {aggregate.median_ir != null ? formatPercent(aggregate.median_ir) : '—'}", "Avg Employer Cost: {formatCurrency(aggregate.avg_employer_cost_annual)}/yr"; cards should scroll horizontally (`overflow-x-auto` on container) when there are many scenarios; import `WorkforceScenarioResult` from `../types/workforce_analysis` and formatters from `../utils/formatters`

- [x] T013 [US2] Integrate `WorkforceAggregateSummary` into `app/src/pages/AnalyzePage.tsx` — in the results area (when `analysisResult` exists), render `<WorkforceAggregateSummary results={analysisResult.results} scenarioColors={scenarioColors} />` immediately above the `WorkforceAnalysisMatrix`; import the component

**Checkpoint**: After running an analysis, aggregate summary cards appear above the matrix. Each card's values match the corresponding persona rows in the matrix (e.g., if 3 of 4 personas show green/on-track IR, the card shows "75% On Track").

---

## Phase 5: User Story 3 — Switch Primary Comparison Metric (Priority: P3)

**Goal**: After running an analysis, a metric selector allows the user to switch between Income Replacement Ratio, Probability of Success, Retirement Balance, and Employer Cost (Annual) without re-running the analysis. The matrix updates immediately.

**Independent Test**: Run an analysis. Matrix defaults to IR values. Switch metric to "Probability of Success" — matrix cells change to show probability values (0.0–1.0 formatted as percentage) without any loading spinner. Switch to "Retirement Balance" — cells change to currency values with balance thresholds.

- [x] T014 [US3] Add metric selector control to `app/src/pages/AnalyzePage.tsx` — in the results area controls bar (above `WorkforceAggregateSummary`), render a segmented button group for metric selection using `ANALYSIS_METRIC_LABELS` to build the button labels; clicking a button sets `metric` state; pass `metric={metric}` prop to `WorkforceAnalysisMatrix`; all buttons are always visible (the matrix already supports all four metrics from T008); style the active button with a blue/primary background matching `ConfidenceLevelToggle` style

**Checkpoint**: With results visible, click "Probability of Success" in the metric selector. Matrix cells immediately show PoS values. Click "Retirement Balance" — cells show currency values. No API call is made during switching.

---

## Phase 6: User Story 4 — Adjust Confidence Level (Priority: P4)

**Goal**: A confidence level toggle (50%, 75%, 90%) applies uniformly to all matrix values and aggregates update accordingly. Higher confidence shows more conservative values.

**Independent Test**: With results showing IR at 75% confidence, switch to 90% confidence. All IR values in the matrix decrease or stay the same (never increase), because 90% confidence maps to the p10 percentile. Switch to 50% confidence — values increase.

- [x] T015 [US4] Add `ConfidenceLevelToggle` to `app/src/pages/AnalyzePage.tsx` — in the controls bar alongside the metric selector, render `<ConfidenceLevelToggle value={confidenceLevel} onChange={setConfidenceLevel} />` (existing reusable component from `app/src/components/ConfidenceLevelToggle.tsx`); pass `confidenceLevel={confidenceLevel}` prop to `WorkforceAnalysisMatrix`; no new component needed — `WorkforceAnalysisMatrix` already accepts the `confidenceLevel` prop from T008 and uses `CONFIDENCE_PERCENTILE_MAP` to select the correct percentile key

**Checkpoint**: With results visible, toggle from 75% to 90% confidence. All percentile-based metric values (IR, Balance) decrease. Scalar metrics (PoS, Employer Cost) are unaffected by confidence toggle. Aggregate median IR also updates.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge-case hardening and final verification across all user stories.

- [x] T016 [P] Harden empty states and edge cases in `app/src/pages/AnalyzePage.tsx` — verify and implement all FR-012 and edge cases from spec: (1) if `scenarios.length < 2` show "This workspace needs at least 2 scenarios to use Analyze. Create scenarios in the Scenarios section." and hide the setup panel run button; (2) if `visiblePersonaCount === 0` show "No visible personas available. Unhide at least one persona in Persona Modeling to use Analyze."; (3) ensure the Run button is disabled (not just visually) during loading to prevent duplicate submissions (`loading` state gates the handler); (4) if user navigates away mid-request, the stale response is ignored (use a `cancelled` flag in the async handler or AbortController)

- [x] T017 [P] Verify scenario name truncation and tooltip in `app/src/components/WorkforceAnalysisMatrix.tsx` — ensure column headers with names longer than 20 characters display a truncated name (CSS `truncate` or manual `.slice(0,20) + '...'`) with a `title` attribute showing the full name; test with a scenario named "Very Long Conservative Match Scenario Name"

- [ ] T018 Run the full 12-step manual verification checklist from `specs/001-persona-scenario-analysis/quickstart.md` — check each item and confirm all pass; fix any failures found before closing this feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001 and T002 run in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 completion
  - T003 depends on T001 (needs backend models)
  - T004 depends on T002 (needs frontend types)
  - T005 depends on T003 (needs service implementation)
  - T006 depends on T005 (needs router)
- **User Story phases (3–6)**: All depend on Phase 2 completion
  - T007, T008 can run in parallel (different files, no inter-dependency)
  - T009 depends on T007, T008 (AnalyzePage wires both sub-components)
  - T010 depends on T009
  - T011 can run in parallel with T007/T008 (different file: Sidebar)
  - T012 can start as soon as Phase 2 is complete (no dependency on Phase 3 tasks)
  - T013 depends on T009 and T012
  - T014 depends on T009 (modifies AnalyzePage)
  - T015 depends on T009 (modifies AnalyzePage)
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — can start after T006 completes
- **US2 (P2)**: Depends on US1 (T009 must exist before T013 can wire into it), but `WorkforceAggregateSummary` (T012) can be built in parallel with US1 tasks
- **US3 (P3)**: Depends on T009 existing — adds a control to the existing page
- **US4 (P4)**: Depends on T009 existing — adds a control to the existing page; US3 and US4 can be worked in parallel (different additions to AnalyzePage, but be careful of merge conflicts)

### Parallel Opportunities

- **Phase 1**: T001 ‖ T002
- **Phase 2**: T003 ‖ T004 → then T005 → T006
- **Phase 3**: T007 ‖ T008 ‖ T011 (three different new files) → T009 → T010
- **Phase 4 + Phase 3**: T012 can be written while Phase 3 is still in progress (it's a standalone component)
- **Phase 7**: T016 ‖ T017 (different files)

---

## Parallel Example: Phase 3 (US1)

```text
# These three tasks have no inter-dependencies — start all at once:
T007: WorkforceAnalysisSetupPanel.tsx  (new component file)
T008: WorkforceAnalysisMatrix.tsx      (new component file)
T011: Sidebar.tsx                      (add one nav entry)

# Once T007 and T008 complete:
T009: AnalyzePage.tsx                  (wires T007 + T008 + API call)

# Once T009 complete:
T010: App.tsx                          (add /analyze route)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: Foundational (T003→T005→T006, T004 in parallel)
3. Complete Phase 3: User Story 1 (T007‖T008‖T011 → T009 → T010)
4. **STOP and VALIDATE**: Navigate to `/analyze`, select 2 scenarios, run, confirm matrix renders
5. This delivers: full backend endpoint + navigable page + persona × scenario matrix with color coding

### Incremental Delivery

1. **MVP** (US1): Backend endpoint + matrix view — plan designers can compare all personas at once
2. **+US2**: Add aggregate cards — adds workforce-level insight per scenario
3. **+US3**: Add metric selector — allows exploring PoS, Balance, Cost without re-running
4. **+US4**: Add confidence toggle — allows conservative/optimistic scenario switching
5. **Polish**: Edge cases, name truncation, full verification checklist

### Suggested Implementation Order (Single Developer)

```
T001 → T002 → T003 → T004 → T005 → T006    # Foundation (backend + types)
→ T007 → T008 → T011 → T009 → T010          # US1 frontend (setup panel + matrix + page + route)
→ T012 → T013                                # US2 (aggregate summary)
→ T014 → T015                                # US3 + US4 (metric selector + confidence toggle)
→ T016 → T017 → T018                         # Polish + verification
```

---

## Notes

- **[P]** tasks use different files and have no dependencies on sibling [P] tasks in the same phase
- Each user story phase produces a working, independently testable increment
- The `WorkforceAnalysisMatrix` component (T008) is designed from the start to accept `metric` and `confidenceLevel` props, so US3/US4 require no changes to the matrix itself — only adding UI controls in `AnalyzePage`
- Follow exact patterns from `PlanComparisonPage.tsx` and `ResultsDashboardPage.tsx` for layout, error handling, and workspace context access
- No new npm or pip dependencies required — all reuses existing libraries
- The `_compute_employer_cost` in the service (T003) should be adapted directly from `api/services/comparison_service.py` to ensure cost parity between features
