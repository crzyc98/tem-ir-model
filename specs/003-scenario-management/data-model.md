# Data Model: 003-scenario-management

**Date**: 2026-02-24

## Existing Models (from features 001/002 — no changes needed)

### Scenario (`api/models/scenario.py`)

Already defined with all required fields:

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Auto-generated |
| workspace_id | UUID | Required, links to parent workspace |
| name | str | Required |
| description | str \| None | Optional |
| plan_design | PlanDesign | Required |
| overrides | AssumptionsOverride \| None | Optional partial overrides |
| created_at | datetime | Auto-populated UTC |
| updated_at | datetime | Auto-populated UTC |
| last_run_at | datetime \| None | Optional, resets on duplicate |

### PlanDesign (`api/models/plan_design.py`)

Already defined with full validation:

| Field | Type | Default |
|-------|------|---------|
| name | str | Required |
| match_tiers | list[MatchTier] | [] (max 3) |
| match_vesting | VestingSchedule | ImmediateVesting |
| match_eligibility_months | int | 0 (0–12) |
| core_contribution_pct | float | 0.0 (0.0–1.0) |
| core_age_service_tiers | list[CoreContributionTier] \| None | None (max 5) |
| core_vesting | VestingSchedule | ImmediateVesting |
| core_eligibility_months | int | 0 (0–12) |
| auto_enroll_enabled | bool | True |
| auto_enroll_rate | float | 0.06 (0.0–1.0) |
| auto_escalation_enabled | bool | True |
| auto_escalation_rate | float | 0.01 (0.0–1.0) |
| auto_escalation_cap | float | 0.10 (0.0–1.0) |

**Validation**: escalation_cap >= enroll_rate when both enabled; no overlapping core contribution tiers.

### AssumptionsOverride (`api/models/assumptions_override.py`)

Already defined — all fields optional (None = inherit from base).

### Assumptions (`api/models/assumptions.py`)

Already defined with 2026 IRS defaults: comp_limit=$345k, deferral_limit=$23.5k, additions_limit=$70k, catchup_limit=$7.5k, super_catchup_limit=$11.25k.

### Persona (`api/models/persona.py`)

Already defined with `deferral_rate` field (0.0–1.0), `age` (18–80), `salary` (>0).

---

## New Models

### ScenarioCreate (request body)

Router-level Pydantic model for creating a scenario.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | str | Yes | Non-empty, stripped |
| description | str \| None | No | Optional |
| plan_design | PlanDesign | Yes | Full plan design |
| overrides | AssumptionsOverride \| None | No | Optional assumption overrides |

**Validation**: `name` must not be empty after stripping whitespace.

### ScenarioUpdate (request body)

Router-level Pydantic model for partial updates.

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | str \| None | No | Non-empty when set |
| description | str \| None | No | Can set or clear |
| plan_design | PlanDesign \| None | No | Full replacement when set |
| overrides | AssumptionsOverride \| None | No | Full replacement when set |

**Behavior**: Only fields present in the request body are applied (uses `model_dump(exclude_unset=True)` pattern from workspace update).

### ScenarioSummary (response for list)

Lightweight view for list endpoint.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Scenario ID |
| name | str | Scenario name |
| description | str \| None | Optional |
| created_at | datetime | |
| updated_at | datetime | |

### ScenarioResponse (response for get/create/update/duplicate)

Full scenario data plus computed fields.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | |
| workspace_id | UUID | |
| name | str | |
| description | str \| None | |
| plan_design | PlanDesign | |
| overrides | AssumptionsOverride \| None | Raw overrides as stored |
| effective_assumptions | Assumptions | Computed: workspace base merged with overrides |
| created_at | datetime | |
| updated_at | datetime | |
| last_run_at | datetime \| None | |
| warnings | list[IrsLimitWarning] | IRS limit validation warnings (may be empty) |

### IrsLimitWarning

Structured warning object returned from IRS limit validation.

| Field | Type | Notes |
|-------|------|-------|
| type | str (literal) | `"employer_additions_limit"` \| `"employee_deferral_limit"` |
| message | str | Human-readable warning description |
| persona_id | UUID \| None | Null for employer-side; persona ID for employee-side |
| persona_name | str \| None | Null for employer-side; persona name for employee-side |
| limit_name | str | Name of the IRS limit exceeded (e.g., "annual_additions_limit", "deferral_limit", "catchup_limit") |
| limit_value | float | The applicable IRS limit in dollars |
| computed_value | float | The computed contribution/deferral in dollars |
| year | int \| None | Null for employer-side; projected year index for employee-side |

### ScenarioNotFoundError (exception)

Follows existing `WorkspaceNotFoundError` pattern.

| Field | Type | Notes |
|-------|------|-------|
| scenario_id | str | The missing scenario ID |
| workspace_id | str | The parent workspace ID |

---

## Entity Relationships

```
Workspace (existing)
├── base_config: Assumptions
├── personas: list[Persona]
├── monte_carlo_config: MonteCarloConfig
└── scenarios/ (new — filesystem relationship, not model field)
    └── Scenario
        ├── plan_design: PlanDesign
        │   ├── match_tiers: list[MatchTier]
        │   ├── match_vesting: VestingSchedule
        │   ├── core_age_service_tiers: list[CoreContributionTier]
        │   └── core_vesting: VestingSchedule
        └── overrides: AssumptionsOverride (optional)
```

**Key relationship**: Scenarios are stored in the workspace's filesystem directory but are NOT embedded in the Workspace model. The workspace_id field on Scenario provides the logical link. This keeps the Workspace JSON file small and allows scenarios to be loaded independently.

---

## Storage Layout

```
~/.retiremodel/workspaces/
└── {workspace_id}/
    ├── workspace.json          # Existing: Workspace model
    └── scenarios/              # New: scenario directory
        ├── {scenario_id_1}.json
        ├── {scenario_id_2}.json
        └── ...
```
