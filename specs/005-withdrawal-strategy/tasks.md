# Tasks: Withdrawal Strategy Interface

**Input**: Design documents from `/specs/005-withdrawal-strategy/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — success criteria (SC-002, SC-003) explicitly require test validation, and the feature involves mathematical correctness (PMT formula) that demands automated verification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Create the withdrawal strategy interface and extend output models — both are required before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T001 [P] Create WithdrawalStrategy protocol and SystematicWithdrawal class in api/models/withdrawal_strategy.py

  Define `WithdrawalStrategy` as a Python `Protocol` (from `typing`) with a single method:
  ```python
  def calculate_withdrawal(
      self,
      current_balance: np.ndarray,       # shape (n,) — balance per trial before withdrawal
      year_in_retirement: int,            # 1-based index (1 = first retirement year)
      initial_retirement_balance: np.ndarray,  # shape (n,) — balance at retirement start
      params: dict[str, Any],             # strategy-specific parameters
  ) -> np.ndarray:                        # shape (n,) — nominal withdrawal per trial
  ```

  Implement `SystematicWithdrawal` class satisfying the protocol:
  - `calculate_withdrawal` computes a level real withdrawal using the PMT annuity-depletion formula
  - Required `params` keys: `total_years` (int), `real_return_rate` (float), `inflation_rate` (float)
  - PMT formula: `W_real = PV × r / (1 − (1 + r)^(−N))` where PV = `initial_retirement_balance`, r = `real_return_rate`, N = `total_years`
  - Edge case: if `|r| < 0.0001`, use `W_real = PV / N`
  - Convert to nominal: `W_nominal = W_real × (1 + inflation_rate)^year_in_retirement`
  - Cap withdrawal at `current_balance` per trial (no negative balances)
  - When `current_balance` is 0 for a trial, return 0 for that trial
  - All operations must be NumPy-vectorized (no Python loops over trials)

  Reference: research.md R1 (PMT formula), R4 (protocol design), data-model.md (WithdrawalStrategy, SystematicWithdrawal)

- [X] T002 [P] Extend output models in api/models/simulation_result.py

  Make three additive changes to existing Pydantic models:

  1. **YearSnapshot**: Add `withdrawal: PercentileValues | None = None`
     - Accumulation-phase snapshots: `withdrawal = None` (omitted from JSON via `exclude_none` or default behavior)
     - Distribution-phase snapshots: populated with withdrawal percentiles in real/today's dollars

  2. **PersonaSimulationResult**: Add `annual_withdrawal: PercentileValues | None = None`
     - Level real annual withdrawal amount at each percentile (p25/p50/p75/p90), in today's dollars
     - None when no distribution phase (retirement_age == planning_age)
     - Place it between `retirement_balance` and `trajectory` fields

  3. **SimulationResponse**: Add `planning_age: int`
     - Place it after the existing `retirement_age` field

  All changes are backward-compatible — new fields are either optional (None default) or additive.

  Reference: research.md R5, R6, R7; data-model.md (Extended Entities); contracts/simulation-response.md

**Checkpoint**: Foundation ready — WithdrawalStrategy protocol, SystematicWithdrawal, and extended output models are in place. User story implementation can now begin.

---

## Phase 2: User Story 1 — Simulate Retirement Income with Default Withdrawal Strategy (Priority: P1) 🎯 MVP

**Goal**: Extend the simulation engine to run a distribution phase from retirement age to planning age using the systematic withdrawal strategy. The trajectory output covers the full lifecycle (current age → planning age) with percentile balances and withdrawal amounts.

**Independent Test**: Run a simulation and verify: (1) trajectory extends to planning age, (2) p50 balance ≈ $0 at planning age, (3) withdrawal amounts are constant in real terms, (4) glide path continues shifting through retirement.

### Implementation for User Story 1

- [X] T003 [US1] Integrate distribution phase into SimulationEngine in api/services/simulation_engine.py

  This is the core implementation task. Modify `_simulate_persona()` to add a distribution phase loop after the existing accumulation loop:

  **1. Accept strategy parameter**: Add an optional `withdrawal_strategy` parameter to `SimulationEngine.__init__()` (default: `SystematicWithdrawal()`). Store as `self._strategy`. The engine must not import or reference the concrete class in its type hints — use the `WithdrawalStrategy` protocol type.

  **2. Compute distribution params** (after accumulation loop ends):
  - Capture `retirement_balances = balances.copy()` (shape `(n,)`)
  - Get allocation at retirement: `stock_pct, bond_pct, cash_pct = self._get_allocation(persona, current_year)` where `current_year` = calendar year at retirement age
  - Compute blended expected nominal return: `r_nominal = stock_pct * a.equity.expected_return + bond_pct * a.fixed_income.expected_return + cash_pct * a.cash.expected_return`
  - Compute real return rate (Fisher formula): `r_real = (1 + r_nominal) / (1 + a.inflation_rate) - 1`
  - Build params dict: `{"total_years": planning_age - retirement_age, "real_return_rate": r_real, "inflation_rate": a.inflation_rate}`

  **3. Distribution phase loop** (from `retirement_age + 1` to `planning_age` inclusive):
  ```
  for year_idx in range(1, distribution_years + 1):
      age = retirement_age + year_idx
      year_in_retirement = year_idx

      # Withdraw
      W_nominal = self._strategy.calculate_withdrawal(balances, year_in_retirement, retirement_balances, params)
      W_nominal = np.minimum(W_nominal, np.maximum(balances, 0.0))  # cap at balance
      balances = balances - W_nominal
      balances = np.maximum(balances, 0.0)  # floor at zero

      # Investment returns (reuse existing pattern)
      current_year = base_year + (retirement_age - persona.age) + year_idx
      stock_pct, bond_pct, cash_pct = self._get_allocation(persona, current_year)
      eq_ret = rng.normal(a.equity.expected_return, a.equity.standard_deviation, n)
      fi_ret = rng.normal(a.fixed_income.expected_return, a.fixed_income.standard_deviation, n)
      ca_ret = rng.normal(a.cash.expected_return, a.cash.standard_deviation, n)
      blended_return = stock_pct * eq_ret + bond_pct * fi_ret + cash_pct * ca_ret
      balances = balances * (1.0 + blended_return)
      balances = np.maximum(balances, 0.0)  # floor again after returns

      # Record
      all_balances.append(balances.copy())
      # Real withdrawal = nominal / (1 + inflation)^year_in_retirement
      W_real = W_nominal / ((1 + a.inflation_rate) ** year_in_retirement)
      all_withdrawals.append(W_real.copy())
  ```

  **4. Extend percentile computation**:
  - Existing balance percentile loop continues to work (just more entries in `all_balances`)
  - Add withdrawal percentile computation: for each distribution-phase year, compute `np.percentile(all_withdrawals[i], PERCENTILES)` and create `PercentileValues`
  - Attach `withdrawal=PercentileValues(...)` to distribution-phase `YearSnapshot` entries
  - Accumulation-phase snapshots keep `withdrawal=None`

  **5. Set headline metrics**:
  - Compute `annual_withdrawal` as percentiles of the real withdrawal amounts from year 1 of retirement (all trials): `PercentileValues(p25=..., p50=..., p75=..., p90=...)`
  - Set `annual_withdrawal=None` if `planning_age == retirement_age` (no distribution phase)

  **6. Edge cases**:
  - If `persona.age >= retirement_age`: skip distribution phase (existing early-return handles this)
  - If `planning_age == retirement_age`: no distribution phase, `annual_withdrawal = None`
  - `retirement_balances` of $0: PMT produces W=0, distribution loop runs but all withdrawals and balances are $0

  Reference: research.md R2 (real return), R3 (distribution integration), R8 (RNG continuity); spec.md FR-003 through FR-009, FR-012, FR-013; data-model.md (State Transitions)

- [X] T004 [US1] Update simulation router in api/routers/simulations.py

  Modify the `run_simulation` endpoint:
  - Add `planning_age=config.planning_age` to the `SimulationResponse` constructor
  - The engine already defaults to SystematicWithdrawal, so no strategy instantiation needed in the router
  - Ensure `config.planning_age` is passed through to the engine (it reads from `self._config.planning_age`)

  Reference: contracts/simulation-response.md; research.md R7

- [X] T005 [P] [US1] Write SystematicWithdrawal unit tests in tests/models/test_withdrawal_strategy.py

  Test the PMT calculation and edge cases:
  - **PMT correctness**: Given known PV, r, N → verify W_real matches hand-calculated value. Example: PV=$100,000, r=0.04, N=26 → W ≈ $6,280
  - **Zero real rate**: When `|r| < 0.0001`, verify W = PV / N (simple division)
  - **Zero balance**: When `current_balance` is all zeros → withdrawal is all zeros
  - **Partial depletion**: Array of mixed balances (some $0, some positive) → $0 trials get $0 withdrawal, positive trials get PMT amount
  - **Cap at balance**: When PMT amount exceeds remaining balance → withdrawal capped at balance
  - **Nominal conversion**: Verify `W_nominal = W_real × (1 + inflation)^year_in_retirement` for years 1, 5, 26
  - **Vectorization**: Verify output shape matches input shape for arrays of size 1, 100, 10000
  - **Protocol conformance**: Verify SystematicWithdrawal satisfies `isinstance(obj, WithdrawalStrategy)` using `runtime_checkable`

  Reference: research.md R1, R4; data-model.md (SystematicWithdrawal constraints)

- [X] T006 [P] [US1] Write distribution phase integration tests in tests/services/test_simulation_distribution.py

  Test the full engine with distribution phase enabled:
  - **Trajectory length**: Given persona age 25, retirement_age 67, planning_age 93 → trajectory has 69 entries (ages 25–93 inclusive)
  - **Balance depletion (SC-002)**: With seed for reproducibility, verify p50 balance at planning_age is within 1% of initial retirement balance of $0 (i.e., approximately $0)
  - **Accumulation unchanged (FR-013)**: Run simulation with and without distribution phase (set planning_age == retirement_age for control). Verify accumulation-phase trajectory is identical.
  - **Glide path continuation (FR-005)**: For target-date persona, verify allocation at retirement+10 is more conservative than at retirement (lower equity, higher bonds)
  - **Custom allocation unchanged (FR-006)**: For custom allocation persona, verify allocation is identical at retirement and retirement+10
  - **Balance floor (FR-007)**: With a low-balance scenario, verify no trial has a negative balance at any distribution-phase year
  - **RNG reproducibility (R8)**: Same seed produces identical results across runs
  - **No distribution phase**: When planning_age == retirement_age, verify trajectory ends at retirement_age and annual_withdrawal is None
  - **Zero balance at retirement**: Persona starting at retirement age or with $0 balance → distribution phase has all-zero withdrawals and balances

  Use a small `num_simulations` (100-500) with a fixed seed for fast, deterministic tests. Use default personas from `api/models/defaults.py` where possible.

  Reference: spec.md (acceptance scenarios, edge cases, FR-003 through FR-009, FR-013); quickstart.md (validation checklist)

**Checkpoint**: At this point, User Story 1 should be fully functional. Running a simulation produces a complete accumulation + distribution trajectory with withdrawal amounts, and all core behaviors (PMT, glide path, floor, percentiles) are verified by tests.

---

## Phase 3: User Story 2 — Swap Withdrawal Strategy Without Engine Changes (Priority: P2)

**Goal**: Prove the WithdrawalStrategy interface is truly pluggable by implementing a trivial alternative strategy and running it through the engine without any engine modifications.

**Independent Test**: Create a FixedDollarWithdrawal strategy, pass it to the engine, and verify the simulation produces different distribution-phase results while accumulation results remain identical.

### Implementation for User Story 2

- [X] T007 [US2] Write pluggability validation test in tests/integration/test_pluggability.py

  Create a test file that validates SC-003 (alternative strategy with zero engine changes):

  1. **Define FixedDollarWithdrawal** (inside the test file, not in api/):
     - Implements the `calculate_withdrawal` interface
     - Returns a fixed nominal dollar amount per year (e.g., $20,000) regardless of balance or year
     - Caps at current_balance (same as systematic)

  2. **Test: Alternative strategy runs without engine changes**:
     - Create SimulationEngine with `withdrawal_strategy=FixedDollarWithdrawal()`
     - Run simulation → verify it completes without errors
     - Verify distribution-phase trajectory is populated

  3. **Test: Accumulation results identical, distribution differs**:
     - Run same scenario with SystematicWithdrawal and FixedDollarWithdrawal (same seed)
     - Verify accumulation-phase YearSnapshots are identical (same p25/p50/p75/p90 at each age up to retirement)
     - Verify distribution-phase results differ (different balance and/or withdrawal percentiles)

  4. **Test: Fixed strategy produces expected withdrawals**:
     - Verify FixedDollarWithdrawal returns the expected fixed amount (or balance cap) at each year

  Reference: spec.md US2 acceptance scenarios; research.md R4 (protocol design); SC-003

**Checkpoint**: At this point, pluggability is proven. Any class implementing `calculate_withdrawal` with the correct signature works as a drop-in replacement.

---

## Phase 4: User Story 3 — Review Withdrawal Amounts Alongside Balance Trajectory (Priority: P3)

**Goal**: Verify that the simulation output includes withdrawal amounts in the distribution-phase trajectory, enabling consultants to see annual retirement income alongside remaining balances.

**Independent Test**: Run a simulation and verify each distribution-phase YearSnapshot has a `withdrawal` field with PercentileValues in real/today's dollars.

### Implementation for User Story 3

- [X] T008 [US3] Add withdrawal output verification tests to tests/services/test_simulation_distribution.py

  Add test cases specifically validating the withdrawal output contract (US3 acceptance scenarios):

  1. **Test: Distribution snapshots include withdrawal PercentileValues**:
     - Run simulation → iterate trajectory
     - For ages > retirement_age: assert `snapshot.withdrawal is not None` and has p25/p50/p75/p90
     - For ages ≤ retirement_age: assert `snapshot.withdrawal is None`

  2. **Test: Withdrawal amounts constant in real terms**:
     - Run simulation with systematic strategy → collect `snapshot.withdrawal.p50` for all distribution years
     - Verify all p50 values are identical (constant real withdrawal)
     - Note: lower percentiles (p25) may drop to $0 in later years as trials deplete — this is expected

  3. **Test: annual_withdrawal headline metric present**:
     - Verify `PersonaSimulationResult.annual_withdrawal` is populated and matches the withdrawal values from year 1 of the distribution phase

  4. **Test: SimulationResponse includes planning_age**:
     - Verify `SimulationResponse.planning_age` equals the configured planning age

  Reference: spec.md US3 acceptance scenarios; contracts/simulation-response.md; FR-008, FR-009; SC-005

**Checkpoint**: All user stories are complete. The simulation produces full lifecycle trajectories with withdrawal amounts, the interface is pluggable, and the output contract is verified.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories and performance verification.

- [X] T009 Run full test suite and validate all success criteria

  Execute `python -m pytest tests/ -v` from project root. Verify:
  - All tests pass (T005, T006, T007, T008)
  - SC-001: Trajectory extends from current age through planning age for every persona
  - SC-002: p50 balance ≈ $0 at planning age (within 1% of initial retirement balance)
  - SC-003: Alternative strategy validated by pluggability test
  - SC-005: Distribution-phase snapshots include withdrawal PercentileValues

- [X] T010 Verify performance target SC-004

  Run a timed simulation to verify performance remains within targets now that the distribution phase is included:
  - 1,000 trials × 8 default personas (accumulation + distribution): < 10 seconds
  - 10,000 trials × 8 default personas (accumulation + distribution): < 60 seconds
  - If targets are missed, profile and optimize the distribution phase loop (likely candidates: redundant copies, unnecessary allocations)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately
- **User Story 1 (Phase 2)**: Depends on Phase 1 completion — CORE MVP
- **User Story 2 (Phase 3)**: Depends on Phase 2 (needs working engine with strategy parameter)
- **User Story 3 (Phase 4)**: Depends on Phase 2 (needs working distribution phase output)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — No dependencies on other stories
- **US2 (P2)**: Depends on US1 (needs the engine to accept a strategy parameter)
- **US3 (P3)**: Depends on US1 (needs the engine to produce withdrawal output). Can run in parallel with US2.

### Within Each Phase

- T001 and T002 are parallel (different files)
- T003 must complete before T004 (router depends on engine changes)
- T005 and T006 are parallel with each other and can start as soon as T001 completes (T005) or T003 completes (T006)
- T007 can start as soon as T003 completes
- T008 can start as soon as T003 completes (parallel with T007)

### Parallel Opportunities

```text
Phase 1:  T001 ─┐
          T002 ─┤ (parallel — different files)
                │
