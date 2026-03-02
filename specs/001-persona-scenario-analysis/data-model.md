# Data Model: Persona-Scenario Analysis Page

**Feature**: 001-persona-scenario-analysis
**Date**: 2026-03-02

---

## Overview

This feature introduces a compute-and-return model with no new persistent storage. All new entities exist only within a single request/response cycle. Existing entities (Workspace, Persona, Scenario, SimulationResult) are reused unmodified.

---

## New Entities

### WorkforceAnalyzeRequest

Request payload for the analyze endpoint.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `scenario_ids` | `list[UUID]` | min_length=2, max_length=8 | IDs of scenarios to include in the analysis |

**Validation rules**:
- Must contain 2–8 unique scenario IDs
- Each scenario ID must exist in the target workspace

---

### PersonaEmployerCost

Per-persona employer cost for a given scenario. Mirrors the existing pattern in `ScenarioComparisonResult` but scoped to one persona within a workforce analysis.

| Field | Type | Description |
|-------|------|-------------|
| `persona_id` | `UUID` | Identifies the persona |
| `employer_cost_annual` | `float` | Annualized employer contribution cost (in today's dollars) |
| `employer_cost_cumulative` | `float` | Total employer contributions over the accumulation period (in today's dollars) |

---

### WorkforceAggregate

Scalar summary statistics for a single scenario across all non-hidden personas.

| Field | Type | Description |
|-------|------|-------------|
| `pct_on_track` | `float` | Fraction (0.0–1.0) of personas whose `pos_assessment == "On Track"` |
| `median_ir` | `float \| None` | Median `income_replacement_ratio.p50` across all non-hidden personas; `None` if no personas have a defined IR |
| `avg_employer_cost_annual` | `float` | Mean `employer_cost_annual` across all non-hidden personas |

---

### WorkforceScenarioResult

Results for one scenario applied to all non-hidden personas.

| Field | Type | Description |
|-------|------|-------------|
| `scenario_id` | `UUID` | Identifies the scenario |
| `scenario_name` | `str` | Human-readable scenario name |
| `persona_results` | `list[PersonaSimulationResult]` | One simulation result per non-hidden persona, in workspace order |
| `employer_costs` | `list[PersonaEmployerCost]` | Employer cost for each non-hidden persona; index-aligned with `persona_results` |
| `aggregate` | `WorkforceAggregate` | Pre-computed aggregate statistics for this scenario |

---

### WorkforceAnalyzeResponse

Top-level response returned by the analyze endpoint.

| Field | Type | Description |
|-------|------|-------------|
| `workspace_id` | `UUID` | The workspace this analysis was run against |
| `scenario_ids` | `list[UUID]` | The scenario IDs that were analyzed (in selection order) |
| `results` | `list[WorkforceScenarioResult]` | One entry per selected scenario; order matches `scenario_ids` |
| `retirement_age` | `int` | Retirement age used (from workspace MC config) |
| `planning_age` | `int` | Planning horizon age used (from workspace MC config) |
| `num_simulations` | `int` | Number of Monte Carlo iterations run |
| `seed` | `int \| None` | Random seed used, if any |

---

## Existing Entities (Reused, Unmodified)

| Entity | Location | How Used |
|--------|----------|---------|
| `Workspace` | `api/models/workspace.py` | Source of personas, MC config, base assumptions |
| `Persona` | `api/models/persona.py` | Iterated; `hidden=False` filter applied in service |
| `Scenario` | `api/models/scenario.py` | Each selected scenario is loaded and simulated |
| `PersonaSimulationResult` | `api/models/simulation_result.py` | Returned unchanged as `persona_results` per scenario |
| `PercentileValues` | `api/models/simulation_result.py` | Used when reading `income_replacement_ratio`, `retirement_balance`, etc. |

---

## Entity Relationships

```
WorkforceAnalyzeRequest
  └── scenario_ids: [Scenario.id, ...]   (2–8)

WorkforceAnalyzeResponse
  ├── workspace_id → Workspace
  └── results: [WorkforceScenarioResult, ...]
        ├── scenario_id → Scenario
        ├── persona_results: [PersonaSimulationResult, ...]   (one per non-hidden Persona)
        ├── employer_costs: [PersonaEmployerCost, ...]        (index-aligned with persona_results)
        └── aggregate: WorkforceAggregate
```

---

## Frontend Display Types

These are frontend-only types used for rendering; they are not part of the API contract.

### `AnalysisMetric` (enum/union)

```typescript
type AnalysisMetric =
  | 'income_replacement_ratio'
  | 'probability_of_success'
  | 'retirement_balance'
  | 'employer_cost_annual'
```

Used to track which metric is currently displayed in the matrix.

### `MatrixCell`

Derived value for a single persona × scenario cell in the matrix.

```typescript
interface MatrixCell {
  personaId: string
  scenarioId: string
  value: number | null         // null if metric is undefined for this combination
  colorClass: 'green' | 'yellow' | 'red' | 'neutral'  // pre-computed based on threshold
  formattedValue: string       // formatted for display (e.g., "82.5%", "$450,000")
}
```

---

## State Transitions

The Analyze page has the following states:

```
IDLE (no results, scenarios not yet selected)
  └─[user selects 2+ scenarios + clicks Run]──► LOADING
LOADING
  ├─[success]──────────────────────────────────► RESULTS_READY
  └─[error]────────────────────────────────────► ERROR
RESULTS_READY
  ├─[user changes metric/confidence]───────────► RESULTS_READY (re-renders only, no API call)
  └─[user clicks Run again]────────────────────► LOADING
ERROR
  └─[user clicks Retry/Run]────────────────────► LOADING
```

---

## Validation Rules Summary

| Rule | Where Enforced |
|------|---------------|
| 2 ≤ scenario_ids.length ≤ 8 | Backend (Pydantic Field) + Frontend (button disabled) |
| Each scenario_id exists in workspace | Backend (service layer) → 404 |
| Workspace exists | Backend (service layer) → 404 |
| At least 1 non-hidden persona exists | Backend (service layer) → 400 |
| No duplicate scenario_ids | Backend (Pydantic validator) |
