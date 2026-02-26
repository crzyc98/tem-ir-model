# Quickstart: Simulation Results Excel Export

**Feature**: 012-excel-export
**Date**: 2026-02-25

---

## Prerequisites

- Python 3.12 environment with existing project dependencies installed
- Node.js with existing frontend dependencies installed (`cd app && npm install`)
- The `openpyxl` library added: `pip install openpyxl>=3.1` (or add to `pyproject.toml`)

---

## Running the Feature

### 1. Start the backend

```bash
cd /Users/nicholasamaral/Developer/tem-ir-model
uvicorn api.main:app --reload --port 8000
```

### 2. Start the frontend

```bash
cd app
npm run dev
```

### 3. Exercise the export

1. Open `http://localhost:5173` in a browser.
2. Open or create a workspace with personas configured.
3. Navigate to a scenario → Results Dashboard.
4. Click **Run Simulation** and wait for results to load.
5. Click **Download Excel** — the browser downloads `{ScenarioName}_results.xlsx`.
6. Open the file in Excel, LibreOffice Calc, or Google Sheets and verify:
   - Row 1: Title with scenario name
   - Label-value rows: plan design fields
   - Separator and assumptions section
   - Data table with one row per persona and all required columns

---

## Testing the Export Endpoint Directly

Run a simulation first to obtain a `SimulationResponse`, then POST it to the export endpoint:

```bash
# Step 1: list workspaces to get IDs
curl http://localhost:8000/api/v1/workspaces

# Step 2: run simulation (saves result for step 3)
curl -s -X POST \
  http://localhost:8000/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate \
  -H 'Content-Type: application/json' \
  -d '{}' \
  > /tmp/sim_result.json

# Step 3: export to Excel
curl -X POST \
  http://localhost:8000/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/export \
  -H 'Content-Type: application/json' \
  -d @/tmp/sim_result.json \
  --output /tmp/results.xlsx

# Step 4: verify file
file /tmp/results.xlsx   # should report: Microsoft OOXML
open /tmp/results.xlsx   # macOS: opens in default spreadsheet app
```

---

## Running Tests

```bash
# All tests
cd /Users/nicholasamaral/Developer/tem-ir-model
pytest

# Excel export service unit tests only
pytest tests/services/test_excel_export_service.py -v

# Integration test for the export endpoint
pytest tests/integration/test_excel_export.py -v
```

---

## Key Files

| File | Purpose |
|------|---------|
| `api/services/excel_export_service.py` | Core Excel generation logic |
| `api/routers/scenarios.py` | Export endpoint added here |
| `app/src/services/api.ts` | `exportSimulationExcel` function |
| `app/src/pages/ResultsDashboardPage.tsx` | Download button and handler |
| `tests/services/test_excel_export_service.py` | Unit tests for the service |
| `tests/integration/test_excel_export.py` | Integration test for endpoint |

---

## Dependency Change

Add `openpyxl>=3.1` to `pyproject.toml` under `[project] dependencies`:

```toml
[project]
dependencies = [
  # ... existing ...
  "openpyxl>=3.1",
]
```

Install: `pip install -e .` (or `pip install openpyxl>=3.1` if managing manually).
