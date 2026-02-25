# Implementation Plan: Persona Gallery

**Branch**: `010-persona-gallery` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-persona-gallery/spec.md`

## Summary

Build a persona gallery UI that displays workspace personas as a grid of interactive cards. Each card shows demographics, compensation, and allocation summary. Clicking a card opens inline editing with real-time validation. Users can add (up to 12), delete, hide/unhide, and reset personas to workspace defaults. Asset allocation supports target-date fund vintage selection or custom stock/bond/cash split with a live donut chart. Social Security toggle per persona. All changes persist via the existing workspace PATCH endpoint (extended with a `personas` field).

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8.2 / React 19 (frontend)
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4 (backend); react-router-dom 7.1, tailwindcss 3.4.17, recharts 2.15, lucide-react 0.469, @tailwindcss/forms 0.5.9 (frontend)
**Storage**: JSON files on local filesystem (`~/.retiremodel/workspaces/{workspace_id}/workspace.json`)
**Testing**: pytest (backend)
**Target Platform**: Web application (localhost dev environment)
**Project Type**: Web service (FastAPI) + SPA (React/Vite)
**Performance Goals**: Gallery loads in <2s, donut chart updates with no perceptible delay
**Constraints**: Max 12 personas per workspace, inline editing (no modals)
**Scale/Scope**: Single-user local tool, 1–12 personas per workspace

## Constitution Check

*No constitution file found at `.specify/memory/constitution.md`. No gates to evaluate.*

## Project Structure

### Documentation (this feature)

```text
specs/010-persona-gallery/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: dev setup guide
├── contracts/
│   ├── workspace-personas-api.md   # API contract
│   └── frontend-components.md      # UI component contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── models/
│   ├── persona.py           # MODIFY: add hidden field, relax salary constraint
│   └── workspace.py         # MODIFY: add personas max_length validation
├── routers/
│   └── workspaces.py        # MODIFY: add personas to WorkspaceUpdate, add reset endpoint
├── services/
│   └── workspace_service.py # MODIFY: handle personas update, add reset_personas method
└── storage/
    └── workspace_store.py   # No changes needed

app/src/
├── components/
│   ├── PersonaGallery.tsx        # NEW: grid container
│   ├── PersonaCard.tsx           # NEW: display/edit card
│   ├── AllocationEditor.tsx      # NEW: TDF/custom mode toggle + inputs
│   ├── AllocationDonutChart.tsx  # NEW: recharts donut chart
│   └── ConfirmDialog.tsx         # REUSE: existing confirmation modal
├── pages/
│   └── PersonaModelingPage.tsx   # MODIFY: replace stub with gallery page
├── services/
│   └── api.ts                    # MODIFY: add persona update + reset functions
└── types/
    └── persona.ts                # MODIFY: add hidden field to Persona interface
```

**Structure Decision**: Follows existing web application structure. Backend modifications are limited to 4 files (all existing). Frontend adds 4 new components and modifies 3 existing files. No new directories or architectural changes.

## Complexity Tracking

No complexity violations. All changes use existing patterns:
- Backend: extending existing Pydantic models and FastAPI endpoints
- Frontend: new components following existing PlanDesignForm patterns
- Storage: no changes (personas already embedded in workspace JSON)
- No new dependencies
