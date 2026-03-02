# Research: Persona-Scenario Analysis Page

**Feature**: 001-persona-scenario-analysis
**Date**: 2026-03-02

---

## Decision 1: Backend Endpoint Strategy

**Decision**: New dedicated endpoint `POST /workspaces/{id}/analyze` separate from the existing comparisons endpoint.

**Rationale**: The existing `/comparisons` endpoint accepts a single `persona_id` and returns results for one persona across many scenarios. The analyze feature is fundamentally different: it runs all non-hidden personas against each selected scenario and returns a persona × scenario matrix. Extending the comparisons endpoint would require breaking changes to its request/response contract. A new endpoint keeps concerns cleanly separated, does not disrupt the existing Plan Comparison page, and aligns with the REST resource pattern (analyze is a different resource type than comparison).

**Alternatives considered**:
- Extend `/comparisons` with an "all personas" flag — rejected because it would break the existing response shape and mix two different UX workflows.
- Reuse `/scenarios/{id}/simulate` in a loop from the frontend — rejected because it leaks orchestration logic to the client, increases network round-trips, and makes atomicity/error handling harder.

---

## Decision 2: Service Implementation (Reuse Simulation Engine)

**Decision**: Implement a new `workforce_analysis_service.py` that reuses `SimulationEngine` directly, following the same pattern as `comparison_service.py`.

**Rationale**: The `SimulationEngine.run(personas)` method already accepts a list of personas and returns `list[PersonaSimulationResult]` — this is exactly the shape needed for the matrix. Rather than calling the engine once per persona (as the comparison service does), the workforce analysis service calls it once per scenario with the full list of non-hidden personas. This is more efficient (fewer engine instantiations) and consistent with how the Results Dashboard's `/simulate` endpoint works.

Employer cost calculation (annual and cumulative) must be computed per persona per scenario, following the pattern in `comparison_service.py`.

**Alternatives considered**:
- Call existing `comparison_service.run_comparison()` N times (once per persona) — rejected because this runs N × M engine instantiations vs. M (one per scenario), and would require merging results into a matrix post-hoc on the backend.

---

## Decision 3: Persona Filtering (Backend vs. Frontend)

**Decision**: Filter hidden personas on the backend — the service layer fetches non-hidden personas from the workspace and never exposes hidden persona data in the analyze response.

**Rationale**: Consistent with how the Results Dashboard filters hidden personas (server-side via workspace load), and prevents any hidden persona data from being transmitted to the client. The frontend does not need to know about hidden personas for this feature.

**Alternatives considered**:
- Filter on frontend (same as ResultsDashboardPage's current approach) — rejected because the new endpoint is compute-heavy; including hidden personas in the simulation wastes compute and leaks data to the client.

---

## Decision 4: No Result Persistence

**Decision**: The analyze endpoint is compute-and-return; results are not persisted to disk.

**Rationale**: The spec explicitly states no persistence is required for this feature. Storing analysis results would require a new storage schema and UI for "saved analyses," which is out of scope. The existing Excel export capability (already present in the app) provides a path to persistence if users want to preserve results.

**Alternatives considered**:
- Persist like PlanComparison — rejected per spec assumption; adds out-of-scope complexity.

---

## Decision 5: Frontend Matrix Layout

**Decision**: Table-based matrix with personas as rows and scenarios as columns, using color-coded cells (green/yellow/red) based on the metric value and known thresholds.

**Rationale**: The matrix format matches the mental model described in the spec ("a matrix of personas × scenarios"). A table provides scannable alignment for comparisons. Color coding (green ≥80% IR, yellow 60–80%, red <60%) matches the existing `pos_assessment` conventions in the simulation engine. The metric selector and confidence toggle are placed above the table, consistent with the existing Results Dashboard and Plan Comparison pages.

Per-scenario aggregate summary cards appear above the matrix, one card per selected scenario, showing: % on track, median IR, average annual employer cost.

**Alternatives considered**:
- Heat map (color grid, no numeric values) — rejected because it sacrifices readability of specific values.
- Grouped bar chart (personas grouped by scenario) — rejected because it becomes unreadable with 12 personas × 8 scenarios.
- Card-per-persona view (each persona has a mini comparison) — considered as secondary view; rejected for the primary layout in favor of the table, but could be added later.

---

## Decision 6: Metric Selector

**Decision**: A segmented button group or dropdown for metric selection with four initial options: Income Replacement Ratio (default), Probability of Success, Retirement Balance, Employer Cost (Annual).

**Rationale**: These four metrics map directly to the spec's FR-009 and cover the key decision-making dimensions for a plan designer. All four are available on every `PersonaSimulationResult` / `ScenarioComparisonResult`. Additional metrics (e.g., deferral rate for 80% IR) can be added later.

**Alternatives considered**:
- Show all metrics at once (multi-row table) — rejected because it overwhelms the interface for an initial implementation; the spec's FR-007 implies a single "primary" metric is shown at a time.

---

## Decision 7: Color Thresholds for Matrix Cell Differentiation

**Decision**: Apply the following thresholds for cell background coloring based on the active metric:

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Income Replacement Ratio | ≥ 80% | 60–79% | < 60% |
| Probability of Success | ≥ 80% | 60–79% | < 60% |
| Retirement Balance | ≥ $500K | $200K–$499K | < $200K |
| Employer Cost (Annual) | (no threshold coloring — informational only) | — | — |

**Rationale**: IR and PoS thresholds align with the existing app conventions (80% is the target IR throughout the codebase). Balance thresholds are heuristic estimates for retirement adequacy; employer cost is not a "good/bad" value — it's a cost metric so it is shown neutral.

**Alternatives considered**:
- Relative coloring (best in column = green, worst = red) — considered, but absolute thresholds are more meaningful for retirement adequacy assessment.

---

## Decision 8: Aggregate Computation Location

**Decision**: Aggregate statistics (pct_on_track, median_ir, avg_employer_cost_annual) are computed on the backend and returned in the `WorkforceAggregate` model.

**Rationale**: Keeps frontend code simple (just display pre-computed values). The backend already has all the data needed to compute these immediately after running simulations. Aggregate computations involving statistics (median) are more naturally expressed in Python (NumPy median) than in frontend TypeScript.

---

## Key File Inventory

### Backend (new/modified)
| File | Status | Purpose |
|------|--------|---------|
| `api/models/workforce_analysis.py` | New | Request/response Pydantic models |
| `api/services/workforce_analysis_service.py` | New | Orchestrates multi-persona × multi-scenario simulation |
| `api/routers/workforce_analysis.py` | New | FastAPI router for `/analyze` endpoint |
| `api/main.py` | Modified | Register new router |

### Frontend (new/modified)
| File | Status | Purpose |
|------|--------|---------|
| `app/src/types/workforce_analysis.ts` | New | TypeScript interfaces for API response |
| `app/src/services/api.ts` | Modified | Add `runWorkforceAnalysis()` function |
| `app/src/pages/AnalyzePage.tsx` | New | Main page component |
| `app/src/components/WorkforceAnalysisSetupPanel.tsx` | New | Scenario selection sidebar |
| `app/src/components/WorkforceAnalysisMatrix.tsx` | New | Persona × scenario results table |
| `app/src/components/WorkforceAggregateSummary.tsx` | New | Per-scenario aggregate summary cards |
| `app/src/App.tsx` | Modified | Add `/analyze` route |
| `app/src/components/Sidebar.tsx` | Modified | Add "Analyze" nav item |
