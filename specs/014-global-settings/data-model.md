# Data Model: Global Settings

**Feature**: 014-global-settings
**Date**: 2026-02-25

---

## New Entities

### GlobalDefaults (application-level config)

Stored at `~/.retiremodel/global_defaults.yaml`. Single record — no ID, no versioning.

| Field | Type | Default | Validation | Notes |
|-------|------|---------|------------|-------|
| `inflation_rate` | float | 0.025 | ge=0.0, le=0.2 | Annual inflation rate |
| `salary_real_growth_rate` | float | 0.015 | ge=0.0, le=0.2 | Real (inflation-adjusted) salary growth; nominal ≈ 4.0% at default inflation |
| `comp_limit` | float | 360,000 | gt=0 | IRC §401(a)(17) annual compensation cap |
| `deferral_limit` | float | 24,500 | gt=0 | §402(g) elective deferral limit |
| `additions_limit` | float | 72,000 | gt=0 | §415(c) annual additions limit |
| `catchup_limit` | float | 8,000 | gt=0 | §402(g) catch-up contribution, age 50+ |
| `super_catchup_limit` | float | 11,250 | gt=0 | SECURE 2.0 super catch-up, age 60–63 |
| `ss_taxable_max` | float | 184,500 | gt=0 | SS wage base (current-year taxable maximum) |
| `target_replacement_ratio_mode` | enum | "lookup_table" | "lookup_table" \| "flat_percentage" | Determines how target replacement ratio is derived |
| `target_replacement_ratio_override` | float \| null | null | ge=0.0, le=1.0 | Required when mode is "flat_percentage" |
| `retirement_age` | int | 67 | ge=55, le=70 | Default retirement age for new workspaces |
| `planning_age` | int | 93 | ge=85, le=100 | Default planning horizon age |
| `ss_claiming_age` | int | 67 | ge=62, le=70 | Applied to each default persona on workspace creation |

**Persistence**: Serialized to YAML via `pyyaml`. Partial YAML files are valid — any missing field defaults to the model-level default. A missing or corrupted file produces `GlobalDefaults()` (all system defaults).

---

## Modified Entities

### Assumptions (existing — additive change)

One new field added:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `ss_taxable_max` | float | 176,100 | NEW. SS wage base. Model-level default is the 2026 value; GlobalDefaults system default is 184,500 per spec. Existing workspace JSON files load cleanly (Pydantic uses field default for missing keys). |

No other fields in `Assumptions` are modified. Existing workspace files remain fully forward-compatible.

---

## Entity Relationships

```
GlobalDefaults (YAML file)
    │
    │  on create_workspace()
    ▼
Workspace
    ├── base_config: Assumptions  ← seeded from GlobalDefaults
    │       ├── inflation_rate
    │       ├── salary_real_growth_rate
    │       ├── comp_limit / deferral_limit / additions_limit
    │       ├── catchup_limit / super_catchup_limit / ss_taxable_max
    │       └── target_replacement_ratio_override (null or float)
    ├── monte_carlo_config: MonteCarloConfig  ← seeded from GlobalDefaults
    │       ├── retirement_age
    │       └── planning_age
    └── personas: list[Persona]  ← ss_claiming_age applied from GlobalDefaults
            └── ss_claiming_age (per persona)
```

**Note**: GlobalDefaults → Workspace is a *seed-only* relationship. After workspace creation, the workspace's fields are independent of GlobalDefaults. Changing GlobalDefaults does not retroactively modify any existing workspace.

---

## Validation Rules

| Rule | Field(s) | Error |
|------|----------|-------|
| Planning age must exceed retirement age | `planning_age`, `retirement_age` | "planning_age must be greater than retirement_age" |
| Flat percentage required when mode is flat | `target_replacement_ratio_mode`, `target_replacement_ratio_override` | "target_replacement_ratio_override is required when mode is flat_percentage" |
| All rate fields must be non-negative | `inflation_rate`, `salary_real_growth_rate` | Field-level validation error |
| All limit fields must be positive | `comp_limit`, `deferral_limit`, etc. | Field-level validation error |

---

## API Request / Response Shapes

### GET /api/v1/global-settings → GlobalSettingsResponse

```json
{
  "inflation_rate": 0.025,
  "salary_real_growth_rate": 0.015,
  "comp_limit": 360000,
  "deferral_limit": 24500,
  "additions_limit": 72000,
  "catchup_limit": 8000,
  "super_catchup_limit": 11250,
  "ss_taxable_max": 184500,
  "target_replacement_ratio_mode": "lookup_table",
  "target_replacement_ratio_override": null,
  "retirement_age": 67,
  "planning_age": 93,
  "ss_claiming_age": 67
}
```

### PUT /api/v1/global-settings request body

Accepts a full `GlobalDefaults` JSON object. All fields are required (PUT semantics — full replacement).

### POST /api/v1/global-settings/restore → GlobalSettingsResponse

No request body. Returns the system defaults after resetting to hardcoded values.

### Validation Error (422)

```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "planning_age"],
      "msg": "planning_age (67) must be greater than retirement_age (67)",
      "input": 67
    }
  ]
}
```
