# Data Model: Social Security Benefit Estimator

**Feature**: 006-social-security-estimator
**Date**: 2026-02-24

## New Entities

### SSBenefitEstimate

The result of a Social Security benefit estimation for a single persona. Returned by both the standalone endpoint and the simulation integration.

| Attribute | Type | Description |
|-----------|------|-------------|
| `persona_id` | UUID | Persona this estimate belongs to |
| `persona_name` | str | Persona display name |
| `claiming_age` | int | Social Security claiming age used (62-70) |
| `monthly_benefit_today` | float | Estimated monthly benefit in today's dollars |
| `annual_benefit_today` | float | Estimated annual benefit in today's dollars (monthly × 12) |
| `pia_monthly` | float | Primary Insurance Amount (monthly) at Full Retirement Age |
| `claiming_adjustment_factor` | float | Multiplier applied to PIA (< 1.0 early, 1.0 at FRA, > 1.0 delayed) |
| `aime` | int | Average Indexed Monthly Earnings (whole dollars) |

**Constraints**:
- `monthly_benefit_today >= 0`
- `annual_benefit_today == floor(monthly_benefit_today) * 12`
- `claiming_age` in range [62, 70]
- `claiming_adjustment_factor` in range [0.70, 1.24]
- `aime >= 0`

---

### SSEstimateResponse

Top-level response for the standalone SS estimate endpoint.

| Attribute | Type | Description |
|-----------|------|-------------|
| `workspace_id` | UUID | Workspace containing the personas |
| `estimates` | list[SSBenefitEstimate] | SS estimates per persona |

---

## Extended Entities

### Persona (modified)

Extended with a claiming age field for Social Security.

| Attribute | Type | Default | Change |
|-----------|------|---------|--------|
| `id` | UUID | uuid4() | Unchanged |
| `name` | str | — | Unchanged |
| `label` | str | — | Unchanged |
| `age` | int | — | Unchanged |
| `tenure_years` | int | — | Unchanged |
| `salary` | float | — | Unchanged |
| `deferral_rate` | float | — | Unchanged |
| `current_balance` | float | — | Unchanged |
| `allocation` | AssetAllocation | — | Unchanged |
| `include_social_security` | bool | True | Unchanged (existing) |
| `ss_claiming_age` | int | 67 | **NEW** — range 62-70 |

**Validation**:
- `ss_claiming_age` must be in [62, 70]
- `ss_claiming_age` must be >= `age` (validated at estimation time, not at model level, since age changes over time)

---

### PersonaSimulationResult (modified)

Extended with Social Security benefit fields.

| Attribute | Type | Default | Change |
|-----------|------|---------|--------|
| `persona_id` | UUID | — | Unchanged |
| `persona_name` | str | — | Unchanged |
| `retirement_balance` | PercentileValues | — | Unchanged |
| `annual_withdrawal` | PercentileValues \| None | None | Unchanged (plan-only) |
| `ss_annual_benefit` | float | 0.0 | **NEW** — deterministic annual SS benefit in today's dollars |
| `total_retirement_income` | PercentileValues \| None | None | **NEW** — annual_withdrawal + ss_annual_benefit at each percentile |
| `trajectory` | list[YearSnapshot] | — | Unchanged |

**Behavior**:
- `annual_withdrawal`: Unchanged — plan-only withdrawal, independent of SS toggle (FR-016)
- `ss_annual_benefit`: Deterministic scalar. $0 when `include_social_security` is false. Same value regardless of Monte Carlo trial.
- `total_retirement_income`: Each percentile = corresponding `annual_withdrawal` percentile + `ss_annual_benefit`. None if no distribution phase.
- When `include_social_security` is false: `ss_annual_benefit = 0.0`, `total_retirement_income` equals `annual_withdrawal`.

---

## Reference Data (not persisted — embedded constants)

### AWI Series

| Attribute | Type | Description |
|-----------|------|-------------|
| `AWI` | dict[int, float] | Year → Average Wage Index. Published values 1951-2023. |

**Projection**: For years beyond 2023: `AWI[Y] = AWI[2023] * (1 + wage_growth_rate)^(Y - 2023)`

### Taxable Maximum Series

| Attribute | Type | Description |
|-----------|------|-------------|
| `TAXABLE_MAX` | dict[int, float] | Year → SS taxable maximum. Published values 1951-2026. |

**Projection**: For years beyond 2026: `TAXABLE_MAX[Y] = TAXABLE_MAX[2026] * (1 + wage_growth_rate)^(Y - 2026)`

### Bend Point Formula Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `BP1_BASE` | 180 | First bend point in 1979 |
| `BP2_BASE` | 1085 | Second bend point in 1979 |
| `AWI_1977` | 9779.44 | Reference AWI for bend point formula |
| `PIA_RATE_1` | 0.90 | Replacement rate below first bend point |
| `PIA_RATE_2` | 0.32 | Replacement rate between bend points |
| `PIA_RATE_3` | 0.15 | Replacement rate above second bend point |

### Other Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `FRA` | 67 | Full Retirement Age (born 1960+) |
| `MIN_CLAIMING_AGE` | 62 | Earliest claiming age |
| `MAX_CLAIMING_AGE` | 70 | Latest claiming age |
| `EMPLOYMENT_START_AGE` | 22 | Assumed age work begins |
| `INDEXING_AGE` | 60 | Age used for earnings indexing year |
| `COMPUTATION_YEARS` | 35 | Number of highest-earning years for AIME |

---

## Entity Relationships

```
SocialSecurityEstimator
    ├── reads → Persona (age, salary, ss_claiming_age, include_social_security)
    ├── reads → Assumptions (inflation_rate, wage_growth_rate)
    ├── reads → MonteCarloConfig (retirement_age)
    ├── uses → AWI series, TAXABLE_MAX series (embedded constants)
    └── produces → SSBenefitEstimate

SimulationEngine
    ├── uses → SocialSecurityEstimator (once per persona)
    ├── produces → PersonaSimulationResult (extended)
    │                  ├── retirement_balance: PercentileValues (unchanged)
    │                  ├── annual_withdrawal: PercentileValues | None (unchanged)
    │                  ├── ss_annual_benefit: float (NEW — deterministic)
    │                  ├── total_retirement_income: PercentileValues | None (NEW)
    │                  └── trajectory: list[YearSnapshot] (unchanged)
    └── configured by → MonteCarloConfig (retirement_age, planning_age)

Standalone Endpoint
    ├── reads → Workspace (personas, base_config.assumptions)
    ├── uses → SocialSecurityEstimator
    └── returns → SSEstimateResponse (list of SSBenefitEstimate)
```

## Computation Pipeline

```
[Inputs]                    [Earnings History]           [Indexing]
persona.age            →    reconstruct past earnings    →  index to age-60 year
persona.salary         →    via AWI ratios               →  using AWI factors
assumptions.wage_growth →   project future earnings      →  (post-60 at nominal)
                            cap at taxable max

[AIME]                      [PIA]                        [Claiming Adj]
top 35 years           →    bend-point formula      →    early/delayed factor
÷ 420 months                (year person turns 62)       (based on claiming_age)
floor to whole $            floor to nearest dime        × PIA

[COLA]                      [Today's $]                  [Output]
apply inflation from   →    discount to present     →    SSBenefitEstimate
age 62 to claiming age      value at inflation rate      monthly + annual
```
