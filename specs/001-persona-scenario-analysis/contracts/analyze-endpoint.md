# API Contract: Workforce Analysis Endpoint

**Feature**: 001-persona-scenario-analysis
**Date**: 2026-03-02

---

## Endpoint

```
POST /api/v1/workspaces/{workspace_id}/analyze
```

**Purpose**: Run a multi-persona × multi-scenario analysis for the given workspace. Returns simulation results for all non-hidden personas in the workspace across each of the selected scenarios, plus per-scenario aggregate statistics.

**No persistence**: Results are compute-and-return only; nothing is saved to storage.

---

## Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `workspace_id` | UUID string | ID of the workspace to analyze |

---

## Request Body

```json
{
  "scenario_ids": [
    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  ]
}
```

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `scenario_ids` | `array[uuid]` | Yes | 2–8 unique items | Scenarios to include in the analysis |

---

## Response: 201 Created

```json
{
  "workspace_id": "1fa85f64-5717-4562-b3fc-2c963f66afa6",
  "scenario_ids": [
    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  ],
  "results": [
    {
      "scenario_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "scenario_name": "Conservative Match",
      "persona_results": [
        {
          "persona_id": "aaa...",
          "persona_name": "Early Career Alice",
          "retirement_balance": { "p10": 300000, "p25": 420000, "p50": 550000, "p75": 700000, "p90": 900000 },
          "annual_retirement_income": { "p10": 18000, "p25": 25000, "p50": 33000, "p75": 42000, "p90": 54000 },
          "ss_annual_benefit": 22000,
          "total_retirement_income": { "p10": 40000, "p25": 47000, "p50": 55000, "p75": 64000, "p90": 76000 },
          "trajectory": [ { "age": 35, "p10": 45000, "p25": 55000, "p50": 70000, "p75": 88000, "p90": 110000, "withdrawal": null } ],
          "total_employee_contributions": 85000,
          "total_employer_contributions": 42000,
          "probability_of_success": 0.82,
          "income_replacement_ratio": { "p10": 0.62, "p25": 0.72, "p50": 0.83, "p75": 0.95, "p90": 1.12 },
          "projected_salary_at_retirement": 95000,
          "shortfall_age_p10": null,
          "shortfall_age_p25": null,
          "shortfall_age_p50": null,
          "pos_assessment": "On Track",
          "target_replacement_ratio": 0.8
        }
      ],
      "employer_costs": [
        {
          "persona_id": "aaa...",
          "employer_cost_annual": 2800,
          "employer_cost_cumulative": 84000
        }
      ],
      "aggregate": {
        "pct_on_track": 0.75,
        "median_ir": 0.81,
        "avg_employer_cost_annual": 3200.0
      }
    }
  ],
  "retirement_age": 65,
  "planning_age": 95,
  "num_simulations": 1000,
  "seed": null
}
```

---

## Error Responses

| Status | Condition | Response Body |
|--------|-----------|---------------|
| 400 | Fewer than 2 or more than 8 scenario IDs provided | `{"detail": "Must provide between 2 and 8 scenario IDs"}` |
| 400 | Duplicate scenario IDs in request | `{"detail": "scenario_ids must be unique"}` |
| 400 | Workspace has no non-hidden personas | `{"detail": "No visible personas in workspace"}` |
| 404 | Workspace not found | `{"detail": "Workspace not found"}` |
| 404 | One or more scenario IDs not found in workspace | `{"detail": "Scenario {id} not found in workspace"}` |
| 422 | Invalid request body (Pydantic validation) | Standard FastAPI 422 response |

---

## Response Schema Reference

### `WorkforceScenarioResult`

| Field | Type | Description |
|-------|------|-------------|
| `scenario_id` | uuid | Identifies the scenario |
| `scenario_name` | string | Scenario display name |
| `persona_results` | `PersonaSimulationResult[]` | One per non-hidden persona, in workspace persona order |
| `employer_costs` | `PersonaEmployerCost[]` | Index-aligned with `persona_results` |
| `aggregate` | `WorkforceAggregate` | Pre-computed aggregate statistics |

### `PersonaEmployerCost`

| Field | Type | Description |
|-------|------|-------------|
| `persona_id` | uuid | Identifies the persona |
| `employer_cost_annual` | number | Annualized employer cost in today's dollars |
| `employer_cost_cumulative` | number | Total employer contributions over accumulation period |

### `WorkforceAggregate`

| Field | Type | Description |
|-------|------|-------------|
| `pct_on_track` | number | Fraction 0.0–1.0 of personas with `pos_assessment == "On Track"` |
| `median_ir` | number \| null | Median `income_replacement_ratio.p50` across personas; null if undefined |
| `avg_employer_cost_annual` | number | Mean annual employer cost across personas |

### `PersonaSimulationResult` (existing — unchanged)

See `api/models/simulation_result.py` for full schema. All monetary values in today's dollars (inflation-adjusted).

---

## Frontend Integration Notes

- The frontend calls this endpoint from `app/src/services/api.ts` as `runWorkforceAnalysis(workspaceId, { scenario_ids })`.
- The Vite dev proxy routes `/api` → `localhost:8000`, so the frontend uses `/api/v1/...` paths.
- Results are held in React state only; they are discarded on page navigation.
- The frontend selects which percentile to display using `CONFIDENCE_PERCENTILE_MAP` (existing utility in `app/src/types/simulation.ts`).
