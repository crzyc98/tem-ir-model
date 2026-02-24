# Data Model: 004-simulation-engine

**Date**: 2026-02-24

## Modified Models

### Assumptions (`api/models/assumptions.py`)

Add one field for wage growth noise parameterization:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| wage_growth_std | float | 0.02 | Standard deviation for wage growth noise (>= 0.0) |

All existing fields unchanged. The new field has a default value, so existing serialized JSON files will deserialize without issues.

### AssumptionsOverride (`api/models/assumptions_override.py`)

Add corresponding optional override field:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| wage_growth_std | float \| None | None | Optional override for wage growth noise std dev (>= 0.0 when set) |

---

## New Models

### SimulationRequest (request body — in router file)

Optional overrides for the simulation run. When omitted, values come from the workspace's `MonteCarloConfig`.

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| num_simulations | int \| None | No | None | Override: 1–10,000. Falls back to workspace config. |
| seed | int \| None | No | None | Override: for reproducibility. Falls back to workspace config. |

**Validation**: `num_simulations` must be between 1 and 10,000 when provided.

### PercentileValues (`api/models/simulation_result.py`)

Holds the four standard percentile values.

| Field | Type | Notes |
|-------|------|-------|
| p25 | float | 25th percentile balance |
| p50 | float | 50th percentile balance |
| p75 | float | 75th percentile balance |
| p90 | float | 90th percentile balance |

**Invariant**: p25 <= p50 <= p75 <= p90 (guaranteed by numpy percentile calculation, not validated by model).

### YearSnapshot (`api/models/simulation_result.py`)

A single year's data point in the trajectory.

| Field | Type | Notes |
|-------|------|-------|
| age | int | Persona's age at this point |
| p25 | float | 25th percentile balance |
| p50 | float | 50th percentile balance |
| p75 | float | 75th percentile balance |
| p90 | float | 90th percentile balance |

### PersonaSimulationResult (`api/models/simulation_result.py`)

Results for a single persona within a simulation run.

| Field | Type | Notes |
|-------|------|-------|
| persona_id | UUID | References the persona |
| persona_name | str | Persona's display name |
| retirement_balance | PercentileValues | Percentiles at retirement age |
| trajectory | list[YearSnapshot] | Year-by-year data from current age through retirement age |

**Invariant**: `len(trajectory) == retirement_age - persona.age + 1` (SC-006).

### SimulationResponse (`api/models/simulation_result.py`)

Top-level simulation result returned by the API.

| Field | Type | Notes |
|-------|------|-------|
| scenario_id | UUID | The scenario that was simulated |
| num_simulations | int | Actual number of trials run |
| seed | int \| None | Seed used (None if non-reproducible) |
| retirement_age | int | From workspace MonteCarloConfig |
| personas | list[PersonaSimulationResult] | Results grouped by persona (FR-020) |

---

## Glide Path Constants (in simulation engine)

Defined as module-level constants, not a Pydantic model. Used internally by the simulation engine to compute target-date allocations.

| Constant | Value | Notes |
|----------|-------|-------|
| GLIDE_EQUITY_START | 0.90 | Equity allocation at 40+ years before target |
| GLIDE_EQUITY_END | 0.30 | Equity allocation at and beyond target |
| GLIDE_BOND_START | 0.08 | Bond allocation at 40+ years before target |
| GLIDE_BOND_END | 0.50 | Bond allocation at and beyond target |
| GLIDE_CASH_START | 0.02 | Cash allocation at 40+ years before target |
| GLIDE_CASH_END | 0.20 | Cash allocation at and beyond target |
| GLIDE_YEARS | 40 | Duration of glide path transition in years |

**Interpolation formula** (per R2 in research.md):
```
t = clamp((GLIDE_YEARS - years_to_target) / GLIDE_YEARS, 0, 1)
equity = GLIDE_EQUITY_START - t * (GLIDE_EQUITY_START - GLIDE_EQUITY_END)
bonds  = GLIDE_BOND_START  + t * (GLIDE_BOND_END - GLIDE_BOND_START)
cash   = GLIDE_CASH_START  + t * (GLIDE_CASH_END - GLIDE_CASH_START)
```

---

## Entity Relationships

```
Workspace (existing)
├── base_config: Assumptions (+ wage_growth_std)
├── personas: list[Persona]
├── monte_carlo_config: MonteCarloConfig
└── scenarios/
    └── Scenario (existing)
        ├── plan_design: PlanDesign
        ├── overrides: AssumptionsOverride (+ wage_growth_std)
        └── last_run_at: datetime | None  ← updated after simulation (FR-021)

SimulationResponse (new — compute-and-return, not persisted)
├── scenario_id → Scenario.id
├── num_simulations, seed, retirement_age
└── personas: list[PersonaSimulationResult]
    ├── persona_id → Persona.id
    ├── persona_name
    ├── retirement_balance: PercentileValues
    └── trajectory: list[YearSnapshot]
```

**Key relationship**: SimulationResponse references a Scenario by ID and Personas by ID/name, but is not stored. The only persistent side effect of a simulation is updating `Scenario.last_run_at`.

---

## State Transitions

### Scenario.last_run_at

```
null ──[simulation completes]──> datetime (UTC)
datetime ──[simulation completes]──> datetime (updated UTC)
datetime ──[scenario duplicated]──> null (reset on copy)
```

No other model state transitions are introduced by this feature.
