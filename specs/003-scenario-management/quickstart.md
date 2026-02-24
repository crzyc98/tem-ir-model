# Quickstart: 003-scenario-management

**Branch**: `003-scenario-management`

## Prerequisites

- Python 3.12+
- Features 001 (core data models) and 002 (workspace management) merged to main
- Virtual environment activated

## Setup

```bash
# Activate venv
source .venv/bin/activate

# Install dependencies (no new deps required — uses existing FastAPI/Pydantic)
pip install -r api/requirements.txt
```

## Run the Server

```bash
uvicorn api.main:app --reload
```

Server starts at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

## Quick Test Flow

```bash
# 1. Create a workspace first
curl -s -X POST http://localhost:8000/api/v1/workspaces \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corp"}' | python -m json.tool

# Save the workspace_id from the response
WS_ID="<workspace_id>"

# 2. Create a scenario
curl -s -X POST http://localhost:8000/api/v1/workspaces/$WS_ID/scenarios \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Base Plan",
    "plan_design": {
      "name": "Safe Harbor 401k",
      "match_tiers": [
        {"match_rate": 1.0, "on_first_pct": 0.03},
        {"match_rate": 0.5, "on_first_pct": 0.02}
      ],
      "match_vesting": {"type": "cliff", "years": 3},
      "core_contribution_pct": 0.03,
      "auto_enroll_rate": 0.06,
      "auto_escalation_cap": 0.10
    }
  }' | python -m json.tool

# Save the scenario_id from the response
SC_ID="<scenario_id>"

# 3. List scenarios
curl -s http://localhost:8000/api/v1/workspaces/$WS_ID/scenarios | python -m json.tool

# 4. Get scenario (with resolved effective_assumptions)
curl -s http://localhost:8000/api/v1/workspaces/$WS_ID/scenarios/$SC_ID | python -m json.tool

# 5. Duplicate scenario
curl -s -X POST http://localhost:8000/api/v1/workspaces/$WS_ID/scenarios/$SC_ID/duplicate | python -m json.tool

# 6. Update the duplicate
DUP_ID="<duplicate_id>"
curl -s -X PATCH http://localhost:8000/api/v1/workspaces/$WS_ID/scenarios/$DUP_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aggressive Match",
    "plan_design": {
      "name": "Aggressive 401k",
      "match_tiers": [
        {"match_rate": 1.0, "on_first_pct": 0.06}
      ],
      "match_vesting": {"type": "immediate"},
      "core_contribution_pct": 0.05,
      "auto_enroll_rate": 0.10,
      "auto_escalation_cap": 0.15
    }
  }' | python -m json.tool

# 7. Delete a scenario
curl -s -X DELETE http://localhost:8000/api/v1/workspaces/$WS_ID/scenarios/$SC_ID -w "%{http_code}"
# Expected: 204
```

## Run Tests

```bash
pytest tests/ -v
```

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `api/routers/scenarios.py` | REST endpoints for scenario CRUD + duplicate |
| `api/services/scenario_service.py` | Business logic for scenario operations |
| `api/services/irs_validator.py` | IRS limit validation (employer + employee side) |
| `api/storage/scenario_store.py` | JSON file persistence for scenarios |
| `tests/test_scenario_service.py` | Service layer unit tests |
| `tests/test_scenario_router.py` | API integration tests |
| `tests/test_irs_validator.py` | IRS validation logic tests |
| `tests/test_scenario_store.py` | Storage layer tests |

### Modified Files
| File | Change |
|------|--------|
| `api/main.py` | Register scenarios router |
| `api/services/exceptions.py` | Add `ScenarioNotFoundError` |
