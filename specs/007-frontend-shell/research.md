# Research: React Frontend Shell

**Feature**: 007-frontend-shell | **Date**: 2026-02-24

## R1: Existing Frontend Scaffold Assessment

**Decision**: Build on the existing `app/` scaffold rather than starting from scratch.

**Rationale**: The project already has a fully functional Vite + React 19 + TypeScript + Tailwind CSS setup in `app/`. It includes:
- Working sidebar with 5 nav items (Dashboard, Persona Modeling, Plan Comparison, Scenarios, Settings)
- Client-side routing via react-router-dom 7.1
- Tailwind CSS configured with brand color palette (`brand-50` through `brand-900`, where `brand-500` = `#00853F`)
- Roboto font loaded from Google Fonts in `index.html`
- Lucide React icons already in use
- Vite proxy for `/api` → `localhost:8000`
- A basic health-check Dashboard page
- Placeholder pages with minimal "Coming Soon" text

The existing scaffold handles ~60% of the spec requirements. The remaining work is:
1. Add workspace selector dropdown (FR-006 through FR-008, FR-019 through FR-021)
2. Add collapsible nav groups (FR-004)
3. Enrich placeholder pages with descriptions (FR-010)
4. Add 404 Not Found page (FR-012)
5. Extract components into organized file structure
6. Create an API service layer for workspace endpoints

**Alternatives considered**:
- Starting fresh with a CDN-only approach (Tailwind CDN, no build step) — rejected because the existing Vite + PostCSS build is already configured and more production-ready.
- Using a different router (TanStack Router) — rejected because react-router-dom is already installed and working.

## R2: Workspace API Integration

**Decision**: Create a thin `api.ts` service module that wraps `fetch()` calls to the existing backend workspace endpoints.

**Rationale**: The backend already provides all needed endpoints:
- `GET /api/v1/workspaces` → returns `WorkspaceSummary[]` with `{id, name, client_name, created_at, updated_at}`
- The Vite proxy already handles routing `/api` requests to `localhost:8000`
- No authentication required (per spec assumptions)

The workspace selector needs to: fetch workspaces on load, display them in a dropdown, and track the active selection in React state.

**Alternatives considered**:
- Using a state management library (Zustand, Redux) — rejected as overkill for a single global selection; React Context or lifting state to the Layout component is sufficient.
- Using React Query / TanStack Query — rejected to avoid adding a new dependency for a single API call; plain `fetch` + `useEffect` is adequate.

## R3: Collapsible Navigation Groups

**Decision**: Implement collapsible nav groups using local React state with a `useState` boolean for each group's expanded/collapsed state.

**Rationale**: The spec requires collapsible dropdowns in the sidebar (FR-004). Looking at the sister app (PlanAlign `Layout.tsx`), it uses a flat nav structure without collapsible groups. However, the spec explicitly requests them. A simple approach: define nav items as either direct links or group headers with children, toggle visibility via `useState`.

For the current 5 pages, a reasonable grouping:
- **Main**: Dashboard (top-level, always visible)
- **Modeling**: Persona Modeling, Plan Comparison (grouped as "Modeling")
- **Analysis**: Scenarios (top-level, always visible)
- **System**: Settings (top-level, always visible)

**Alternatives considered**:
- No groups at all (flat list as in PlanAlign) — rejected because spec explicitly requires collapsible dropdowns.
- Using a UI component library (Headless UI, Radix) — rejected to avoid new dependencies; the interaction is simple enough to implement directly.

## R4: Component Organization Pattern

**Decision**: Organize into `components/`, `pages/`, `services/`, and `types/` directories under `src/`.

**Rationale**: The current `App.tsx` contains everything (layout, pages, routing) in a single 207-line file. As we add the workspace selector, collapsible nav, and enriched pages, this becomes unwieldy. The sister app (PlanAlign) demonstrates this pattern with separate files for Layout, Dashboard, ScenariosPage, WorkspaceManager, etc.

Structure:
- `components/` — reusable shell components (Layout, Sidebar, WorkspaceSelector)
- `pages/` — route-level page components (one per page)
- `services/` — API client functions
- `types/` — shared TypeScript interfaces

**Alternatives considered**:
- Keeping everything in `App.tsx` — rejected because the file would grow to 400+ lines and become hard to maintain.
- Feature-based organization (e.g., `features/workspace/`, `features/dashboard/`) — rejected as premature for a shell with placeholder pages.

## R5: Active Workspace State Management

**Decision**: Store active workspace in Layout component state, pass via React Router's `Outlet` context (matching the PlanAlign pattern).

**Rationale**: The PlanAlign sister app uses `useOutletContext` to pass workspace data from the Layout to child pages. This is a clean pattern that:
- Avoids prop drilling through multiple levels
- Doesn't require a Context Provider or state management library
- Is native to react-router-dom (already installed)
- Makes each page's workspace dependency explicit via `useOutletContext<T>()`

**Alternatives considered**:
- React Context API — would work but adds boilerplate; `useOutletContext` is simpler for this use case.
- URL-based workspace selection (workspace ID in URL path) — rejected for initial shell; can be added later if needed.
