# Data Model: Workspace Management

**Feature**: 002-workspace-management
**Date**: 2026-02-24

## Existing Models (from feature 001 — no changes)

### Workspace

Already defined in `api/models/workspace.py`. Used as-is.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | UUID | auto-generated | unique |
| name | str | required | - |
| client_name | str | required | non-empty |
| created_at | datetime | UTC now | - |
| updated_at | datetime | UTC now | - |
| base_config | Assumptions | default instance | - |
| personas | list[Persona] | empty list | - |
| monte_carlo_config | MonteCarloConfig | default instance | - |

### Scenario

Already defined in `api/models/scenario.py`. Used as-is for deep-merge resolution.

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| id | UUID | auto-generated | unique |
| workspace_id | UUID | required | - |
| name | str | required | - |
| description | str or None | None | - |
| plan_design | PlanDesign | required | - |
| overrides | Assumptions or None | None | - |
| created_at | datetime | UTC now | - |
| updated_at | datetime | UTC now | - |
| last_run_at | datetime or None | None | - |

### Assumptions

Already defined in `api/models/assumptions.py`. Used as-is for base config and merge target.

| Field | Type | Default |
|-------|------|---------|
| inflation_rate | float | 0.025 |
| wage_growth_rate | float | 0.03 |
| equity | AssetClassReturn | 7.5% / 17.0% |
| intl_equity | AssetClassReturn | 7.0% / 19.0% |
| fixed_income | AssetClassReturn | 4.0% / 5.5% |
| cash | AssetClassReturn | 3.0% / 1.0% |
| comp_limit | float | 345,000 |
| deferral_limit | float | 23,500 |
| additions_limit | float | 70,000 |
| catchup_limit | float | 7,500 |
| super_catchup_limit | float | 11,250 |

### AssetClassReturn

Already defined in `api/models/asset_class_return.py`.

| Field | Type | Constraints |
|-------|------|-------------|
| expected_return | float | - |
| standard_deviation | float | >= 0.0 |

## New Models

### AssumptionsOverride

New model for partial assumption overrides. All fields optional (`None` = inherit from base).

**Location**: `api/models/assumptions_override.py`

| Field | Type | Default | Semantics |
|-------|------|---------|-----------|
| inflation_rate | float or None | None | Override workspace base if set |
| wage_growth_rate | float or None | None | Override workspace base if set |
| equity | AssetClassReturnOverride or None | None | Override workspace base if set |
| intl_equity | AssetClassReturnOverride or None | None | Override workspace base if set |
| fixed_income | AssetClassReturnOverride or None | None | Override workspace base if set |
| cash | AssetClassReturnOverride or None | None | Override workspace base if set |
| comp_limit | float or None | None | Override workspace base if set |
| deferral_limit | float or None | None | Override workspace base if set |
| additions_limit | float or None | None | Override workspace base if set |
| catchup_limit | float or None | None | Override workspace base if set |
| super_catchup_limit | float or None | None | Override workspace base if set |

### AssetClassReturnOverride

New model for partial asset class return overrides.

**Location**: `api/models/assumptions_override.py` (same file)

| Field | Type | Default | Semantics |
|-------|------|---------|-----------|
| expected_return | float or None | None | Override if set |
| standard_deviation | float or None | None | Override if set; >= 0.0 when set |

### WorkspaceCreate

Request model for creating a workspace.

**Location**: `api/routers/workspaces.py` (inline with router, or `api/schemas/workspace.py`)

| Field | Type | Default | Constraints |
|-------|------|---------|-------------|
| client_name | str | required | non-empty, stripped whitespace |
| name | str or None | None | If not provided, defaults to client_name |

### WorkspaceUpdate

Request model for partial workspace updates.

**Location**: same as WorkspaceCreate

| Field | Type | Default | Semantics |
|-------|------|---------|-----------|
| name | str or None | None | Update if set |
| client_name | str or None | None | Update if set; non-empty when set |
| base_config | AssumptionsOverride or None | None | Deep-merge with existing base_config if set |

### WorkspaceSummary

Response model for list endpoint (lightweight, no full config).

**Location**: same as WorkspaceCreate

| Field | Type | Source |
|-------|------|--------|
| id | UUID | Workspace.id |
| name | str | Workspace.name |
| client_name | str | Workspace.client_name |
| created_at | datetime | Workspace.created_at |
| updated_at | datetime | Workspace.updated_at |

## Relationships

```
Workspace 1 ──── * Scenario
    │                  │
    │ base_config      │ overrides (AssumptionsOverride)
    ▼                  ▼
Assumptions    AssumptionsOverride
                       │
                       │ deep-merge with base_config
                       ▼
               Assumptions (resolved)
```

## Filesystem Layout

```
{base_path}/
└── workspaces/
    ├── {uuid-1}/
    │   └── workspace.json     # Serialized Workspace model
    ├── {uuid-2}/
    │   └── workspace.json
    └── {uuid-3}/
        ├── workspace.json
        └── scenarios/         # Future: scenario storage (out of scope)
            └── {scenario-uuid}.json
```

## State Transitions

Workspace lifecycle is simple CRUD — no complex state machine:

```
(not exists) ──create──▶ Active ──delete──▶ (not exists)
                            │
                         update
                            │
                            ▼
                         Active (updated_at refreshed)
```
