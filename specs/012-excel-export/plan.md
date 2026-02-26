# Implementation Plan: Simulation Results Excel Export

**Branch**: `012-excel-export` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-excel-export/spec.md`

---

## Summary

Add the ability to export simulation results from a scenario as a formatted `.xlsx` file, accessible via a "Download Excel" button on the results dashboard. The export includes a plan design summary header block, a simulation assumptions block, and a data table with one row per persona containing all key retirement metrics across all confidence levels (p10/p25/p50/p75/p90).

**Technical approach**: A new `ExcelExportService` generates the workbook using `openpyxl`. A new `POST /scenarios/{id}/export` endpoint accepts the `SimulationResponse` as the request body (avoiding re-computation or new persistence), loads the scenario from storage to enrich the header, and streams the file back. The frontend adds an `exportSimulationExcel` API function and a disabled-when-no-results download button to the `ResultsDashboardPage`.

---

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8.2 (frontend)
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, openpyxl ≥3.1 (new), React 19, Vite 6.2
**Storage**: JSON files on local filesystem (existing; read-only for this feature — no new persistence)
**Testing**: pytest (backend unit + integration), no frontend test framework currently
**Target Platform**: Linux/macOS server (backend), browser (frontend via Vite dev proxy)
**Project Type**: Web service (FastAPI backend) + web application (React frontend)
**Performance Goals**: Export completes in <5 seconds for ≤20 personas (SC-001); expected <100ms for workbook generation at this scale
**Constraints**: Synchronous streaming response; no temp files written to disk; no new persistence layer
**Scale/Scope**: ≤20 personas per export; single active workspace per session

---

## Constitution Check

*No `.specify/memory/constitution.md` exists in this project. Gates evaluated from project conventions observed in existing code.*

| Gate | Status | Notes |
|------|--------|-------|
| No new persistence layer | PASS | Export is compute-and-return; scenario loaded read-only |
| Compute-and-return model preserved | PASS | Results accepted as request body; no caching added |
| No new frontend dependencies | PASS | `fetch` + `Blob` URL pattern; no new npm packages |
| New dependency (openpyxl) justified | PASS | Only way to generate `.xlsx`; no alternatives without it |
| New endpoint follows existing router pattern | PASS | Added to existing `scenarios.py` router, same path prefix |

No violations requiring justification.

---

## Project Structure

### Documentation (this feature)

```text
specs/012-excel-export/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings and decisions
├── data-model.md        # Phase 1: entity and workbook structure
├── quickstart.md        # Phase 1: how to run and test
├── contracts/
│   └── export-api.md    # Phase 1: API and TypeScript client contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
api/
├── models/
│   └── simulation_result.py   # Existing — SimulationResponse (request body)
├── routers/
│   └── scenarios.py           # Existing — add export endpoint here
└── services/
    └── excel_export_service.py  # NEW — ExcelExportService

app/src/
├── services/
│   └── api.ts                 # Existing — add exportSimulationExcel()
└── pages/
    └── ResultsDashboardPage.tsx  # Existing — add Download Excel button

tests/
├── services/
│   └── test_excel_export_service.py  # NEW — unit tests for export service
└── integration/
    └── test_excel_export.py          # NEW — endpoint integration test

pyproject.toml  # Add openpyxl>=3.1 to dependencies
```

**Structure Decision**: Web application layout (FastAPI backend + React frontend). All backend changes go into the existing `api/` tree; frontend changes into the existing `app/src/` tree. Follows established patterns throughout the codebase.

---

## Complexity Tracking

No constitution violations. No new complexity requiring justification.

---

## Implementation Phases

### Phase 0 — Research ✅

See [research.md](research.md) for all decisions.

Key decisions:
- **Excel library**: `openpyxl` (pure Python `.xlsx` generation; see research Decision 1)
- **API pattern**: POST with `SimulationResponse` body (avoid re-computation; see Decision 2)
- **Sheet layout**: Single sheet with header block + data table (see Decision 3)
- **Columns**: All 5 percentiles for balance and IRR; PoS; employee/employer/total contributions (see Decision 4)
- **Streaming**: `StreamingResponse` + `io.BytesIO` — no disk I/O (see Decision 5)
- **Frontend**: `fetch` + `Blob` URL pattern — no new npm packages (see Decision 6)

### Phase 1 — Design & Contracts ✅

See [data-model.md](data-model.md) and [contracts/export-api.md](contracts/export-api.md).

Key design decisions:
- No new persistent data entities
- `ExcelExportService` is a pure function (scenario + simulation_result → bytes)
- Endpoint added to existing `scenarios.py` router under the same `/workspaces/{workspace_id}/scenarios/{scenario_id}/` path prefix
- TypeScript client returns `Blob`; caller handles `URL.createObjectURL` + anchor trigger
- Download button is disabled (not hidden) when `simulationResult` is null in React state — with tooltip "Run simulation first"

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| openpyxl version conflict with existing packages | Low | Low | Pin `openpyxl>=3.1,<4` in pyproject.toml |
| Persona names with special chars break filename | Low | Low | Sanitize filename server-side (replace non-alphanumeric with `_`) |
| Large trajectory data in request body causes timeout | Very Low | Medium | Trajectory is optional in request; document that clients may omit it |
| Browser blocks programmatic download | Very Low | Low | Standard Blob URL pattern is universally supported in modern browsers |
