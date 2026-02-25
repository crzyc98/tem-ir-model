# Quickstart: Persona Gallery

**Branch**: `010-persona-gallery` | **Date**: 2026-02-24

## Prerequisites

- Python 3.12 with FastAPI backend running on port 8000
- Node.js with Vite dev server on port 5173
- An existing workspace (created via the Dashboard)

## Development Setup

```bash
# Terminal 1: Backend
cd api
uvicorn api.main:app --reload --port 8000

# Terminal 2: Frontend
cd app
npm run dev
```

## Files to Modify

### Backend (Python)

| File | Change |
|------|--------|
| `api/models/persona.py` | Add `hidden: bool = False` field; relax `salary` from `gt=0` to `ge=0` |
| `api/models/workspace.py` | Add `max_length=12` validator on `personas` field |
| `api/routers/workspaces.py` | Add `personas` field to `WorkspaceUpdate` schema; add `reset_personas` endpoint |
| `api/services/workspace_service.py` | Handle `personas` in `update_workspace`; add `reset_personas` method |

### Frontend (TypeScript/React)

| File | Change |
|------|--------|
| `app/src/types/persona.ts` | Add `hidden: boolean` to Persona interface |
| `app/src/services/api.ts` | Add `updateWorkspacePersonas()` and `resetWorkspacePersonas()` functions |
| `app/src/pages/PersonaModelingPage.tsx` | Replace stub with full persona gallery page |

### Frontend — New Files

| File | Purpose |
|------|---------|
| `app/src/components/PersonaGallery.tsx` | Grid container for persona cards |
| `app/src/components/PersonaCard.tsx` | Display/edit card for a single persona |
| `app/src/components/AllocationEditor.tsx` | Asset allocation mode toggle + inputs |
| `app/src/components/AllocationDonutChart.tsx` | Recharts donut chart for custom allocation |

## Verification

1. Navigate to `/personas` with an active workspace selected
2. Verify 8 default persona cards are displayed
3. Click a card — inline editor opens
4. Modify salary, save — card updates and change persists after reload
5. Add a persona — new card appears in edit mode
6. Hide a persona — card dims, persona excluded from simulations
7. Delete a persona — confirmation dialog, card removed
8. Reset to defaults — confirmation dialog, 8 original personas restored
9. Configure custom allocation — donut chart updates live
10. Toggle Social Security — icon/badge reflects state

## Key Patterns to Follow

- **Form validation**: See `PlanDesignForm.tsx` for real-time validation and error display patterns
- **Confirmation dialogs**: Reuse `ConfirmDialog.tsx` for delete and reset actions
- **API calls**: Follow existing patterns in `api.ts` (fetch + error handling)
- **Layout context**: Use `useOutletContext<LayoutContext>()` to access active workspace
- **Styling**: Tailwind CSS classes consistent with existing components (rounded-xl, border-gray-100, shadow-sm)
