# Implementation Plan: React Frontend Shell

**Branch**: `007-frontend-shell` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-frontend-shell/spec.md`

## Summary

Enhance the existing React frontend shell (`app/`) to add a workspace selector dropdown in the sidebar, collapsible navigation groups, richer placeholder pages with descriptions, a 404 page, and full alignment with the design system (brand color #00853F, Roboto font, Lucide icons, consistent card styling). The app already has a working Vite + React + TypeScript + Tailwind setup with basic sidebar navigation and a health-check dashboard. This plan builds on that foundation.

## Technical Context

**Language/Version**: TypeScript 5.8.2 / React 19 / Vite 6.2
**Primary Dependencies**: react-router-dom 7.1, lucide-react 0.469, tailwindcss 3.4.17, @tailwindcss/forms 0.5.9, recharts 2.15 (existing, not needed for shell)
**Storage**: N/A (frontend only; consumes backend REST API)
**Testing**: Manual visual testing + TypeScript compilation (`tsc -b`); no test framework currently configured for frontend
**Target Platform**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge) via Vite dev server on localhost:5173
**Project Type**: Single-page web application (React SPA)
**Performance Goals**: Shell loads and becomes interactive within 3 seconds; workspace list loads within 2 seconds
**Constraints**: Tailwind CSS via PostCSS build (already configured), no additional npm dependencies needed
**Scale/Scope**: 5 placeholder pages, 1 layout component, 1 workspace selector component, ~10 files changed/created

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file found at `.specify/memory/constitution.md`. Proceeding with standard best practices:

| Gate | Status | Notes |
|------|--------|-------|
| No unnecessary dependencies | PASS | All dependencies already installed; no new npm packages needed |
| No over-engineering | PASS | Building on existing scaffold; adding only what spec requires |
| Separation of concerns | PASS | Components separated into layout, pages, services |
| Type safety | PASS | TypeScript strict mode already enabled |
| Design system consistency | PASS | Tailwind config already has brand colors and Roboto font |

## Project Structure

### Documentation (this feature)

```text
specs/007-frontend-shell/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output
    └── api-client.md    # Frontend API client contract
```

### Source Code (repository root)

```text
app/
├── index.html                    # Entry point (existing - no changes)
├── package.json                  # Dependencies (existing - no changes)
├── vite.config.ts                # Vite config (existing - no changes)
├── tailwind.config.js            # Tailwind config (existing - no changes)
├── tsconfig.json                 # TypeScript config (existing - no changes)
├── src/
│   ├── main.tsx                  # App bootstrap (existing - no changes)
│   ├── index.css                 # Tailwind directives (existing - no changes)
│   ├── App.tsx                   # Root component with routes (MODIFY)
│   ├── components/
│   │   ├── Layout.tsx            # Shell layout: sidebar + header + outlet (NEW)
│   │   ├── Sidebar.tsx           # Sidebar with nav items + workspace selector (NEW)
│   │   └── WorkspaceSelector.tsx # Workspace dropdown component (NEW)
│   ├── pages/
│   │   ├── DashboardPage.tsx     # Dashboard placeholder (NEW - extracted from App.tsx)
│   │   ├── PersonaModelingPage.tsx  # Placeholder (NEW)
│   │   ├── PlanComparisonPage.tsx   # Placeholder (NEW)
│   │   ├── ScenariosPage.tsx     # Placeholder (NEW)
│   │   ├── SettingsPage.tsx      # Placeholder (NEW)
│   │   └── NotFoundPage.tsx      # 404 page (NEW)
│   ├── services/
│   │   └── api.ts                # API client for workspace endpoints (NEW)
│   └── types/
│       └── workspace.ts          # TypeScript types for workspace data (NEW)
└── tests/                        # (empty for now; no frontend test framework)
```

**Structure Decision**: Extends the existing `app/` frontend directory. Introduces a `components/`, `pages/`, `services/`, and `types/` sub-structure within `src/` to organize the growing codebase. This follows the patterns established in the sister PlanAlign application (examples/).

## Complexity Tracking

No constitution violations to justify.
