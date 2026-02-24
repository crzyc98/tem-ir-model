# Data Model: Core Pydantic Data Models

**Feature Branch**: `001-core-data-models`
**Date**: 2026-02-24

## Entity Relationship Overview

```text
Workspace (1) ──── has-many ──── Scenario (*)
    │                                │
    ├── base_config: Assumptions     ├── plan_design: PlanDesign
    ├── personas: [Persona]          ├── overrides: Assumptions?
    └── monte_carlo_config: MC       └── workspace_id: UUID
                                          │
                                     PlanDesign
                                          │
                                     ├── match_tiers: [MatchTier] (0–3)
                                     ├── match_vesting: VestingSchedule
                                     ├── core_age_service_tiers: [CoreContributionTier]? (0–5)
                                     └── core_vesting: VestingSchedule

Persona
    └── allocation: AssetAllocation (discriminated: TargetDate | Custom)

VestingSchedule = ImmediateVesting | CliffVesting | GradedVesting (discriminated union)
AssetAllocation = TargetDateAllocation | CustomAllocation (discriminated union)

Assumptions
    ├── equity: AssetClassReturn
    ├── intl_equity: AssetClassReturn
    ├── fixed_income: AssetClassReturn
    └── cash: AssetClassReturn
```

## Entities

### AssetClassReturn (FR-015)

Structured sub-model for return/risk per asset class.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `expected_return` | `float` | — | required | Expected annual return rate |
| `standard_deviation` | `float` | `>= 0.0` | required | Annual return standard deviation |

### MatchTier (FR-001)

A single tier in an employer match formula.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `match_rate` | `float` | `0.0–1.0` | required | Match rate (e.g., 1.0 = 100%) |
| `on_first_pct` | `float` | `0.0–1.0` | required | Deferral pct this tier applies to |

### VestingSchedule (FR-002) — Discriminated Union

Three variants, discriminated on `type` field:

**ImmediateVesting**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `type` | `Literal["immediate"]` | — | `"immediate"` | Discriminator |

**CliffVesting**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `type` | `Literal["cliff"]` | — | `"cliff"` | Discriminator |
| `years` | `int` | `1–6` | required | Years until fully vested |

**GradedVesting**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `type` | `Literal["graded"]` | — | `"graded"` | Discriminator |
| `schedule` | `dict[int, float]` | values `0.0–1.0` | required | Year → vested percentage mapping |

### CoreContributionTier (FR-016)

A single tier in an age/service-based core contribution schedule.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `min_age` | `int \| None` | `>= 0` | `None` | Lower age bound (inclusive) |
| `max_age` | `int \| None` | `>= 0` | `None` | Upper age bound (exclusive) |
| `min_service` | `int \| None` | `>= 0` | `None` | Lower service bound (inclusive) |
| `max_service` | `int \| None` | `>= 0` | `None` | Upper service bound (exclusive) |
| `contribution_pct` | `float` | `0.0–1.0` | required | Contribution percentage |

**Validation rules**:
- At least one dimension (age or service) must have non-null bounds
- If both bounds of a dimension are set, min < max
- Overlap detection is performed at the PlanDesign level across all tiers

### PlanDesign (FR-003)

Complete specification of a retirement plan's contribution structure.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `name` | `str` | required | — | Plan design name |
| `match_tiers` | `list[MatchTier]` | `0–3` items | `[]` | Employer match tiers |
| `match_vesting` | `VestingSchedule` | — | `ImmediateVesting()` | Match vesting schedule |
| `match_eligibility_months` | `int` | `0–12` | `0` | Match eligibility waiting period |
| `core_contribution_pct` | `float` | `0.0–1.0` | `0.0` | Fixed core contribution rate |
| `core_age_service_tiers` | `list[CoreContributionTier] \| None` | `0–5` items | `None` | Age/service-based core tiers |
| `core_vesting` | `VestingSchedule` | — | `ImmediateVesting()` | Core vesting schedule |
| `core_eligibility_months` | `int` | `0–12` | `0` | Core eligibility waiting period |
| `auto_enroll_enabled` | `bool` | — | `True` | Auto-enrollment toggle |
| `auto_enroll_rate` | `float` | `0.0–1.0` | `0.06` | Default deferral rate |
| `auto_escalation_enabled` | `bool` | — | `True` | Auto-escalation toggle |
| `auto_escalation_rate` | `float` | `0.0–1.0` | `0.01` | Annual escalation increment |
| `auto_escalation_cap` | `float` | `0.0–1.0` | `0.10` | Maximum escalation rate |

**Cross-field validation** (FR-014):
- When both `auto_enroll_enabled` and `auto_escalation_enabled` are True, `auto_escalation_cap` must be >= `auto_enroll_rate`
- CoreContributionTier overlap detection across all tiers in `core_age_service_tiers`

### AssetAllocation (FR-004) — Discriminated Union

Two variants, discriminated on `type` field:

**TargetDateAllocation**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `type` | `Literal["target_date"]` | — | `"target_date"` | Discriminator |
| `target_date_vintage` | `int` | `>= current year` | required | Fund vintage year |

**CustomAllocation**:

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `type` | `Literal["custom"]` | — | `"custom"` | Discriminator |
| `stock_pct` | `float` | `0.0–1.0` | required | Stock allocation |
| `bond_pct` | `float` | `0.0–1.0` | required | Bond allocation |
| `cash_pct` | `float` | `0.0–1.0` | required | Cash allocation |

