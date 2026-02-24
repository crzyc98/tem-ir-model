# Data Model: Withdrawal Strategy Interface

**Feature**: 005-withdrawal-strategy
**Date**: 2026-02-24

## New Entities

### WithdrawalStrategy (Protocol)

A structural interface (Python Protocol) that any withdrawal strategy must satisfy. The simulation engine depends only on this protocol, never on concrete implementations.

| Attribute | Type | Description |
|-----------|------|-------------|
| — | — | No stored attributes; stateless protocol |

**Method: `calculate_withdrawal`**

| Parameter | Type | Description |
|-----------|------|-------------|
| `current_balance` | ndarray (n,) | Portfolio balance per trial before this year's withdrawal |
| `year_in_retirement` | int | 1-based year index (1 = first retirement year) |
| `initial_retirement_balance` | ndarray (n,) | Balance at retirement start per trial (immutable) |
| `params` | dict[str, Any] | Strategy-specific parameters |
| **Returns** | ndarray (n,) | Nominal withdrawal amount per trial |

**Constraints**:
- Return values MUST be non-negative
- Return values MUST NOT exceed `current_balance` per trial
- Must operate on vectorized NumPy arrays for performance

---

### SystematicWithdrawal

The default (and currently sole) implementation of `WithdrawalStrategy`. Computes a level real annual withdrawal using the PMT annuity-depletion formula.

| Attribute | Type | Description |
|-----------|------|-------------|
| — | — | No stored state; all computation from params |

**Required params keys**:

| Key | Type | Description |
|-----|------|-------------|
| `total_years` | int | Planning age − retirement age (number of distribution years) |
| `real_return_rate` | float | Blended expected nominal return at retirement allocation minus inflation (Fisher formula) |
| `inflation_rate` | float | Annual inflation rate from assumptions |

**PMT formula**:
```
If |r| > 0.0001:
    W_real = PV × r / (1 − (1 + r)^(−N))
Else:
    W_real = PV / N

W_nominal = W_real × (1 + inflation)^year_in_retirement
```

Where `PV` = `initial_retirement_balance`, `r` = `real_return_rate`, `N` = `total_years`.

**Constraints**:
- When `current_balance` is 0 for a trial, withdrawal MUST be 0 for that trial
- Withdrawal capped at `current_balance` to prevent negative balances

---

## Extended Entities

### YearSnapshot (modified)

Extended with an optional withdrawal field for distribution-phase snapshots.

| Attribute | Type | Default | Change |
|-----------|------|---------|--------|
| `age` | int | — | Unchanged |
| `p25` | float | — | Unchanged |
| `p50` | float | — | Unchanged |
| `p75` | float | — | Unchanged |
| `p90` | float | — | Unchanged |
| `withdrawal` | PercentileValues \| None | None | **NEW** |

**Behavior**:
- Accumulation phase (age ≤ retirement_age): `withdrawal = None`
- Distribution phase (age > retirement_age): `withdrawal = PercentileValues(...)` in real/today's dollars
- For systematic strategy: withdrawal percentiles are constant across all distribution years (because the real amount is level per trial)

---

### PersonaSimulationResult (modified)

Extended with an optional annual withdrawal summary.

| Attribute | Type | Default | Change |
|-----------|------|---------|--------|
| `persona_id` | UUID | — | Unchanged |
| `persona_name` | str | — | Unchanged |
| `retirement_balance` | PercentileValues | — | Unchanged |
| `annual_withdrawal` | PercentileValues \| None | None | **NEW** |
| `trajectory` | list[YearSnapshot] | — | Extended through planning_age |

**Behavior**:
- `annual_withdrawal`: Level real annual withdrawal amount at p25/p50/p75/p90, in today's dollars. None if no distribution phase (retirement_age == planning_age).
- `trajectory`: Now extends from persona's current age through planning_age (was through retirement_age).

---

### SimulationResponse (modified)

Extended with planning age.

| Attribute | Type | Default | Change |
|-----------|------|---------|--------|
| `scenario_id` | UUID | — | Unchanged |
| `num_simulations` | int | — | Unchanged |
| `seed` | int \| None | — | Unchanged |
| `retirement_age` | int | — | Unchanged |
| `planning_age` | int | — | **NEW** |
| `personas` | list[PersonaSimulationResult] | — | Unchanged (contents extended) |

---

## Entity Relationships

```
SimulationEngine
    ├── uses → WithdrawalStrategy (protocol)
    │              └── implemented by → SystematicWithdrawal
    ├── produces → PersonaSimulationResult
    │                  ├── retirement_balance: PercentileValues
    │                  ├── annual_withdrawal: PercentileValues | None
    │                  └── trajectory: list[YearSnapshot]
    │                                       └── withdrawal: PercentileValues | None
    └── configured by → MonteCarloConfig
                            ├── retirement_age (existing)
                            └── planning_age (existing, now used)
```

## State Transitions

The simulation has two sequential phases:

```
[Accumulation Phase]          [Distribution Phase]
age → retirement_age          retirement_age+1 → planning_age
─────────────────────    →    ──────────────────────────────
contributions + returns       withdrawals + returns
balance grows                 balance declines
withdrawal = None             withdrawal = PercentileValues
```

**Transition point** (at retirement_age):
1. Record final accumulation snapshot
2. Capture `initial_retirement_balance` per trial
3. Compute PMT-based `W_real` per trial
4. Begin distribution loop
