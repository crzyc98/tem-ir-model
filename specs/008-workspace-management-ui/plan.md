# Implementation Plan: Workspace Management UI

**Branch**: `008-workspace-management-ui` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-workspace-management-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build the full workspace management UI as a React frontend consuming the existing backend REST API. This includes: a workspace dashboard with cards (client name, scenario count, last modified), workspace creation via modal, workspace deletion with confirmation, scenario list with plan design summary cards, scenario create/edit/duplicate/delete flows, and a workspace settings page for base assumptions and persona editing. No backend changes required — all endpoints already exist.

## Technical Context

**Language/Version**: TypeScript 5.8.2 / React 19 / Vite 6.2 (existing)
**Primary Dependencies**: react-router-dom 7.1, lucide-react 0.469, tailwindcss 3.4.17, @tailwindcss/forms 0.5.9 (all existing — no new dependencies)
**Storage**: N/A — frontend only; consumes backend REST API via Vite dev proxy (`/api` → `localhost:8000`)
**Testing**: No frontend test framework currently installed; manual verification via browser
**Target Platform**: Web browser (SPA)
**Project Type**: Frontend SPA (React + Vite)
**Performance Goals**: Dashboard renders within 5 seconds; all CRUD operations complete within 2 seconds perceived latency
**Constraints**: No new npm dependencies; plain `fetch()` API client pattern (matches existing `api.ts`); Tailwind utility classes only (no component library)
**Scale/Scope**: ~15 new/modified files; 5 new pages/views, 1 new modal, ~8 new components, 1 expanded API service, 3 new type files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file found at `.specify/memory/constitution.md`. Gate passes by default — no constraints to check.

## Project Structure

### Documentation (this feature)

```text
specs/008-workspace-management-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-client.md    # Frontend API service contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
app/src/
├── App.tsx                              # MODIFY — add routes: /scenarios/new, /scenarios/:id
├── components/
│   ├── Layout.tsx                       # MODIFY — add refreshWorkspaces callback to context, add deleteWorkspace support
│   ├── Sidebar.tsx                      # EXISTING (no changes)
│   ├── WorkspaceSelector.tsx            # EXISTING (no changes)
│   ├── ConfirmDialog.tsx                # NEW — reusable confirmation modal
│   ├── CreateWorkspaceModal.tsx         # NEW — modal for workspace creation (client name + optional assumptions)
│   ├── WorkspaceCard.tsx                # NEW — dashboard card (client name, scenario count, last modified, delete)
│   ├── ScenarioCard.tsx                 # NEW — scenario list card (name, plan design summary, duplicate/delete actions)
│   └── PlanDesignForm.tsx               # NEW — reusable plan design form (match tiers, vesting, auto-enroll, core contrib)
├── pages/
│   ├── DashboardPage.tsx                # MODIFY — replace stub with workspace card grid, empty state, create button
│   ├── ScenariosPage.tsx                # MODIFY — replace stub with scenario card list, empty state, create/duplicate/delete
│   ├── ScenarioCreatePage.tsx           # NEW — dedicated full page for scenario creation with PlanDesignForm
│   ├── ScenarioEditPage.tsx             # NEW — detail/edit page for existing scenario with PlanDesignForm
│   ├── SettingsPage.tsx                 # MODIFY — replace stub with assumptions form + persona table
│   ├── NotFoundPage.tsx                 # EXISTING (no changes)
│   ├── PersonaModelingPage.tsx          # EXISTING (no changes)
│   └── PlanComparisonPage.tsx           # EXISTING (no changes)
├── services/
│   └── api.ts                           # MODIFY — add all workspace/scenario CRUD functions
├── types/
│   ├── workspace.ts                     # MODIFY — add full Workspace type, extend LayoutContext
│   ├── scenario.ts                      # NEW — Scenario, ScenarioSummary, ScenarioCreate, ScenarioUpdate, ScenarioResponse
│   ├── plan-design.ts                   # NEW — PlanDesign, MatchTier, VestingSchedule, CoreContributionTier
│   ├── assumptions.ts                   # NEW — Assumptions, AssumptionsOverride, AssetClassReturn
│   ├── persona.ts                       # NEW — Persona, AssetAllocation (TargetDate | Custom)
│   └── navigation.ts                    # EXISTING (no changes)
└── utils/
    └── plan-design-summary.ts           # NEW — human-readable plan design summary formatter
```

**Structure Decision**: Follows the existing frontend structure established in 007-frontend-shell. All new files are placed within the existing `app/src/` directory hierarchy. New type files mirror the backend model structure (one file per domain concept). A `utils/` directory is added for pure formatting logic. No new top-level directories created.

## Complexity Tracking

> No constitution violations — table not required.
