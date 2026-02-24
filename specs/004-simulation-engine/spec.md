# Feature Specification: Monte Carlo Simulation Engine

**Feature Branch**: `004-simulation-engine`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Build the Monte Carlo simulation engine. Given a plan design, a persona, and assumptions, simulate the accumulation phase year-by-year from current age to retirement age: apply wage growth with noise, calculate employee deferrals (with auto-escalation and IRS limits), calculate employer match per tiered formula, calculate employer core contributions, enforce the 415 annual additions limit, apply vesting based on tenure, generate annual returns from a normal distribution based on asset allocation, and shift target-date allocations along a glide path. All values are pre-tax in today's dollars. IRS limits are held constant. Run 1,000 simulations by default (configurable up to 10,000). Output percentile balances (25th, 50th, 75th, 90th) at retirement and year-by-year trajectory data for charting."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Simulation for a Scenario (Priority: P1)

A retirement plan consultant selects a scenario (which contains a plan design, personas, and assumptions) and runs a Monte Carlo simulation to project retirement outcomes for each persona. The system simulates the accumulation phase from each persona's current age to retirement age across many randomized trials, then returns percentile-based balance projections at retirement.

**Why this priority**: This is the core value proposition — without the ability to run simulations and see projected retirement balances, no other feature in this specification delivers value.

**Independent Test**: Can be fully tested by providing a scenario with at least one persona and one plan design, triggering a simulation run, and verifying that percentile balances (25th, 50th, 75th, 90th) are returned for each persona at retirement age.

**Acceptance Scenarios**:

1. **Given** a workspace with a scenario containing a valid plan design and at least one persona, **When** the user triggers a simulation run, **Then** the system returns percentile balance projections (25th, 50th, 75th, 90th) at retirement for each persona.
2. **Given** a scenario with multiple personas of different ages and salaries, **When** the simulation runs, **Then** each persona receives independent results reflecting their unique starting conditions.
3. **Given** a scenario with default assumptions, **When** the simulation runs with 1,000 trials, **Then** results are returned within a reasonable time and percentile values are statistically stable.

---

### User Story 2 - View Year-by-Year Trajectory Data (Priority: P2)

A consultant wants to visualize how a persona's projected balance grows over time. After running a simulation, the system provides year-by-year trajectory data at each percentile level so the consultant can chart the accumulation path from current age to retirement.

**Why this priority**: Trajectory data enables charting and deeper analysis beyond just the final retirement number, but the final number (P1) is the minimum viable output.

**Independent Test**: Can be tested by running a simulation and verifying that for each persona, the response includes balance values at each year from current age to retirement age, at each reported percentile.

**Acceptance Scenarios**:

1. **Given** a completed simulation run, **When** the user retrieves results, **Then** trajectory data includes a balance value for every year from the persona's current age through retirement age, at the 25th, 50th, 75th, and 90th percentiles.
2. **Given** a persona aged 30 with retirement age 67, **When** the simulation completes, **Then** trajectory data contains exactly 38 year-by-year entries (ages 30 through 67 inclusive).
3. **Given** trajectory data for a persona, **When** plotted on a chart, **Then** the balance values at each percentile form monotonically non-decreasing trends in the median case under normal market conditions.

---

### User Story 3 - Configure Simulation Parameters (Priority: P3)

A consultant wants to adjust the number of simulation trials or set a random seed for reproducible results. The system allows the user to override the default simulation count (1,000) up to 10,000 and optionally provide a seed value.

**Why this priority**: Configurability is important for advanced users and reproducibility, but default settings serve most use cases adequately.

**Independent Test**: Can be tested by running a simulation with a specified trial count and seed, then re-running with the same seed and verifying identical results.

**Acceptance Scenarios**:

1. **Given** a workspace with a Monte Carlo configuration specifying 5,000 simulations, **When** the simulation runs, **Then** results are based on 5,000 trials.
2. **Given** a Monte Carlo configuration with a fixed seed value, **When** the simulation is run twice with the same inputs, **Then** the results are identical.
3. **Given** no explicit Monte Carlo configuration, **When** the simulation runs, **Then** the system defaults to 1,000 trials.

