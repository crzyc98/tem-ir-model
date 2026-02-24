# Implementation Plan: Core Pydantic Data Models

**Branch**: `001-core-data-models` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-core-data-models/spec.md`

## Summary

Define 10+ validated Pydantic v2 data models for the RetireModel retirement plan modeling tool. Models cover the full domain: workspaces, scenarios, plan designs (tiered match, core contributions, auto-enrollment/escalation, vesting), personas with asset allocations, economic assumptions with structured asset class returns, and Monte Carlo simulation configuration. All models use sensible defaults, comprehensive field-level and cross-field validation, discriminated unions for polymorphic types (VestingSchedule, AssetAllocation), and full JSON serialization round-trip support. Includes a factory function returning 8 default employee personas spanning early career to near retirement.

## Technical Context

**Language/Version**: Python 3.12
**Primary Dependencies**: Pydantic 2.10.4, FastAPI 0.115.6 (existing)
**Storage**: N/A (models only — persistence is a separate feature)
**Testing**: pytest >= 8.0, jsonschema >= 4.20
**Target Platform**: Local desktop (macOS/Linux), single-user
**Project Type**: Web application (FastAPI backend + React SPA frontend)
**Performance Goals**: Model instantiation and validation < 1ms per model
**Constraints**: No external database dependencies, all validation at the model layer
**Scale/Scope**: 10+ Pydantic models, ~14 source files, ~14 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution file exists. Gates are not applicable. Proceeding with standard best practices.

**Post-Phase 1 re-check**: Design follows single-package structure (`api/models/`), uses only Pydantic (already a dependency), and adds no new architectural layers. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-core-data-models/
├── plan.md              # This file
├── research.md          # Phase 0 output — technology decisions
├── data-model.md        # Phase 1 output — entity definitions
├── quickstart.md        # Phase 1 output — usage guide
├── contracts/
│   └── model-exports.md # Phase 1 output — public API contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
api/
├── __init__.py              # (existing)
├── main.py                  # (existing)
├── models/
│   ├── __init__.py          # Public exports for all models
│   ├── base.py              # Shared utilities (_utc_now factory)
│   ├── asset_class_return.py # AssetClassReturn (FR-015)
│   ├── match_tier.py        # MatchTier (FR-001)
│   ├── vesting.py           # VestingSchedule union (FR-002)
│   ├── core_contribution_tier.py # CoreContributionTier (FR-016)
│   ├── plan_design.py       # PlanDesign (FR-003, FR-014)
│   ├── asset_allocation.py  # AssetAllocation union (FR-004)
│   ├── persona.py           # Persona (FR-005)
│   ├── assumptions.py       # Assumptions (FR-006)
│   ├── monte_carlo_config.py # MonteCarloConfig (FR-007, FR-013)
│   ├── workspace.py         # Workspace (FR-008)
│   ├── scenario.py          # Scenario (FR-009)
│   └── defaults.py          # default_personas() factory (FR-010)
└── routers/
    ├── __init__.py          # (existing)
    └── health.py            # (existing)

tests/
├── __init__.py
├── conftest.py              # Shared fixtures
└── models/
    ├── __init__.py
    ├── conftest.py           # Model-specific fixtures
    ├── test_asset_class_return.py
    ├── test_match_tier.py
    ├── test_vesting.py
    ├── test_core_contribution_tier.py
    ├── test_plan_design.py
    ├── test_asset_allocation.py
    ├── test_persona.py
    ├── test_assumptions.py
    ├── test_monte_carlo_config.py
    ├── test_workspace.py
    ├── test_scenario.py
    ├── test_defaults.py
    ├── test_serialization.py  # FR-011 round-trip tests
    └── test_json_schema.py    # FR-012 schema validation
```

**Structure Decision**: Single `api/` package with a `models/` subpackage. One module per model (or logical group). Tests in a top-level `tests/` directory mirroring source structure. This aligns with the existing project layout where `api/` is the backend package.

## Complexity Tracking

No constitution violations to justify. Design uses:
- Standard Pydantic v2 patterns (discriminated unions, model validators, default factories)
- No additional dependencies beyond pytest and jsonschema for testing
- No new architectural layers, services, or abstractions
