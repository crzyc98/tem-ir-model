# Quickstart: Simulation Engine

## Prerequisites

- Python 3.12+
- Dependencies installed: `pip install -r api/requirements.txt`
- A workspace with at least one persona and one scenario (see features 002, 003)

## Running a Simulation

### 1. Start the server

```bash
cd /Users/nicholasamaral/Developer/tem-ir-model
python -m uvicorn api.main:app --reload
```

### 2. Create a workspace (if needed)

```bash
curl -X POST http://localhost:8000/api/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corp"}'
```

Save the workspace `id` from the response.

### 3. Create a scenario (if needed)

```bash
curl -X POST http://localhost:8000/api/v1/workspaces/{workspace_id}/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Base Plan",
    "plan_design": {
      "name": "Standard 401k",
      "match_tiers": [
        {"match_rate": 1.0, "on_first_pct": 0.03},
        {"match_rate": 0.5, "on_first_pct": 0.02}
      ],
      "core_contribution_pct": 0.03
    }
  }'
```

Save the scenario `id` from the response.

### 4. Run simulation with defaults (1,000 trials)

```bash
curl -X POST http://localhost:8000/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate
```

### 5. Run simulation with custom parameters

```bash
curl -X POST http://localhost:8000/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate \
  -H "Content-Type: application/json" \
  -d '{"num_simulations": 5000, "seed": 42}'
```

### 6. Verify reproducibility

Run the same request twice with a fixed seed — results should be identical:

```bash
# Run 1
curl -s -X POST http://localhost:8000/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate \
  -H "Content-Type: application/json" \
  -d '{"seed": 42}' | python -m json.tool > run1.json

# Run 2
curl -s -X POST http://localhost:8000/api/v1/workspaces/{workspace_id}/scenarios/{scenario_id}/simulate \
  -H "Content-Type: application/json" \
  -d '{"seed": 42}' | python -m json.tool > run2.json

# Compare
diff run1.json run2.json
# Should produce no output (identical)
```

## Running Tests

```bash
cd /Users/nicholasamaral/Developer/tem-ir-model
pytest tests/ -v
```

## Key Response Fields

- `personas[].retirement_balance` — Percentile balances (p25/p50/p75/p90) at retirement
- `personas[].trajectory` — Year-by-year percentile balances from current age to retirement
- `num_simulations` — Number of trials actually run
- `seed` — Seed used (null if non-reproducible)
