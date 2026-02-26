# API Contract: Excel Export Endpoint

**Feature**: 012-excel-export
**Date**: 2026-02-25

---

## Endpoint

```
POST /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/export
```

---

## Request

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | UUID (string) | ID of the workspace containing the scenario |
| `scenario_id` | UUID (string) | ID of the scenario whose results are being exported |

### Headers

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |

### Body

The request body is a `SimulationResponse` object — the same structure returned by `POST /workspaces/{workspace_id}/scenarios/{scenario_id}/simulate`.

```json
{
  "scenario_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "num_simulations": 250,
  "seed": null,
  "retirement_age": 65,
  "planning_age": 90,
  "personas": [
    {
      "persona_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "persona_name": "Early Career",
      "retirement_balance": {
        "p10": 450000.00,
        "p25": 620000.00,
        "p50": 810000.00,
        "p75": 1050000.00,
        "p90": 1320000.00
      },
      "income_replacement_ratio": {
        "p10": 0.62,
        "p25": 0.75,
        "p50": 0.88,
        "p75": 1.05,
        "p90": 1.24
      },
      "probability_of_success": 0.72,
      "total_employee_contributions": 125000.00,
      "total_employer_contributions": 62500.00,
      "annual_retirement_income": null,
      "ss_annual_benefit": 24000.00,
      "total_retirement_income": null,
      "trajectory": [],
      "projected_salary_at_retirement": 95000.00,
      "shortfall_age_p50": null,
      "pos_assessment": "On Track",
      "target_replacement_ratio": 0.85
    }
  ]
}
```

**Note**: `trajectory` may be an empty array `[]` in the export request — it is not used in the export and including full trajectory data is optional but supported.

---

## Response

### Success (200 OK)

| Header | Value |
|--------|-------|
| `Content-Type` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| `Content-Disposition` | `attachment; filename="{scenario_name}_results.xlsx"` |

Body: Binary `.xlsx` file contents.

**File structure** (see data-model.md for full layout):
- Header block: Plan Design Summary (label-value pairs)
- Separator
- Assumptions block (label-value pairs)
- Separator
- Column headers + one data row per persona

### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `404 Not Found` | Workspace or scenario does not exist | `{"detail": "Workspace not found"}` or `{"detail": "Scenario not found"}` |
| `422 Unprocessable Entity` | Request body fails validation (missing required fields, wrong types) | FastAPI standard validation error body |

---

## TypeScript Client Contract

```typescript
// app/src/services/api.ts

export async function exportSimulationExcel(
  workspaceId: string,
  scenarioId: string,
  simulationResult: SimulationResponse,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}/export`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simulationResult),
    },
  );
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }
  return response.blob();
}
```

---

## Frontend Usage

```typescript
// In ResultsDashboardPage.tsx

async function handleExportExcel() {
  if (!simulationResult || !activeWorkspace) return;
  const blob = await exportSimulationExcel(
    activeWorkspace.id,
    scenarioId,
    simulationResult,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${scenario?.name ?? 'simulation'}_results.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

Button in JSX:
```tsx
<button
  onClick={handleExportExcel}
  disabled={!simulationResult}
  title={simulationResult ? 'Download Excel report' : 'Run simulation first'}
>
  Download Excel
</button>
```

---

## Constraints & Assumptions

- The endpoint is synchronous — for ≤20 personas, workbook generation takes <100ms and well under the 5-second SC-001 requirement.
- No authentication changes — endpoint follows the same access model as the simulate endpoint.
- `Content-Disposition` filename sanitizes the scenario name (replaces spaces with underscores, strips non-ASCII characters) to ensure a valid filename across OSes.
- The endpoint validates `scenario_id` in the path matches `scenario_id` in the body; a mismatch returns `422`.
