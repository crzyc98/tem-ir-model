# Implementation Plan: Scenario Management

**Branch**: `003-scenario-management` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-scenario-management/spec.md`

## Summary

Add full CRUD + duplicate operations for scenarios within workspaces. Each scenario contains a plan design and optional assumption overrides. The system validates plan designs against IRS contribution limits (both employer and employee sides) and returns warnings alongside saved data. Follows the existing layered architecture: router → service → storage, with JSON file persistence within workspace directories.

## Technical Context

**Language/Version**: Python 3.12
**Primary Dependencies**: FastAPI 0.115.6, Pydantic 2.10.4, uvicorn 0.34.0
**Storage**: JSON files on local filesystem (`{base_path}/workspaces/{workspace_id}/scenarios/{scenario_id}.json`)
**Testing**: pytest
**Target Platform**: Local server (macOS/Linux)
**Project Type**: web-service (REST API)
**Performance Goals**: <5s create+retrieve, <2s list 50 scenarios, <3s duplicate
**Constraints**: Single-user per workspace, file-based persistence, no new dependencies
**Scale/Scope**: Up to 50 scenarios per workspace, 100 workspaces

## Constitution Check

*No constitution file found. No gates to evaluate.*

## Project Structure

### Documentation (this feature)

```text
specs/003-scenario-management/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── scenarios.md     # REST API contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── main.py                          # MODIFY: register scenarios router
├── models/
│   ├── scenario.py                  # EXISTING: Scenario model (no changes)
│   ├── plan_design.py               # EXISTING: PlanDesign model (no changes)
│   ├── assumptions.py               # EXISTING: Assumptions with IRS limits (no changes)
│   ├── assumptions_override.py      # EXISTING: Override model (no changes)
│   └── persona.py                   # EXISTING: Persona with deferral_rate (no changes)
├── routers/
│   ├── workspaces.py                # EXISTING (no changes)
│   └── scenarios.py                 # NEW: scenario CRUD + duplicate endpoints
├── services/
│   ├── workspace_service.py         # EXISTING (no changes)
│   ├── config_resolver.py           # EXISTING: resolve_config (no changes)
│   ├── exceptions.py                # MODIFY: add ScenarioNotFoundError
│   ├── scenario_service.py          # NEW: scenario business logic
│   └── irs_validator.py             # NEW: IRS limit validation
└── storage/
    ├── workspace_store.py           # EXISTING (no changes)
    └── scenario_store.py            # NEW: scenario file persistence

tests/
├── models/                          # EXISTING model tests (no changes)
├── test_scenario_service.py         # NEW: service unit tests
├── test_scenario_router.py          # NEW: API integration tests
├── test_irs_validator.py            # NEW: IRS validation tests
└── test_scenario_store.py           # NEW: storage tests
```

**Structure Decision**: Single project layout following the existing `api/` structure established by features 001 and 002. No new directories needed beyond adding files to existing `routers/`, `services/`, and `storage/` directories. Test files follow the existing flat-file pattern in `tests/`.

## Complexity Tracking

No constitution violations — no tracking needed.
