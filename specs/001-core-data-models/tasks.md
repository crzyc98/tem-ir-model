# Tasks: Core Pydantic Data Models

**Input**: Design documents from `/specs/001-core-data-models/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/model-exports.md, quickstart.md

**Tests**: Included — this is a data model feature with no UI or API endpoints; tests are the primary verification mechanism for all acceptance scenarios.

**Organization**: Tasks are grouped by user story. US1 (model instantiation) and US2 (validation rejection) share identical implementation code since Pydantic models define constraints at the field level. They are combined into a single phase. US3 and US4 are separate phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project configuration, package skeleton, and test infrastructure

- [x] T001 Create pyproject.toml at project root with project metadata (`name = "tem-ir-model"`, `requires-python = ">=3.12"`) and pytest configuration (`pythonpath = ["."]`, `addopts = ["--import-mode=importlib", "--strict-markers", "-ra"]`, `testpaths = ["tests"]`)
- [x] T002 [P] Create api/models/ package: empty api/models/__init__.py and api/models/base.py with `_utc_now()` helper function returning `datetime.now(UTC)` per research.md R3
- [x] T003 [P] Create tests/ directory structure: tests/__init__.py, tests/conftest.py (empty), tests/models/__init__.py, tests/models/conftest.py (empty) — directory layout per plan.md
- [x] T004 Add pytest>=8.0 and jsonschema>=4.20 to api/requirements.txt per plan.md testing dependencies

---

## Phase 2: US1 + US2 — Core Data Models & Validation (Priority: P1) 🎯 MVP

**Goal**: All 10+ Pydantic data models can be imported from `api.models`, instantiated with valid data using sensible defaults, and reject invalid data with clear error messages in 100% of defined validation scenarios.

**Independent Test**: Import models from `api.models`, create valid instances of every model, verify defaults, then attempt invalid data and confirm `ValidationError` is raised with correct field locations and messages. Run `pytest tests/models/` — all tests pass.

### Leaf Models (no interdependencies — all parallelizable)

- [x] T005 [P] [US1] Implement AssetClassReturn model in api/models/asset_class_return.py — two fields: `expected_return` (float) and `standard_deviation` (float, ge=0.0) per data-model.md FR-015
- [x] T006 [P] [US1] Implement MatchTier model in api/models/match_tier.py — two fields: `match_rate` (float, ge=0.0, le=1.0) and `on_first_pct` (float, ge=0.0, le=1.0), both required per data-model.md FR-001
- [x] T007 [P] [US1] Implement ImmediateVesting, CliffVesting, GradedVesting models and VestingSchedule discriminated union type alias in api/models/vesting.py — use Literal type fields with `Field(discriminator="type")` pattern per research.md R1; CliffVesting.years (int, ge=1, le=6), GradedVesting.schedule (dict[int, float]) per data-model.md FR-002
- [x] T008 [P] [US1] Implement CoreContributionTier model in api/models/core_contribution_tier.py — nullable `min_age`, `max_age`, `min_service`, `max_service` (int|None, ge=0) + required `contribution_pct` (float, ge=0.0, le=1.0); model_validator: at least one dimension must have non-null bounds, bounds ordering (min < max when both set) per data-model.md FR-016
- [x] T009 [P] [US1] Implement TargetDateAllocation and CustomAllocation models and AssetAllocation discriminated union type alias in api/models/asset_allocation.py — TargetDateAllocation: model_validator rejecting vintage < current year; CustomAllocation: model_validator checking stock_pct + bond_pct + cash_pct sums to 1.0 within ±0.01 tolerance per data-model.md FR-004

### Composite Models (depend on leaf models above)

- [x] T010 [P] [US1] Implement Persona model in api/models/persona.py — `id` (UUID, default_factory=uuid4), `name` (str), `label` (str), `age` (int, ge=18, le=80), `tenure_years` (int, ge=0, le=60), `salary` (float, gt=0), `deferral_rate` (float, ge=0.0, le=1.0), `current_balance` (float, ge=0), `allocation` (AssetAllocation), `include_social_security` (bool, default True) per data-model.md FR-005
- [x] T011 [P] [US1] Implement Assumptions model in api/models/assumptions.py — structured AssetClassReturn sub-models for equity (0.075/0.17), intl_equity (0.07/0.19), fixed_income (0.04/0.055), cash (0.03/0.01); inflation_rate (0.025), wage_growth_rate (0.03); IRS limits: comp_limit (345000), deferral_limit (23500), additions_limit (70000), catchup_limit (7500), super_catchup_limit (11250) — all with defaults per data-model.md FR-006
- [x] T012 [P] [US1] Implement MonteCarloConfig model in api/models/monte_carlo_config.py — `num_simulations` (int, ge=1, le=10000, default 1000), `seed` (int|None), `retirement_age` (int, ge=55, le=70, default 67), `planning_age` (int, ge=85, le=100, default 93); model_validator: planning_age > retirement_age per data-model.md FR-007/FR-013
- [x] T013 [US1] Implement PlanDesign model in api/models/plan_design.py — all fields per data-model.md FR-003; `match_tiers` (list, max_length=3), `core_age_service_tiers` (optional list, max_length=5); defaults: ImmediateVesting() for vesting fields; model_validators: (1) auto_escalation_cap >= auto_enroll_rate when both enabled (FR-014), (2) pairwise tier overlap detection using interval math from research.md R4 per FR-016

### Top-Level Models

- [x] T014 [P] [US1] Implement Workspace model in api/models/workspace.py — `id` (UUID, default_factory=uuid4), `name` (str), `client_name` (str), `created_at`/`updated_at` (datetime, default_factory=_utc_now from base.py), `base_config` (Assumptions, default Assumptions()), `personas` (list[Persona], default []), `monte_carlo_config` (MonteCarloConfig, default MonteCarloConfig()) per data-model.md FR-008
- [x] T015 [P] [US1] Implement Scenario model in api/models/scenario.py — `id` (UUID, default_factory=uuid4), `workspace_id` (UUID, required), `name` (str), `description` (str|None), `plan_design` (PlanDesign, required), `overrides` (Assumptions|None), `created_at`/`updated_at` (datetime, default_factory=_utc_now), `last_run_at` (datetime|None) per data-model.md FR-009
- [x] T016 [US1] Update api/models/__init__.py with all public exports: AssetClassReturn, MatchTier, ImmediateVesting, CliffVesting, GradedVesting, VestingSchedule, CoreContributionTier, PlanDesign, TargetDateAllocation, CustomAllocation, AssetAllocation, Persona, Assumptions, MonteCarloConfig, Workspace, Scenario per contracts/model-exports.md

### Tests

- [x] T017 [US1] Create shared test fixtures in tests/models/conftest.py — valid instances of each model (valid_match_tier, valid_vesting_immediate, valid_asset_allocation_target, valid_persona, default_assumptions, valid_plan_design, valid_workspace, valid_scenario) for reuse across test files
- [x] T018 [P] [US2] Write tests for AssetClassReturn in tests/models/test_asset_class_return.py — valid instantiation, negative standard_deviation rejected
- [x] T019 [P] [US2] Write tests for MatchTier in tests/models/test_match_tier.py — valid instantiation, match_rate/on_first_pct out of [0,1] range rejected
- [x] T020 [P] [US2] Write tests for VestingSchedule variants in tests/models/test_vesting.py — immediate (no extra fields), cliff (requires years 1-6, rejects 0 and 7), graded (requires schedule dict), discriminator correctly routes type field; acceptance scenario US2-4 (cliff without years rejected)
- [x] T021 [P] [US2] Write tests for CoreContributionTier in tests/models/test_core_contribution_tier.py — valid single-dimension (age only, service only), valid compound (age+service), all-null bounds rejected (acceptance scenario US2-6), invalid bounds ordering (min >= max), contribution_pct out of range
- [x] T022 [P] [US2] Write tests for AssetAllocation in tests/models/test_asset_allocation.py — valid target date, valid custom (sums to 1.0), past vintage year rejected, sum not 1.0 rejected within tolerance (acceptance scenario US2-2), discriminator correctly routes type field
- [x] T023 [P] [US2] Write tests for Persona in tests/models/test_persona.py — valid instantiation with auto-generated UUID, age < 18 rejected, negative salary rejected, deferral_rate > 1.0 rejected (acceptance scenario US2-1), current_balance negative rejected, include_social_security defaults to True
- [x] T024 [P] [US2] Write tests for Assumptions in tests/models/test_assumptions.py — zero-argument construction produces correct defaults (inflation 2.5%, wage growth 3.0%, equity return 7.5% per acceptance scenario US1-3), all AssetClassReturn sub-models have correct default values, negative returns are allowed (edge case)
- [x] T025 [P] [US2] Write tests for MonteCarloConfig in tests/models/test_monte_carlo_config.py — defaults (1000 sims, retirement 67, planning 93), planning_age <= retirement_age rejected (FR-013), num_simulations=1 accepted (edge case), seed optional
- [x] T026 [P] [US2] Write tests for PlanDesign in tests/models/test_plan_design.py — valid with 2 match tiers + graded vesting + auto-enroll (acceptance scenario US1-1), >3 match tiers rejected (acceptance scenario US2-3), escalation_cap < enroll_rate rejected when both enabled (FR-014), zero match tiers + zero core allowed (edge case), overlapping CoreContributionTier ranges rejected (acceptance scenario US2-5)
- [x] T027 [P] [US2] Write tests for Workspace in tests/models/test_workspace.py — auto-generated UUID, auto-populated timestamps, default empty personas list, default Assumptions and MonteCarloConfig instances
- [x] T028 [P] [US2] Write tests for Scenario in tests/models/test_scenario.py — auto-generated UUID, auto-populated timestamps, required workspace_id and plan_design, optional overrides and last_run_at

**Checkpoint**: All models importable from `api.models`. `pytest tests/models/` passes. US1 (valid instantiation + defaults) and US2 (validation rejection) acceptance scenarios verified. MVP complete.

---

## Phase 3: US3 — JSON Serialization & Schema Export (Priority: P2)

**Goal**: Every model instance can be serialized to JSON and deserialized back with zero data loss. JSON Schema export produces valid schemas for all models.

**Independent Test**: Round-trip every model through `model_dump_json()` → `model_validate_json()` and verify equality. Export JSON Schema and validate against the JSON Schema metaschema. Run `pytest tests/models/test_serialization.py tests/models/test_json_schema.py`.

- [x] T029 [P] [US3] Write JSON round-trip serialization tests in tests/models/test_serialization.py — test each model: Workspace (with personas and assumptions), Scenario, PlanDesign (with match tiers and vesting), Persona, Assumptions, MonteCarloConfig; verify UUID preservation, timestamp preservation, discriminated union round-trip (VestingSchedule, AssetAllocation) per FR-011 and acceptance scenario US3-1
- [x] T030 [P] [US3] Write JSON Schema export and validation tests in tests/models/test_json_schema.py — parametrize across all BaseModel types, validate each schema against `jsonschema.Draft202012Validator.check_schema()`, verify schemas include properties and titles, test TypeAdapter for VestingSchedule and AssetAllocation union types per FR-012 and acceptance scenario US3-2

**Checkpoint**: `pytest tests/models/test_serialization.py tests/models/test_json_schema.py` passes. All models round-trip correctly through JSON. All schemas are valid.

---

## Phase 4: US4 — Default Persona Set (Priority: P2)

**Goal**: A factory function returns exactly 8 default employee personas matching the product specification, spanning early career to near retirement.

**Independent Test**: Call `default_personas()`, verify count is 8, verify each persona's name/age/salary/allocation matches the PRD table. Run `pytest tests/models/test_defaults.py`.

- [x] T031 [US4] Implement default_personas() factory function in api/models/defaults.py — return list of 8 Persona instances matching PRD table: Jordan (25, $40k, TD2065), Priya (30, $65k, TD2060), Marcus (38, $90k, TD2055), Sarah (42, $120k, TD2050), David (48, $160k, TD2045), Michelle (52, $210k, TD2040), Robert (58, $140k, TD2035), Linda (55, $52k, TD2035) per data-model.md FR-010
- [x] T032 [US4] Add default_personas to api/models/__init__.py exports
- [x] T033 [US4] Write tests for default_personas in tests/models/test_defaults.py — exactly 8 returned (acceptance scenario US4-1), expected names present, age range 25-58, salary range $40k-$210k, all target-date allocations with vintages 2035-2065 (acceptance scenario US4-2), all pass Pydantic re-validation

**Checkpoint**: `pytest tests/models/test_defaults.py` passes. `from api.models import default_personas` works. 8 personas match spec.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [x] T034 Run full test suite with `pytest tests/ -v` and fix any failures
- [x] T035 Validate quickstart.md examples execute correctly in a Python REPL

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1+US2 (Phase 2)**: Depends on Setup (Phase 1) completion — BLOCKS all other stories
- **US3 (Phase 3)**: Depends on US1+US2 (needs models to exist for round-trip testing)
- **US4 (Phase 4)**: Depends on US1+US2 (needs Persona + AssetAllocation models)
- **US3 and US4 can run in parallel** — they are independent of each other
- **Polish (Phase 5)**: Depends on all desired stories being complete

### User Story Dependencies

- **US1+US2 (P1)**: Can start after Setup — no dependencies on other stories
- **US3 (P2)**: Depends on US1+US2 models existing for serialization tests
- **US4 (P2)**: Depends on Persona and AssetAllocation from US1+US2
- **US3 and US4 are independent of each other** — can run in parallel

### Within Phase 2 (US1+US2)

```
T005-T009 (leaf models) ──→ T010-T012 (composite models) ──→ T013 (PlanDesign)
                                                            ──→ T014-T015 (top-level)
                                                            ──→ T016 (__init__.py)
                                                            ──→ T017-T028 (tests)