Phase 2:  T003 ─┤ (depends on T001 + T002)
          T004 ─┤ (depends on T003)
          T005 ─┤ (parallel with T006 — different files; can start after T001)
          T006 ─┘ (parallel with T005 — different files; can start after T003)
                │
Phase 3:  T007 ─┤ (depends on T003)
Phase 4:  T008 ─┘ (depends on T003; parallel with T007 — different files)
                │
Phase 5:  T009 ─┤ (depends on all above)
          T010 ─┘ (depends on T009)
```

---

## Parallel Example: Foundational Phase

```text
# Launch both foundational tasks together:
Task T001: "Create WithdrawalStrategy protocol + SystematicWithdrawal in api/models/withdrawal_strategy.py"
Task T002: "Extend output models in api/models/simulation_result.py"
```

## Parallel Example: User Story 1

```text
# After T003 completes, launch tests in parallel:
Task T005: "Write SystematicWithdrawal unit tests in tests/models/test_withdrawal_strategy.py"
Task T006: "Write distribution phase integration tests in tests/services/test_simulation_distribution.py"
```

## Parallel Example: User Story 2 + 3

```text
# After T003 completes, US2 and US3 can proceed in parallel:
Task T007: "Write pluggability validation test in tests/integration/test_pluggability.py"
Task T008: "Add withdrawal output verification tests in tests/services/test_simulation_distribution.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Foundational (T001, T002 in parallel)
2. Complete Phase 2: US1 implementation (T003, T004 sequential; T005, T006 parallel)
3. **STOP and VALIDATE**: Run tests, verify trajectory to planning age, p50 ≈ $0
4. Deploy/demo if ready — this delivers the core "retirement income simulation" value

### Incremental Delivery

1. Complete Foundational → protocol + output models ready
2. Complete US1 → full lifecycle simulation working (MVP!)
3. Complete US2 → pluggability proven for proprietary model integration
4. Complete US3 → withdrawal output contract verified
5. Polish → performance validated, all SC confirmed

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All operations on trial arrays must be NumPy-vectorized — no Python loops over the `n` dimension
- Withdrawal amounts in output are always in **real/today's dollars** (not nominal)
- The `calculate_withdrawal` method returns **nominal** dollars internally; conversion to real happens in the engine when recording snapshots
- Use fixed seeds in all tests for deterministic, reproducible assertions
- Commit after each task or logical group
