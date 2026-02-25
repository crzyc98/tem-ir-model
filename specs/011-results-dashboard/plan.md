# Implementation Plan: Results Dashboard

**Branch**: `011-results-dashboard` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-results-dashboard/spec.md`

## Summary

Build a results dashboard that displays simulation outcomes for all active personas in a scenario. The backend simulation engine must be extended to return five additional data points per persona: p10 percentile (for 90% confidence), cumulative employer contributions, cumulative employee contributions, probability of success, and income replacement ratio. The frontend adds a new page at `/scenarios/:scenarioId/results` with three Recharts visualizations (income replacement bar chart, balance trajectory line chart with confidence bands, summary data table) and a confidence level toggle (50% | 75% | 90%) that switches which percentile is displayed across all views.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8.2 / React 19 (frontend)
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, NumPy >= 1.26 (backend); react-router-dom 7.1, recharts 2.15, tailwindcss 3.4.17, lucide-react 0.469 (frontend — all existing)
**Storage**: N/A — compute-and-return model; no result persistence
**Testing**: pytest (backend), manual verification (frontend — no test framework configured)
**Target Platform**: Web browser (frontend), Linux/macOS server (backend)
**Project Type**: Web application (FastAPI backend + React SPA frontend)
**Performance Goals**: Simulation results render within 1 second of receiving response; confidence level toggle updates all visualizations instantly (client-side only)
**Constraints**: No new dependencies; all required libraries already installed
**Scale/Scope**: Up to 12 active personas per scenario, 1–10,000 simulation trials

## Constitution Check

*No constitution file found. Proceeding with standard project conventions.*

Gates checked against existing project patterns:
- **No new dependencies**: PASS — all libraries (Recharts, React Router, Tailwind, NumPy) are already installed
- **Consistent architecture**: PASS — follows existing page/component patterns, extends existing models
- **Backend changes are additive**: PASS — new fields added to existing response models are backward-compatible (new fields have defaults)

## Project Structure

### Documentation (this feature)

```text
specs/011-results-dashboard/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — 6 decisions
├── data-model.md        # Phase 1 output — model extensions
├── quickstart.md        # Phase 1 output — dev setup guide
├── contracts/
│   ├── simulate-api.md  # Extended simulation endpoint contract
│   └── frontend-components.md  # UI component hierarchy and contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── models/
│   └── simulation_result.py       # MODIFY — add p10, contributions, probability, IRR, salary
├── services/
│   └── simulation_engine.py       # MODIFY — add p10 percentile, contribution tracking,
│                                  #           probability of success, IRR calculation
└── routers/
    └── simulations.py             # MODIFY — no logic changes, response model auto-updated

app/src/
├── types/
│   └── simulation.ts              # NEW — TypeScript types mirroring extended response
├── services/
│   └── api.ts                     # MODIFY — add runSimulation() function
├── utils/
│   └── formatters.ts              # NEW — formatCurrency(), formatPercent() helpers
├── pages/
│   └── ResultsDashboardPage.tsx   # NEW — main page component with simulation trigger + layout
├── components/
│   ├── IncomeReplacementChart.tsx  # NEW — Recharts BarChart with 70%/80% reference lines
│   ├── TrajectoryChart.tsx         # NEW — Recharts ComposedChart (Line + Area bands)
│   ├── ResultsSummaryTable.tsx     # NEW — HTML table with 7 columns
│   └── ConfidenceLevelToggle.tsx   # NEW — 3-button toggle (50% | 75% | 90%)
├── App.tsx                         # MODIFY — add route for /scenarios/:scenarioId/results
└── ...
```

**Structure Decision**: Follows the existing web application structure with `api/` (backend) and `app/` (frontend). All backend changes modify existing files. Frontend adds 6 new files (1 type, 1 utility, 1 page, 3 components) plus modifies 2 existing files (api.ts, App.tsx).

## Complexity Tracking

No constitution violations to justify. The feature is additive:
- Backend: extends 2 existing files (model + engine), no new modules
- Frontend: 6 new files following established patterns, 2 minor modifications
- No new dependencies, no new architectural patterns, no new storage mechanisms
