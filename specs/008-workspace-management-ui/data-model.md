# Data Model: Workspace Management UI

**Branch**: `008-workspace-management-ui` | **Date**: 2026-02-24

## Existing Types (no changes)

### `WorkspaceSummary` — `app/src/types/workspace.ts`

| Field        | Type     | Notes                    |
| ------------ | -------- | ------------------------ |
| id           | string   | UUID from backend        |
| name         | string   |                          |
| client_name  | string   |                          |
| created_at   | string   | ISO 8601 datetime        |
| updated_at   | string   | ISO 8601 datetime        |

### `LayoutContext` — `app/src/types/workspace.ts`

| Field              | Type                             | Notes                     |
| ------------------ | -------------------------------- | ------------------------- |
| activeWorkspace    | WorkspaceSummary \| null         |                           |
| setActiveWorkspace | (ws: WorkspaceSummary) => void   |                           |
| workspaces         | WorkspaceSummary[]               |                           |

### `HealthStatus` — `app/src/types/workspace.ts`

| Field       | Type              | Notes    |
| ----------- | ----------------- | -------- |
| status      | string            |          |
| version     | string \| undefined |        |
| environment | string \| undefined |        |

### `NavItem` — `app/src/types/navigation.ts`

| Field    | Type              | Notes    |
| -------- | ----------------- | -------- |
| label    | string            |          |
| icon     | LucideIcon        |          |
| to       | string \| undefined |        |
| end      | boolean \| undefined |       |
| children | NavItem[] \| undefined |     |

## New Types

### `AssetClassReturn` — `app/src/types/assumptions.ts`

| Field              | Type   | Notes          |
| ------------------ | ------ | -------------- |
| expected_return    | number |                |
| standard_deviation | number | >= 0           |

### `Assumptions` — `app/src/types/assumptions.ts`

| Field               | Type             | Default   | Notes                  |
| ------------------- | ---------------- | --------- | ---------------------- |
| inflation_rate      | number           | 0.025     |                        |
| wage_growth_rate    | number           | 0.03      |                        |
| wage_growth_std     | number           | 0.02      | >= 0                   |
| equity              | AssetClassReturn |           |                        |
| intl_equity         | AssetClassReturn |           |                        |
| fixed_income        | AssetClassReturn |           |                        |
| cash                | AssetClassReturn |           |                        |
| comp_limit          | number           | 345000    | > 0                    |
| deferral_limit      | number           | 23500     | > 0                    |
| additions_limit     | number           | 70000     | > 0                    |
| catchup_limit       | number           | 7500      | > 0                    |
| super_catchup_limit | number           | 11250     | > 0                    |

### `AssetClassReturnOverride` — `app/src/types/assumptions.ts`

| Field              | Type              | Notes         |
| ------------------ | ----------------- | ------------- |
| expected_return    | number \| null    | null = inherit |
| standard_deviation | number \| null    | null = inherit |

### `AssumptionsOverride` — `app/src/types/assumptions.ts`

All fields are `number | null` or `AssetClassReturnOverride | null`. Null means "inherit from base config". Same field names as `Assumptions`.

### `TargetDateAllocation` — `app/src/types/persona.ts`

| Field                | Type            | Notes                    |
| -------------------- | --------------- | ------------------------ |
| type                 | "target_date"   | Discriminator            |
| target_date_vintage  | number          | >= current year          |

### `CustomAllocation` — `app/src/types/persona.ts`

| Field     | Type     | Notes                           |
| --------- | -------- | ------------------------------- |
| type      | "custom" | Discriminator                   |
| stock_pct | number   | 0.0–1.0                         |
| bond_pct  | number   | 0.0–1.0                         |
| cash_pct  | number   | 0.0–1.0; sum must equal 1.0±0.01 |

### `AssetAllocation` — `app/src/types/persona.ts`

Discriminated union: `TargetDateAllocation | CustomAllocation`

### `Persona` — `app/src/types/persona.ts`

| Field                 | Type            | Notes           |
| --------------------- | --------------- | --------------- |
| id                    | string          | UUID            |
| name                  | string          |                 |
| label                 | string          |                 |
| age                   | number          | 18–80           |
| tenure_years          | number          | 0–60            |
| salary                | number          | > 0             |
| deferral_rate         | number          | 0.0–1.0         |
| current_balance       | number          | >= 0            |
| allocation            | AssetAllocation |                 |
| include_social_security | boolean       | default true    |
| ss_claiming_age       | number          | 62–70, default 67 |