```

- Leaf models (T005-T009) are all parallelizable — different files, no cross-dependencies
- Composite models (T010-T012) are parallelizable — each depends on different leaf models
- PlanDesign (T013) depends on MatchTier, VestingSchedule, CoreContributionTier
- Top-level models (T014-T015) depend on composite models
- Tests (T018-T028) depend on __init__.py exports (T016) and conftest (T017)
- Test files (T018-T028) are all parallelizable with each other

---

## Parallel Opportunities

### Phase 1 (Setup)

```
T001 (pyproject.toml) → then parallel:
  T002 (api/models/ skeleton)
  T003 (tests/ skeleton)
  T004 (requirements.txt)
```

### Phase 2 (US1+US2) — Leaf Models

```
All 5 leaf models in parallel:
  T005 (AssetClassReturn)
  T006 (MatchTier)
  T007 (VestingSchedule)
  T008 (CoreContributionTier)
  T009 (AssetAllocation)
```

### Phase 2 (US1+US2) — Composite Models

```
After leaf models, 3 composite models in parallel:
  T010 (Persona)
  T011 (Assumptions)
  T012 (MonteCarloConfig)
```

### Phase 2 (US1+US2) — Tests

```
After T016+T017, all 11 test files in parallel:
  T018 (test_asset_class_return)
  T019 (test_match_tier)
  T020 (test_vesting)
  T021 (test_core_contribution_tier)
  T022 (test_asset_allocation)
  T023 (test_persona)
  T024 (test_assumptions)
  T025 (test_monte_carlo_config)
  T026 (test_plan_design)
  T027 (test_workspace)
  T028 (test_scenario)
```

### Phase 3+4 (US3 and US4 in parallel)

```
After Phase 2:
  US3: T029 + T030 (parallel)
  US4: T031 → T032 → T033 (sequential)
  US3 and US4 are independent — run in parallel
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: All models + validation + tests (T005-T028)
3. **STOP and VALIDATE**: `pytest tests/models/ -v` — all pass
4. Models are importable, validated, and tested — MVP complete

### Incremental Delivery

1. Setup → Foundation ready
2. US1+US2 → All models with validation → `pytest` passes → **MVP!**
3. US3 → Serialization verified → JSON contract confirmed
4. US4 → Default personas available → Workspace initialization ready
5. Polish → Full confidence, quickstart validated

### Notes

- [P] tasks = different files, no dependencies — safe to parallelize
- [Story] label maps task to specific user story for traceability
- US1 and US2 are combined because Pydantic models inherently include validation — the "implementation" and "validation" are the same code
- Commit after each logical group (leaf models, composite models, tests)
- Stop at any checkpoint to verify independently
