# Tasks: Monte Carlo Simulation Engine

**Input**: Design documents from `/specs/004-simulation-engine/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/simulation.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Tests are omitted from task phases.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Model modifications and new model files that all user stories depend on

- [x] T001 [P] Add `wage_growth_std: float = Field(default=0.02, ge=0.0)` field to Assumptions model in `api/models/assumptions.py` — add after `wage_growth_rate` field (per data-model.md R3)
- [x] T002 [P] Add `wage_growth_std: float | None = Field(default=None, ge=0.0)` field to AssumptionsOverride model in `api/models/assumptions_override.py` — add after `wage_growth_rate` field
- [x] T003 [P] Create simulation result models in `api/models/simulation_result.py` — define PercentileValues (p25/p50/p75/p90 floats), YearSnapshot (age int + p25/p50/p75/p90), PersonaSimulationResult (persona_id UUID, persona_name str, retirement_balance PercentileValues, trajectory list[YearSnapshot]), and SimulationResponse (scenario_id UUID, num_simulations int, seed int|None, retirement_age int, personas list[PersonaSimulationResult]) per data-model.md
- [x] T004 Add exports for PercentileValues, YearSnapshot, PersonaSimulationResult, and SimulationResponse to `api/models/__init__.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core simulation engine that MUST be complete before any user story endpoint can work

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create `api/services/simulation_engine.py` with SimulationEngine class skeleton — constructor takes `assumptions: Assumptions`, `plan_design: PlanDesign`, `config: MonteCarloConfig`; define glide path constants (GLIDE_EQUITY_START=0.90, GLIDE_EQUITY_END=0.30, GLIDE_BOND_START=0.08, GLIDE_BOND_END=0.50, GLIDE_CASH_START=0.02, GLIDE_CASH_END=0.20, GLIDE_YEARS=40) as module-level constants per research.md R2
- [x] T006 Implement helper method `_get_deferral_limit(self, age: int) -> float` in `api/services/simulation_engine.py` — returns applicable IRS deferral limit based on age: under 50 = deferral_limit, 50-59 = deferral_limit + catchup_limit, 60-63 = deferral_limit + super_catchup_limit, 64+ = deferral_limit + catchup_limit (per FR-005)
- [x] T007 Implement helper method `_get_vesting_pct(self, vesting: VestingSchedule, tenure_years: int) -> float` in `api/services/simulation_engine.py` — immediate returns 1.0, cliff returns 1.0 if tenure >= years else 0.0, graded finds highest schedule entry <= tenure (per research.md R5)
- [x] T008 Implement helper method `_get_allocation(self, persona: Persona, current_year: int) -> tuple[float, float, float]` in `api/services/simulation_engine.py` — for CustomAllocation return (stock_pct, bond_pct, cash_pct) directly; for TargetDateAllocation compute years_to_target = target_date_vintage - current_year, then apply glide path linear interpolation formula (per research.md R2, FR-011)
- [x] T009 Implement helper method `_calculate_match(self, deferrals: np.ndarray, capped_comp: np.ndarray) -> np.ndarray` in `api/services/simulation_engine.py` — iterate through plan_design.match_tiers in order, for each tier compute tier_threshold = on_first_pct * capped_comp, applicable_deferral = min(remaining_deferral, tier_threshold), accumulate match_rate * applicable_deferral, decrement remaining_deferral (per FR-006)
- [x] T010 Implement helper method `_calculate_core(self, capped_comp: np.ndarray, age: int, tenure: int) -> np.ndarray` in `api/services/simulation_engine.py` — if core_age_service_tiers is defined, find matching tier where min_age <= age <= max_age and min_service <= tenure <= max_service (using tier's contribution_pct; 0 if no match); if tiers not defined, use core_contribution_pct * capped_comp (per FR-007)
- [x] T011 Implement core method `_simulate_persona(self, persona: Persona, rng: np.random.Generator) -> PersonaSimulationResult` in `api/services/simulation_engine.py` — handles the full year-by-year simulation loop per research.md R4 order of operations: (1) handle edge case where persona.age >= retirement_age (return current_balance for all percentiles, single trajectory entry), (2) initialize numpy arrays of shape (num_simulations,) for balances, salaries, deferral_rates, (3) apply auto-enrollment if deferral_rate==0 and auto_enroll_enabled (R8), (4) record year 0 trajectory (starting balance), (5) loop year 1..num_years: wage growth with noise N(wage_growth_rate, wage_growth_std), cap comp, auto-escalate, compute deferrals capped at age-based IRS limit, compute match/core, eligibility check (tenure*12 vs months), 415 limit enforcement (reduce core first then match per R6), vesting, sample 3 asset class returns blended by allocation, update balance = (balance + contributions) * (1 + blended_return), record trajectory, (6) compute percentiles [25,50,75,90] across trials for each year's balances, (7) build and return PersonaSimulationResult
- [x] T012 Implement public method `run(self, personas: list[Persona]) -> list[PersonaSimulationResult]` in `api/services/simulation_engine.py` — derive per-persona seeds from master seed using np.random.default_rng(seed).integers(0, 2**63, size=len(personas)) per research.md R7, iterate personas calling _simulate_persona with each persona's dedicated RNG, return list of results

**Checkpoint**: SimulationEngine can be instantiated and called directly with model objects — no HTTP layer needed yet

---

## Phase 3: User Story 1 — Run Simulation for a Scenario (Priority: P1) MVP

**Goal**: A consultant can trigger a simulation run via API and receive percentile balance projections at retirement for each persona

**Independent Test**: POST to `/simulate` endpoint with a workspace containing personas and a scenario with a plan design → response contains percentile balances (p25/p50/p75/p90) at retirement for each persona

### Implementation for User Story 1

- [x] T013 Create `api/routers/simulations.py` with SimulationRequest model (num_simulations: int|None with ge=1 le=10000, seed: int|None, both default None) and POST endpoint at `/{scenario_id}/simulate` — endpoint loads workspace via workspace_store, loads scenario via scenario_store, resolves effective assumptions via resolve_config(workspace.base_config, scenario.overrides), merges num_simulations/seed from request body over workspace.monte_carlo_config defaults, instantiates SimulationEngine and calls run(workspace.personas), updates scenario.last_run_at to utc now and saves via scenario_store, returns SimulationResponse (per contracts/simulation.md, FR-019, FR-021)
- [x] T014 Register simulations router in `api/main.py` — import router from api.routers.simulations, include_router with prefix `/workspaces/{workspace_id}/scenarios/{scenario_id}` on the api_router, following existing pattern for scenarios router
- [x] T015 [US1] Add error handling to simulate endpoint in `api/routers/simulations.py` — catch WorkspaceNotFoundError and ScenarioNotFoundError, return 404 with detail message matching existing patterns (per contracts/simulation.md error responses)

**Checkpoint**: POST `/api/v1/workspaces/{wid}/scenarios/{sid}/simulate` returns retirement percentiles for all personas. User Story 1 is fully functional.

---

## Phase 4: User Story 2 — View Year-by-Year Trajectory Data (Priority: P2)

**Goal**: Simulation results include year-by-year trajectory data at each percentile for charting

**Independent Test**: Run a simulation for a persona aged 30 with retirement age 67 → trajectory contains exactly 38 entries (ages 30-67), each with p25/p50/p75/p90 values

### Implementation for User Story 2

> **NOTE**: Trajectory data is already generated by the simulation engine in T011 (_simulate_persona records a YearSnapshot at each year). This phase validates correctness and ensures the response contract is met.

- [x] T016 [US2] Verify trajectory completeness in `api/services/simulation_engine.py` — ensure _simulate_persona produces exactly (retirement_age - persona.age + 1) trajectory entries per SC-006, first entry has age == persona.age with all percentiles == current_balance, last entry has age == retirement_age matching retirement_balance values; add assertion or validation if not already guaranteed by loop structure
- [x] T017 [US2] Verify edge case: persona at or past retirement age in `api/services/simulation_engine.py` — confirm the edge case handler in _simulate_persona returns a single YearSnapshot with age == persona.age and all percentiles == current_balance (per spec edge case and SC-006 where retirement_age - current_age + 1 = 1 when ages are equal)

**Checkpoint**: Trajectory data is complete, correctly sized, and covers all edge cases. User Stories 1 AND 2 are both functional.

---

## Phase 5: User Story 3 — Configure Simulation Parameters (Priority: P3)

**Goal**: Consultant can override num_simulations and seed in the request, and the system produces reproducible results with a fixed seed

**Independent Test**: POST with `{"seed": 42}` twice → identical results; POST with `{"num_simulations": 5000}` → response shows num_simulations=5000

### Implementation for User Story 3

> **NOTE**: The SimulationRequest model and parameter merging logic are already implemented in T013. This phase ensures correct override behavior and reproducibility.

- [x] T018 [US3] Verify parameter override logic in `api/routers/simulations.py` — ensure that when request body provides num_simulations, it overrides workspace.monte_carlo_config.num_simulations; when request body provides seed, it overrides workspace.monte_carlo_config.seed; when request body is empty or fields are None, workspace defaults are used (per FR-014, contracts/simulation.md)
- [x] T019 [US3] Verify seed reproducibility in `api/services/simulation_engine.py` — ensure that given the same seed, assumptions, plan_design, and personas, the engine produces identical results across multiple invocations (per FR-018, SC-003); verify per-persona seed derivation from R7 is correctly implemented

**Checkpoint**: All three user stories are functional. Simulations are configurable and reproducible.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, config resolver update, and validation across all stories

- [x] T020 Update `api/services/config_resolver.py` to handle the new `wage_growth_std` field — ensure resolve_config merges wage_growth_std from AssumptionsOverride onto Assumptions base, following the same scalar-field pattern used for inflation_rate and wage_growth_rate
- [x] T021 Verify all spec edge cases are handled in `api/services/simulation_engine.py` — salary exceeds IRS comp limit (capped at comp_limit), combined contributions exceed 415 limit (employer reduced first per R6), auto-escalation pushes deferral above IRS dollar limit (capped per FR-005), 0% deferral with no auto-enrollment (match is zero, only core accumulates), target-date past vintage (uses conservative glide path end per R2), single simulation trial (all percentiles equal single result), tenure below eligibility (contributions excluded per FR-017)
- [x] T022 Run `ruff check .` from project root and fix any linting issues across all new and modified files
- [x] T023 Run full test suite `pytest tests/ -v` from project root and verify all existing tests still pass (no regressions from wage_growth_std addition to Assumptions/AssumptionsOverride)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T001, T002, T003 are parallel. T004 depends on T003.
- **Foundational (Phase 2)**: Depends on T003 (simulation result models). T005 first, then T006-T010 are parallel helpers, T011 depends on all helpers (T006-T010), T012 depends on T011.
- **User Story 1 (Phase 3)**: Depends on T012 (engine complete). T013 first, T014 and T015 depend on T013.
- **User Story 2 (Phase 4)**: Depends on T011 (engine internals). T016, T017 are parallel.
- **User Story 3 (Phase 5)**: Depends on T013 (endpoint). T018, T019 are parallel.
- **Polish (Phase 6)**: Depends on all user stories. T020-T023 are sequential (T020 first, T021, then T022-T023).

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational phase — the MVP
- **User Story 2 (P2)**: Depends on Foundational phase (trajectory is generated inside the engine) — can be verified in parallel with US1 endpoint work
- **User Story 3 (P3)**: Depends on US1 endpoint (T013) for parameter override logic

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration

### Parallel Opportunities

**Phase 1** (all parallel):
```
T001 (assumptions.py) || T002 (assumptions_override.py) || T003 (simulation_result.py)
→ T004 (after T003)
```

**Phase 2** (helpers parallel after skeleton):
```
T005 (skeleton)
→ T006 || T007 || T008 || T009 || T010 (all parallel helpers)
→ T011 (core loop, depends on all helpers)
→ T012 (public API, depends on T011)
```

**Phases 3-5** (US2 can overlap with US1 endpoint work):
```
T013 → T014 + T015 (US1 endpoint)
T016 || T017 (US2 verification — can run alongside US1 endpoint work)
T018 || T019 (US3 verification — after T013)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004) — model changes
2. Complete Phase 2: Foundational (T005-T012) — simulation engine
3. Complete Phase 3: User Story 1 (T013-T015) — API endpoint
4. **STOP and VALIDATE**: POST to simulate endpoint → verify percentile balances returned
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Engine ready (testable via direct instantiation)
2. Add US1 endpoint → POST returns retirement percentiles (MVP!)
3. Verify US2 trajectory → Confirm year-by-year data is correct
4. Verify US3 configurability → Confirm seed reproducibility and param overrides
5. Polish → Config resolver, edge cases, linting, regression check

### Suggested MVP Scope

**User Story 1 only** (Phases 1-3, tasks T001-T015): A consultant can trigger a simulation and receive retirement balance percentiles. This is the core value proposition and accounts for the bulk of implementation effort (the engine itself). User Stories 2 and 3 are largely verification/validation of behavior already built into the engine.
