# Tasks: Social Security Benefit Estimator

**Input**: Design documents from `/specs/006-social-security-estimator/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included — feature involves financial calculations that require correctness validation per SSA methodology.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new dependencies needed. All existing (Python 3.12, FastAPI, Pydantic, NumPy, pytest). This phase is a no-op — proceed directly to Foundational.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Model extensions and reference data that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [P] Add `ss_claiming_age` field to Persona model in `api/models/persona.py`. Add `ss_claiming_age: int = Field(default=67, ge=62, le=70)` after the existing `include_social_security` field. Per data-model.md: range 62-70, default 67. Do NOT add cross-field validation with `age` at the model level (validated at estimation time since age changes).

- [X] T002 [P] Create `SSBenefitEstimate` and `SSEstimateResponse` Pydantic models in `api/models/ss_estimator.py`. Per data-model.md: `SSBenefitEstimate` has fields `persona_id` (UUID), `persona_name` (str), `claiming_age` (int), `monthly_benefit_today` (float), `annual_benefit_today` (float), `pia_monthly` (float), `claiming_adjustment_factor` (float), `aime` (int). `SSEstimateResponse` has `workspace_id` (UUID) and `estimates` (list[SSBenefitEstimate]). Add `SSEstimateRequest` with optional `persona_ids: list[UUID] | None = None`.

- [X] T003 [P] Extend `PersonaSimulationResult` in `api/models/simulation_result.py`. Add two fields: `ss_annual_benefit: float = 0.0` (deterministic scalar — annual SS benefit in today's dollars, $0 when toggled off) and `total_retirement_income: PercentileValues | None = None` (annual_withdrawal + ss_annual_benefit at each percentile, None if no distribution phase). Per contracts/simulation-response.md and data-model.md.

- [X] T004 Update default personas in `api/models/defaults.py`. Add explicit `ss_claiming_age=67` to all 8 default persona constructors in the `default_personas()` function. This ensures the field is documented in defaults even though the Pydantic default handles it.

- [X] T005 [P] Write tests for the new Persona `ss_claiming_age` field in `tests/models/test_persona.py`. Add test cases: (1) default claiming age is 67, (2) valid range 62-70 accepted, (3) values outside 62-70 raise ValidationError, (4) existing persona fields unchanged, (5) serialization includes new field.

- [X] T006 [P] Write tests for `SSBenefitEstimate` and `SSEstimateResponse` models in `tests/models/test_ss_estimator.py`. Test: (1) valid construction with all fields, (2) `aime` is int (whole dollars), (3) `claiming_age` in range 62-70, (4) serialization round-trip, (5) `SSEstimateResponse` with list of estimates.

**Checkpoint**: All models extended. Run `python -m pytest tests/models/ -v` — all tests pass.

---

## Phase 3: User Story 1 — Estimate Social Security Benefit for a Persona (Priority: P1) 🎯 MVP

**Goal**: Given a persona's age, salary, retirement age, and claiming age, compute the estimated monthly and annual SS benefit in today's dollars using the Fidelity GRP/SSA methodology.

**Independent Test**: Provide sample persona inputs and verify AIME, PIA, and final benefit against hand-calculated references using published SSA data.

### Implementation for User Story 1

- [X] T007 [US1] Create core SS estimator service in `api/services/ss_estimator.py`. This is the main implementation file. Structure it as a `SocialSecurityEstimator` class with the following components, all per research.md:

  **Reference data (embedded as module-level constants)**:
  - `AWI: dict[int, float]` — Complete AWI series 1951-2023 from research.md R2
  - `TAXABLE_MAX: dict[int, float]` — Complete taxable maximum series 1951-2026 from research.md R3
  - Named constants: `FRA = 67`, `MIN_CLAIMING_AGE = 62`, `MAX_CLAIMING_AGE = 70`, `EMPLOYMENT_START_AGE = 22`, `INDEXING_AGE = 60`, `COMPUTATION_YEARS = 35`, `BP1_BASE = 180`, `BP2_BASE = 1085`, `AWI_1977 = 9779.44`, `PIA_RATE_1 = 0.90`, `PIA_RATE_2 = 0.32`, `PIA_RATE_3 = 0.15`

  **Constructor**: `__init__(self, assumptions: Assumptions)` — stores inflation_rate and wage_growth_rate from workspace assumptions.

  **Helper methods** (all private, called by `estimate()`):
  - `_get_awi(self, year: int) -> float` — Returns published AWI if available, otherwise projects: `AWI[2023] * (1 + wage_growth_rate)^(year - 2023)`. Per R2.
  - `_get_taxable_max(self, year: int) -> float` — Returns published value if available, otherwise projects: `TAXABLE_MAX[2026] * (1 + wage_growth_rate)^(year - 2026)`. Per R3.
  - `_reconstruct_earnings(self, birth_year: int, current_age: int, salary: float, retirement_age: int, current_year: int) -> dict[int, float]` — Per R1: backward using AWI ratios for past years, forward using wage_growth_rate for future years. Cap each year at taxable max. Returns year→earnings dict.
  - `_index_earnings(self, earnings: dict[int, float], birth_year: int) -> dict[int, float]` — Per R4: index to age-60 year using AWI factors. Earnings after indexing year at nominal.
  - `_compute_aime(self, indexed_earnings: dict[int, float]) -> int` — Per R5: top 35 years, sum / 420, floor to whole dollar.
  - `_get_bend_points(self, year_turning_62: int) -> tuple[int, int]` — Per R6: `BP1 = round(180 * AWI[year-2] / 9779.44)`, `BP2 = round(1085 * AWI[year-2] / 9779.44)`.
  - `_compute_pia(self, aime: int, year_turning_62: int) -> float` — Per R6: three-tier formula, truncate to nearest dime.
  - `_claiming_adjustment_factor(self, claiming_age: int) -> float` — Per R7/R8: early reduction (two-tier: 5/9% first 36 months, 5/12% beyond) or delayed credit (2/3% per month up to age 70).
  - `_apply_cola_and_discount(self, pia: float, current_age: int, claiming_age: int) -> float` — Per R9: apply COLA from age 62 to claiming age (truncate to dime each year), apply claiming factor, discount to today's dollars.

  **Public method**:
  - `estimate(self, persona: Persona, retirement_age: int, current_year: int) -> SSBenefitEstimate` — Orchestrates the full pipeline: validate claiming_age >= current_age (raise ValueError if not), reconstruct earnings, index, compute AIME, compute PIA, apply COLA + claiming adjustment, discount to today's dollars. Return `SSBenefitEstimate` with all fields populated. Per R12: follow SSA truncation rules (AIME→floor dollar, PIA→floor dime, final monthly→floor dollar).

- [X] T008 [US1] Create standalone SS estimate router in `api/routers/ss_estimate.py`. Per contracts/ss-estimate.md: `POST /api/v1/workspaces/{workspace_id}/ss-estimate`. Accept optional `SSEstimateRequest` body with `persona_ids` filter. Load workspace via `WorkspaceService`, resolve assumptions from `base_config`, get retirement_age from `monte_carlo_config`. For each persona (filtered by persona_ids or all), call `SocialSecurityEstimator(assumptions).estimate(persona, retirement_age, current_year)`. Return `SSEstimateResponse`. Handle errors: 404 if workspace not found, 404 if persona_id not in workspace.

- [X] T009 [US1] Register SS estimate router in `api/main.py`. Import the new router and include it at the workspace-scoped path: `app.include_router(ss_estimate_router, prefix="/api/v1/workspaces/{workspace_id}", tags=["ss-estimate"])`. Follow the existing pattern used by other routers (workspaces, scenarios, simulations).

- [X] T010 [US1] Write core calculation unit tests in `tests/services/test_ss_estimator.py`. Test the following against hand-calculated references using the embedded AWI/taxable-max data:

  1. **AWI lookup and projection**: verify `_get_awi(2023)` returns 66621.80; verify future year projection uses wage_growth_rate.
  2. **Taxable max lookup and projection**: verify `_get_taxable_max(2026)` returns 184500; verify future year projection.
  3. **Earnings reconstruction**: for a persona aged 42, salary $120K, verify past earnings are scaled by AWI ratio and capped at taxable max. Verify future earnings grow at wage_growth_rate.
  4. **Earnings indexing**: verify earnings before indexing year multiplied by `AWI[indexing_year] / AWI[earnings_year]`; earnings after indexing year at nominal.
  5. **AIME**: verify top-35-year selection, $0 padding for fewer than 35 years, truncation to whole dollar.
  6. **Bend points**: verify 2025 bend points match published values ($1,226, $7,391). Verify projection formula for future years.
  7. **PIA**: verify three-tier formula with known AIME/bend-point inputs. Verify truncation to nearest dime.
  8. **Claiming adjustment**: verify factor at ages 62 (0.70), 63 (0.75), 64 (0.80), 65 (0.8667), 66 (0.9333), 67 (1.0), 68 (1.08), 69 (1.16), 70 (1.24).
  9. **End-to-end estimate**: for each acceptance scenario in spec.md US1: (a) persona aged 42, $120K salary, claiming 67; (b) persona aged 25, $40K salary, claiming 62; (c) persona aged 52, $210K salary, claiming 70. Verify PIA is within 2% of hand-calculated reference (SC-001).
  10. **Edge cases**: persona under 22 → AIME $0, PIA $0. Current age > claiming age → ValueError. Salary $0 → benefit $0. Salary above taxable max every year → earnings capped.

- [X] T011 [US1] Write standalone endpoint integration test in `tests/integration/test_ss_endpoint.py`. Use FastAPI TestClient. Test: (1) POST to `/api/v1/workspaces/{id}/ss-estimate` returns estimates for all 8 default personas (SC-005), (2) filtered `persona_ids` returns only requested personas, (3) 404 for non-existent workspace, (4) 404 for non-existent persona_id, (5) response matches `SSEstimateResponse` schema.

**Checkpoint**: Core SS estimator works. `python -m pytest tests/services/test_ss_estimator.py tests/integration/test_ss_endpoint.py -v` — all pass. The standalone endpoint returns correct estimates for all 8 default personas.

---

## Phase 4: User Story 2 — Toggle Social Security in Income Replacement Calculation (Priority: P2)

**Goal**: When `include_social_security` is true on a persona, the simulation results include the SS benefit in `ss_annual_benefit` and `total_retirement_income`. When false, `ss_annual_benefit` is $0 and `total_retirement_income` equals `annual_withdrawal`. The plan withdrawal (`annual_withdrawal`) is unchanged regardless of toggle.

**Independent Test**: Run the same simulation with SS on vs. off for the same persona. Verify `annual_withdrawal` is identical in both cases and `total_retirement_income` differs by exactly the SS benefit amount.

### Implementation for User Story 2

- [X] T012 [US2] Integrate SS estimator into `SimulationEngine` in `api/services/simulation_engine.py`. Modifications per research.md R10:

  1. Import `SocialSecurityEstimator` and `SSBenefitEstimate` from `api.services.ss_estimator` and `api.models.ss_estimator`.
  2. In `_simulate_persona()`, **after** the existing distribution phase and result construction (after line ~310 where `PersonaSimulationResult` is returned), add SS computation:
     - If `persona.include_social_security` is True: instantiate `SocialSecurityEstimator(self._assumptions)` and call `.estimate(persona, self._config.retirement_age, current_year)`. Set `ss_annual = ss_estimate.annual_benefit_today`.
     - If False: set `ss_annual = 0.0`.
  3. Set `ss_annual_benefit = ss_annual` on the result.
  4. Compute `total_retirement_income`: if `annual_withdrawal` is not None, create `PercentileValues(p25=aw.p25 + ss_annual, p50=aw.p50 + ss_annual, p75=aw.p75 + ss_annual, p90=aw.p90 + ss_annual)`. If `annual_withdrawal` is None, set to None.
  5. **CRITICAL**: Do NOT modify ANY existing accumulation or distribution phase code. The `annual_withdrawal` field MUST remain identical to current behavior (FR-016).

- [X] T013 [US2] Write simulation SS integration tests in `tests/integration/test_ss_simulation.py`. Test the following:

  1. **SS toggle on**: Run simulation for a persona with `include_social_security=True`. Verify `ss_annual_benefit > 0` and `total_retirement_income.p50 == annual_withdrawal.p50 + ss_annual_benefit` (SC-003).
  2. **SS toggle off**: Run simulation for same persona with `include_social_security=False`. Verify `ss_annual_benefit == 0.0` and `total_retirement_income` equals `annual_withdrawal` at each percentile (SC-004).
  3. **annual_withdrawal unchanged**: Run simulation for same persona with SS on and off. Verify `annual_withdrawal` is identical in both runs (FR-016). Use `seed` for determinism.
  4. **Mixed personas**: Run simulation with two personas — one SS on, one SS off. Verify each persona's results independently reflect their own toggle setting (spec US2 acceptance scenario 3).
  5. **Backward compatibility**: Verify `retirement_balance`, `trajectory`, and all existing fields are unchanged.
  6. **No distribution phase**: Persona already at retirement age — verify `total_retirement_income` is None when `annual_withdrawal` is None.
  7. **Consistency**: Verify standalone endpoint and simulation produce the same `ss_annual_benefit` for the same persona.

**Checkpoint**: Simulation integration complete. `python -m pytest tests/ -v` — all tests pass including existing simulation tests (no regression).

---

## Phase 5: User Story 3 — Configure Claiming Age Per Persona (Priority: P3)

**Goal**: Analysts can set claiming age (62-70) per persona and see the resulting benefit vary. Default is 67 if not specified.

**Independent Test**: Compute SS benefits for the same persona at claiming ages 62, 67, and 70. Verify ~30% reduction at 62, full PIA at 67, ~24% increase at 70 (SC-002).

### Implementation for User Story 3

- [X] T014 [US3] Write claiming age sensitivity tests in `tests/services/test_ss_estimator.py` (append to existing file). Test the following:

  1. **Default claiming age**: Create persona without explicit `ss_claiming_age`. Verify estimator uses 67 and benefit equals PIA (no adjustment).
  2. **Claiming age 62**: Verify benefit is approximately 70% of PIA (30% reduction). Per research.md R7: 60 months early = 20% (first 36 months) + 10% (next 24 months) = 30%.
  3. **Claiming age 70**: Verify benefit is approximately 124% of PIA (24% increase). Per research.md R8: 36 months late × 2/3% = 24%.
  4. **Each integer age 62-70**: Verify claiming adjustment factors match the reference table: 62→0.70, 63→0.75, 64→0.80, 65→0.8667, 66→0.9333, 67→1.0, 68→1.08, 69→1.16, 70→1.24 (SC-002).
  5. **Monotonicity**: Verify benefit strictly increases as claiming age increases from 62 to 70 for the same persona.
  6. **Claiming age validation**: Persona aged 25 with claiming age 24 — verify estimation raises ValueError (claiming_age < current_age, FR-013).
  7. **Different claiming ages in same simulation**: Two personas with different claiming ages in one simulation. Verify each persona's SS benefit reflects their own claiming age.

**Checkpoint**: Full claiming age range validated. `python -m pytest tests/ -v` — all tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [X] T015 Run all 8 default personas through the estimator and verify non-zero results for each (SC-005). Run: `python -m pytest tests/ -v`. Verify no regressions in existing tests (`tests/models/`, `tests/services/test_simulation_distribution.py`, `tests/integration/test_pluggability.py`).

- [X] T016 Run `ruff check api/ tests/` and fix any linting issues in new and modified files.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — can start immediately
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion (models must exist)
- **User Story 2 (Phase 4)**: Depends on Phase 3 completion (SS estimator service must exist for simulation to call it)
- **User Story 3 (Phase 5)**: Depends on Phase 3 completion (SS estimator service must exist for claiming age tests)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only → **MVP**
- **US2 (P2)**: Depends on US1 (needs the SS estimator service)
- **US3 (P3)**: Depends on US1 (needs the SS estimator service). Can run in **parallel** with US2.

```
Phase 2 (Foundational)
    │
    ▼
