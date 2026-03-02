# Implementation Plan: Persona-Scenario Analysis Page

**Branch**: `001-persona-scenario-analysis` | **Date**: 2026-03-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-persona-scenario-analysis/spec.md`

---

## Summary

Add a dedicated "Analyze" page that allows plan designers to simultaneously compare retirement outcomes for all non-hidden personas across 2–8 selected scenarios. This is the inverse of the existing Plan Comparison page: instead of one persona × many scenarios, the Analyze page shows all personas × many scenarios in a single matrix view. The backend adds a new `POST /analyze` endpoint that runs the existing simulation engine against all non-hidden personas for each selected scenario in a single request. The frontend adds a new page with a scenario-selection panel, per-scenario aggregate summary cards, a color-coded persona × scenario results matrix, and metric/confidence-level controls — all following established patterns from the existing Results Dashboard and Plan Comparison pages. No new dependencies are required; no data is persisted.

---

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8.2 / React 19 (frontend)
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, NumPy ≥ 1.26 (backend); react-router-dom 7.1, recharts 2.15, lucide-react 0.469, Tailwind CSS 3.4, @tailwindcss/forms 0.5.9 (frontend) — all existing, no new dependencies
**Storage**: N/A — compute-and-return model; no new persistence
**Testing**: pytest (backend unit + integration tests)
**Target Platform**: Web (browser + local Python server)
**Project Type**: Full-stack web application (FastAPI backend + React/Vite frontend)
**Performance Goals**: Full analysis of 12 personas × 8 scenarios completes and renders in ≤ 60 seconds (matches SC-001)
**Constraints**: No new pip or npm packages; reuse existing simulation engine, component patterns, and utilities
**Scale/Scope**: Up to 12 personas × 8 scenarios per analysis; single-user local tool

---

## Constitution Check

No constitution file exists for this project. No gates to evaluate. Proceeding without violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-persona-scenario-analysis/
├── plan.md              # This file
├── research.md          # Phase 0 output — decisions and rationale
├── data-model.md        # Phase 1 output — entities and validation rules
├── quickstart.md        # Phase 1 output — how to run and verify
├── contracts/
│   └── analyze-endpoint.md   # Phase 1 output — API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code

```text
api/
├── models/
│   └── workforce_analysis.py         # NEW: Pydantic models for analyze request/response
├── routers/
│   └── workforce_analysis.py         # NEW: FastAPI router for POST /analyze
├── services/
│   └── workforce_analysis_service.py # NEW: Orchestration logic
└── main.py                           # MODIFIED: Register new router

app/src/
├── pages/
│   └── AnalyzePage.tsx               # NEW: Main analyze page
├── components/
│   ├── WorkforceAnalysisSetupPanel.tsx    # NEW: Scenario selection sidebar
│   ├── WorkforceAnalysisMatrix.tsx        # NEW: Persona × scenario results table
│   └── WorkforceAggregateSummary.tsx      # NEW: Per-scenario aggregate cards
├── types/
│   └── workforce_analysis.ts              # NEW: TypeScript interfaces
├── services/
│   └── api.ts                             # MODIFIED: Add runWorkforceAnalysis()
├── App.tsx                                # MODIFIED: Add /analyze route
└── components/Sidebar.tsx                 # MODIFIED: Add "Analyze" nav item
```

**Structure Decision**: Web application (Option 2 pattern). Backend in `api/`, frontend in `app/src/`. This matches the established structure for all existing features (011-results-dashboard, 010-persona-gallery, etc.).

---

## Implementation Steps

### Step 1 — Backend: New Pydantic Models

**File**: `api/models/workforce_analysis.py` (new file)

Create the following Pydantic v2 models:

```python
from uuid import UUID
from pydantic import BaseModel, Field
from .simulation_result import PersonaSimulationResult

class WorkforceAnalyzeRequest(BaseModel):
    scenario_ids: list[UUID] = Field(min_length=2, max_length=8)

