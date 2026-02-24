# API Contract: Workspace Management

**Base URL**: `/api/v1/workspaces`
**Content-Type**: `application/json`

---

## POST /api/v1/workspaces

Create a new workspace.

**Request Body**:
```json
{
  "client_name": "Acme Corp",
  "name": "Acme 2026 Plan Review"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| client_name | string | yes | Non-empty after trimming whitespace |
| name | string | no | Defaults to client_name if omitted |

**Response**: `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme 2026 Plan Review",
  "client_name": "Acme Corp",
  "created_at": "2026-02-24T14:30:00Z",
  "updated_at": "2026-02-24T14:30:00Z",
  "base_config": {
    "inflation_rate": 0.025,
    "wage_growth_rate": 0.03,
    "equity": { "expected_return": 0.075, "standard_deviation": 0.17 },
    "intl_equity": { "expected_return": 0.07, "standard_deviation": 0.19 },
    "fixed_income": { "expected_return": 0.04, "standard_deviation": 0.055 },
    "cash": { "expected_return": 0.03, "standard_deviation": 0.01 },
    "comp_limit": 345000,
    "deferral_limit": 23500,
    "additions_limit": 70000,
    "catchup_limit": 7500,
    "super_catchup_limit": 11250
  },
  "personas": [
    {
      "id": "...",
      "name": "Jordan",
      "label": "Early Career Entry-Level",
      "age": 25,
      "tenure_years": 1,
      "salary": 40000,
      "deferral_rate": 0.03,
      "current_balance": 2000,
      "allocation": { "type": "target_date", "target_date_vintage": 2065 },
      "include_social_security": true
    }
  ],
  "monte_carlo_config": {
    "num_simulations": 1000,
    "seed": null,
    "retirement_age": 67,
    "planning_age": 93
  }
}
```

**Errors**:

| Status | Condition | Body |
|--------|-----------|------|
| 422 | client_name is empty or missing | `{"detail": [{"msg": "...", "type": "..."}]}` |

---

## GET /api/v1/workspaces

List all workspaces (summary view).

**Response**: `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme 2026 Plan Review",
    "client_name": "Acme Corp",
    "created_at": "2026-02-24T14:30:00Z",
    "updated_at": "2026-02-24T14:30:00Z"
  }
]
```

Returns empty array `[]` when no workspaces exist.

---

## GET /api/v1/workspaces/{workspace_id}

Retrieve a workspace by ID.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| workspace_id | UUID | Workspace identifier |

**Response**: `200 OK`

Full workspace object (same schema as POST response).

**Errors**:

| Status | Condition | Body |
|--------|-----------|------|
| 404 | Workspace ID not found | `{"detail": "Workspace {workspace_id} not found"}` |
| 422 | Invalid UUID format | `{"detail": [{"msg": "...", "type": "..."}]}` |

---

## PATCH /api/v1/workspaces/{workspace_id}

Update a workspace (partial update).

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| workspace_id | UUID | Workspace identifier |

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "client_name": "Acme Corporation",
  "base_config": {
    "inflation_rate": 0.03,
    "equity": {
      "expected_return": 0.065
    }
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | no | Updated workspace name |
| client_name | string | no | Non-empty when provided |
| base_config | object | no | Partial assumptions override; deep-merged with existing |

**Merge behavior for `base_config`**:
- Only provided fields are updated
- Nested objects (e.g., `equity`) are merged recursively — providing `equity.expected_return` without `equity.standard_deviation` preserves the existing `standard_deviation`
- Omitted fields retain their current values

**Response**: `200 OK`

Full updated workspace object. `updated_at` is refreshed.

**Errors**:

| Status | Condition | Body |
|--------|-----------|------|
| 404 | Workspace ID not found | `{"detail": "Workspace {workspace_id} not found"}` |
| 422 | Invalid data (e.g., empty client_name) | `{"detail": [{"msg": "...", "type": "..."}]}` |

---

## DELETE /api/v1/workspaces/{workspace_id}

Delete a workspace and all its contents.

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| workspace_id | UUID | Workspace identifier |

**Response**: `204 No Content`

No response body.

**Errors**:

| Status | Condition | Body |
|--------|-----------|------|
| 404 | Workspace ID not found | `{"detail": "Workspace {workspace_id} not found"}` |
| 422 | Invalid UUID format | `{"detail": [{"msg": "...", "type": "..."}]}` |

---

## Configuration Resolution (Internal)

Not an HTTP endpoint. Used internally by future scenario endpoints.

**Function**: `resolve_config(base: Assumptions, overrides: AssumptionsOverride | None) -> Assumptions`

**Behavior**:
- If `overrides` is `None`: return `base` unchanged
- For each field in overrides: if not `None`, use override value; otherwise use base value
- For nested `AssetClassReturn` fields: apply same logic recursively using `AssetClassReturnOverride`
- Result is a fully-populated, validated `Assumptions` instance
