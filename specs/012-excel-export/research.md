# Research: Simulation Results Excel Export

**Feature**: 012-excel-export
**Date**: 2026-02-25

---

## Decision 1: Excel Generation Library

**Decision**: Use `openpyxl` for `.xlsx` file generation.

**Rationale**:
- Pure Python — no native binary dependencies; works on all platforms where CPython runs.
- First-class read/write support for the `.xlsx` (Office Open XML) format, which is the format requested in the spec.
- Active maintenance and the de-facto standard in the Python ecosystem for `.xlsx` generation.
- Supports cell styling (bold headers, number formats, column widths) needed for a readable export.
- FastAPI's `StreamingResponse` or `Response` can return an `openpyxl` workbook as bytes directly — no temp-file I/O required.

**Alternatives considered**:
- **xlsxwriter**: Write-only (cannot read/modify existing files), marginally faster for very large files. Rejected because openpyxl is sufficient at the scale of ≤20 personas and is more flexible.
- **pandas + openpyxl/xlsxwriter**: Adds pandas as a heavyweight dependency just to write a table. Rejected — the data is already in well-typed Pydantic objects; no DataFrame transformation needed.
- **csv**: Doesn't produce `.xlsx`, no multi-section layout, no column formatting. Rejected per spec requirement.

---

## Decision 2: API Pattern — How Simulation Results Reach the Export Endpoint

**Decision**: Accept the `SimulationResponse` as the POST request body for the export endpoint.

**Rationale**:
The project uses a **compute-and-return model with no result persistence** — simulation results are computed on demand and returned to the frontend. There is no server-side store of the last simulation run for a scenario.

When the user clicks "Download Excel", the frontend already holds the `SimulationResponse` in React state (from the most recent `runSimulation()` call). The cleanest approach is to POST that result back to the server for formatting into Excel — no re-computation, no new persistence layer.

The scenario is loaded server-side from JSON storage (using the `scenario_id` in the URL) to enrich the header block with plan design details and assumptions.

**Alternatives considered**:
- **Re-run simulation on export** (`POST /scenarios/{id}/export` with no body, triggers a new Monte Carlo run): Adds unnecessary latency (250-sim Monte Carlo run is non-trivial); results may differ from what the user reviewed. Rejected.
- **Cache last result server-side**: Would require introducing a persistence layer or in-memory cache; contradicts the compute-and-return architecture. Rejected.
- **GET with query params**: Simulation results are too large and complex to encode as query parameters. Rejected.

---

## Decision 3: Excel Sheet Layout

**Decision**: Single sheet (`Results`) with a clearly separated header block followed by the persona data table.

**Layout**:
```
Row 1:   [Title] Plan Design Summary — <Scenario Name>
Row 2:   [Blank]
Row 3+:  Label | Value   (plan design fields)
...
Row N:   [Blank]
Row N+1: [Section label] Simulation Assumptions
Row N+2+ Label | Value   (assumption fields)
...
Row M:   [Blank]
Row M+1: [Blank]
Row M+2: [Column header row]  Persona | Bal p10 | Bal p25 | ... | PoS | Total Contrib
Row M+3+ [Data rows — one per persona]
```

**Rationale**:
- The spec explicitly says "header section" and "one row per persona" — a single sheet with vertical separation satisfies both requirements simply.
- A second sheet for year-by-year trajectory data is out of scope per the spec (not in FR-004).
- Single-sheet layout is universally openable in any spreadsheet app without navigation.

---

## Decision 4: Persona Data Columns

**Decision**: Export all five percentile columns for both projected balance and income replacement ratio. Include probability of success and combined total contributions (employee + employer).

**Column order**:
| Column | Data |
|--------|------|
| Persona | `persona_name` |
| Bal p10 | `retirement_balance.p10` |
| Bal p25 | `retirement_balance.p25` |
| Bal p50 (Median) | `retirement_balance.p50` |
| Bal p75 | `retirement_balance.p75` |
| Bal p90 | `retirement_balance.p90` |
| IRR p10 | `income_replacement_ratio.p10` (%) |
| IRR p25 | `income_replacement_ratio.p25` (%) |
| IRR p50 (Median) | `income_replacement_ratio.p50` (%) |
| IRR p75 | `income_replacement_ratio.p75` (%) |
| IRR p90 | `income_replacement_ratio.p90` (%) |
| Prob. of Success | `probability_of_success` (%) |
| Total Employee Contributions | `total_employee_contributions` |
| Total Employer Contributions | `total_employer_contributions` |
| Total Contributions | sum of employee + employer |

**Rationale**: All five confidence levels are already computed; exporting all provides the most analytical value without additional computation. The spec says "at each confidence level" so all five are included.

---

## Decision 5: FastAPI File Response Pattern

**Decision**: Use `fastapi.responses.StreamingResponse` with `io.BytesIO` — stream the workbook bytes directly without writing to disk.

**Implementation sketch**:
```python
import io
from fastapi.responses import StreamingResponse
import openpyxl

def generate_excel(scenario, simulation_result) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    # ... fill rows ...
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()

@router.post("/{scenario_id}/export")
async def export_simulation(scenario_id: UUID, body: SimulationResponse, ...):
    data = generate_excel(scenario, body)
    filename = f"{scenario.name.replace(' ', '_')}_results.xlsx"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

**Rationale**: No temp files, no disk I/O, memory-efficient for small files (≤20 personas generates <100 KB). Aligns with the existing compute-and-return model.

---

## Decision 6: Frontend Download Trigger

**Decision**: Use `fetch` + `Blob` URL pattern to trigger the file download from a React onClick handler.

**Implementation sketch**:
```typescript
async function handleExportExcel() {
  const blob = await exportSimulationExcel(workspaceId, scenarioId, simulationResult);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${scenario.name}_results.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Rationale**: Standard browser download pattern that works without a separate anchor tag in the DOM. No additional libraries needed. The download filename is set by the `Content-Disposition` header from the server (as fallback) or by the `a.download` attribute.

---

## Dependency Addition

- **Backend**: Add `openpyxl>=3.1` to `pyproject.toml` dependencies.
- **Frontend**: No new dependencies required.
