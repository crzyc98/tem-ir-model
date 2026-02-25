# Research: Workspace Management UI

**Branch**: `008-workspace-management-ui` | **Date**: 2026-02-24

## R1: Scenario Count on Dashboard Cards

**Decision**: Fetch scenario count per workspace by calling `GET /api/v1/workspaces/{id}/scenarios` for each workspace on the dashboard, extracting the array length. Requests are dispatched in parallel using `Promise.all`.

**Rationale**: The `GET /api/v1/workspaces` list endpoint returns `WorkspaceSummary` which does not include a scenario count field. The backend does not expose a count-only endpoint. Since workspaces are expected to be few (< 20 in typical use), parallel fetches are acceptable. The scenario list endpoint returns `ScenarioSummary[]` which is lightweight (no plan design data).

**Alternatives considered**:
- Add a `scenario_count` field to the backend `WorkspaceSummary` response — rejected because this feature is frontend-only; backend changes are out of scope.
- Fetch full scenario data for each workspace — rejected because `ScenarioResponse` includes heavy `PlanDesign` and `effective_assumptions` objects; `ScenarioSummary` is sufficient for counting.

## R2: Modal vs Page for Workspace Creation

**Decision**: Use a custom modal component built with Tailwind utilities and native HTML `<dialog>` or a portal-based div overlay. No external modal library needed.

**Rationale**: The workspace creation form is lightweight (client name required, optional assumptions accordion). A modal keeps the user in context on the dashboard. The existing codebase uses no component library and only Tailwind, so a hand-rolled modal is consistent. The `@tailwindcss/forms` plugin handles input styling.

**Alternatives considered**:
- Headless UI / Radix UI modal — rejected to avoid adding new dependencies per project constraints.
- Dedicated page with back navigation — rejected because the form is too simple to warrant a full page; a modal is faster for the user.

## R3: Plan Design Form Architecture

**Decision**: Build a single `PlanDesignForm` component that handles all plan design fields (match tiers, vesting, auto-enrollment, core contributions) and is reused on both the ScenarioCreatePage and ScenarioEditPage. The form uses controlled React state with local validation before submission.

**Rationale**: The plan design model is complex (nested match tiers, discriminated union vesting schedules, cross-field validation). A single reusable form component ensures consistency between create and edit flows. Controlled state enables real-time validation feedback (e.g., auto-escalation cap >= auto-enroll rate).

**Alternatives considered**:
- React Hook Form or Formik — rejected to avoid new dependencies; the form has moderate complexity manageable with controlled state.
- Separate form components per section (match tiers form, vesting form, etc.) — rejected because cross-field validation requires a single form state owner; splitting would add prop-drilling complexity.

## R4: Unsaved Changes Warning

**Decision**: Use React Router's `useBlocker` hook (available in react-router-dom v7) to intercept navigation when the form has unsaved changes. Track dirty state via a simple boolean flag comparing current form state to the last-saved state.

**Rationale**: `useBlocker` is the standard React Router mechanism for blocking navigation and showing a confirmation prompt. It handles both in-app navigation (link clicks) and browser-level navigation (back button, tab close). No additional dependencies needed.

**Alternatives considered**:
- `window.onbeforeunload` only — rejected because it only catches browser-level navigation, not in-app React Router transitions.
- Custom navigation guard via context — rejected because `useBlocker` already provides this functionality natively.

## R5: Workspace Settings Save Granularity

**Decision**: The settings page uses a single save action that submits both base assumptions and persona edits together via `PATCH /api/v1/workspaces/{id}`. The request body includes the full `base_config` (as `AssumptionsOverride`) and the full `personas` array.

**Rationale**: The backend `WorkspaceUpdate` schema accepts `base_config: AssumptionsOverride | None` which deep-merges into existing config. Personas are part of the `Workspace` model and are updated via the same PATCH. A single save action is simpler for the user and avoids partial-save confusion.

**Alternatives considered**:
- Separate save buttons for assumptions vs personas — rejected because it introduces partial-state risk and confuses the "unsaved changes" warning.
- Auto-save on field blur — rejected because it could fire too many API calls and removes the user's ability to review before committing.

## R6: Error Handling Pattern

**Decision**: API functions in `api.ts` throw typed errors with HTTP status codes. Components use try/catch with local error state displayed as inline alert banners. Loading states use a disabled/spinner pattern on action buttons.

**Rationale**: Matches the existing pattern in `api.ts` where non-ok responses throw `Error` with the status code. Components already handle errors as string state (see `Layout.tsx`, `DashboardPage.tsx`). Consistent with the existing approach — no new error boundary or toast library needed.

**Alternatives considered**:
- Global error boundary with toast notifications — rejected to avoid new dependencies and because most errors are page-scoped (a failed workspace load doesn't affect the sidebar).
- Error boundary per route — rejected as over-engineering for the current scope; local error state is sufficient.

## R7: Dashboard Scenario Count Loading Strategy

**Decision**: Load workspace list first, render cards immediately with a loading indicator for scenario counts, then resolve counts asynchronously. This avoids blocking the entire dashboard while counts load.

**Rationale**: The dashboard should feel responsive (SC-001: within 5 seconds). Showing workspace cards immediately with a small spinner/skeleton for the count, then filling in counts as they resolve, provides progressive loading. If a count fetch fails, display "—" as a graceful fallback.

**Alternatives considered**:
- Wait for all counts before rendering — rejected because it blocks the entire dashboard on N sequential/parallel API calls.
- Show cards without counts and add counts on a background refresh — rejected because users need scenario counts to be visible promptly per FR-001.
