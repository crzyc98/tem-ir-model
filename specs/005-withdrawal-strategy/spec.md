# Feature Specification: Withdrawal Strategy Interface

**Feature Branch**: `005-withdrawal-strategy`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Design a pluggable withdrawal strategy interface for the distribution phase (retirement age to planning age). Define a WithdrawalStrategy protocol with a calculate_withdrawal method that takes current balance, year in retirement, initial retirement balance, and parameters. Implement a systematic withdrawal placeholder that calculates a level real (inflation-adjusted) annual withdrawal amount designed to deplete the portfolio to $0 at the planning age. The post-retirement asset allocation continues to shift along the target-date glide path through retirement. The interface must be designed so that our proprietary income model can be bolted on later as a drop-in replacement without changing the simulation engine."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simulate Retirement Income with Default Withdrawal Strategy (Priority: P1)

A plan consultant runs a Monte Carlo simulation for a workspace containing multiple personas. After the accumulation phase ends at retirement age, the system automatically continues the simulation through the distribution phase up to the planning age (default 93). Each year in retirement, the system calculates the withdrawal amount using the default systematic withdrawal strategy — a level real (inflation-adjusted) annual withdrawal that depletes the portfolio to $0 at the planning age. The consultant sees the full trajectory from current age through planning age, including both the accumulation and distribution phases, allowing them to assess whether the plan design produces adequate retirement income.

**Why this priority**: This is the core value of the feature — extending the simulation beyond retirement age to answer the fundamental question: "Will this plan design provide enough retirement income?" Without the distribution phase, the simulation only shows a lump-sum balance at retirement, which is far less actionable for plan sponsors.

**Independent Test**: Can be fully tested by running a simulation and verifying that the trajectory extends from current age through planning age, with year-over-year declining balances in the distribution phase that reach approximately $0 at the planning age.

**Acceptance Scenarios**:

1. **Given** a workspace with personas and a scenario with no withdrawal strategy override, **When** a simulation is run, **Then** the trajectory includes year-by-year snapshots from current age through planning age, with the distribution phase using the default systematic withdrawal strategy.
2. **Given** a persona with a target-date fund allocation, **When** the simulation runs through the distribution phase, **Then** the asset allocation continues to shift along the glide path each year through retirement (becoming progressively more conservative).
3. **Given** a persona whose accumulation phase ends at retirement age 67 with planning age 93, **When** the systematic withdrawal strategy is applied, **Then** the withdrawal amount is a level real annual amount calculated so that the portfolio reaches approximately $0 at age 93 (across the median simulation path).
4. **Given** a simulation with 1,000 trials, **When** the distribution phase is computed, **Then** percentile trajectory values (p25, p50, p75, p90) are reported for each year of retirement, reflecting the range of possible outcomes.

---

### User Story 2 - Swap Withdrawal Strategy Without Engine Changes (Priority: P2)

A development team building a proprietary income model creates a new withdrawal strategy that conforms to the withdrawal strategy interface. They register it as the active strategy for a scenario and run a simulation. The simulation engine uses the new strategy for the distribution phase without any code changes to the engine itself. This proves the interface is truly pluggable.

**Why this priority**: The explicit design goal is extensibility — ensuring the proprietary income model can be bolted on later as a drop-in replacement. Validating that the interface supports this without engine changes is critical to the architectural promise of the feature.

**Independent Test**: Can be tested by implementing a trivial alternative strategy (e.g., fixed-dollar withdrawal) that conforms to the interface, plugging it in, and verifying the simulation produces different distribution-phase results without modifying the engine.

**Acceptance Scenarios**:

1. **Given** a withdrawal strategy that conforms to the defined interface, **When** it is provided to the simulation engine, **Then** the engine uses it for the distribution phase without any code changes to the engine.
2. **Given** two different withdrawal strategies that both conform to the interface, **When** simulations are run with each, **Then** the accumulation-phase results are identical and only the distribution-phase results differ.

