# API Contract: Workspace Persona Management

**Branch**: `010-persona-gallery` | **Date**: 2026-02-24

## Overview

Persona management is handled through the existing workspace PATCH endpoint. The `personas` field is added to the `WorkspaceUpdate` request schema, allowing the frontend to send the full updated personas list.

No new endpoints are required.

---

## Modified Endpoint: Update Workspace

**`PATCH /api/v1/workspaces/{workspace_id}`**

### Request Body (extended)

```json
{
  "name": "string (optional)",
  "client_name": "string (optional)",
  "base_config": { "...AssumptionsOverride (optional)" },
  "personas": [
    {
      "id": "uuid-string",
      "name": "string",
      "label": "string",
      "age": 25,
      "tenure_years": 1,
      "salary": 40000,
      "deferral_rate": 0.03,
      "current_balance": 2000,
      "allocation": {
        "type": "target_date",
        "target_date_vintage": 2065
      },
      "include_social_security": true,
      "ss_claiming_age": 67,
      "hidden": false
    }
  ]
}
```

### Personas Field Behavior

- **Optional**: When omitted, existing personas are unchanged (existing behavior)
- **Full replacement**: When provided, the entire personas list is replaced
- **Validation rules**:
  - Maximum 12 personas
  - Each persona validated per Persona model constraints (age 18-80, deferral_rate 0-1.0, salary >= 0, current_balance >= 0)
  - Asset allocation validated (custom percentages sum to 1.0 ± 0.01)

### Allocation Variants

**Target-Date Fund:**
```json
{
  "type": "target_date",
  "target_date_vintage": 2055
}
```

**Custom Split:**
```json
{
  "type": "custom",
  "stock_pct": 0.60,
  "bond_pct": 0.30,
  "cash_pct": 0.10
}
```

### Response

Same as existing: returns the full updated `Workspace` object (status 200).

### Error Responses

| Status | Condition                          | Body                                                        |
|--------|------------------------------------|-------------------------------------------------------------|
| 404    | Workspace not found                | `{"detail": "Workspace {id} not found"}`                    |
| 422    | Validation error (Pydantic)        | `{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}` |

### Validation Error Examples

- `personas` list exceeds 12: `"ensure this value has at most 12 items"`
- Persona age out of range: `"Input should be greater than or equal to 18"`
- Custom allocation doesn't sum to 1.0: `"Allocation percentages must sum to 1.0"`
- Deferral rate out of range: `"Input should be less than or equal to 1"`

---

## Existing Endpoint: Get Workspace (unchanged)

**`GET /api/v1/workspaces/{workspace_id}`**

Returns the full workspace including the `personas` array with the new `hidden` field on each persona. Existing clients that don't read `hidden` are unaffected.

### Response Persona Object (extended)

```json
{
  "id": "uuid-string",
  "name": "Jordan",
  "label": "Early Career Entry-Level",
  "age": 25,
  "tenure_years": 1,
  "salary": 40000,
  "deferral_rate": 0.03,
  "current_balance": 2000,
  "allocation": {
    "type": "target_date",
    "target_date_vintage": 2065
  },
  "include_social_security": true,
  "ss_claiming_age": 67,
  "hidden": false
}
```

---

## Frontend API Functions (new)

The frontend `api.ts` service needs these additions:

### `updateWorkspacePersonas`

Sends a PATCH to the workspace endpoint with the personas field.

**Parameters**: `workspaceId: string`, `personas: Persona[]`
**Returns**: `Promise<Workspace>`
**Method**: `PATCH /api/v1/workspaces/{workspaceId}` with body `{ personas: [...] }`

### `resetWorkspacePersonas`

Sends a PATCH with `personas` set to `null` or a sentinel value to trigger server-side reset to defaults.

**Alternative**: The frontend can call `GET /api/v1/workspaces/{id}` after creation of a temporary workspace to get defaults, then PATCH the personas. Simpler alternative: add a dedicated reset endpoint.

**Decision**: Add a `POST /api/v1/workspaces/{workspace_id}/personas/reset` endpoint that replaces the workspace's personas with `default_personas()` and returns the updated workspace.

---

## New Endpoint: Reset Personas to Defaults

**`POST /api/v1/workspaces/{workspace_id}/personas/reset`**

### Request Body

None.

### Response

Returns the full updated `Workspace` object (status 200) with personas restored to the 8 defaults (all `hidden: false`).

### Error Responses

| Status | Condition           | Body                                             |
|--------|---------------------|--------------------------------------------------|
| 404    | Workspace not found | `{"detail": "Workspace {id} not found"}`         |
