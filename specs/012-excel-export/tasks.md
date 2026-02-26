# Tasks: Simulation Results Excel Export

**Input**: Design documents from `/specs/012-excel-export/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/export-api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Add the only new dependency required for this feature.

- [x] T001 Add `openpyxl>=3.1,<4` to the `[project] dependencies` list in `pyproject.toml` and run `pip install -e .` to make it available in the virtual environment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No infrastructure changes are required — the existing FastAPI router structure, Pydantic models, and storage layer are all reused. Setup (Phase 1) is the only blocker.

**Checkpoint**: `openpyxl` installed → user story implementation can begin

---

## Phase 3: User Story 1 — Core Excel Download (Priority: P1) 🎯 MVP

**Goal**: A user with simulation results can click "Download Excel" and receive a valid `.xlsx` file with a data table containing one row per persona and all key retirement metrics across all confidence levels.

**Independent Test**: Run a simulation, click "Download Excel", open the file — it must contain a column header row and one data row per persona, with all 15 expected columns (Persona, Bal p10-p90, IRR p10-p90, Prob. of Success, Employee Contrib, Employer Contrib, Total Contrib). The header block can be minimal or absent at this stage; US2 fills it in.

### Implementation for User Story 1

- [x] T002 [US1] Create `api/services/excel_export_service.py` — implement `generate_workbook(scenario: Scenario, simulation_result: SimulationResponse) -> bytes` using `openpyxl`; write a bold column header row with labels: `Persona | Bal p10 | Bal p25 | Bal p50 | Bal p75 | Bal p90 | IRR p10 | IRR p25 | IRR p50 | IRR p75 | IRR p90 | Prob. of Success | Employee Contrib | Employer Contrib | Total Contrib`; write one data row per `PersonaSimulationResult`; format currency columns with `$#,##0` number format and PoS/IRR columns with `0.0%`; render null `income_replacement_ratio` cells as the string `"N/A"`; serialize to `io.BytesIO` and return bytes

- [x] T003 [P] [US1] Add `POST /workspaces/{workspace_id}/scenarios/{scenario_id}/export` endpoint to `api/routers/scenarios.py` — accept `SimulationResponse` as JSON request body; temporarily pass a stub or the scenario loaded by existing `get_scenario` dependency; call `generate_workbook()` from `excel_export_service.py`; return `fastapi.responses.StreamingResponse` with `media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"` and `Content-Disposition: attachment; filename="{scenario_id}_results.xlsx"`

- [x] T004 [P] [US1] Add `exportSimulationExcel(workspaceId: string, scenarioId: string, simulationResult: SimulationResponse): Promise<Blob>` to `app/src/services/api.ts` — POST to `${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}/export` with `Content-Type: application/json` body of `JSON.stringify(simulationResult)`; throw on non-OK response; return `response.blob()`

- [x] T005 [US1] Add "Download Excel" button and download handler to `app/src/pages/ResultsDashboardPage.tsx` — add `handleExportExcel` async function that calls `exportSimulationExcel()`, creates a `URL.createObjectURL(blob)` URL, programmatically creates and clicks an `<a>` element with `download` set to `${scenario?.name ?? 'simulation'}_results.xlsx`, then calls `URL.revokeObjectURL()`; render the button using a `Download` icon from `lucide-react`; button is `disabled={!simulationResult}`; place button near the existing "Run Simulation" button in the header area

- [x] T006 [P] [US1] Write unit tests in `tests/services/test_excel_export_service.py` — fixture: build a minimal `SimulationResponse` with two `PersonaSimulationResult` objects (one with valid IRR values, one with `income_replacement_ratio=None`); test: `generate_workbook()` returns bytes that `openpyxl.load_workbook(BytesIO(result))` parses without error; test: active worksheet has exactly 3 rows (1 header + 2 persona rows); test: header row contains all 15 expected column labels; test: null IRR cells in second persona row contain the string `"N/A"` (not empty); test: `total_employee_contributions + total_employer_contributions` equals the "Total Contrib" cell value

- [x] T007 [P] [US1] Write integration test in `tests/integration/test_excel_export.py` — use the `TestClient` pattern from existing integration tests; fixture: create workspace + scenario via API, then POST to `/simulate` and capture `SimulationResponse`; test: POST to `/export` with that body returns `200` and `Content-Type` containing `spreadsheetml.sheet`; test: response bytes parse as a valid xlsx (openpyxl load succeeds); test: POST to `/export` with a non-existent `scenario_id` UUID returns `404`

