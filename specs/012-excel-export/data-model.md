# Data Model: Simulation Results Excel Export

**Feature**: 012-excel-export
**Date**: 2026-02-25

---

## Overview

This feature introduces no new persistent entities. It adds a new **service** (`ExcelExportService`) that transforms existing in-memory data structures into an Excel workbook and a new **API endpoint** that accepts a simulation result, loads supplementary scenario data from storage, and streams back an `.xlsx` file.

---

## Input Data Structures (existing models, read-only)

### SimulationResponse *(from `api/models/simulation_result.py`)*

Top-level request body for the export endpoint.

| Field | Type | Source |
|-------|------|--------|
| `scenario_id` | UUID | Identifies the scenario for header enrichment |
| `num_simulations` | int | Shown in assumptions header |
| `seed` | int \| None | Shown in assumptions header if set |
| `retirement_age` | int | Shown in assumptions header |
| `planning_age` | int | Shown in assumptions header |
| `personas` | list[PersonaSimulationResult] | One row per entry in the data table |

### PersonaSimulationResult *(from `api/models/simulation_result.py`)*

Source of each data row in the export table.

| Field | Type | Export column(s) |
|-------|------|-----------------|
| `persona_name` | str | Persona |
| `retirement_balance` | PercentileValues | Bal p10/p25/p50/p75/p90 |
| `income_replacement_ratio` | PercentileValues \| None | IRR p10/p25/p50/p75/p90 |
| `probability_of_success` | float (0–1) | Prob. of Success (formatted as %) |
| `total_employee_contributions` | float | Employee Contributions |
| `total_employer_contributions` | float | Employer Contributions |
| `total_employee_contributions + total_employer_contributions` | computed | Total Contributions |

### Scenario *(from `api/models/scenario.py` — loaded from storage)*

Source of the plan design header block.

| Field | Type | Header section |
|-------|------|---------------|
| `name` | str | Export title / filename |
| `plan_design` | PlanDesign | Plan Design Summary block |
| `overrides` | AssumptionsOverride \| None | Assumptions block (merged with workspace defaults) |

### PlanDesign *(from `api/models/plan_design.py`)*

Fields surfaced in the Plan Design Summary header block:

| Field | Label in Export |
|-------|----------------|
| `name` | Plan Name |
| `auto_enroll_enabled` | Auto Enrollment |
| `auto_enroll_rate` | Default Deferral Rate |
| `auto_escalation_enabled` | Auto Escalation |
| `auto_escalation_rate` | Annual Escalation Rate |
| `auto_escalation_cap` | Escalation Cap |
| `match_tiers` | Match Formula (formatted per tier) |
| `match_vesting` | Match Vesting |
| `match_eligibility_months` | Match Eligibility |
| `core_contribution_pct` | Core Contribution Rate |
| `core_vesting` | Core Vesting |
| `core_eligibility_months` | Core Eligibility |

### Workspace Assumptions *(from `api/models/workspace.py`)*

Fields surfaced in the Simulation Assumptions header block:

| Field | Label in Export |
|-------|----------------|
| `inflation_rate` | Inflation Rate |
| `wage_growth_rate` | Wage Growth Rate |
| Asset return rates (from allocation) | Investment Return Assumptions |
| `num_simulations` (from SimulationResponse) | Number of Simulations |
| `retirement_age` (from SimulationResponse) | Retirement Age |
| `planning_age` (from SimulationResponse) | Planning Age |

---

## New Service: ExcelExportService

**File**: `api/services/excel_export_service.py`

**Responsibilities**:
1. Accept a `Scenario` and `SimulationResponse`.
2. Build an `openpyxl.Workbook` with:
   - A header block containing plan design label-value pairs.
   - A separator row.
   - An assumptions block containing simulation assumption label-value pairs.
   - A separator row.
   - A column header row.
   - One data row per `PersonaSimulationResult`.
3. Apply basic formatting: bold section labels and column headers, number formats for currency and percentages, auto-fitted column widths.
4. Return raw bytes (`io.BytesIO` → `bytes`).

**Pure function** — no side effects, no I/O beyond returning bytes.

---

## New API Endpoint

**Router**: Added to `api/routers/scenarios.py` (existing scenarios router)

**Endpoint**: `POST /workspaces/{workspace_id}/scenarios/{scenario_id}/export`

**Request**:
- Path params: `workspace_id` (UUID), `scenario_id` (UUID)
- Body: `SimulationResponse` (Pydantic model, JSON)

**Response**: `StreamingResponse`
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Content-Disposition: `attachment; filename="{scenario_name}_results.xlsx"`

**Error cases**:
- `404` if workspace or scenario not found (uses existing storage layer patterns)
- `422` if request body fails Pydantic validation

---

## New Frontend API Function

**File**: `app/src/services/api.ts`

```typescript
// New function added to existing api.ts
export async function exportSimulationExcel(
  workspaceId: string,
  scenarioId: string,
  simulationResult: SimulationResponse,
): Promise<Blob>
```

Returns a `Blob` — the caller triggers the download via a dynamic anchor element.

---

## Excel Workbook Structure

```
Sheet: "Results"

Row 1:  [Title]      Plan Design Summary — {Scenario Name}
Row 2:  [Blank]
Row 3:  Plan Name           | {value}
Row 4:  Auto Enrollment     | {Yes/No}
Row 5:  Default Deferral    | {X%}
Row 6:  Auto Escalation     | {Yes/No — rate, cap}
Row 7:  Match Formula       | {Tier 1: X% on first Y%} [repeated per tier]
...
Row N:  [Blank]
Row N+1: [Section] Simulation Assumptions
Row N+2: Retirement Age     | {value}
Row N+3: Planning Age       | {value}
Row N+4: Inflation Rate     | {X%}
Row N+5: Number of Simulations | {value}
...
Row M:  [Blank]
Row M+1: [Blank]
Row M+2: [Column headers]
         Persona | Bal p10 | Bal p25 | Bal p50 | Bal p75 | Bal p90 |
                   IRR p10 | IRR p25 | IRR p50 | IRR p75 | IRR p90 |
                   Prob. of Success | Employee Contrib | Employer Contrib | Total Contrib
Row M+3+: [Data rows]
```

---

## No New Persistent Entities

This feature is compute-and-format-only:
- No database tables, new JSON files, or file storage changes.
- The scenario JSON is read (not modified) to populate the header.
- The export is generated on demand and streamed — not saved.
