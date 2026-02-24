# API Client Contract: Frontend Shell

**Feature**: 007-frontend-shell | **Date**: 2026-02-24

## Overview

The frontend shell consumes the existing backend REST API via a thin service layer. All requests are proxied through Vite's dev server (`/api` → `http://localhost:8000`).

## Endpoints Consumed

### List Workspaces

```
GET /api/v1/workspaces
```

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Q2 2025 Analysis",
    "client_name": "Acme Corp",
    "created_at": "2026-02-20T10:30:00Z",
    "updated_at": "2026-02-24T15:45:00Z"
  }
]
```

**Response** (200 OK, empty):
```json
[]
```

**Error responses**: 500 (server error), network error (API unreachable)

**Frontend behavior by response**:

| Response | Frontend State | UI |
|----------|---------------|-----|
| 200, non-empty array | LOADED | Workspace selector shows first item as active |
| 200, empty array | EMPTY | "Create your first workspace" prompt |
| Network error / 5xx | ERROR | Error message with retry button |
| Loading (in-flight) | LOADING | Spinner in workspace selector area |

### Health Check

```
GET /api/v1/health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "version": "0.1.0"
}
```

**Used by**: DashboardPage (existing, carried forward from current implementation)

## API Client Interface

```typescript
// services/api.ts

/** Fetch all workspaces from the backend. */
async function listWorkspaces(): Promise<WorkspaceSummary[]>

/** Check backend health status. */
async function getHealthStatus(): Promise<HealthStatus>
```

### Error Handling

- Network errors throw with a descriptive message
- Non-2xx responses throw with the HTTP status and response body
- Callers handle errors in their own `try/catch` or `.catch()` blocks
- No global error interceptor (unnecessary for 2 endpoints)

## Contract Guarantees

1. All API calls go through the `/api` prefix (Vite proxy handles routing)
2. No authentication headers are attached (no auth in shell phase)
3. Request content type is `application/json` where applicable
4. Response parsing assumes JSON content type
5. UUID fields are treated as opaque strings on the frontend (no UUID validation)