**Checkpoint**: User Story 1 complete — end-to-end download works, file opens in any spreadsheet app, data table is correct

---

## Phase 4: User Story 2 — Plan Design Summary Header (Priority: P2)

**Goal**: The downloaded Excel file is self-contained — opening it shows a plan design summary header block and a simulation assumptions block above the data table, so stakeholders without app access can interpret the results.

**Independent Test**: Download Excel, open file — row 1 must contain "Plan Design Summary" in the title cell; subsequent rows must contain labeled plan design fields (auto enroll, match formula, etc.); a clearly labeled "Simulation Assumptions" section must follow with inflation rate, retirement age, and number of simulations; data table rows must be unchanged.

### Implementation for User Story 2

- [x] T008 [US2] Update `api/services/excel_export_service.py` — before the data table rows, prepend: (a) title row with bold text `"Plan Design Summary — {scenario.name}"` in column A; (b) blank row; (c) label-value rows for plan design fields: `Auto Enrollment`, `Default Deferral Rate`, `Auto Escalation`, `Annual Escalation Rate`, `Escalation Cap`, `Match Formula` (one row per tier formatted as `"{rate*100:.0f}% on first {on_first*100:.0f}%"`), `Match Vesting`, `Match Eligibility`, `Core Contribution Rate`, `Core Vesting`, `Core Eligibility`; (d) blank row; (e) bold section label `"Simulation Assumptions"`; (f) label-value rows: `Retirement Age`, `Planning Age`, `Number of Simulations`, `Inflation Rate`, `Wage Growth Rate`; (g) two blank rows before the existing data table column header row; apply bold formatting to all section label cells and the label column (column A) of each label-value row

- [x] T009 [US2] Update the `POST /export` endpoint in `api/routers/scenarios.py` — replace the stub scenario with a real scenario loaded from storage using the existing `ScenarioStorage` or `get_scenario` dependency pattern; raise `HTTPException(status_code=404, detail="Scenario not found")` if the scenario does not exist; update the `Content-Disposition` filename to use `re.sub(r'[^\w\s-]', '_', scenario.name).strip().replace(' ', '_')` to sanitize the scenario name; pass the loaded scenario to `generate_workbook()`

- [x] T010 [P] [US2] Add header block unit tests to `tests/services/test_excel_export_service.py` — build a minimal scenario fixture with known `plan_design` values; test: cell A1 of the worksheet contains text starting with `"Plan Design Summary"`; test: a cell in column A contains `"Auto Enrollment"` before the column header row; test: a cell in column A contains `"Simulation Assumptions"` before the column header row; test: total worksheet row count equals (header rows + 2 blank rows + 1 column header + N persona rows); test: "Match Formula" label appears once per match tier

- [x] T011 [P] [US2] Add header integration tests to `tests/integration/test_excel_export.py` — using existing workspace/scenario fixture; test: downloaded xlsx cell A1 contains "Plan Design Summary"; test: scenario name appears somewhere in the first few rows; test: updating scenario plan design and re-exporting produces a header reflecting the updated values (re-POST to `/export` with same body, compare cell content)

**Checkpoint**: User Stories 1 AND 2 complete — exported file is fully self-contained with plan design context

---

## Phase 5: User Story 3 — Export Unavailable Without Results (Priority: P3)

**Goal**: Users who visit the results dashboard before running a simulation see the download button in a visibly disabled state with an explanatory tooltip, preventing confusion about what the button does.

**Independent Test**: Navigate to results dashboard for a scenario with no simulation results — "Download Excel" button must render with `disabled` attribute and tooltip `"Run simulation first to enable export"`; after running simulation, button must become enabled and functional.

### Implementation for User Story 3

- [x] T012 [US3] Update "Download Excel" button in `app/src/pages/ResultsDashboardPage.tsx` — ensure `disabled={!simulationResult}` is applied; add `title={simulationResult ? 'Download Excel report' : 'Run simulation first to enable export'}` attribute to the button element; add `aria-disabled={!simulationResult}` for accessibility; visually style the disabled state using Tailwind `disabled:opacity-50 disabled:cursor-not-allowed` classes consistent with other disabled controls in the dashboard

**Checkpoint**: All three user stories complete — feature is fully functional with proper UX for all states

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Formatting quality, edge case robustness, and end-to-end validation.

- [x] T013 Apply column auto-width to `api/services/excel_export_service.py` — after writing all rows, iterate over worksheet columns to calculate the maximum character length of each column's content; set `ws.column_dimensions[col_letter].width = min(max_length + 4, 40)` for each column; freeze the data table column header row with `ws.freeze_panes = ws.cell(row=header_row_index, column=1)` so it stays visible when scrolling