### `MatchTier` — `app/src/types/plan-design.ts`

| Field      | Type   | Notes   |
| ---------- | ------ | ------- |
| match_rate | number | 0.0–1.0 |
| on_first_pct | number | 0.0–1.0 |

### `ImmediateVesting` — `app/src/types/plan-design.ts`

| Field | Type          | Notes         |
| ----- | ------------- | ------------- |
| type  | "immediate"   | Discriminator |

### `CliffVesting` — `app/src/types/plan-design.ts`

| Field | Type    | Notes         |
| ----- | ------- | ------------- |
| type  | "cliff" | Discriminator |
| years | number  | 1–6           |

### `GradedVesting` — `app/src/types/plan-design.ts`

| Field    | Type                      | Notes                      |
| -------- | ------------------------- | -------------------------- |
| type     | "graded"                  | Discriminator              |
| schedule | Record\<string, number\>  | JSON keys are always strings |

### `VestingSchedule` — `app/src/types/plan-design.ts`

Discriminated union: `ImmediateVesting | CliffVesting | GradedVesting`

### `CoreContributionTier` — `app/src/types/plan-design.ts`

| Field            | Type           | Notes                                   |
| ---------------- | -------------- | --------------------------------------- |
| min_age          | number \| null | >= 0                                    |
| max_age          | number \| null | >= 0                                    |
| min_service      | number \| null | >= 0                                    |
| max_service      | number \| null | >= 0                                    |
| contribution_pct | number         | 0.0–1.0; at least one dimension required |

### `PlanDesign` — `app/src/types/plan-design.ts`

| Field                   | Type                            | Default             | Notes                            |
| ----------------------- | ------------------------------- | ------------------- | -------------------------------- |
| name                    | string                          |                     | Required                         |
| match_tiers             | MatchTier[]                     | []                  | Max 3                            |
| match_vesting           | VestingSchedule                 | { type: "immediate" } |                                |
| match_eligibility_months | number                         | 0                   | 0–12                             |
| core_contribution_pct   | number                          | 0.0                 | 0.0–1.0                          |
| core_age_service_tiers  | CoreContributionTier[] \| null  | null                | Max 5                            |
| core_vesting            | VestingSchedule                 | { type: "immediate" } |                                |
| core_eligibility_months | number                          | 0                   | 0–12                             |
| auto_enroll_enabled     | boolean                         | true                |                                  |
| auto_enroll_rate        | number                          | 0.06                | 0.0–1.0                          |
| auto_escalation_enabled | boolean                         | true                |                                  |
| auto_escalation_rate    | number                          | 0.01                | 0.0–1.0                          |
| auto_escalation_cap     | number                          | 0.10                | 0.0–1.0; must be >= auto_enroll_rate when both enabled |

### `IrsLimitWarning` — `app/src/types/scenario.ts`

| Field          | Type                                                    | Notes    |
| -------------- | ------------------------------------------------------- | -------- |
| type           | "employer_additions_limit" \| "employee_deferral_limit" |          |
| message        | string                                                  |          |
| persona_id     | string \| null                                          |          |
| persona_name   | string \| null                                          |          |
| limit_name     | string                                                  |          |
| limit_value    | number                                                  |          |
| computed_value | number                                                  |          |
| year           | number \| null                                          |          |

### `ScenarioSummary` — `app/src/types/scenario.ts`

| Field       | Type            | Notes           |
| ----------- | --------------- | --------------- |
| id          | string          | UUID            |
| name        | string          |                 |
| description | string \| null  |                 |
| created_at  | string          | ISO 8601        |
| updated_at  | string          | ISO 8601        |

### `ScenarioResponse` — `app/src/types/scenario.ts`

| Field                 | Type                        | Notes               |
| --------------------- | --------------------------- | -------------------- |
| id                    | string                      | UUID                 |
| workspace_id          | string                      | UUID                 |
| name                  | string                      |                      |
| description           | string \| null              |                      |
| plan_design           | PlanDesign                  |                      |
| overrides             | AssumptionsOverride \| null |                      |
| effective_assumptions | Assumptions                 | Computed by backend  |
| created_at            | string                      | ISO 8601             |
| updated_at            | string                      | ISO 8601             |
| last_run_at           | string \| null              | ISO 8601             |
| warnings              | IrsLimitWarning[]           | Computed by backend  |

