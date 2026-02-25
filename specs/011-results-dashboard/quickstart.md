# Quickstart: Results Dashboard

**Branch**: `011-results-dashboard` | **Date**: 2026-02-24

## Prerequisites

- Python 3.12 with virtual environment activated
- Node.js (for frontend dev server)
- Backend dependencies installed (`pip install -r requirements.txt`)
- Frontend dependencies installed (`cd app && npm install`)
- A workspace with at least one scenario containing a plan design and 2+ active personas

## Development Setup

```bash
# Terminal 1: Backend API server
cd api
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend dev server
cd app
npm run dev
# → http://localhost:5173
```

## Files to Modify

### Backend

| File | Change |
|------|--------|
| `api/models/simulation_result.py` | Add `p10` to `PercentileValues` and `YearSnapshot`; add `total_employee_contributions`, `total_employer_contributions`, `probability_of_success`, `income_replacement_ratio`, `projected_salary_at_retirement` to `PersonaSimulationResult` |
| `api/services/simulation_engine.py` | Add `10` to `PERCENTILES` tuple; accumulate contribution arrays; compute probability of success; compute projected salary and income replacement ratio; update all percentile indexing |

### Frontend

| File | Change |
|------|--------|
| `app/src/services/api.ts` | Add `runSimulation()` function |
| `app/src/App.tsx` | Add route `/scenarios/:scenarioId/results` → `ResultsDashboardPage` |

## Frontend New Files

| File | Purpose |
|------|---------|
| `app/src/types/simulation.ts` | TypeScript types mirroring backend simulation response models |
| `app/src/utils/formatters.ts` | `formatCurrency()` and `formatPercent()` helper functions |
| `app/src/pages/ResultsDashboardPage.tsx` | Main dashboard page: simulation trigger, confidence toggle, layout |
| `app/src/components/ConfidenceLevelToggle.tsx` | Three-button toggle for 50% / 75% / 90% confidence levels |
| `app/src/components/IncomeReplacementChart.tsx` | Recharts BarChart with reference lines at 70% and 80% |
| `app/src/components/TrajectoryChart.tsx` | Recharts ComposedChart with Line + Area confidence bands |
| `app/src/components/ResultsSummaryTable.tsx` | HTML table with 7 columns, all formatted values |

## Verification

1. Start backend and frontend dev servers
2. Navigate to an existing workspace with a scenario that has a plan design and personas
3. Navigate to `/scenarios/{scenarioId}/results`
4. Verify the "Run Simulation" call-to-action is displayed (no results yet)
5. Click "Run Simulation" and verify loading state appears
6. After simulation completes, verify:
   - Summary table displays one row per active persona with all 7 columns
   - Bar chart shows one bar per persona with 70% and 80% reference lines
   - Trajectory chart shows one line per persona with shaded confidence bands
   - Default confidence level is 75%
7. Switch confidence level to 50% and verify all values increase (less conservative)
8. Switch confidence level to 90% and verify all values decrease (more conservative)
9. Verify values in the summary table match the chart visualizations at each confidence level
10. Hover over trajectory chart data points and verify tooltips display correctly
11. Test with a single persona — all visualizations should remain functional

## Key Patterns to Follow

- **Page data fetching**: Follow `PersonaModelingPage.tsx` pattern — `useOutletContext` for workspace, `useCallback` + `useEffect` for data loading, `useState` for loading/error states
- **API function**: Follow existing functions in `api.ts` — plain `fetch`, `API_BASE` prefix, throw on non-ok response
- **Recharts responsive charts**: Use `<ResponsiveContainer width="100%" height={300}>` wrapper instead of fixed pixel dimensions
- **Tailwind styling**: Follow existing component styles — use `bg-white rounded-lg shadow p-6` for card containers, consistent spacing
- **TypeScript types**: Follow `persona.ts` pattern — export interfaces matching backend Pydantic models, use `string` for UUID fields
