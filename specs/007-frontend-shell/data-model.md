# Data Model: React Frontend Shell

**Feature**: 007-frontend-shell | **Date**: 2026-02-24

## TypeScript Interfaces

### WorkspaceSummary

Represents a workspace as returned by the backend `GET /api/v1/workspaces` endpoint.

```typescript
interface WorkspaceSummary {
  id: string          // UUID string from backend
  name: string        // Display name (e.g., "Q2 2025 Analysis")
  client_name: string // Client organization name
  created_at: string  // ISO 8601 datetime
  updated_at: string  // ISO 8601 datetime
}
```

**Source**: Backend `WorkspaceSummary` Pydantic model in `api/routers/workspaces.py:36-43`
**Used by**: WorkspaceSelector component, Layout context

### NavItem

Represents a navigation entry in the sidebar. Supports both direct links and collapsible groups.

```typescript
interface NavItem {
  label: string                  // Display text (e.g., "Dashboard")
  icon: LucideIcon               // Lucide icon component
  to?: string                    // Route path (omit for group headers)
  end?: boolean                  // Exact match for active state
  children?: NavItem[]           // Sub-items for collapsible groups
}
```

**Used by**: Sidebar component
**Validation**: A NavItem must have either `to` (leaf link) or `children` (group header), not both.

### LayoutContext

Shared context passed from Layout to child pages via React Router's Outlet context.

```typescript
interface LayoutContext {
  activeWorkspace: WorkspaceSummary | null
  setActiveWorkspace: (ws: WorkspaceSummary) => void
  workspaces: WorkspaceSummary[]
}
```

**Used by**: All page components via `useOutletContext<LayoutContext>()`

## State Transitions

### Workspace Loading States

```
INITIAL → LOADING → LOADED | ERROR | EMPTY

LOADING: Fetching workspace list from API
LOADED:  Workspaces available, first selected as active
ERROR:   API call failed, retry option shown
EMPTY:   API returned empty list, "create workspace" prompt shown
```

### Navigation Group States

```
COLLAPSED ↔ EXPANDED

Toggle on group header click
Default: EXPANDED (all groups open on initial load)
```

## Entity Relationships

```
Layout (1)
  ├── has active → WorkspaceSummary (0..1)
  ├── has list → WorkspaceSummary (0..N)
  ├── renders → Sidebar (1)
  │     ├── renders → WorkspaceSelector (1)
  │     └── renders → NavItem (5+)
  └── renders → Page (1 of 6)
        ├── DashboardPage
        ├── PersonaModelingPage
        ├── PlanComparisonPage
        ├── ScenariosPage
        ├── SettingsPage
        └── NotFoundPage
```