---

### User Story 3 - Review Withdrawal Amounts Alongside Balance Trajectory (Priority: P3)

A plan consultant reviewing simulation results wants to understand not just the balance trajectory but also the annual withdrawal amounts during retirement. For each year in the distribution phase, the results include the withdrawal amount alongside the remaining balance, so the consultant can assess whether the income stream is adequate for retirees.

**Why this priority**: Showing withdrawal amounts alongside balances provides a complete picture of retirement adequacy. Without it, the consultant only sees balances declining but cannot easily communicate the implied annual income to plan sponsors.

**Independent Test**: Can be tested by running a simulation and verifying that the distribution-phase trajectory includes both the remaining balance and the annual withdrawal amount for each year.

**Acceptance Scenarios**:

1. **Given** a completed simulation with distribution phase, **When** the results are returned, **Then** each year-snapshot in the distribution phase includes the annual withdrawal amount in addition to the remaining balance.
2. **Given** a simulation using the systematic withdrawal strategy, **When** the distribution-phase results are reviewed, **Then** the annual withdrawal amount is constant across all years because it is reported in real/today's dollars.

---

### Edge Cases

- What happens when the retirement balance is $0 at the start of the distribution phase? The withdrawal amount should be $0 for all years, and the balance should remain $0 through planning age.
- What happens when a simulation trial produces a negative return large enough that the balance would go below $0 mid-retirement? The balance should be floored at $0, and subsequent withdrawal amounts should be $0 for that trial.
- What happens when retirement age equals planning age (no distribution phase)? The distribution phase should be skipped entirely, and results should be identical to the current accumulation-only output.
- What happens when a persona uses a custom (fixed) asset allocation instead of target-date? The custom allocation should remain unchanged throughout the distribution phase (no glide path shift), consistent with the accumulation-phase behavior.
- How does the systematic withdrawal calculation handle the very last year (planning age)? The final withdrawal should equal the remaining balance, depleting the portfolio to exactly $0.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a withdrawal strategy interface with a method that accepts current balance, year in retirement, initial retirement balance, and a parameters object, and returns the withdrawal amount for that year.
- **FR-002**: System MUST implement a default systematic withdrawal strategy that computes a level real (inflation-adjusted) annual withdrawal amount designed to deplete the portfolio to $0 at the planning age.
- **FR-003**: System MUST extend the simulation engine to continue year-by-year simulation from retirement age through planning age (the distribution phase), applying the active withdrawal strategy each year.
- **FR-004**: System MUST apply investment returns during the distribution phase using the same asset-class return assumptions and random sampling as the accumulation phase.
- **FR-005**: System MUST continue shifting the target-date glide path allocation during the distribution phase, consistent with the accumulation-phase glide path logic.
- **FR-006**: System MUST maintain custom (fixed) asset allocations unchanged during the distribution phase, consistent with the accumulation-phase behavior.
- **FR-007**: System MUST floor individual trial balances at $0 during the distribution phase — if a trial's balance is depleted before the planning age, withdrawals for that trial become $0 for remaining years.
- **FR-008**: System MUST include annual withdrawal amounts in real/today's dollars in the distribution-phase trajectory output alongside remaining balances, consistent with the project convention that all values are pre-tax in today's dollars.
- **FR-009**: System MUST report percentile values (p25, p50, p75, p90) for both balances and withdrawal amounts (in real/today's dollars) across all trials for each year in the distribution phase.
- **FR-010**: System MUST allow the withdrawal strategy to be swapped at the code level without modifying the simulation engine code — the engine accepts any object conforming to the withdrawal strategy interface. No user-facing or API-level strategy selection mechanism is provided in this feature.
- **FR-011**: System MUST use the systematic withdrawal strategy as the sole hardcoded strategy. A selection mechanism will be introduced when an alternative strategy (e.g., proprietary income model) is available.
- **FR-012**: The systematic withdrawal strategy MUST calculate the level withdrawal amount using the initial retirement balance, the number of years in retirement (planning age minus retirement age), and the expected real return rate, such that the portfolio is projected to reach $0 at the planning age.
- **FR-013**: System MUST produce the same accumulation-phase results regardless of which withdrawal strategy is used — the withdrawal strategy only affects the distribution phase.

### Key Entities

- **WithdrawalStrategy**: The pluggable interface that defines how annual withdrawal amounts are calculated during the distribution phase. Accepts current balance, year in retirement, initial retirement balance, and strategy-specific parameters. Returns the withdrawal amount for that year.
- **SystematicWithdrawal**: The default implementation of WithdrawalStrategy. Calculates a level real annual withdrawal amount (analogous to the PMT formula for an annuity) that depletes the portfolio to $0 over the retirement horizon. Parameters include the number of years in retirement and the expected real return rate.
- **YearSnapshot (extended)**: The existing per-year trajectory record, extended to include a withdrawal amount field for distribution-phase years. Accumulation-phase snapshots have no withdrawal amount.
- **Distribution Phase**: The period from retirement age to planning age during which the portfolio is drawn down. Each year: (1) withdraw, (2) apply investment returns on the remaining balance, (3) shift glide path allocation.

## Clarifications

### Session 2026-02-24

- Q: How is the active withdrawal strategy associated with a simulation run? → A: Hardcode systematic as the only strategy with no user-facing selection mechanism. Pluggability lives at the code level (protocol/interface) only. No API surface for strategy selection until the proprietary model is ready.
- Q: Should withdrawal amounts in the output be reported in nominal or real/today's dollars? → A: Real/today's dollars. Consistent with the PRD's "all values are pre-tax in today's dollars" convention and with plan sponsor expectations. Makes income replacement ratio intuitive since final salary is also in today's dollars.

## Assumptions

- The systematic withdrawal amount is computed once at the start of retirement using the actual realized retirement balance for each trial (not the median). This means each trial has its own level withdrawal amount.
- The "level real" withdrawal is constant in today's dollars. Internally, the nominal withdrawal grows by the inflation rate each year to maintain purchasing power, but the output reports the constant real value. This is consistent with the PRD convention that all values are pre-tax in today's dollars, and aligns with plan sponsor expectations (e.g., income replacement ratio is intuitive since final salary is also in today's dollars).
- The order of operations each distribution-phase year is: (1) withdraw from the portfolio, (2) apply investment returns to the remaining balance, (3) record the snapshot.
- The expected real return rate used in the systematic withdrawal calculation is derived from the blended portfolio return assumption minus the inflation rate, using the allocation at retirement age.
- Social Security is out of scope for this feature. The `include_social_security` toggle on Persona is not used by the withdrawal strategy.
- The withdrawal strategy interface is designed to be stateless per call — each invocation receives all necessary context as arguments, making strategies easy to test and swap.
- No API endpoint, request parameter, or persisted configuration field is introduced for strategy selection. The systematic withdrawal strategy is hardcoded as the sole active strategy. Swapping to a new strategy is a code-level change (one-line replacement) that does not require simulation engine modifications.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Simulation results extend from current age through planning age, providing a complete accumulation-plus-distribution trajectory for every persona.
- **SC-002**: Using the systematic withdrawal strategy, the median (p50) balance across trials reaches approximately $0 (within 1% of the initial retirement balance) at the planning age.
- **SC-003**: An alternative withdrawal strategy can be implemented and used by the simulation engine with zero changes to the engine code, validated by a test.
- **SC-004**: Distribution-phase simulation performance remains within existing performance targets: 1,000 trials across 8 personas complete in under 10 seconds, 10,000 trials in under 60 seconds (inclusive of both accumulation and distribution phases).
- **SC-005**: Each distribution-phase year-snapshot includes both the remaining balance and the withdrawal amount, at all reported percentiles.
