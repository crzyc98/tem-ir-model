# Implementation Plan: Social Security Benefit Estimator

**Branch**: `006-social-security-estimator` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-social-security-estimator/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a Social Security benefit estimator following the Fidelity GRP methodology. The estimator reconstructs an earnings history using the national Average Wage Index (AWI) scaled to the persona's current compensation, computes AIME from the top 35 years of indexed earnings, applies the SSA bend-point formula for PIA, and adjusts for early/delayed claiming. It is exposed as both a standalone calculation service and integrated into the existing simulation engine, where SS benefits are reported alongside (but independent of) plan withdrawals. The persona model gains a `ss_claiming_age` field; the simulation result model gains `ss_annual_benefit` and `total_retirement_income` fields.

## Technical Context

**Language/Version**: Python 3.12 (existing)
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, NumPy >= 1.26 (all existing — no new dependencies)
**Storage**: N/A — compute-and-return model; SSA reference data (AWI, taxable maximums, bend points) embedded as Python constants
**Testing**: pytest (existing)
**Target Platform**: Linux/macOS server
**Project Type**: Web service (REST API)
**Performance Goals**: SS estimation is a lightweight deterministic calculation (~50 years of arithmetic per persona). Negligible compared to Monte Carlo engine. No new performance targets needed.
**Constraints**: SS calculation is deterministic (not stochastic). Computed once per persona, then added as a constant to each Monte Carlo path.
**Scale/Scope**: 1–20 personas, each with ~35-50 years of earnings history. Reference data covers 1951–2026 (76 years of AWI + taxable maximums).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file found at `.specify/memory/constitution.md`. No gates to evaluate. Proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/006-social-security-estimator/
├── plan.md              # This file
├── research.md          # Phase 0 output — SSA formulas, AWI data, algorithm design
├── data-model.md        # Phase 1 output — entity definitions and extensions
├── quickstart.md        # Phase 1 output — developer quickstart guide
├── contracts/           # Phase 1 output — API contract changes
│   ├── simulation-response.md
│   └── ss-estimate.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── models/
│   ├── persona.py               # MODIFIED — add ss_claiming_age field
│   ├── ss_estimator.py          # NEW — SSBenefitEstimate result model
│   ├── simulation_result.py     # MODIFIED — add ss_annual_benefit, total_retirement_income to PersonaSimulationResult
│   └── defaults.py              # MODIFIED — update default personas with ss_claiming_age
├── services/
│   ├── ss_estimator.py          # NEW — core SS calculation engine (AWI data, AIME, PIA, claiming adjustment)
│   └── simulation_engine.py     # MODIFIED — call SS estimator per persona, populate new result fields
└── routers/
    ├── simulations.py           # MODIFIED — new response fields flow through automatically
    └── ss_estimate.py           # NEW — standalone SS estimate endpoint

tests/
├── models/
│   └── test_ss_estimator.py     # NEW — SS result model validation
├── services/
│   └── test_ss_estimator.py     # NEW — core SS calculation tests (AIME, PIA, claiming, edge cases)
└── integration/
    └── test_ss_simulation.py    # NEW — SS integration with simulation engine, toggle behavior
```

**Structure Decision**: Extends the existing `api/` single-project structure. The SS estimator follows the established pattern: models in `api/models/`, business logic in `api/services/`, routes in `api/routers/`, tests mirroring source layout. Two new service files (model + logic), one new router, three new test files, four modified files.

| File | Action | Purpose |
|------|--------|---------|
| `api/models/persona.py` | MODIFY | Add `ss_claiming_age: int` field (62-70, default 67) |
| `api/models/ss_estimator.py` | NEW | `SSBenefitEstimate` result model (monthly, annual, PIA, AIME, claiming_age) |
| `api/models/simulation_result.py` | MODIFY | Add `ss_annual_benefit` and `total_retirement_income` to `PersonaSimulationResult` |
| `api/models/defaults.py` | MODIFY | Default personas get explicit `ss_claiming_age=67` |
| `api/services/ss_estimator.py` | NEW | Core SS engine: AWI/tax-max reference data, earnings reconstruction, AIME, PIA, claiming adjustment |
| `api/services/simulation_engine.py` | MODIFY | Call SS estimator per persona, populate `ss_annual_benefit` and `total_retirement_income` |
| `api/routers/ss_estimate.py` | NEW | `POST /api/v1/workspaces/{workspace_id}/ss-estimate` endpoint |
| `api/main.py` | MODIFY | Register new SS estimate router |
| `tests/models/test_ss_estimator.py` | NEW | SS model validation tests |
| `tests/services/test_ss_estimator.py` | NEW | Core calculation tests: AIME, PIA, bend points, claiming adjustments, edge cases |
| `tests/integration/test_ss_simulation.py` | NEW | End-to-end: toggle behavior, three-field output, backward compatibility |

## Complexity Tracking

No constitution violations to justify. The design adds:
- 3 new source files (1 model, 1 service, 1 router)
- 5 modified source files (persona, simulation_result, defaults, simulation_engine, main)
- 3 new test files

This is the minimum viable set for the feature. The SS estimator is a single pure-function service with embedded reference data — no new dependencies, no persistence, no external calls.