**Cross-field validation**: `stock_pct + bond_pct + cash_pct` must equal 1.0 (±0.01 tolerance)

### Persona (FR-005)

A hypothetical employee profile for simulation.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `UUID` | — | `uuid4()` | Auto-generated unique identifier |
| `name` | `str` | required | — | Employee name |
| `label` | `str` | required | — | Career stage label |
| `age` | `int` | `18–80` | required | Current age |
| `tenure_years` | `int` | `0–60` | required | Years of service |
| `salary` | `float` | `> 0` | required | Annual compensation |
| `deferral_rate` | `float` | `0.0–1.0` | required | Employee deferral rate |
| `current_balance` | `float` | `>= 0` | required | Current account balance |
| `allocation` | `AssetAllocation` | — | required | Investment allocation |
| `include_social_security` | `bool` | — | `True` | Include SS estimate toggle |

### Assumptions (FR-006)

Economic and regulatory assumptions with 2026 IRS defaults.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `inflation_rate` | `float` | — | `0.025` | Annual inflation rate |
| `wage_growth_rate` | `float` | — | `0.03` | Annual wage growth rate |
| `equity` | `AssetClassReturn` | — | `(0.075, 0.17)` | U.S. equity return/risk |
| `intl_equity` | `AssetClassReturn` | — | `(0.07, 0.19)` | International equity return/risk |
| `fixed_income` | `AssetClassReturn` | — | `(0.04, 0.055)` | Fixed income return/risk |
| `cash` | `AssetClassReturn` | — | `(0.03, 0.01)` | Cash/stable value return/risk |
| `comp_limit` | `float` | `> 0` | `345_000` | 401(a)(17) comp limit |
| `deferral_limit` | `float` | `> 0` | `23_500` | 402(g) deferral limit |
| `additions_limit` | `float` | `> 0` | `70_000` | 415 annual additions limit |
| `catchup_limit` | `float` | `> 0` | `7_500` | Age 50+ catch-up limit |
| `super_catchup_limit` | `float` | `> 0` | `11_250` | Age 60-63 super catch-up |

### MonteCarloConfig (FR-007)

Configuration for the simulation engine.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `num_simulations` | `int` | `1–10,000` | `1_000` | Number of simulation runs |
| `seed` | `int \| None` | — | `None` | Random seed for reproducibility |
| `retirement_age` | `int` | `55–70` | `67` | Target retirement age |
| `planning_age` | `int` | `85–100` | `93` | Mortality/planning horizon age |

**Cross-field validation** (FR-013): `planning_age` must be > `retirement_age`

### Workspace (FR-008)

Top-level organizational container.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `UUID` | — | `uuid4()` | Auto-generated identifier |
| `name` | `str` | required | — | Workspace display name |
| `client_name` | `str` | required | — | Plan sponsor name |
| `created_at` | `datetime` | — | `now(UTC)` | Creation timestamp |
| `updated_at` | `datetime` | — | `now(UTC)` | Last update timestamp |
| `base_config` | `Assumptions` | — | `Assumptions()` | Default assumptions |
| `personas` | `list[Persona]` | — | `[]` | Default persona set |
| `monte_carlo_config` | `MonteCarloConfig` | — | `MonteCarloConfig()` | Simulation config |

### Scenario (FR-009)

A specific plan design configuration within a workspace.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | `UUID` | — | `uuid4()` | Auto-generated identifier |
| `workspace_id` | `UUID` | required | — | Parent workspace reference |
| `name` | `str` | required | — | Scenario display name |
| `description` | `str \| None` | — | `None` | Optional description |
| `plan_design` | `PlanDesign` | required | — | The plan design |
| `overrides` | `Assumptions \| None` | — | `None` | Assumption overrides |
| `created_at` | `datetime` | — | `now(UTC)` | Creation timestamp |
| `updated_at` | `datetime` | — | `now(UTC)` | Last update timestamp |
| `last_run_at` | `datetime \| None` | — | `None` | Last simulation run |

## Default Personas (FR-010)

Factory function `default_personas()` returns 8 personas:

| Name | Label | Age | Tenure | Salary | Deferral | Balance | Allocation |
|------|-------|-----|--------|--------|----------|---------|------------|
| Jordan | Early Career Entry-Level | 25 | 1 | $40,000 | 3% | $2,000 | TD 2065 |
| Priya | Early Career Professional | 30 | 3 | $65,000 | 6% | $35,000 | TD 2060 |
| Marcus | Mid-Career Individual Contributor | 38 | 8 | $90,000 | 8% | $150,000 | TD 2055 |
| Sarah | Mid-Career Manager | 42 | 12 | $120,000 | 10% | $320,000 | TD 2050 |
| David | Senior Manager | 48 | 18 | $160,000 | 12% | $650,000 | TD 2045 |
| Michelle | Director / Executive | 52 | 22 | $210,000 | 15% | $1,100,000 | TD 2040 |
| Robert | Late Career / Near Retirement | 58 | 28 | $140,000 | 10% | $480,000 | TD 2035 |
| Linda | Lower-Paid Long-Tenure | 55 | 30 | $52,000 | 5% | $120,000 | TD 2035 |

All personas have `include_social_security = True` by default.

## State Transitions

No state machines in this feature. Models are immutable data holders — state changes (e.g., updating `updated_at`, setting `last_run_at`) are handled at the service layer via `model_copy(update={...})`.
