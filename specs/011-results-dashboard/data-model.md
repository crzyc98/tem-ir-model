# Data Model: Results Dashboard

**Branch**: `011-results-dashboard` | **Date**: 2026-02-24

## Entity: PercentileValues (Modified)

Represents a set of percentile statistics across simulation trials. Extended with p10 for 90% confidence level support.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| **p10** | float | >= 0 | **NEW** — 10th percentile; 90% of trials exceed this value |
| p25 | float | >= 0 | 25th percentile; existing |
| p50 | float | >= 0 | 50th percentile (median); existing |
| p75 | float | >= 0 | 75th percentile; existing |
| p90 | float | >= 0 | 90th percentile; existing |

### Changes from existing model

1. Added `p10: float` field to support 90% confidence level mapping
2. Engine constant changed from `PERCENTILES = (25, 50, 75, 90)` to `PERCENTILES = (10, 25, 50, 75, 90)`
3. All array indexing in the engine shifts by +1 to accommodate the new leading element

## Entity: YearSnapshot (Modified)

Represents projected balance at a single age across simulation trials. Extended with p10.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| age | int | 18–100 | Year of the persona's life; existing |
| **p10** | float | >= 0 | **NEW** — 10th percentile balance at this age |
| p25 | float | >= 0 | 25th percentile balance; existing |
| p50 | float | >= 0 | Median balance; existing |
| p75 | float | >= 0 | 75th percentile balance; existing |
| p90 | float | >= 0 | 90th percentile balance; existing |
| withdrawal | PercentileValues or null | | Withdrawal amounts; only populated during distribution phase; existing |

### Changes from existing model

1. Added `p10: float` field

## Entity: PersonaSimulationResult (Modified)

Per-persona simulation output. Extended with contribution totals, probability of success, income replacement ratio, and projected salary.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| persona_id | UUID | required | Existing |
| persona_name | string | required | Existing |
| retirement_balance | PercentileValues | required | Balance at retirement age; existing |
| annual_withdrawal | PercentileValues or null | | Annual withdrawal amount; existing |
| ss_annual_benefit | float | >= 0, default 0.0 | Social Security annual benefit in today's dollars; existing |
| total_retirement_income | PercentileValues or null | | Withdrawal + SS income; existing |
| trajectory | list[YearSnapshot] | required | Year-by-year balance projections; existing |
| **total_employee_contributions** | float | >= 0, default 0.0 | **NEW** — Median cumulative employee deferrals from current age to retirement |
| **total_employer_contributions** | float | >= 0, default 0.0 | **NEW** — Median cumulative employer match + core from current age to retirement |
| **probability_of_success** | float | 0.0–1.0, default 1.0 | **NEW** — Fraction of trials where balance sustains through planning age |
| **income_replacement_ratio** | PercentileValues or null | | **NEW** — total_retirement_income / projected_salary; varies by percentile |
| **projected_salary_at_retirement** | float | >= 0, default 0.0 | **NEW** — Deterministic projected salary at retirement age |

### Changes from existing model

1. Added `total_employee_contributions: float` — median cumulative employee deferrals across all accumulation years
2. Added `total_employer_contributions: float` — median cumulative employer match + employer core contributions across all accumulation years
3. Added `probability_of_success: float` — percentage of trials where balance > 0 at planning age
4. Added `income_replacement_ratio: PercentileValues | None` — income replacement ratio at each percentile, calculated as `total_retirement_income_percentile / projected_salary_at_retirement`
5. Added `projected_salary_at_retirement: float` — deterministic projection: `salary * (1 + wage_growth_rate) ^ years_to_retirement`

## Entity: SimulationResponse (Unchanged)

No structural changes. The response shape remains the same; changes propagate through the `personas: list[PersonaSimulationResult]` field.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| scenario_id | UUID | required | Existing |
| num_simulations | int | 1–10000 | Existing |
| seed | int or null | | Existing |
| retirement_age | int | required | Existing |
| planning_age | int | required | Existing |
| personas | list[PersonaSimulationResult] | required | Contains all per-persona results with new fields |

## Entity: Frontend Simulation Types (New)

TypeScript types mirroring the extended backend models. Created in `app/src/types/simulation.ts`.

| Type | Fields | Notes |
|------|--------|-------|
| PercentileValues | p10, p25, p50, p75, p90 (all number) | Mirrors backend PercentileValues |
| YearSnapshot | age, p10, p25, p50, p75, p90 (number); withdrawal (PercentileValues or null) | Mirrors backend YearSnapshot |
| PersonaSimulationResult | persona_id, persona_name, retirement_balance, annual_withdrawal, ss_annual_benefit, total_retirement_income, trajectory, total_employee_contributions, total_employer_contributions, probability_of_success, income_replacement_ratio, projected_salary_at_retirement | Mirrors backend PersonaSimulationResult |
| SimulationResponse | scenario_id, num_simulations, seed, retirement_age, planning_age, personas | Mirrors backend SimulationResponse |
| SimulationRequest | num_simulations?, seed? | Request body for POST /simulate |
| ConfidenceLevel | "50" or "75" or "90" | Union type for confidence toggle state |

## Entity: Confidence Level Mapping (New — Frontend Only)

Defines the mapping between user-facing confidence levels and backend percentile fields.

| Confidence Level | Central Line Field | Band Lower Field | Band Upper Field | Description |
|-----------------|-------------------|-----------------|-----------------|-------------|
| 50% | p50 | p25 | p75 | Median outcome with interquartile range band |
| 75% | p25 | p10 | p50 | Conservative estimate with p10–p50 band |
| 90% | p10 | (none) | (none) | Most conservative estimate; line only, no band |

## Relationships

```text
SimulationResponse
  └── personas: list[PersonaSimulationResult]
        ├── retirement_balance: PercentileValues
        ├── annual_withdrawal: PercentileValues | null
        ├── total_retirement_income: PercentileValues | null
        ├── income_replacement_ratio: PercentileValues | null  (NEW)
        └── trajectory: list[YearSnapshot]
              └── withdrawal: PercentileValues | null

ConfidenceLevel (frontend state)
  └── determines which percentile field to read from all PercentileValues objects
```
