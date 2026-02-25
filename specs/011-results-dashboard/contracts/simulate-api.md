# API Contract: Extended Simulation Endpoint

**Branch**: `011-results-dashboard` | **Date**: 2026-02-24

## Overview

The existing simulation endpoint is extended with additional per-persona fields in the response. The request format, URL, and method are unchanged. All new response fields have defaults, making this a backward-compatible change.

## Modified Endpoint: Run Simulation

**Method**: `POST`
**Path**: `/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate`

### Request Body (unchanged)

```json
{
  "num_simulations": 1000,
  "seed": null
}
```

Both fields are optional. Defaults come from the workspace's `MonteCarloConfig`.

### Response Body (extended)

```json
{
  "scenario_id": "uuid-string",
  "num_simulations": 1000,
  "seed": null,
  "retirement_age": 65,
  "planning_age": 95,
  "personas": [
    {
      "persona_id": "uuid-string",
      "persona_name": "Mid-Career Professional",
      "retirement_balance": {
        "p10": 450000.0,
        "p25": 520000.0,
        "p50": 620000.0,
        "p75": 740000.0,
        "p90": 890000.0
      },
      "annual_withdrawal": {
        "p10": 22000.0,
        "p25": 25500.0,
        "p50": 30400.0,
        "p75": 36300.0,
        "p90": 43700.0
      },
      "ss_annual_benefit": 24500.0,
      "total_retirement_income": {
        "p10": 46500.0,
        "p25": 50000.0,
        "p50": 54900.0,
        "p75": 60800.0,
        "p90": 68200.0
      },
      "trajectory": [
        {
          "age": 35,
          "p10": 95000.0,
          "p25": 100000.0,
          "p50": 105000.0,
          "p75": 110000.0,
          "p90": 118000.0,
          "withdrawal": null
        },
        {
          "age": 65,
          "p10": 450000.0,
          "p25": 520000.0,
          "p50": 620000.0,
          "p75": 740000.0,
          "p90": 890000.0,
          "withdrawal": null
        },
        {
          "age": 66,
          "p10": 430000.0,
          "p25": 500000.0,
          "p50": 600000.0,
          "p75": 715000.0,
          "p90": 860000.0,
          "withdrawal": {
            "p10": 22000.0,
            "p25": 25500.0,
            "p50": 30400.0,
            "p75": 36300.0,
            "p90": 43700.0
          }
        }
      ],
      "total_employee_contributions": 185000.0,
      "total_employer_contributions": 142000.0,
      "probability_of_success": 0.87,
      "income_replacement_ratio": {
        "p10": 0.52,
        "p25": 0.56,
        "p50": 0.61,
        "p75": 0.68,
        "p90": 0.76
      },
      "projected_salary_at_retirement": 89500.0
    }
  ]
}
```

### New Fields in PersonaSimulationResult

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `total_employee_contributions` | float | 0.0 | Median cumulative employee deferrals from current age through retirement age, in today's dollars |
| `total_employer_contributions` | float | 0.0 | Median cumulative employer match + employer core contributions from current age through retirement age, in today's dollars |
| `probability_of_success` | float | 1.0 | Fraction of trials (0.0–1.0) where balance remains positive through planning age |
| `income_replacement_ratio` | PercentileValues or null | null | Income replacement ratio at each percentile: `total_retirement_income / projected_salary_at_retirement`. Null if no distribution phase. |
| `projected_salary_at_retirement` | float | 0.0 | Deterministic projected annual salary at retirement: `salary * (1 + wage_growth_rate) ^ years_to_retirement` |

### Modified Fields (PercentileValues and YearSnapshot)

All existing `PercentileValues` objects and `YearSnapshot` records gain a new `p10` field:

| Field | Type | Description |
|-------|------|-------------|
| `p10` | float | 10th percentile value — 90% of simulation trials produced a result at or above this value |

### Error Responses (unchanged)

| Status | Condition |
|--------|-----------|
| 404 | Workspace or scenario not found |
| 422 | Invalid request body (num_simulations out of range) |
| 400 | Scenario has no plan design configured |

## Frontend API Function

**Function**: `runSimulation`
**Location**: `app/src/services/api.ts`

- **Parameters**: `workspaceId: string`, `scenarioId: string`, `request?: SimulationRequest`
- **Returns**: `Promise<SimulationResponse>`
- **Method**: POST to `/api/v1/workspaces/${workspaceId}/scenarios/${scenarioId}/simulate`
- **Body**: JSON-serialized `request` if provided, omitted otherwise
- **Error handling**: Throws on non-ok response with HTTP status in message
