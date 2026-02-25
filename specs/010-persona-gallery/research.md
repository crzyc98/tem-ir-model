# Research: Persona Gallery

**Branch**: `010-persona-gallery` | **Date**: 2026-02-24

## Decision 1: Backend Persona Persistence Strategy

**Decision**: Extend the existing `WorkspaceUpdate` schema with a `personas` field so the frontend can PATCH the full personas list to `PATCH /workspaces/{id}`.

**Rationale**: Personas are already embedded in the Workspace model (`personas: list[Persona]`). The workspace is the unit of persistence (single JSON file). Adding individual persona CRUD endpoints (POST/PATCH/DELETE per persona) would fragment the persistence model and require sub-resource routing. The simpler approach is to let the frontend manage the personas array in memory and send the complete updated list when changes are saved. This matches the existing pattern where `WorkspaceUpdate` partially updates workspace fields.

**Alternatives considered**:
- **Dedicated persona endpoints** (`POST/PATCH/DELETE /workspaces/{id}/personas/{persona_id}`): More RESTful but adds 4+ new endpoints, a new router file, and per-persona persistence logic — all for data that's already embedded in workspace JSON. Rejected for over-engineering.
- **Separate persona storage files**: Would break the current single-file-per-workspace pattern and introduce sync complexity. Rejected.

## Decision 2: Hidden/Active Persona Field

**Decision**: Add `hidden: bool = False` field to the `Persona` Pydantic model. The simulation engine already filters personas — it will additionally skip personas where `hidden=True`.

**Rationale**: The spec requires hiding personas from simulations while retaining their configuration. A simple boolean flag on the existing model is the minimal change. The `hidden` field defaults to `False`, making it backward-compatible with existing workspace JSON files (Pydantic will use the default when deserializing old data).

**Alternatives considered**:
- **Separate active/hidden lists on workspace**: Would require migrating existing data and changing the personas field type. Rejected for unnecessary complexity.
- **Client-side-only hiding** (not persisted): Would not survive page reloads. Rejected — spec requires persistence.

## Decision 3: Frontend Donut Chart Implementation

**Decision**: Use recharts `PieChart` with `innerRadius` prop to create the donut chart. recharts 2.15 is already a project dependency.

**Rationale**: recharts is already installed and used in the project. A `PieChart` with `innerRadius > 0` produces a donut chart natively. No new dependencies needed.

**Alternatives considered**:
- **Custom SVG/Canvas chart**: More work, no benefit over recharts. Rejected.
- **chart.js or d3**: Would add a new dependency when recharts is already available. Rejected.

## Decision 4: Frontend Component Architecture

**Decision**: Build three new components — `PersonaGallery` (grid container), `PersonaCard` (display/edit modes), and `AllocationEditor` (target-date selector + custom split with donut chart). The `PersonaModelingPage` orchestrates state and API calls.

**Rationale**: This mirrors the existing pattern where pages manage data fetching and state while components handle rendering. `PlanDesignForm.tsx` (625 lines) serves as a reference for form patterns including validation, conditional fields, and real-time feedback. Separating `AllocationEditor` keeps `PersonaCard` focused on demographics while encapsulating the allocation mode toggle and donut chart.

**Alternatives considered**:
- **Single monolithic PersonaCard**: Would become too large with allocation logic + donut chart. Rejected.
- **Modal-based editing** instead of inline: Spec explicitly requires inline editing within the card. Rejected.

## Decision 5: Save Behavior

**Decision**: Explicit save per card. When the user clicks "Save" on an inline editor, the frontend updates the local personas array and sends a PATCH to the workspace endpoint with the full updated personas list.

**Rationale**: Auto-save on blur creates UX ambiguity (did my change save?) and generates excessive API calls. An explicit save button per card is consistent with the PlanDesignForm pattern and gives users clear control.

**Alternatives considered**:
- **Auto-save on field blur**: Too aggressive; partially-edited state could be persisted. Rejected.
- **Global "Save All" button**: Would require tracking dirty state across all cards. Rejected for added complexity.

## Decision 6: Maximum Persona Limit Enforcement

**Decision**: Enforce the 12-persona maximum on both frontend and backend. Frontend disables the "Add Persona" button when count reaches 12. Backend validates `len(personas) <= 12` in the workspace update path.

**Rationale**: Defense in depth — frontend provides immediate UX feedback, backend ensures data integrity regardless of client.

**Alternatives considered**:
- **Frontend-only enforcement**: Bypassed if API is called directly. Rejected.
- **Backend-only enforcement**: Poor UX (user sees error only after attempting to save). Rejected.