class PersonaEmployerCost(BaseModel):
    persona_id: UUID
    employer_cost_annual: float
    employer_cost_cumulative: float

class WorkforceAggregate(BaseModel):
    pct_on_track: float
    median_ir: float | None
    avg_employer_cost_annual: float

class WorkforceScenarioResult(BaseModel):
    scenario_id: UUID
    scenario_name: str
    persona_results: list[PersonaSimulationResult]
    employer_costs: list[PersonaEmployerCost]
    aggregate: WorkforceAggregate

class WorkforceAnalyzeResponse(BaseModel):
    workspace_id: UUID
    scenario_ids: list[UUID]
    results: list[WorkforceScenarioResult]
    retirement_age: int
    planning_age: int
    num_simulations: int
    seed: int | None
```

**Acceptance**: Models import without errors; `WorkforceAnalyzeRequest(scenario_ids=["a","b"])` validates; `WorkforceAnalyzeRequest(scenario_ids=["a"])` raises `ValidationError`.

---

### Step 2 — Backend: Workforce Analysis Service

**File**: `api/services/workforce_analysis_service.py` (new file)

```python
import numpy as np
from uuid import UUID
from ..models.workforce_analysis import (
    WorkforceAnalyzeRequest, WorkforceAnalyzeResponse,
    WorkforceScenarioResult, PersonaEmployerCost, WorkforceAggregate,
)
from ..services.simulation_engine import SimulationEngine
from ..storage.workspace_store import load_workspace
from ..storage.scenario_store import load_scenario

def run_workforce_analysis(workspace_id: UUID, request: WorkforceAnalyzeRequest) -> WorkforceAnalyzeResponse:
    workspace = load_workspace(workspace_id)      # raises 404 if not found
    visible_personas = [p for p in workspace.personas if not p.hidden]
    if not visible_personas:
        raise ValueError("No visible personas in workspace")

    effective_base = workspace.base_config
    mc_config = workspace.monte_carlo_config
    results = []

    for scenario_id in request.scenario_ids:
        scenario = load_scenario(workspace_id, scenario_id)  # raises 404 if not found
        # Resolve effective assumptions (scenario overrides base config)
        effective = effective_base.apply_overrides(scenario.overrides)
        engine = SimulationEngine(effective, scenario.plan_design, mc_config)
        persona_results = engine.run(visible_personas)

        # Employer cost per persona (mirrors comparison_service pattern)
        employer_costs = [
            _compute_employer_cost(p, scenario, effective, mc_config)
            for p in visible_personas
        ]

        aggregate = _compute_aggregate(persona_results, employer_costs)

        results.append(WorkforceScenarioResult(
            scenario_id=scenario_id,
            scenario_name=scenario.name,
            persona_results=persona_results,
            employer_costs=employer_costs,
            aggregate=aggregate,
        ))

    return WorkforceAnalyzeResponse(
        workspace_id=workspace_id,
        scenario_ids=request.scenario_ids,
        results=results,
        retirement_age=mc_config.retirement_age,
        planning_age=mc_config.planning_age,
        num_simulations=mc_config.num_simulations,
        seed=mc_config.seed,
    )

def _compute_employer_cost(persona, scenario, effective, mc_config) -> PersonaEmployerCost:
    # Reuse the same cost computation pattern from comparison_service.py
    # (single-persona engine run to derive cost; or extract cost from plan_design directly)
    # Implementation follows comparison_service._compute_employer_cost pattern
    ...

def _compute_aggregate(persona_results, employer_costs) -> WorkforceAggregate:
    on_track_count = sum(1 for r in persona_results if r.pos_assessment == "On Track")
    pct_on_track = on_track_count / len(persona_results) if persona_results else 0.0

    irs = [r.income_replacement_ratio.p50 for r in persona_results if r.income_replacement_ratio]
    median_ir = float(np.median(irs)) if irs else None

    avg_cost = (
        sum(c.employer_cost_annual for c in employer_costs) / len(employer_costs)
        if employer_costs else 0.0
    )
    return WorkforceAggregate(pct_on_track=pct_on_track, median_ir=median_ir, avg_employer_cost_annual=avg_cost)
