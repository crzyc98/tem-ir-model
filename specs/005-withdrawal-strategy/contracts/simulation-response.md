# API Contract: Simulation Response (Extended)

**Feature**: 005-withdrawal-strategy
**Endpoint**: `POST /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate`
**Change type**: Backward-compatible additive extension

## Request (unchanged)

```json
{
  "num_simulations": 1000,
  "seed": 42
}
```

No changes to the request body. The distribution phase runs automatically using the hardcoded systematic withdrawal strategy.

## Response (extended)

### SimulationResponse

```json
{
  "scenario_id": "uuid",
  "num_simulations": 1000,
  "seed": 42,
  "retirement_age": 67,
  "planning_age": 93,
  "personas": [
    {
      "persona_id": "uuid",
      "persona_name": "Jordan",
      "retirement_balance": {
        "p25": 245000.00,
        "p50": 312000.00,
        "p75": 398000.00,
        "p90": 510000.00
      },
      "annual_withdrawal": {
        "p25": 15200.00,
        "p50": 19400.00,
        "p75": 24700.00,
        "p90": 31700.00
      },
      "trajectory": [
        {
          "age": 25,
          "p25": 5000.00,
          "p50": 5000.00,
          "p75": 5000.00,
          "p90": 5000.00
        },
        {
          "age": 67,
          "p25": 245000.00,
          "p50": 312000.00,
          "p75": 398000.00,
          "p90": 510000.00
        },
        {
          "age": 68,
          "p25": 228500.00,
          "p50": 295000.00,
          "p75": 380000.00,
          "p90": 492000.00,
          "withdrawal": {
            "p25": 15200.00,
            "p50": 19400.00,
            "p75": 24700.00,
            "p90": 31700.00
          }
        },
        {
          "age": 93,
          "p25": 0.00,
          "p50": 0.00,
          "p75": 1200.00,
          "p90": 45000.00,
          "withdrawal": {
            "p25": 0.00,
            "p50": 19400.00,
            "p75": 24700.00,
            "p90": 31700.00
          }
        }
      ]
    }
  ]
}
```

## Field Changes

### New fields

| Field | Location | Type | Description |
|-------|----------|------|-------------|
| `planning_age` | SimulationResponse | int | Planning horizon end age (from MonteCarloConfig) |
| `annual_withdrawal` | PersonaSimulationResult | PercentileValues \| null | Level real annual withdrawal at each percentile, in today's dollars. Null if no distribution phase. |
| `withdrawal` | YearSnapshot | PercentileValues \| null | Per-year withdrawal percentiles in today's dollars. Null for accumulation-phase years. |

### Backward compatibility

- All new fields are additive (new keys in JSON objects)
- Existing fields retain their types and semantics
- `trajectory` now extends through `planning_age` (was through `retirement_age`) — consumers iterating over trajectory will see more entries but no structural change
- `withdrawal` on YearSnapshot is null/omitted for accumulation years, so existing parsing of `{age, p25, p50, p75, p90}` is unaffected
- `annual_withdrawal` on PersonaSimulationResult is null/omitted when no distribution phase

### Notes on withdrawal values

- All `withdrawal` values are in **real/today's dollars** (constant purchasing power)
- For the systematic strategy, withdrawal percentiles are the same across all distribution years (level real amount per trial)
- When a trial's balance is depleted (floored at $0), that trial's withdrawal becomes $0, which affects the lower percentiles in later years
- The `p25` withdrawal at age 93 may be $0 if more than 25% of trials have depleted before reaching planning age