---

### Edge Cases

- What happens when a persona's current age equals or exceeds the retirement age? The system returns the current balance as the retirement balance for all percentiles with no accumulation simulation.
- What happens when a persona's salary exceeds the IRS compensation limit? Contributions are calculated on capped compensation only ($345,000 for 2026).
- What happens when combined employee + employer contributions exceed the Section 415 annual additions limit? Total contributions for that year are capped at the additions limit ($70,000 for 2026), with employer contributions reduced first.
- What happens when auto-escalation pushes a persona's deferral rate above the IRS deferral limit in dollar terms? The deferral is capped at the applicable dollar limit for that persona's age in that year.
- What happens when a persona has 0% deferral rate and the plan has no auto-enrollment? Only employer core contributions (if any) accumulate; employer match is zero since there are no employee deferrals to match.
- What happens when a persona has a target-date allocation and the target date has already passed? The allocation uses the most conservative (post-retirement) point on the glide path.
- What happens when the number of simulations is set to 1? The system returns valid results where all percentile values equal the single trial result.
- What happens when a persona has tenure below the match or core eligibility period? That contribution type is excluded until enough simulated years pass to meet the eligibility threshold (converted from months).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST simulate the accumulation phase for each persona from their current age to the configured retirement age, year by year, across all trials.
- **FR-002**: System MUST apply annual wage growth to each persona's salary, incorporating random noise drawn from a distribution parameterized by the assumptions' wage growth rate.
- **FR-003**: System MUST calculate employee deferrals each year based on the persona's current deferral rate applied to their salary, capped at the IRS compensation limit.
- **FR-004**: System MUST apply auto-escalation to the deferral rate annually (when enabled in the plan design), incrementing by the auto-escalation rate up to the auto-escalation cap.
- **FR-005**: System MUST enforce IRS deferral limits based on the persona's age each simulated year: basic limit for under 50, basic + catch-up for ages 50-59, basic + super catch-up for ages 60-63, and basic + catch-up for age 64+.
- **FR-006**: System MUST calculate employer match contributions by applying each match tier's formula to the persona's deferral amount, based on compensation capped at the IRS compensation limit.
- **FR-007**: System MUST calculate employer core contributions based on the plan design's core contribution percentage, applying the appropriate age/service-based tier when tiers are defined, based on capped compensation.
- **FR-008**: System MUST enforce the Section 415 annual additions limit ($70,000 for 2026) on total employee deferrals plus employer contributions (match + core) each year, reducing employer contributions when the limit would be exceeded.
- **FR-009**: System MUST apply vesting schedules to employer match and core contributions separately, based on the persona's accumulated tenure (starting tenure + simulated years elapsed), counting only vested employer amounts toward the balance.
- **FR-010**: System MUST generate annual investment returns for each simulation trial by sampling from a normal distribution parameterized by the expected return and standard deviation of three asset classes (equity, fixed income, cash), blended according to the persona's allocation weights (stock_pct, bond_pct, cash_pct). International equity assumptions are not used.
- **FR-011**: System MUST shift target-date allocations along a glide path each simulated year, progressively adjusting equity/bond/cash weights as the persona approaches and passes the target date vintage.
- **FR-012**: System MUST hold all IRS limits constant across all simulated years (no inflation adjustment to regulatory limits).
- **FR-013**: System MUST express all simulated values in pre-tax, nominal (today's dollar) terms without inflation discounting.
- **FR-014**: System MUST run a configurable number of simulation trials, defaulting to 1,000 and supporting a range of 1 to 10,000.
- **FR-015**: System MUST compute and return percentile balances (25th, 50th, 75th, 90th) at retirement age for each persona.
- **FR-016**: System MUST compute and return year-by-year trajectory data at each reported percentile (25th, 50th, 75th, 90th) for each persona, covering every year from the persona's current age through retirement age.
- **FR-017**: System MUST respect match and core eligibility periods — if a persona's accumulated tenure (in months) is below the eligibility threshold, that contribution type is excluded for that simulated year.
- **FR-018**: System MUST produce identical results when the same random seed, assumptions, scenario, and personas are provided.
- **FR-019**: System MUST resolve effective assumptions by merging the scenario's overrides onto the workspace's base configuration before running the simulation.
- **FR-020**: System MUST return results grouped by persona, with each persona's results containing both the final retirement percentile balances and the full year-by-year trajectory.
- **FR-021**: System MUST update the scenario's "last run" timestamp after a simulation completes successfully.

### Key Entities

- **Simulation Run**: A single synchronous execution of the Monte Carlo engine for a given scenario, producing results for all personas. Characterized by the number of trials, optional seed, and the resolved assumptions. The request blocks until complete and results are returned directly in the response — they are not persisted for later retrieval.
- **Persona Simulation Result**: The output for one persona within a simulation run. Contains the persona's identifier, percentile balances at retirement, and year-by-year trajectory data.
- **Year Snapshot**: A single year's data point within a trajectory, representing the projected balance at a given age at each percentile level (25th, 50th, 75th, 90th).
- **Glide Path**: The rule governing how a target-date allocation shifts its stock/bond/cash mix over time as the persona approaches and passes the target date vintage.

## Clarifications

### Session 2026-02-24

- Q: Are simulation results persisted for later retrieval, or returned only in the immediate response? → A: Compute-and-return only (results returned in the response, not stored; user re-runs to get fresh results).
- Q: How do the four asset-class return assumptions map to the three custom allocation weights? → A: Use three asset classes only — stock_pct uses equity returns, bond_pct uses fixed income returns, cash_pct uses cash returns. International equity assumptions are ignored for now.
- Q: Should the simulation run synchronously or asynchronously? → A: Synchronous — the request blocks until simulation completes and returns results directly in the response.

## Assumptions

- The glide path for target-date allocations follows a standard linear interpolation from a high-equity allocation (approximately 90% equity at 40+ years before target) to a conservative allocation (approximately 30% equity at and beyond the target date). The specific glide path schedule will be defined during the planning phase.
- Wage growth noise is modeled as a normally distributed random variable centered on the configured wage growth rate. The standard deviation for wage growth noise will be defined during planning (reasonable default: approximately 2% of the wage growth rate or a fixed standard deviation around 1-2%).
- The blended portfolio return for a given allocation is computed as the weighted sum of three asset class returns (equity, fixed income, cash), where each is independently drawn from its own normal distribution each year per trial. International equity return assumptions exist in the model but are not used by the simulation engine at this time.
- When the Section 415 annual additions limit is hit, employee deferrals take priority (are preserved); employer contributions are reduced to fit within the remaining limit headroom.
- Vesting applies only to employer contributions (match and core separately). Employee deferrals are always 100% vested.
- For personas whose current age is at or above retirement age, the simulation returns the current balance for all percentiles with a single trajectory entry.
- Core age/service-based tiers are re-evaluated each simulated year against the persona's current simulated age and accumulated tenure to determine the applicable core contribution rate.
- The "today's dollars" approach means all values are nominal (no inflation discounting is applied). This is consistent with the instruction that IRS limits are held constant.
- The auto-enroll rate from the plan design is used as the starting deferral rate only if the persona's own deferral rate is zero and auto-enrollment is enabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A simulation with 1,000 trials for a scenario with 8 personas completes within 10 seconds.
- **SC-002**: A simulation with 10,000 trials for a scenario with 8 personas completes within 60 seconds.
- **SC-003**: Running the same simulation twice with the same seed produces byte-identical percentile balances and trajectory data for every persona.
- **SC-004**: For a known deterministic test case (fixed seed, single trial), the year-by-year balance matches a hand-calculated expected result within rounding tolerance ($0.01).
- **SC-005**: Percentile values at retirement are correctly ordered: 25th <= 50th <= 75th <= 90th for every persona in every simulation run.
- **SC-006**: Year-by-year trajectory data for each persona contains exactly (retirement_age - current_age + 1) data points.
- **SC-007**: No simulated year for any persona produces employee deferrals exceeding the applicable IRS deferral limit for that persona's age.
- **SC-008**: No simulated year for any persona produces total annual additions (employee + employer) exceeding the Section 415 additions limit.