- [x] T014 [P] Handle zero-persona edge case in `api/services/excel_export_service.py` — after the plan design + assumptions header block, if `simulation_result.personas` is empty, write the column header row followed by a single row with `"No personas configured"` in column A and empty cells for remaining columns; do not raise an exception

- [x] T015 [P] Verify filename sanitization in `api/routers/scenarios.py` — add an integration test in `tests/integration/test_excel_export.py` for a scenario whose name contains spaces and special characters (e.g., `"Q4 Plan: 2026 Test!"`); assert the `Content-Disposition` header contains only safe filename characters and no unescaped special characters; assert the downloaded file still opens successfully

- [x] T016 Validate end-to-end per `specs/012-excel-export/quickstart.md` — manually run the quickstart curl steps; confirm the exported file opens in a spreadsheet app; confirm all sections (plan design header, assumptions, data table) are present and correctly formatted; note any discrepancies and fix

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Skipped (no new infrastructure needed)
- **User Story 1 (Phase 3)**: Depends on T001 (openpyxl installed)
- **User Story 2 (Phase 4)**: Depends on T002 (service exists), T003 (endpoint exists), T009 replaces T003's stub
- **User Story 3 (Phase 5)**: Depends on T004 (API client exists), T005 (button exists) — frontend-only, can start after T004+T005
- **Polish (Phase 6)**: Depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: Starts after T001 — no dependency on US2 or US3
- **US2 (P2)**: Depends on T002 and T003 from US1 (extends the service and endpoint)
- **US3 (P3)**: Depends on T004 and T005 from US1 (modifies the button added in US1)

### Within User Story 1

- T002 first (service — everything else depends on it)
- T003 and T004 in parallel (different files — `scenarios.py` and `api.ts`)
- T005 after T004 (uses `exportSimulationExcel` from api.ts)
- T006 and T007 in parallel after T002 (different test files)

### Within User Story 2

- T008 first (extends service from T002)
- T009 in parallel with T008 (extends endpoint from T003, different concern)
- T010 and T011 in parallel after T008/T009 (different test files)

---

## Parallel Opportunities

### User Story 1

```
After T001 (openpyxl):
  T002 → (blocks T003, T006, T007)

After T002:
  T003 ──────────────────────── [parallel] ──── (scenarios.py: endpoint stub)
  T004 ──────────────────────── [parallel] ──── (api.ts: exportSimulationExcel)
  T006 ──────────────────────── [parallel] ──── (test_excel_export_service.py: unit tests)
  T007 ──────────────────────── [parallel] ──── (test_excel_export.py: integration tests)

After T004:
  T005 ─── (ResultsDashboardPage.tsx: button + handler)
```

### User Story 2

```
After US1 complete:
  T008 → (extends service — blocks T010)
  T009 ──────────────────────── [parallel] ──── (extends endpoint — blocks T011)

After T008/T009:
  T010 ──────────────────────── [parallel] ──── (unit test additions)
  T011 ──────────────────────── [parallel] ──── (integration test additions)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T001: Install openpyxl
2. Complete T002: Service with data table
3. Complete T003 + T004 in parallel: Endpoint + API client
4. Complete T005: Download button
5. **STOP and VALIDATE**: Run simulation → click Download → open Excel → verify data table
6. Complete T006 + T007 in parallel: Tests pass
7. Demo / ship as MVP

### Incremental Delivery

1. T001 → T002 → T003/T004 → T005 → MVP download works ← **ship**
2. T008 → T009 → header enriched → US2 complete ← **ship**
3. T012 → disabled state → US3 complete ← **ship**
4. T013/T014/T015/T016 → polish ← **ship**

### Single Developer Sequence

```
T001 → T002 → T003 → T004 → T005 → T006 → T007
     → T008 → T009 → T010 → T011
     → T012
     → T013 → T014 → T015 → T016
```

---

## Notes

- **[P]** tasks operate on different files and have no shared state — safe to parallelize
- **Story labels** [US1]/[US2]/[US3] enable traceability to spec.md acceptance scenarios
- US1 is the complete MVP — it delivers a working download with a correct data table
- US2 enriches the same artifacts; no new files are created in Phase 4
- US3 is purely a frontend change — 1 task, <30 minutes
- `trajectory` data in `SimulationResponse` is large but unused by the export service — clients may omit it (empty array `[]`) to reduce request body size
- The export endpoint does not persist any data — fully aligned with the compute-and-return architecture
