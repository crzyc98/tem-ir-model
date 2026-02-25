# API Client Contract: Workspace Management UI

**Branch**: `008-workspace-management-ui` | **Date**: 2026-02-24

## Overview

All functions live in `app/src/services/api.ts`. They use the existing `fetch()`-based pattern with `const API_BASE = '/api/v1'`. Non-ok responses throw `Error` with status code in message.

## Existing Functions (no changes)

### `listWorkspaces()`

```typescript
async function listWorkspaces(): Promise<WorkspaceSummary[]>
```

- **Method**: `GET /api/v1/workspaces`
- **Response**: `WorkspaceSummary[]`
- **Errors**: Throws `Error` on non-200

### `getHealthStatus()`

```typescript
async function getHealthStatus(): Promise<HealthStatus>
```

- **Method**: `GET /api/v1/health`
- **Response**: `HealthStatus`
- **Errors**: Throws `Error` on non-200

## New Functions

### `createWorkspace(data)`

```typescript
async function createWorkspace(data: WorkspaceCreate): Promise<Workspace>
```

- **Method**: `POST /api/v1/workspaces`
- **Request Body**: `{ client_name: string, name?: string }`
- **Response**: Full `Workspace` object (201)
- **Errors**:

| Status | Condition              |
| ------ | ---------------------- |
| 422    | Validation error (empty client_name) |

### `getWorkspace(workspaceId)`

```typescript
async function getWorkspace(workspaceId: string): Promise<Workspace>
```

- **Method**: `GET /api/v1/workspaces/{workspaceId}`
- **Response**: Full `Workspace` object (200)
- **Errors**:

| Status | Condition         |
| ------ | ----------------- |
| 404    | Workspace not found |

### `updateWorkspace(workspaceId, data)`

```typescript
async function updateWorkspace(workspaceId: string, data: WorkspaceUpdate): Promise<Workspace>
```

- **Method**: `PATCH /api/v1/workspaces/{workspaceId}`
- **Request Body**: `{ name?: string, client_name?: string, base_config?: AssumptionsOverride }`
- **Response**: Full `Workspace` object (200)
- **Errors**:

| Status | Condition              |
| ------ | ---------------------- |
| 404    | Workspace not found    |
| 422    | Validation error       |

**Note**: `base_config` accepts `AssumptionsOverride` (partial), which the backend deep-merges into the existing `Assumptions`. Persona updates are sent by including the full `personas` array in the workspace PATCH body.

### `deleteWorkspace(workspaceId)`

```typescript
async function deleteWorkspace(workspaceId: string): Promise<void>
```

- **Method**: `DELETE /api/v1/workspaces/{workspaceId}`
- **Response**: Empty (204)
- **Errors**:

| Status | Condition         |
| ------ | ----------------- |
| 404    | Workspace not found |

### `listScenarios(workspaceId)`

```typescript
async function listScenarios(workspaceId: string): Promise<ScenarioSummary[]>
```

- **Method**: `GET /api/v1/workspaces/{workspaceId}/scenarios`
- **Response**: `ScenarioSummary[]` (200)
- **Errors**:

| Status | Condition         |
| ------ | ----------------- |
| 404    | Workspace not found |

### `getScenario(workspaceId, scenarioId)`

```typescript
async function getScenario(workspaceId: string, scenarioId: string): Promise<ScenarioResponse>
```

- **Method**: `GET /api/v1/workspaces/{workspaceId}/scenarios/{scenarioId}`
- **Response**: `ScenarioResponse` (200) — includes `effective_assumptions` and `warnings`
- **Errors**:

| Status | Condition          |
| ------ | ------------------ |
| 404    | Workspace or scenario not found |

### `createScenario(workspaceId, data)`

```typescript
async function createScenario(workspaceId: string, data: ScenarioCreate): Promise<ScenarioResponse>
```

- **Method**: `POST /api/v1/workspaces/{workspaceId}/scenarios`
- **Request Body**: `{ name: string, description?: string, plan_design: PlanDesign, overrides?: AssumptionsOverride }`
- **Response**: `ScenarioResponse` (201)
- **Errors**:

| Status | Condition              |
| ------ | ---------------------- |
| 404    | Workspace not found    |
| 422    | Validation error (empty name, invalid plan design) |

### `updateScenario(workspaceId, scenarioId, data)`

```typescript
async function updateScenario(workspaceId: string, scenarioId: string, data: ScenarioUpdate): Promise<ScenarioResponse>
```

- **Method**: `PATCH /api/v1/workspaces/{workspaceId}/scenarios/{scenarioId}`
- **Request Body**: `{ name?: string, description?: string, plan_design?: PlanDesign, overrides?: AssumptionsOverride }`
- **Response**: `ScenarioResponse` (200)
- **Errors**:

| Status | Condition              |
| ------ | ---------------------- |
| 404    | Workspace or scenario not found |
| 422    | Validation error       |

### `deleteScenario(workspaceId, scenarioId)`

```typescript
async function deleteScenario(workspaceId: string, scenarioId: string): Promise<void>
```

- **Method**: `DELETE /api/v1/workspaces/{workspaceId}/scenarios/{scenarioId}`
- **Response**: Empty (204)
- **Errors**:

| Status | Condition          |
| ------ | ------------------ |
| 404    | Workspace or scenario not found |

### `duplicateScenario(workspaceId, scenarioId)`

```typescript
async function duplicateScenario(workspaceId: string, scenarioId: string): Promise<ScenarioResponse>
```

- **Method**: `POST /api/v1/workspaces/{workspaceId}/scenarios/{scenarioId}/duplicate`
- **Response**: `ScenarioResponse` (201) — the new copy
- **Errors**:

| Status | Condition          |
| ------ | ------------------ |
| 404    | Workspace or scenario not found |

## UI Behavior Per Response State

| State     | UI Behavior                                                |
| --------- | ---------------------------------------------------------- |
| Loading   | Action buttons disabled; spinner shown on trigger button   |
| Success   | Optimistic list update or re-fetch; success implied by UI update |
| 404       | Inline "not found" message; redirect to dashboard for workspace-level 404s |
| 422       | Inline validation errors mapped to form fields where possible |
| Network   | Inline error banner with "Retry" button                    |

## Persona Update Pattern

Personas are part of the `Workspace` model. To update personas, the frontend sends a `PATCH /api/v1/workspaces/{id}` with the full workspace body including the modified `personas` array. The backend `WorkspaceUpdate` schema is extended beyond `AssumptionsOverride` to accept the full workspace fields including personas.

**Important**: The `WorkspaceUpdate` schema in the router only accepts `name`, `client_name`, and `base_config`. To update personas, the service layer must be extended, OR the frontend sends the full workspace object. Based on the existing backend code, persona updates go through the workspace PATCH — the service layer accepts and persists the full workspace model.
