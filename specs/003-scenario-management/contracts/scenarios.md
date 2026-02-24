# API Contract: Scenario Management

**Base path**: `/api/v1/workspaces/{workspace_id}/scenarios`

All endpoints require `workspace_id` (UUID) in the path. If the workspace does not exist, all endpoints return `404` with `{"detail": "Workspace {workspace_id} not found"}`.

---

## POST `/api/v1/workspaces/{workspace_id}/scenarios`

**Create a scenario.**

### Request Body

```json
{
  "name": "Base Plan",
  "description": "Conservative 3-tier match design",
  "plan_design": {
    "name": "Safe Harbor 401k",
    "match_tiers": [
      {"match_rate": 1.0, "on_first_pct": 0.03},
      {"match_rate": 0.5, "on_first_pct": 0.02}
    ],
    "match_vesting": {"type": "cliff", "years": 3},
    "match_eligibility_months": 0,
    "core_contribution_pct": 0.03,
    "core_age_service_tiers": null,
    "core_vesting": {"type": "graded", "schedule": {"1": 0.2, "2": 0.4, "3": 0.6, "4": 0.8, "5": 1.0}},
    "core_eligibility_months": 12,
    "auto_enroll_enabled": true,
    "auto_enroll_rate": 0.06,
    "auto_escalation_enabled": true,
    "auto_escalation_rate": 0.01,
    "auto_escalation_cap": 0.10
  },
  "overrides": {
    "inflation_rate": 0.03
  }
}
```

**Required fields**: `name`, `plan_design` (with `plan_design.name` required).

### Response `201 Created`

```json
{
  "id": "a1b2c3d4-...",
  "workspace_id": "e5f6g7h8-...",
  "name": "Base Plan",
  "description": "Conservative 3-tier match design",
  "plan_design": { "..." },
  "overrides": { "inflation_rate": 0.03 },
  "effective_assumptions": {
    "inflation_rate": 0.03,
    "wage_growth_rate": 0.03,
    "equity": {"expected_return": 0.075, "standard_deviation": 0.17},
    "...": "...(full resolved assumptions)"
  },
  "created_at": "2026-02-24T12:00:00Z",
  "updated_at": "2026-02-24T12:00:00Z",
  "last_run_at": null,
  "warnings": [
    {
      "type": "employer_additions_limit",
      "message": "Maximum employer contribution ($24,150) at comp limit exceeds annual additions limit when combined with max employee deferral",
      "persona_id": null,
      "persona_name": null,
      "limit_name": "annual_additions_limit",
      "limit_value": 70000,
      "computed_value": 24150,
      "year": null
    }
  ]
}
```

### Error Responses

- `404`: Workspace not found
- `422`: Validation error (invalid plan design, empty name, etc.)

---

## GET `/api/v1/workspaces/{workspace_id}/scenarios`

**List all scenarios in a workspace.**

### Response `200 OK`

```json
[
  {
    "id": "a1b2c3d4-...",
    "name": "Base Plan",
    "description": "Conservative 3-tier match design",
    "created_at": "2026-02-24T12:00:00Z",
    "updated_at": "2026-02-24T14:30:00Z"
  },
  {
    "id": "b2c3d4e5-...",
    "name": "Aggressive Match",
    "description": null,
    "created_at": "2026-02-24T13:00:00Z",
    "updated_at": "2026-02-24T13:00:00Z"
  }
]
```

**Sort order**: Last modified date, newest first.

### Error Responses

- `404`: Workspace not found

---

## GET `/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}`

**Retrieve a single scenario with resolved assumptions.**

### Response `200 OK`

Same shape as the create response (ScenarioResponse with `effective_assumptions` and `warnings`).

### Error Responses

- `404`: Workspace or scenario not found

---

## PATCH `/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}`

**Partially update a scenario.**

### Request Body

Only include fields to update. Omitted fields are unchanged.

```json
{
  "name": "Updated Plan Name",
  "plan_design": {
    "name": "Updated Safe Harbor 401k",
    "match_tiers": [
      {"match_rate": 1.0, "on_first_pct": 0.04},
      {"match_rate": 0.5, "on_first_pct": 0.02},
      {"match_rate": 0.25, "on_first_pct": 0.01}
    ],
    "match_vesting": {"type": "immediate"},
    "auto_enroll_rate": 0.08,
    "auto_escalation_cap": 0.15
  }
}
```

**Note**: `plan_design` and `overrides`, when provided, are full replacements (not deep-merged). This avoids ambiguity about which nested fields to clear vs. inherit.

### Response `200 OK`

Same shape as ScenarioResponse. The `updated_at` timestamp is refreshed. IRS warnings are recomputed.

### Error Responses

- `404`: Workspace or scenario not found
- `422`: Validation error

---

## DELETE `/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}`

**Delete a scenario.**

### Response `204 No Content`

Empty body.

### Error Responses

- `404`: Workspace or scenario not found

---

## POST `/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/duplicate`

**Duplicate a scenario.**

Creates a new scenario with a copy of the source's plan design and overrides. The new scenario gets:
- A new UUID
- Name derived as `"{original_name} (Copy)"`, incrementing with `"(Copy 2)"`, etc.
- New `created_at` and `updated_at` timestamps
- `last_run_at` reset to null

### Request Body

None (empty body).

### Response `201 Created`

Same shape as ScenarioResponse. Returns the newly created duplicate.

### Error Responses

- `404`: Workspace or source scenario not found
