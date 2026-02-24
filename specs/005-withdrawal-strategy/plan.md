# Implementation Plan: Withdrawal Strategy Interface

**Branch**: `005-withdrawal-strategy` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-withdrawal-strategy/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Extend the existing Monte Carlo simulation engine with a distribution phase that runs from retirement age to planning age. Define a pluggable `WithdrawalStrategy` protocol and implement a `SystematicWithdrawal` strategy that uses the PMT annuity-depletion formula to compute a level real annual withdrawal depleting the portfolio to $0 at the planning age. The simulation output is extended with per-year withdrawal amounts (in real/today's dollars) and a headline annual withdrawal metric. The interface is designed for code-level pluggability so the proprietary income model can be swapped in later without engine changes.

## Technical Context

**Language/Version**: Python 3.12 (existing)
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, NumPy >= 1.26 (all existing — no new dependencies)
**Storage**: N/A — compute-and-return model; no new persistence
**Testing**: pytest (existing)
**Target Platform**: Linux/macOS server
**Project Type**: Web service (REST API)
**Performance Goals**: 1k trials × 8 personas < 10s, 10k trials × 8 personas < 60s (existing targets, now inclusive of both accumulation and distribution phases)
**Constraints**: NumPy-vectorized operations for all per-trial computations; no Python-level loops over trials
**Scale/Scope**: 1–10,000 trials, 1–20 personas, up to 45-year distribution phase (retirement 55 → planning 100 at extremes; default 26 years: 67 → 93)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file found at `.specify/memory/constitution.md`. No gates to evaluate. Proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/005-withdrawal-strategy/
├── plan.md              # This file
├── research.md          # Phase 0 output — PMT formula, integration design, protocol design
├── data-model.md        # Phase 1 output — entity definitions and extensions
├── quickstart.md        # Phase 1 output — developer quickstart guide
├── contracts/           # Phase 1 output — API contract changes
│   └── simulation-response.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── models/
│   ├── withdrawal_strategy.py    # NEW — WithdrawalStrategy protocol + SystematicWithdrawal
│   └── simulation_result.py      # MODIFIED — YearSnapshot.withdrawal, PersonaSimulationResult.annual_withdrawal, SimulationResponse.planning_age
├── services/
│   └── simulation_engine.py      # MODIFIED — distribution phase loop, WithdrawalStrategy integration
└── routers/
    └── simulations.py            # MODIFIED — pass planning_age to SimulationResponse

tests/
├── models/
│   └── test_withdrawal_strategy.py    # NEW — PMT calculation, edge cases, protocol conformance
├── services/
│   └── test_simulation_distribution.py  # NEW — distribution phase integration, balance depletion, glide path
└── integration/
    └── test_pluggability.py           # NEW — alternative strategy swap without engine changes
```

**Structure Decision**: Extends the existing `api/` single-project structure. New code follows the established pattern: models in `api/models/`, business logic in `api/services/`, tests mirroring the source layout. Only one new model file (`withdrawal_strategy.py`) is created; all other changes are modifications to existing files.

## Complexity Tracking

No constitution violations to justify. The design adds:
- 1 new model file (protocol + implementation)
- 3 modified files (simulation_result, simulation_engine, simulations router)
- 3 new test files

This is the minimum viable set for the feature.
