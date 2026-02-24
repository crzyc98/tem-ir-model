# API Contract: Simulation Response (Extended)

**Feature**: 006-social-security-estimator
**Endpoint**: `POST /api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate`
**Change type**: Backward-compatible additive extension

## Request (unchanged)

```json
{
  "num_simulations": 1000,
  "seed": 42
}
```

No changes to the request body.

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
      "persona_name": "Sarah",
      "retirement_balance": {
        "p25": 850000.00,
        "p50": 1100000.00,
        "p75": 1400000.00,
        "p90": 1800000.00
      },
      "annual_withdrawal": {
        "p25": 52800.00,
        "p50": 68300.00,
        "p75": 86900.00,
        "p90": 111800.00
      },
      "ss_annual_benefit": 29400.00,
      "total_retirement_income": {
        "p25": 82200.00,
        "p50": 97700.00,
        "p75": 116300.00,
        "p90": 141200.00
      },
      "trajectory": [
        {
          "age": 42,
          "p25": 320000.00,
          "p50": 320000.00,
          "p75": 320000.00,
          "p90": 320000.00
        },
        {
          "age": 67,
          "p25": 850000.00,
          "p50": 1100000.00,
          "p75": 1400000.00,
          "p90": 1800000.00
        },
        {
          "age": 68,
          "p25": 800000.00,
          "p50": 1040000.00,
          "p75": 1340000.00,
          "p90": 1730000.00,
          "withdrawal": {
            "p25": 52800.00,
            "p50": 68300.00,
            "p75": 86900.00,
            "p90": 111800.00
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
| `ss_annual_benefit` | PersonaSimulationResult | float | Annual SS benefit in today's dollars. Deterministic scalar (same across all trials). $0 when `include_social_security` is false. |
| `total_retirement_income` | PersonaSimulationResult | PercentileValues \| null | `annual_withdrawal` at each percentile + `ss_annual_benefit`. Null if no distribution phase. |

### Backward compatibility

- All new fields are additive (new keys in JSON objects)
- Existing fields retain their types, semantics, and values
- `annual_withdrawal` is **unchanged** regardless of SS toggle — plan-only withdrawal (FR-016)
- `trajectory` structure is unchanged (no SS-related fields added to YearSnapshot)
- Existing consumers ignoring unknown keys will work without modification

### Computation of total_retirement_income

```
total_retirement_income.p25 = annual_withdrawal.p25 + ss_annual_benefit
total_retirement_income.p50 = annual_withdrawal.p50 + ss_annual_benefit
total_retirement_income.p75 = annual_withdrawal.p75 + ss_annual_benefit
total_retirement_income.p90 = annual_withdrawal.p90 + ss_annual_benefit
```

Because `ss_annual_benefit` is deterministic, it shifts all percentiles by a constant amount.

### Toggle behavior

| `include_social_security` | `ss_annual_benefit` | `total_retirement_income` |
|---|---|---|
| true | Computed SS benefit | annual_withdrawal + SS |
| false | 0.0 | Equals annual_withdrawal |

### Notes on SS values

- `ss_annual_benefit` is in **today's dollars** (real/constant purchasing power), consistent with `annual_withdrawal`
- The value is the same for all Monte Carlo trials because SS benefits are deterministic (government-guaranteed, not market-dependent)
- SS benefit is computed using the persona's `ss_claiming_age` (default 67) and the workspace's economic assumptions
