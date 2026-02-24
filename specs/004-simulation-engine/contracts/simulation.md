# API Contract: Simulation Engine

**Base path**: `/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}`

Requires both `workspace_id` and `scenario_id` (UUIDs) in the path.

---

## POST `/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate`

**Run a Monte Carlo simulation for a scenario.**

The request blocks until the simulation completes (synchronous). Results are returned directly and are not persisted. The scenario's `last_run_at` timestamp is updated on success.

### Request Body (optional)

All fields optional. When omitted, values fall back to the workspace's `MonteCarloConfig`.

```json
{
  "num_simulations": 5000,
  "seed": 42
}
```

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| num_simulations | int \| null | workspace config (default 1,000) | 1–10,000 |
| seed | int \| null | workspace config (default null) | Any integer |

An empty body `{}` or no body is valid — the simulation uses workspace defaults.

### Response `200 OK`

```json
{
  "scenario_id": "a1b2c3d4-...",
  "num_simulations": 5000,
  "seed": 42,
  "retirement_age": 67,
  "personas": [
    {
      "persona_id": "d4e5f6a7-...",
      "persona_name": "Jordan",
      "retirement_balance": {
        "p25": 452381.12,
        "p50": 621744.89,
        "p75": 834102.53,
        "p90": 1052887.41
      },
      "trajectory": [
        {"age": 25, "p25": 1200.00, "p50": 1200.00, "p75": 1200.00, "p90": 1200.00},
        {"age": 26, "p25": 5847.32, "p50": 6102.18, "p75": 6389.44, "p90": 6621.95},
        {"age": 27, "p25": 11293.81, "p50": 12145.02, "p75": 13104.67, "p90": 13892.10},
        "...(one entry per year from current age through retirement age)"
      ]
    },
    {
      "persona_id": "e5f6a7b8-...",
      "persona_name": "Priya",
      "retirement_balance": { "..." },
      "trajectory": [ "..." ]
    }
  ]
}
```

**Response structure**:

| Field | Type | Notes |
|-------|------|-------|
| scenario_id | UUID | The simulated scenario |
| num_simulations | int | Actual trial count used |
| seed | int \| null | Seed used (null if non-reproducible) |
| retirement_age | int | From workspace MonteCarloConfig |
| personas | list | One entry per persona in the workspace |

**Per-persona fields**:

| Field | Type | Notes |
|-------|------|-------|
| persona_id | UUID | References the persona |
| persona_name | str | Display name |
| retirement_balance | object | `{p25, p50, p75, p90}` — balances at retirement age |
| trajectory | list | Year-by-year snapshots from current age through retirement age |

**Per-trajectory-entry fields**:

| Field | Type | Notes |
|-------|------|-------|
| age | int | Persona's age at this snapshot |
| p25 | float | 25th percentile balance |
| p50 | float | 50th percentile balance |
| p75 | float | 75th percentile balance |
| p90 | float | 90th percentile balance |

**Guarantees**:
- `len(trajectory) == retirement_age - persona.age + 1` for each persona (SC-006)
- `p25 <= p50 <= p75 <= p90` for all percentile values (SC-005)
- First trajectory entry has age == persona's current age, with all percentiles == current_balance
- Last trajectory entry has age == retirement_age, matching retirement_balance values
- Personas at or past retirement age have a single trajectory entry with current balance

### Error Responses

- `404`: Workspace or scenario not found
  ```json
  {"detail": "Workspace {workspace_id} not found"}
  ```
  ```json
  {"detail": "Scenario {scenario_id} not found in workspace {workspace_id}"}
  ```

- `422`: Validation error (e.g., num_simulations out of range)
  ```json
  {
    "detail": [
      {
        "loc": ["body", "num_simulations"],
        "msg": "Input should be less than or equal to 10000",
        "type": "less_than_equal"
      }
    ]
  }
  ```

### Timing Expectations

| Configuration | Expected |
|---------------|----------|
| 1,000 trials, 8 personas | < 10 seconds (SC-001) |
| 10,000 trials, 8 personas | < 60 seconds (SC-002) |

### Side Effects

- Updates `scenario.last_run_at` to the current UTC timestamp (FR-021)
- No other persistent changes