### `ScenarioCreate` — `app/src/types/scenario.ts`

| Field       | Type                        | Notes    |
| ----------- | --------------------------- | -------- |
| name        | string                      | Required, non-empty |
| description | string \| undefined         | Optional |
| plan_design | PlanDesign                  | Required |
| overrides   | AssumptionsOverride \| undefined | Optional |

### `ScenarioUpdate` — `app/src/types/scenario.ts`

| Field       | Type                        | Notes    |
| ----------- | --------------------------- | -------- |
| name        | string \| undefined         | Optional |
| description | string \| undefined         | Optional |
| plan_design | PlanDesign \| undefined     | Optional |
| overrides   | AssumptionsOverride \| undefined | Optional |

### `Workspace` (full) — `app/src/types/workspace.ts`

| Field              | Type              | Notes                  |
| ------------------ | ----------------- | ---------------------- |
| id                 | string            | UUID                   |
| name               | string            |                        |
| client_name        | string            |                        |
| created_at         | string            | ISO 8601               |
| updated_at         | string            | ISO 8601               |
| base_config        | Assumptions       |                        |
| personas           | Persona[]         | 8 defaults on creation |
| monte_carlo_config | MonteCarloConfig  | Read-only in this feature |

### `MonteCarloConfig` — `app/src/types/workspace.ts`

| Field          | Type           | Default | Notes           |
| -------------- | -------------- | ------- | --------------- |
| num_simulations | number        | 1000    | 1–10000         |
| seed           | number \| null | null    |                 |
| retirement_age | number         | 67      | 55–70           |
| planning_age   | number         | 93      | 85–100; > retirement_age |

### `WorkspaceCreate` — `app/src/types/workspace.ts`

| Field       | Type               | Notes           |
| ----------- | ------------------ | --------------- |
| client_name | string             | Required, non-empty |
| name        | string \| undefined | Optional; defaults to client_name |

### `WorkspaceUpdate` — `app/src/types/workspace.ts`

| Field       | Type                        | Notes    |
| ----------- | --------------------------- | -------- |
| name        | string \| undefined         | Optional |
| client_name | string \| undefined         | Optional |
| base_config | AssumptionsOverride \| undefined | Optional; deep-merged |

## Modified Types

### `LayoutContext` — `app/src/types/workspace.ts` (MODIFY)

| Field              | Type                                       | Notes              |
| ------------------ | ------------------------------------------ | ------------------ |
| activeWorkspace    | WorkspaceSummary \| null                   | Existing           |
| setActiveWorkspace | (ws: WorkspaceSummary \| null) => void     | MODIFY — accept null for deletion |
| workspaces         | WorkspaceSummary[]                         | Existing           |
| refreshWorkspaces  | () => Promise\<void\>                      | NEW — re-fetch workspace list |

## Relationships

```text
Workspace (1) ──── has many ──── Scenario (*)
    │                                │
    ├── base_config: Assumptions     ├── plan_design: PlanDesign
    ├── personas: Persona[]          │     ├── match_tiers: MatchTier[]
    └── monte_carlo_config           │     ├── match_vesting: VestingSchedule
                                     │     ├── core_age_service_tiers: CoreContributionTier[]
                                     │     └── auto_enroll/escalation settings
                                     │
                                     ├── overrides: AssumptionsOverride | null
                                     ├── effective_assumptions: Assumptions (computed)
                                     └── warnings: IrsLimitWarning[] (computed)
```

## Utility Types

### `PlanDesignSummary` — `app/src/utils/plan-design-summary.ts`

Pure function: `formatPlanDesignSummary(pd: PlanDesign) => { matchFormula: string, autoEnrollRate: string, coreContribution: string }`

Formats plan design fields into human-readable strings for scenario cards:
- `matchFormula`: e.g., "100% on first 6%" or "100% on first 3%, 50% on next 2%" or "No match"
- `autoEnrollRate`: e.g., "6% auto-enroll" or "Auto-enroll off"
- `coreContribution`: e.g., "3% core" or "Age/service tiers" or "No core"