Phase 3 (US1: Core SS Calculation) ← MVP
    │
    ├──────────────┐
    ▼              ▼
Phase 4 (US2)  Phase 5 (US3)   ← can run in parallel
    │              │
    └──────┬───────┘
           ▼
    Phase 6 (Polish)
```

### Within Each Phase

- Tasks marked [P] can run in parallel
- T001-T006: All parallelizable (different files)
- T007 must complete before T008-T009 (endpoint needs the estimator)
- T010-T011 can run after T007-T009 complete
- T012 must complete before T013
- T014 can run after T007 completes

### Parallel Opportunities

**Phase 2** — All 6 tasks on different files, all parallelizable:
```
T001 (persona.py) || T002 (ss_estimator model) || T003 (simulation_result.py) || T004 (defaults.py) || T005 (test_persona.py) || T006 (test_ss_estimator model)
```

**Phase 3** — After T007 (core service), T008-T009 can start, then T010-T011:
```
T007 (core service) → T008 (router) || T009 (main.py) → T010 (unit tests) || T011 (endpoint tests)
```

**Phase 4 & 5** — Can run in parallel after US1 completes:
```
T012 (sim integration) → T013 (sim tests)
    ||  (parallel with)
T014 (claiming age tests)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T006)
2. Complete Phase 3: User Story 1 (T007-T011)
3. **STOP and VALIDATE**: All 8 default personas produce correct SS estimates via standalone endpoint
4. Deploy/demo if ready

### Incremental Delivery

1. Phase 2 → Foundation ready
2. Phase 3 (US1) → Standalone SS estimator works → **MVP!**
3. Phase 4 (US2) → SS integrated into simulation → Toggle on/off works
4. Phase 5 (US3) → Claiming age sensitivity validated → Full feature
5. Phase 6 → Polish → Ready for merge

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All reference data (AWI, taxable max, bend points) is embedded in the service file — no separate data files
- SS benefit is **deterministic** — computed once per persona, not per Monte Carlo trial
- SS benefit is **purely additive** — plan withdrawal unchanged, SS added alongside
- SSA truncation rules (floor, not round) must be followed per research.md R12
- The `current_year` for estimation should use `datetime.now(UTC).year` consistent with existing simulation engine