```

**Acceptance**:
- Calling with a valid workspace + 2 scenarios returns a `WorkforceAnalyzeResponse` with `len(results) == 2`.
- Each `WorkforceScenarioResult.persona_results` contains exactly the non-hidden personas.
- Calling with workspace where all personas are hidden raises `ValueError`.

---

### Step 3 — Backend: Router

**File**: `api/routers/workforce_analysis.py` (new file)

```python
from uuid import UUID
from fastapi import APIRouter, HTTPException
from ..models.workforce_analysis import WorkforceAnalyzeRequest, WorkforceAnalyzeResponse
from ..services.workforce_analysis_service import run_workforce_analysis

router = APIRouter(tags=["workforce-analysis"])

@router.post("/workspaces/{workspace_id}/analyze", response_model=WorkforceAnalyzeResponse, status_code=201)
def analyze_workforce(workspace_id: UUID, request: WorkforceAnalyzeRequest):
    try:
        return run_workforce_analysis(workspace_id, request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

**Acceptance**: `POST /api/v1/workspaces/{id}/analyze` with valid payload returns 201; with missing workspace returns 404; with no visible personas returns 400.

---

### Step 4 — Backend: Register Router in `main.py`

**File**: `api/main.py` (modify)

Find the block where existing routers are registered and add:

```python
from .routers.workforce_analysis import router as workforce_analysis_router
app.include_router(workforce_analysis_router, prefix="/api/v1")
```

**Acceptance**: `GET /openapi.json` includes the `/api/v1/workspaces/{workspace_id}/analyze` endpoint definition.

---

### Step 5 — Frontend: TypeScript Types

**File**: `app/src/types/workforce_analysis.ts` (new file)

```typescript
import type { PersonaSimulationResult } from './simulation'

export interface WorkforceAnalyzeRequest {
  scenario_ids: string[]
}

export interface PersonaEmployerCost {
  persona_id: string
  employer_cost_annual: number
  employer_cost_cumulative: number
}

export interface WorkforceAggregate {
  pct_on_track: number
  median_ir: number | null
  avg_employer_cost_annual: number
}

export interface WorkforceScenarioResult {
  scenario_id: string
  scenario_name: string
  persona_results: PersonaSimulationResult[]
  employer_costs: PersonaEmployerCost[]
  aggregate: WorkforceAggregate
}

export interface WorkforceAnalyzeResponse {
  workspace_id: string
  scenario_ids: string[]
  results: WorkforceScenarioResult[]
  retirement_age: number
  planning_age: number
  num_simulations: number
  seed: number | null
}

export type AnalysisMetric =
  | 'income_replacement_ratio'
  | 'probability_of_success'
  | 'retirement_balance'
  | 'employer_cost_annual'

export const ANALYSIS_METRIC_LABELS: Record<AnalysisMetric, string> = {
  income_replacement_ratio: 'Income Replacement Ratio',
  probability_of_success: 'Probability of Success',
  retirement_balance: 'Retirement Balance',
  employer_cost_annual: 'Employer Cost (Annual)',
}
```

---

### Step 6 — Frontend: API Function

**File**: `app/src/services/api.ts` (modify — add one function)

```typescript
export async function runWorkforceAnalysis(
  workspaceId: string,
  req: { scenario_ids: string[] }
): Promise<WorkforceAnalyzeResponse> {
  const res = await fetch(`/api/v1/workspaces/${workspaceId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail ?? `Analysis failed (${res.status})`)
  }
  return res.json()
}
```

---

### Step 7 — Frontend: `WorkforceAnalysisSetupPanel` Component

**File**: `app/src/components/WorkforceAnalysisSetupPanel.tsx` (new file)

Responsibilities:
- Renders a list of all scenarios in the workspace with checkboxes and color swatches (follow `ComparisonSetupPanel` pattern with `SCENARIO_COLORS`).
- Enforces max 8 selections (disables unchecked items when 8 are selected).
- Shows the count of selected scenarios (e.g., "3 of 8 max").
- Shows the count of visible personas that will be analyzed (e.g., "Analyzes 5 visible personas").
- Disables the "Run Analysis" button if fewer than 2 scenarios are selected.
- Props: `scenarios`, `selectedScenarioIds`, `onSelectionChange`, `visiblePersonaCount`, `onRun`, `loading`.

---

### Step 8 — Frontend: `WorkforceAggregateSummary` Component

**File**: `app/src/components/WorkforceAggregateSummary.tsx` (new file)

Responsibilities:
- Renders a horizontal row of cards, one per selected scenario.
- Each card shows: scenario name (colored header matching `SCENARIO_COLORS[index]`), % On Track, Median IR (formatted as percentage), Avg Employer Cost (formatted as currency).
- Cards scroll horizontally if there are many scenarios.
- Props: `results: WorkforceScenarioResult[]`, `scenarioColors: string[]`.

---

### Step 9 — Frontend: `WorkforceAnalysisMatrix` Component

**File**: `app/src/components/WorkforceAnalysisMatrix.tsx` (new file)

Responsibilities:
- Renders a table: rows = non-hidden personas, columns = selected scenarios.
- First column: persona name (fixed left, 140–180px).
- Each scenario column: displays the active metric value for that persona × scenario.
- Cell color classes:
  - **Income Replacement Ratio / Probability of Success**: green ≥ 80%, yellow 60–79%, red < 60%
  - **Retirement Balance**: green ≥ $500K, yellow $200K–$499K, red < $200K
  - **Employer Cost Annual**: neutral (gray background only)
- Uses `CONFIDENCE_PERCENTILE_MAP` to select the correct percentile based on `confidenceLevel`.
- Column headers: scenario name (truncated with tooltip if > 20 chars), colored with `SCENARIO_COLORS[index]`.
- Props: `results: WorkforceScenarioResult[]`, `metric: AnalysisMetric`, `confidenceLevel: ConfidenceLevel`, `scenarioColors: string[]`.

**Cell value extraction logic**:
```typescript
function getCellValue(
  personaResult: PersonaSimulationResult,
  employerCost: PersonaEmployerCost,
  metric: AnalysisMetric,
  percentileKey: keyof PercentileValues
): number | null {
  switch (metric) {
    case 'income_replacement_ratio':
      return personaResult.income_replacement_ratio?.[percentileKey] ?? null
    case 'probability_of_success':
      return personaResult.probability_of_success  // scalar, no percentile
    case 'retirement_balance':
      return personaResult.retirement_balance[percentileKey]
    case 'employer_cost_annual':
      return employerCost.employer_cost_annual  // scalar
  }
}
```

---

### Step 10 — Frontend: `AnalyzePage` Component

**File**: `app/src/pages/AnalyzePage.tsx` (new file)

Structure:
```tsx
<AnalyzePage>
  <header>
    <h1>Analyze</h1>
    <p>Compare all personas across selected scenarios</p>
  </header>
  {error && <ErrorBanner message={error} />}
  <main className="flex gap-6">
    <WorkforceAnalysisSetupPanel ... />  {/* left, fixed 320px */}
    <div className="flex-1">            {/* right, grows */}
      {loading && <LoadingSpinner />}
      {!loading && !analysisResult && <EmptyState message="Select 2–8 scenarios and run the analysis to see results." />}
      {analysisResult && (
        <>
          <ControlsBar>
            <MetricSelector metric={metric} onChange={setMetric} />
            <ConfidenceLevelToggle value={confidenceLevel} onChange={setConfidenceLevel} />
          </ControlsBar>
          <WorkforceAggregateSummary results={analysisResult.results} scenarioColors={scenarioColors} />
          <WorkforceAnalysisMatrix
            results={analysisResult.results}
            metric={metric}
            confidenceLevel={confidenceLevel}
            scenarioColors={scenarioColors}
          />
        </>
      )}
    </div>
  </main>
