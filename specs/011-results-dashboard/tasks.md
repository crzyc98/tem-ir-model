# Tasks: Results Dashboard

**Input**: Design documents from `/specs/011-results-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/simulate-api.md, contracts/frontend-components.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create TypeScript types, formatting utilities, and API function needed by all frontend stories

- [x] T001 [P] Create TypeScript simulation types (PercentileValues, YearSnapshot, PersonaSimulationResult, SimulationResponse, SimulationRequest, ConfidenceLevel) in app/src/types/simulation.ts per data-model.md "Frontend Simulation Types" section. Include a CONFIDENCE_PERCENTILE_MAP constant mapping ConfidenceLevel → percentile field name ({"50": "p50", "75": "p25", "90": "p10"})
- [x] T002 [P] Create formatting utilities (formatCurrency with Intl.NumberFormat for "$X,XXX", formatPercent for "X.X%", formatCompactCurrency for chart axes "$620K"/"$1.2M") in app/src/utils/formatters.ts per contracts/frontend-components.md "Formatting Conventions" table
- [x] T003 [P] Add runSimulation(workspaceId: string, scenarioId: string, request?: SimulationRequest) function to app/src/services/api.ts per contracts/simulate-api.md "Frontend API Function" section. POST to `${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}/simulate`, throw on non-ok response

---

## Phase 2: Foundational (Backend — Blocking Prerequisites)

**Purpose**: Extend simulation engine and response models with p10 percentile, contribution tracking, probability of success, and income replacement ratio

**⚠️ CRITICAL**: No frontend story beyond the page scaffold can display real data until this phase is complete

- [x] T004 Extend Pydantic models in api/models/simulation_result.py: (1) add `p10: float` field to `PercentileValues` before p25, (2) add `p10: float` field to `YearSnapshot` before p25, (3) add five new fields to `PersonaSimulationResult`: `total_employee_contributions: float = 0.0`, `total_employer_contributions: float = 0.0`, `probability_of_success: float = 1.0`, `income_replacement_ratio: PercentileValues | None = None`, `projected_salary_at_retirement: float = 0.0`. All new fields have defaults for backward compatibility.
- [x] T005 Update PERCENTILES constant from `(25, 50, 75, 90)` to `(10, 25, 50, 75, 90)` in api/services/simulation_engine.py. Fix ALL percentile array indexing throughout the file — every `pcts[0]`, `pcts[1]`, `pcts[2]`, `pcts[3]` reference must shift by +1 to account for the new leading p10 element. Update all PercentileValues and YearSnapshot constructions to include the new `p10=pcts[0]` field. Search for every occurrence of `pcts[` and `PERCENTILES` to ensure nothing is missed.
- [x] T006 Add contribution accumulation to the accumulation loop in api/services/simulation_engine.py `_simulate_persona` method. Initialize three numpy arrays `cum_deferrals`, `cum_match`, `cum_core` (all shape `(n,)`, zeros). Each year in the accumulation loop, add the year's `deferrals`, `vested_match`, `vested_core` to these running totals. After the accumulation loop ends, compute `total_employee_contributions = float(np.median(cum_deferrals))` and `total_employer_contributions = float(np.median(cum_match + cum_core))`.
- [x] T007 Add probability of success and income replacement ratio calculations in api/services/simulation_engine.py after the distribution phase loop. Probability: `float(np.sum(balances > 0) / n)` using final balances at planning age. Projected salary: `persona.salary * (1 + assumptions.wage_growth_rate) ** years_to_retirement` (deterministic). Income replacement ratio: for each percentile in PERCENTILES, divide the corresponding total_retirement_income percentile by projected_salary; construct a PercentileValues with the results. If no distribution phase, set probability_of_success=1.0 and income_replacement_ratio=None.
- [x] T008 Wire new computed values into PersonaSimulationResult construction in api/services/simulation_engine.py. Add `total_employee_contributions`, `total_employer_contributions`, `probability_of_success`, `income_replacement_ratio`, and `projected_salary_at_retirement` fields to the PersonaSimulationResult instantiation that is returned from `_simulate_persona`.

**Checkpoint**: Backend now returns extended simulation results. Verify with: `curl -X POST http://localhost:8000/api/v1/workspaces/{id}/scenarios/{id}/simulate | python -m json.tool` — confirm new fields appear in response.

---

## Phase 3: User Story 1 — Run Simulation and View Summary Table (Priority: P1) 🎯 MVP

**Goal**: User can navigate to the results page, run a simulation, and see a summary data table with all 7 columns for every active persona.

**Independent Test**: Navigate to `/scenarios/{scenarioId}/results`, click "Run Simulation", verify table appears with persona name, projected balance, annual income, income replacement ratio, probability of success, employer contributions, employee contributions. Default confidence level is 75%.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create ResultsSummaryTable component in app/src/components/ResultsSummaryTable.tsx per contracts/frontend-components.md. Props: `personas: PersonaSimulationResult[]`, `confidenceLevel: ConfidenceLevel`. Render HTML `<table>` with Tailwind styling (`bg-white rounded-lg shadow`). Seven columns per contract: Persona Name, Projected Balance, Annual Income, Income Replacement Ratio, Probability of Success, Employer Contributions, Employee Contributions. Use CONFIDENCE_PERCENTILE_MAP from types/simulation.ts to select the correct percentile field. Use formatCurrency() for monetary values, formatPercent(value, 1) for ratios, formatPercent(value, 0) for probability. Sort rows by persona name.
- [x] T010 [US1] Create ResultsDashboardPage in app/src/pages/ResultsDashboardPage.tsx per contracts/frontend-components.md. Use `useOutletContext<LayoutContext>()` for workspace, `useParams()` for scenarioId. State: `simulationResult: SimulationResponse | null`, `loading: boolean`, `error: string | null`, hardcoded `confidenceLevel: ConfidenceLevel = "75"` (toggle added in US4). Fetch scenario details on mount to display scenario name. "Run Simulation" button calls runSimulation(). Show loading spinner during simulation. Show error banner with retry on failure. When no results: show empty state CTA with "Run Simulation" prompt. When results exist: render ResultsSummaryTable with simulation results and confidence level.
- [x] T011 [US1] Add results dashboard route to app/src/App.tsx. Import ResultsDashboardPage and add `<Route path="scenarios/:scenarioId/results" element={<ResultsDashboardPage />} />` inside the Layout route group, following the existing routing pattern (e.g., adjacent to the `scenarios/:scenarioId` edit route).

**Checkpoint**: MVP complete — user can run simulation and view the summary table at 75% confidence. All 7 columns display correct data.

---

## Phase 4: User Story 2 — Assess Income Replacement Adequacy (Priority: P2)

**Goal**: User can see a bar chart comparing income replacement ratios across personas with 70% and 80% reference lines.

**Independent Test**: After running simulation, verify bar chart appears with one bar per persona. Reference lines at 70% and 80% are visible and labeled. Bars below 70% are red, 70-80% yellow, above 80% green.

### Implementation for User Story 2

- [x] T012 [US2] Create IncomeReplacementChart component in app/src/components/IncomeReplacementChart.tsx per contracts/frontend-components.md. Props: `personas: PersonaSimulationResult[]`, `confidenceLevel: ConfidenceLevel`. Use Recharts `BarChart` wrapped in `ResponsiveContainer` (width="100%", height={350}). Transform persona data into chart data array: `[{ name: persona_name, ratio: income_replacement_ratio[percentileField] }]`. Render `<Bar dataKey="ratio">` with per-bar `<Cell>` fill colors: red (#ef4444) below 0.70, yellow (#eab308) 0.70–0.80, green (#22c55e) above 0.80. Add two `<ReferenceLine y={0.70} label="70%" stroke="#ef4444" strokeDasharray="3 3" />` and `<ReferenceLine y={0.80} label="80%" stroke="#22c55e" strokeDasharray="3 3" />`. X-axis: persona names. Y-axis: 0–1.2 domain, formatted as percentage via tick formatter. Add `<Tooltip>` with percentage format.
- [x] T013 [US2] Integrate IncomeReplacementChart into ResultsDashboardPage in app/src/pages/ResultsDashboardPage.tsx. Import the component and render it in the dashboard layout above the summary table, in a two-column grid alongside where the trajectory chart will go (left column). Pass `personas={simulationResult.personas}` and `confidenceLevel={confidenceLevel}`. Wrap in a card container (`bg-white rounded-lg shadow p-6`) with heading "Income Replacement Ratio".

**Checkpoint**: Bar chart renders alongside summary table. Reference lines visible. Bar colors reflect threshold zones.

---

## Phase 5: User Story 3 — Analyze Balance Growth Trajectories (Priority: P3)

**Goal**: User can see a line chart showing each persona's projected balance accumulation with shaded confidence bands.

**Independent Test**: After running simulation, verify line chart shows one trajectory per persona from their current age to retirement age. Confidence bands are visible as shaded areas. Legend identifies each persona. Hover tooltips show persona name, age, and balance.

### Implementation for User Story 3

- [x] T014 [US3] Create TrajectoryChart component in app/src/components/TrajectoryChart.tsx per contracts/frontend-components.md. Props: `personas: PersonaSimulationResult[]`, `confidenceLevel: ConfidenceLevel`, `retirementAge: number`. Use Recharts `ComposedChart` wrapped in `ResponsiveContainer` (width="100%", height={400}). Define a color palette (6-8 distinct colors). For data transformation: merge all personas' trajectories into a unified age-indexed dataset where each age row has fields like `persona1_line`, `persona1_upper`, `persona1_lower` keyed by persona index. Per confidence level mapping from data-model.md: 50% → line=p50, band=p25–p75; 75% → line=p25, band=p10–p50; 90% → line=p10, no band. Render `<Area>` for each persona's band (semi-transparent fill, no stroke) and `<Line>` for central estimate. X-axis: age. Y-axis: balance with formatCompactCurrency tick formatter. Add `<Legend>` with persona names. Add `<Tooltip>` showing persona name, age, and balance. Add `<ReferenceLine x={retirementAge} label="Retirement" stroke="#6b7280" strokeDasharray="3 3" />`.
- [x] T015 [US3] Integrate TrajectoryChart into ResultsDashboardPage in app/src/pages/ResultsDashboardPage.tsx. Import the component and render it in the right column of the two-column chart grid. Pass `personas={simulationResult.personas}`, `confidenceLevel={confidenceLevel}`, and `retirementAge={simulationResult.retirement_age}`. Wrap in a card container with heading "Balance Accumulation Trajectories".

**Checkpoint**: Trajectory chart renders in right column. Each persona has a distinct-colored line with shaded confidence band. Legend and tooltips functional.

---

## Phase 6: User Story 4 — Adjust Confidence Level (Priority: P4)

**Goal**: User can toggle between 50%, 75%, and 90% confidence levels and see all visualizations update simultaneously.

**Independent Test**: Click each confidence level button. Verify: (1) summary table values change — 50% shows highest values, 90% shows lowest, (2) bar chart heights change correspondingly, (3) trajectory chart lines and bands shift. Selected level is visually highlighted.

### Implementation for User Story 4

- [x] T016 [US4] Create ConfidenceLevelToggle component in app/src/components/ConfidenceLevelToggle.tsx per contracts/frontend-components.md. Props: `value: ConfidenceLevel`, `onChange: (level: ConfidenceLevel) => void`. Render three buttons labeled "50%", "75%", "90%". Selected button has filled background (e.g., `bg-blue-600 text-white`), unselected buttons have outline style (e.g., `bg-white text-gray-700 border`). Use `rounded-l-lg`, no rounding, `rounded-r-lg` for button group styling. Call `onChange` with the corresponding level string on click.
- [x] T017 [US4] Wire confidence level toggle into ResultsDashboardPage in app/src/pages/ResultsDashboardPage.tsx. Replace hardcoded `confidenceLevel = "75"` with `useState<ConfidenceLevel>("75")`. Import and render `<ConfidenceLevelToggle value={confidenceLevel} onChange={setConfidenceLevel} />` above the chart grid per the layout in contracts/frontend-components.md. Confirm that all child components (ResultsSummaryTable, IncomeReplacementChart, TrajectoryChart) already receive `confidenceLevel` as a prop — they should update automatically when the toggle changes state.

**Checkpoint**: All three confidence levels work. Switching levels instantly updates all visualizations without re-running simulation. 50% shows optimistic values, 90% shows conservative values, 75% is default.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, consistency verification, and final validation

- [x] T018 Handle edge cases across all components in app/src/pages/ResultsDashboardPage.tsx and app/src/components/. Verify and fix: (1) single persona — bar chart shows one bar, trajectory shows one line, table shows one row, (2) persona at retirement age — trajectory chart handles empty/single-point trajectory gracefully, (3) zero balance/zero deferral persona — displays $0 and 0.0% without errors, (4) persona with null income_replacement_ratio — table and bar chart handle null gracefully (show "N/A" or skip), (5) no active personas — show appropriate empty state message
- [x] T019 Run quickstart.md verification checklist (all 11 steps) end-to-end. Start both dev servers, navigate to results page, run simulation, verify all visualizations, test all three confidence levels, verify tooltip behavior, test single-persona scenario

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. All three tasks are parallel.
- **Foundational (Phase 2)**: T004 first (models), then T005→T006→T007→T008 sequentially (all modify simulation_engine.py). T004 is independent of Phase 1.
- **User Story 1 (Phase 3)**: Depends on Phase 1 (types, formatters, API function) and Phase 2 (backend returns data). T009 and T011 can be parallel (different files). T010 depends on T009 (page must exist for route to reference it) — or they can be done together.
- **User Story 2 (Phase 4)**: Depends on Phase 3 (page exists). T012 then T013 sequentially.
- **User Story 3 (Phase 5)**: Depends on Phase 3 (page exists). T014 then T015 sequentially. Can run in parallel with US2 if T013 and T015 modifications to ResultsDashboardPage are coordinated.
- **User Story 4 (Phase 6)**: Depends on Phase 3 (page with hardcoded confidence). T016 then T017 sequentially.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 1 + Phase 2 — no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (page scaffold exists). Independent of US3 and US4.
- **User Story 3 (P3)**: Depends on US1 (page scaffold exists). Independent of US2 and US4.
- **User Story 4 (P4)**: Depends on US1 (page with components to toggle). Best implemented after US2 and US3 so all visualizations respond to the toggle.

### Within Each User Story

- Create component(s) first, then integrate into the page
- Components accept `confidenceLevel` as a prop from the start (even before US4 adds the toggle)

### Parallel Opportunities

- **Phase 1**: T001, T002, T003 are all parallel (three different files)
- **Phase 2**: T004 parallel with Phase 1 tasks (different files, backend vs frontend)
- **Phase 3**: T009 and T011 can be parallel (different files)
- **Phase 4 + 5**: T012 and T014 can be parallel (different component files), but T013 and T015 must be sequential (both modify ResultsDashboardPage.tsx)

---

## Parallel Example: Phase 1 (Setup)

```bash
# Launch all setup tasks together (all different files):
Task: "Create TypeScript simulation types in app/src/types/simulation.ts"
Task: "Create formatting utilities in app/src/utils/formatters.ts"
Task: "Add runSimulation() function to app/src/services/api.ts"
```

## Parallel Example: Phase 2 + Phase 1

```bash
# Backend model changes can run alongside frontend setup:
Task: "Extend Pydantic models in api/models/simulation_result.py"  # backend
Task: "Create TypeScript types in app/src/types/simulation.ts"      # frontend
Task: "Create formatting utilities in app/src/utils/formatters.ts"  # frontend
```

## Parallel Example: Phase 4 + Phase 5

```bash
# Chart components can be created in parallel (different files):
Task: "Create IncomeReplacementChart in app/src/components/IncomeReplacementChart.tsx"
Task: "Create TrajectoryChart in app/src/components/TrajectoryChart.tsx"
# Then integrate sequentially (both modify ResultsDashboardPage.tsx)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (3 tasks, all parallel)
2. Complete Phase 2: Foundational backend changes (5 tasks, sequential)
3. Complete Phase 3: User Story 1 — Summary Table (3 tasks)
4. **STOP and VALIDATE**: Run simulation, verify table displays all 7 columns correctly at 75% confidence
5. Deploy/demo if ready — the summary table alone delivers significant analytical value

### Incremental Delivery

1. Phase 1 + Phase 2 → Backend ready, frontend scaffolded
2. Add US1 → Summary table MVP → Deploy/Demo
3. Add US2 → Income replacement bar chart → Deploy/Demo
4. Add US3 → Balance trajectory chart → Deploy/Demo
5. Add US4 → Confidence toggle enhances all views → Deploy/Demo
6. Polish → Edge cases and full verification → Final release

### Parallel Team Strategy

With two developers:

1. **Developer A** (backend): Phase 2 — all engine and model changes
2. **Developer B** (frontend): Phase 1 — types, formatters, API function
3. Once both complete:
   - **Developer A**: US2 (IncomeReplacementChart) + US3 (TrajectoryChart)
   - **Developer B**: US1 (Page + SummaryTable) then US4 (ConfidenceLevelToggle)
4. Merge and run Phase 7 verification together

---

## Notes

- All components accept `confidenceLevel` as a prop from the start, even before the toggle (US4) exists — the page passes a hardcoded `"75"` until then
- Backend changes are backward-compatible: all new fields have defaults, so existing API consumers are unaffected
- The confidence level toggle is purely client-side — it does NOT trigger a new simulation run
- Probability of success and contribution totals are scalar values that do NOT change with confidence level
- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
