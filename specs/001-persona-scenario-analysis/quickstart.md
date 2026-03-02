# Quickstart: Persona-Scenario Analysis Page

**Feature**: 001-persona-scenario-analysis
**Date**: 2026-03-02

---

## Prerequisites

- Python 3.12 + existing virtualenv (or `uv`/`pip install -r requirements.txt`)
- Node.js + npm (for frontend)
- A workspace with at least 2 non-hidden personas and at least 2 scenarios

---

## Running the Application

### Backend

```bash
cd api
uvicorn main:app --reload --port 8000
```

The new analyze endpoint will be available at:
```
POST http://localhost:8000/api/v1/workspaces/{workspace_id}/analyze
```

### Frontend

```bash
cd app
npm install
npm run dev
```

Navigate to `http://localhost:5173/analyze` to access the new Analyze page.

---

## Testing the Analyze Endpoint Manually

### 1. Find a workspace ID

```bash
curl http://localhost:8000/api/v1/workspaces | jq '.[0].id'
```

### 2. Find 2+ scenario IDs in that workspace

```bash
curl http://localhost:8000/api/v1/workspaces/{workspace_id}/scenarios | jq '.[].id'
```

### 3. Run the analysis

```bash
curl -X POST http://localhost:8000/api/v1/workspaces/{workspace_id}/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "scenario_ids": [
      "SCENARIO_ID_1",
      "SCENARIO_ID_2"
    ]
  }' | jq '.results[0].aggregate'
```

Expected output:
```json
{
  "pct_on_track": 0.75,
  "median_ir": 0.82,
  "avg_employer_cost_annual": 3400.0
}
```

---

## Running Backend Tests

```bash
cd api
pytest tests/ -v
```

Key test files for this feature:
- `tests/test_workforce_analysis_service.py` — unit tests for the service
- `tests/test_workforce_analysis_router.py` — integration tests for the endpoint

---

## Verification Checklist

After implementation, verify these behaviors manually:

1. **Navigation**: Click "Analyze" in the sidebar → lands on `/analyze` page
2. **Scenario selection**: Check 2 scenarios → Run button becomes active
3. **Too few**: With 0–1 scenarios checked → Run button stays disabled
4. **Too many**: With 8 checked → 9th checkbox is disabled
5. **Analysis runs**: Click Run → loading spinner appears → matrix renders with all non-hidden personas
6. **Hidden personas excluded**: Mark a persona as hidden → re-run → that persona is absent from the matrix
7. **Metric switching**: Change active metric → matrix values update immediately (no loading spinner)
8. **Confidence level**: Switch from 75% to 90% → all values shift conservatively
9. **Aggregate cards**: Each selected scenario shows correct % on track, median IR, avg cost
10. **Color coding**: Cells with IR ≥ 80% show green; 60–79% yellow; <60% red
11. **Empty state**: Workspace with all personas hidden → "No visible personas" message shown
12. **Edge case — 1 scenario**: Workspace with 1 scenario → "Need at least 2 scenarios" message shown

---

## Adding a Test Workspace (Dev Convenience)

If you do not have a workspace with multiple scenarios, the existing persona gallery and scenario creator can be used from the Dashboard to create one quickly. Alternatively, use the workspace import feature (`/settings`) to import a pre-built workspace JSON.