</AnalyzePage>
```

**State**:
- `selectedScenarioIds: string[]` — user selection (default: empty)
- `analysisResult: WorkforceAnalyzeResponse | null` — API response
- `metric: AnalysisMetric` — default: `'income_replacement_ratio'`
- `confidenceLevel: ConfidenceLevel` — default: `'75'`
- `loading: boolean`
- `error: string | null`

**Data loading**: Load workspace (from Layout context) and scenarios on mount via existing hooks/API.

**Run handler**: Call `runWorkforceAnalysis(workspace.id, { scenario_ids: selectedScenarioIds })`, update `analysisResult` state.

---

### Step 11 — Frontend: Register Route

**File**: `app/src/App.tsx` (modify)

Add inside the `<Route element={<Layout />}>` block:
```tsx
<Route path="/analyze" element={<AnalyzePage />} />
```

---

### Step 12 — Frontend: Add Sidebar Navigation Item

**File**: `app/src/components/Sidebar.tsx` (modify)

In the `navEntries` array, within the "Modeling" section, add after "Plan Comparison":
```typescript
{ kind: 'link', label: 'Analyze', icon: BarChart3, to: '/analyze' }
```

(Use `BarChart3` from `lucide-react`, which is already a dependency.)

---

## Testing Plan

### Backend Unit Tests (`tests/test_workforce_analysis_service.py`)

| Test | Expected Result |
|------|----------------|
| `test_run_with_two_scenarios_two_personas` | Returns `WorkforceAnalyzeResponse` with 2 `WorkforceScenarioResult`s, each with 2 `persona_results` |
| `test_hidden_personas_excluded` | When workspace has 1 visible + 1 hidden persona, each result has 1 `persona_result` |
| `test_all_personas_hidden_raises` | `ValueError("No visible personas in workspace")` raised |
| `test_aggregate_pct_on_track` | Aggregate correctly counts "On Track" vs. "Needs Refinement" |
| `test_aggregate_median_ir` | Median IR correctly computed for even/odd persona counts |
| `test_aggregate_no_ir_returns_none` | `median_ir` is `None` when no persona has IR defined |
| `test_scenario_not_found_raises` | `FileNotFoundError` raised with appropriate message |

### Backend Integration Tests (`tests/test_workforce_analysis_router.py`)

| Test | Expected Result |
|------|----------------|
| `test_post_analyze_success` | Status 201, valid `WorkforceAnalyzeResponse` JSON |
| `test_post_analyze_one_scenario` | Status 400, detail contains "between 2 and 8" |
| `test_post_analyze_nine_scenarios` | Status 422 (Pydantic max_length=8 validation) |
| `test_post_analyze_workspace_not_found` | Status 404 |
| `test_post_analyze_no_visible_personas` | Status 400, detail contains "No visible personas" |
| `test_post_analyze_scenario_not_found` | Status 404 |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Performance: 12 personas × 8 scenarios = 96 simulation runs | Medium | Medium | Simulation engine already handles batches; each scenario runs all personas in one engine call (not 96 separate calls). Acceptable for local single-user tool. |
| Column overflow in matrix for 8 scenarios + long names | Low | Low | Truncate scenario names at 20 chars with full-name tooltip |
| `income_replacement_ratio` null for some personas | Low | Medium | Null-safe cell extraction; show "—" for null cells |
| Duplicate scenario selection in request | Low | Low | Pydantic validation + frontend prevents duplicate checkbox selection |
