# Implementation Plan: Monte Carlo Simulation Engine

**Branch**: `004-simulation-engine` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-simulation-engine/spec.md`

## Summary

Build a synchronous Monte Carlo simulation engine that projects retirement account balances for each persona in a scenario. Given a plan design, personas, and resolved assumptions, the engine simulates the accumulation phase year-by-year from current age to retirement age across configurable trials (default 1,000, max 10,000). Uses NumPy vectorization across trials for performance. Returns percentile balances (25th, 50th, 75th, 90th) at retirement and year-by-year trajectory data. Results are compute-and-return only (not persisted). Exposed via a single POST endpoint on the existing scenario resource.

## Technical Context

**Language/Version**: Python 3.12
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, uvicorn 0.34.0, NumPy >= 1.26 (existing)
**Storage**: Compute-and-return — no result persistence. Only side effect: update `scenario.last_run_at` timestamp.
**Testing**: pytest
**Target Platform**: Local server (macOS/Linux)
**Project Type**: web-service (REST API)
**Performance Goals**: 1k trials x 8 personas < 10s; 10k trials x 8 personas < 60s (SC-001, SC-002)
**Constraints**: Synchronous request/response, pre-tax nominal dollars, IRS limits held constant, single-user
**Scale/Scope**: Up to 10,000 trials, 8 default personas, ~37 years per persona

## Constitution Check

*No constitution file found. No gates to evaluate.*

## Project Structure

### Documentation (this feature)

```text
specs/004-simulation-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output — 8 research decisions
├── data-model.md        # Phase 1 output — new + modified models
├── quickstart.md        # Phase 1 output — usage guide
├── contracts/           # Phase 1 output
│   └── simulation.md    # REST API contract for simulate endpoint
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── main.py                          # MODIFY: register simulations router
├── models/
│   ├── __init__.py                  # MODIFY: export new models
│   ├── assumptions.py               # MODIFY: add wage_growth_std field
│   ├── assumptions_override.py      # MODIFY: add wage_growth_std override
│   └── simulation_result.py         # NEW: PercentileValues, YearSnapshot, PersonaSimulationResult, SimulationResponse
├── routers/
│   └── simulations.py               # NEW: POST simulate endpoint + SimulationRequest
├── services/
│   └── simulation_engine.py         # NEW: SimulationEngine class (core Monte Carlo logic)
└── storage/                         # No changes

tests/
├── test_simulation_engine.py        # NEW: Core engine unit tests (deterministic, edge cases, limits)
└── test_simulation_router.py        # NEW: API integration tests (endpoint, error handling)
```

**Structure Decision**: Single project layout following the existing `api/` layered architecture (router → service → storage). The simulation engine is a pure service with no storage of its own (results are compute-and-return). Test files follow the existing flat-file pattern in `tests/`.

### File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `api/models/assumptions.py` | MODIFY | Add `wage_growth_std: float = 0.02` |
| `api/models/assumptions_override.py` | MODIFY | Add `wage_growth_std: float \| None = None` |
| `api/models/simulation_result.py` | NEW | Result models: PercentileValues, YearSnapshot, PersonaSimulationResult, SimulationResponse |
| `api/models/__init__.py` | MODIFY | Export new simulation result models |
| `api/services/simulation_engine.py` | NEW | Core SimulationEngine class with NumPy-vectorized Monte Carlo loop |
| `api/routers/simulations.py` | NEW | POST simulate endpoint, SimulationRequest model, error handling |
| `api/main.py` | MODIFY | Register simulations router |
| `tests/test_simulation_engine.py` | NEW | Engine unit tests: deterministic results, edge cases, IRS limits, vesting, glide path |
| `tests/test_simulation_router.py` | NEW | API integration tests: endpoint behavior, error responses, last_run_at update |

## Complexity Tracking

No constitution violations — no tracking needed.
