# API Contract: Global Settings

**Feature**: 014-global-settings
**Base URL**: `/api/v1`
**Tag**: `global-settings`

---

## Endpoints

### GET /api/v1/global-settings

**Purpose**: Retrieve current global defaults. Returns system defaults if no config file exists.

**Request**: No parameters, no body.

**Response 200 OK**:
```json
{
  "inflation_rate": 0.025,
  "salary_real_growth_rate": 0.015,
  "comp_limit": 360000.0,
  "deferral_limit": 24500.0,
  "additions_limit": 72000.0,
  "catchup_limit": 8000.0,
  "super_catchup_limit": 11250.0,
  "ss_taxable_max": 184500.0,
  "target_replacement_ratio_mode": "lookup_table",
  "target_replacement_ratio_override": null,
  "retirement_age": 67,
  "planning_age": 93,
  "ss_claiming_age": 67
}
```

---

### PUT /api/v1/global-settings

**Purpose**: Save updated global defaults. Returns the saved record.

**Request Body** (`application/json`): Full `GlobalDefaults` object.

```json
{
  "inflation_rate": 0.03,
  "salary_real_growth_rate": 0.015,
  "comp_limit": 360000.0,
  "deferral_limit": 24500.0,
  "additions_limit": 72000.0,
  "catchup_limit": 8000.0,
  "super_catchup_limit": 11250.0,
  "ss_taxable_max": 184500.0,
  "target_replacement_ratio_mode": "flat_percentage",
  "target_replacement_ratio_override": 0.80,
  "retirement_age": 67,
  "planning_age": 93,
  "ss_claiming_age": 67
}
```

**Response 200 OK**: Saved `GlobalDefaults` object (same shape as GET).

**Response 422 Unprocessable Entity**: Validation error.

```json
{
  "detail": [
    {
      "type": "greater_than",
      "loc": ["body", "deferral_limit"],
      "msg": "Input should be greater than 0",
      "input": -100
    }
  ]
}
```

**Business Rules**:
- When `target_replacement_ratio_mode` is `"flat_percentage"`, `target_replacement_ratio_override` must be a float in [0.0, 1.0].
- `planning_age` must be greater than `retirement_age`.
- Negative or zero values for any limit field are rejected.

---

### POST /api/v1/global-settings/restore

**Purpose**: Reset all global defaults to hardcoded system defaults. Deletes the config file.

**Request**: No parameters, no body.

**Response 200 OK**: The system defaults object.

```json
{
  "inflation_rate": 0.025,
  "salary_real_growth_rate": 0.015,
  "comp_limit": 360000.0,
  "deferral_limit": 24500.0,
  "additions_limit": 72000.0,
  "catchup_limit": 8000.0,
  "super_catchup_limit": 11250.0,
  "ss_taxable_max": 184500.0,
  "target_replacement_ratio_mode": "lookup_table",
  "target_replacement_ratio_override": null,
  "retirement_age": 67,
  "planning_age": 93,
  "ss_claiming_age": 67
}
```

---

## Error Handling

| Status | When |
|--------|------|
| 422 | Any field fails Pydantic validation |
| 200 | All other cases (GET always returns 200 even on fallback to defaults) |

No 404 errors — the global settings resource always "exists" (it falls back to defaults).

---

## Existing Endpoint Change

### POST /api/v1/workspaces (modified)

`create_workspace()` behavior changes: the backend now reads GlobalDefaults from `app.state.global_defaults_store` when creating a workspace. No change to the request body or response schema. This is a transparent behavior change — callers do not need to pass global defaults explicitly.

**Before**: New workspace always initialized with `Assumptions()` model defaults.
**After**: New workspace initialized with `GlobalDefaults` values (loaded from YAML; falls back to hardcoded defaults).
