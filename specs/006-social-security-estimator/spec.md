# Feature Specification: Social Security Benefit Estimator

**Feature Branch**: `006-social-security-estimator`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Add a Social Security benefit estimator following the Fidelity GRP Social Security Methodology. Inputs are current age, current compensation, retirement age, and claiming age (configurable 62-70, default 67). The estimator assumes employment start at age 22, reconstructs an earnings history using the national average wage index (AWI) scaled to current compensation, caps each year at the SS taxable maximum, selects the top 35 years of indexed earnings to compute AIME, applies the SSA bend-point formula for PIA, and adjusts for early/delayed claiming relative to Full Retirement Age. Benefits grow at the 2.5% inflation rate. This should be a toggleable component per persona — users can include or exclude Social Security from the income replacement calculation."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estimate Social Security Benefit for a Persona (Priority: P1)

A plan analyst wants to see the estimated monthly and annual Social Security benefit for a given persona so they can understand how Social Security income supplements retirement plan withdrawals.

The analyst provides a persona's current age, current compensation, retirement age, and Social Security claiming age. The system reconstructs an earnings history starting from age 22, indexes past earnings using the national Average Wage Index (AWI) scaled to the persona's current compensation, caps each year at the Social Security taxable maximum, selects the highest 35 years of indexed earnings, and computes the Average Indexed Monthly Earnings (AIME). It then applies the SSA bend-point formula to determine the Primary Insurance Amount (PIA) and adjusts the benefit for early or delayed claiming relative to Full Retirement Age (FRA). The resulting benefit is expressed in today's dollars.

**Why this priority**: This is the core calculation — without a correct SS benefit estimate, nothing else in this feature can function.

**Independent Test**: Can be fully tested by providing sample persona inputs and verifying the computed monthly benefit against a hand-calculated reference using published SSA tables.

**Acceptance Scenarios**:

1. **Given** a persona aged 42 with $120,000 salary, retirement age 65, claiming age 67, **When** the estimator runs, **Then** it returns a monthly PIA and annual benefit amount in today's dollars consistent with SSA bend-point formula calculations.
2. **Given** a persona aged 25 with $40,000 salary, retirement age 65, claiming age 62, **When** the estimator runs, **Then** the benefit is reduced from PIA to reflect early claiming (before FRA).
3. **Given** a persona aged 52 with $210,000 salary, retirement age 65, claiming age 70, **When** the estimator runs, **Then** the benefit is increased from PIA to reflect delayed retirement credits (after FRA).
4. **Given** a persona with compensation above the Social Security taxable maximum, **When** earnings history is constructed, **Then** each year's earnings are capped at that year's taxable maximum before indexing.

---

### User Story 2 - Toggle Social Security in Income Replacement Calculation (Priority: P2)

A plan analyst wants to include or exclude Social Security benefits when evaluating a persona's total retirement income replacement ratio. When Social Security is included, the annual SS benefit is added to the plan withdrawal amount before computing the replacement ratio against final salary. When excluded, only plan withdrawals count.

**Why this priority**: The toggle makes Social Security analysis actionable within the existing simulation framework rather than a standalone calculation.

**Independent Test**: Can be tested by running two simulations for the same persona — one with Social Security included and one excluded — and verifying the total retirement income differs by the expected SS benefit amount.

**Acceptance Scenarios**:

1. **Given** a persona with `include_social_security` set to true, **When** a simulation completes, **Then** the annual Social Security benefit is added to the annual plan withdrawal to compute total retirement income.
2. **Given** a persona with `include_social_security` set to false, **When** a simulation completes, **Then** the total retirement income is based solely on plan withdrawals (Social Security benefit is not included).
3. **Given** two personas in the same scenario — one with Social Security enabled and one without — **When** the simulation runs, **Then** each persona's results independently reflect their own toggle setting.

---

### User Story 3 - Configure Claiming Age Per Persona (Priority: P3)

A plan analyst wants to model different Social Security claiming strategies by adjusting the claiming age for individual personas. The claiming age can be set anywhere from 62 to 70, with a default of 67 if not specified.

**Why this priority**: Claiming age sensitivity is valuable for plan design analysis but the core estimator works with a default, so this is an enhancement.

**Independent Test**: Can be tested by computing SS benefits for the same persona at claiming ages 62, 67, and 70 and verifying the benefit amounts differ as expected (reduced at 62, full PIA at FRA, increased at 70).

**Acceptance Scenarios**:

1. **Given** a persona with no claiming age specified, **When** the estimator runs, **Then** it uses the default claiming age of 67.
2. **Given** a persona with claiming age set to 62, **When** the estimator runs, **Then** the benefit reflects the maximum early-claiming reduction.
3. **Given** a persona with claiming age set to 70, **When** the estimator runs, **Then** the benefit reflects the maximum delayed retirement credits.
4. **Given** a claiming age outside the 62-70 range, **When** the user attempts to set it, **Then** the system rejects the input with a clear validation message.

---

### Edge Cases

- **Persona younger than 22**: The estimator assumes earnings begin at age 22. If the persona is under 22, no earnings history exists yet and the estimated benefit should reflect zero working years (AIME of $0, PIA of $0).
- **Current age exceeds claiming age**: The system rejects this as invalid — the claiming age must be at or after the persona's current age.
- **Retirement age after claiming age**: Valid scenario (person claims SS before leaving their employer). The estimator allows this; SS benefits begin at claiming age regardless of retirement age.
- **Retirement age before claiming age**: Valid scenario (person retires from their job but delays SS claiming). The estimator handles this — SS benefits start at claiming age, not retirement age.
- **Fewer than 35 working years**: If the persona has fewer than 35 years of earnings, remaining years are filled with $0 earnings, reducing the AIME accordingly.
- **Claiming age equals Full Retirement Age**: No adjustment is applied; the benefit equals the PIA.
- **Compensation exceeds SS taxable maximum in every year**: Earnings are capped each year; the AIME reflects the taxable maximum trajectory, not the actual salary.
- **Very low compensation**: The bend-point formula's progressive structure means lower earners receive a higher replacement rate. The estimator should handle salaries down to $0 (producing $0 benefit).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST reconstruct an earnings history for each persona starting from age 22 through the persona's current age, using the national Average Wage Index (AWI) scaled proportionally to the persona's current compensation.
- **FR-002**: System MUST cap each year's reconstructed earnings at the Social Security taxable maximum for that year before indexing.
- **FR-003**: System MUST index all earnings years to the indexing year (age 60 or two years before FRA eligibility, whichever applies) using the AWI series, per SSA methodology.
- **FR-004**: System MUST select the highest 35 years of indexed earnings to compute the Average Indexed Monthly Earnings (AIME).
- **FR-005**: System MUST apply the SSA bend-point formula to AIME to compute the Primary Insurance Amount (PIA), using the bend points for the year the worker turns 62.
- **FR-006**: System MUST adjust PIA for early claiming (before FRA) by applying the SSA early-reduction factors: 5/9 of 1% per month for the first 36 months before FRA, and 5/12 of 1% per month for additional months beyond 36.
- **FR-007**: System MUST adjust PIA for delayed claiming (after FRA) by applying delayed retirement credits of 8% per year (2/3 of 1% per month) for each month after FRA up to age 70.
- **FR-008**: System MUST accept a claiming age parameter per persona, constrained to the range 62-70 inclusive, defaulting to 67 if not specified.
- **FR-009**: System MUST express the estimated benefit in today's dollars, growing future benefits at the 2.5% inflation rate (consistent with existing workspace assumptions).
- **FR-010**: System MUST respect the existing `include_social_security` toggle on each persona — when true, the SS benefit is included in `total_retirement_income`; when false, `ss_annual_benefit` is $0 and `total_retirement_income` equals `annual_withdrawal`. The toggle MUST NOT alter the plan withdrawal calculation; SS is purely additive.
- **FR-011**: System MUST project earnings from the persona's current age forward to the earlier of retirement age or age 60 (the indexing year) by growing current compensation at the assumed wage growth rate, capping each future year at the projected SS taxable maximum.
- **FR-012**: System MUST use a Full Retirement Age (FRA) of 67 for all personas, consistent with the FRA for individuals born in 1960 or later.
- **FR-013**: System MUST validate that the claiming age is not earlier than the persona's current age at the time of estimation.
- **FR-014**: System MUST return the estimated benefit as both a monthly amount and an annualized amount.
- **FR-015**: Simulation results MUST include three income fields per persona: `annual_withdrawal` (plan-only, unchanged from current behavior), `ss_annual_benefit` (Social Security estimate, $0 when toggled off), and `total_retirement_income` (sum of both).
- **FR-016**: The `annual_withdrawal` field MUST remain identical to current behavior regardless of the Social Security toggle, preserving backward compatibility for plan design evaluation.
- **FR-017**: System MUST provide a standalone SS benefit estimation that can be invoked independently per persona without running a full simulation.
- **FR-018**: The standalone SS estimator and the simulation-integrated SS calculation MUST share the same underlying computation logic to ensure consistent results.

### Key Entities

- **Earnings History**: A year-by-year record of a persona's reconstructed and indexed earnings from age 22 through their working years, capped at the SS taxable maximum per year.
- **AIME (Average Indexed Monthly Earnings)**: The average monthly earnings computed from the top 35 years of indexed earnings; the primary input to the PIA formula.
- **PIA (Primary Insurance Amount)**: The base monthly Social Security benefit at Full Retirement Age, computed by applying the SSA bend-point formula to AIME.
- **Claiming Adjustment**: A multiplier applied to PIA based on whether the persona claims before (reduction) or after (credits) Full Retirement Age.
- **SS Benefit Estimate**: The final computed monthly and annual benefit in today's dollars, optionally included in income replacement calculations.

### Assumptions

- **Employment start age**: All personas are assumed to have begun working at age 22, regardless of their actual employment history.
- **AWI series**: The estimator uses the published SSA national Average Wage Index. Historical AWI values and taxable maximums are embedded as reference data; future values are projected using the assumed wage growth rate.
- **Full Retirement Age**: Fixed at 67 for all personas (applies to anyone born 1960 or later). Since this is a forward-looking modeling tool, not a historical calculator, this simplification is appropriate.
- **Inflation rate**: Benefits grow at the 2.5% inflation rate, consistent with the existing workspace inflation rate assumption.
- **Wage growth for future earnings**: Future compensation grows at the assumed nominal wage growth rate from workspace assumptions. If no separate wage growth rate exists, salary is grown at the inflation rate.
- **Bend points and reduction factors**: The estimator uses the SSA bend points for the year the persona turns 62. For personas who have not yet turned 62, bend points are projected forward using the AWI growth rate.
- **No spousal or survivor benefits**: This estimator covers the worker's own retired-worker benefit only.
- **No earnings test**: The estimator does not model the Social Security earnings test for individuals who claim before FRA while still working.

## Clarifications

### Session 2026-02-24

- Q: How should the SS benefit appear in simulation response output? → A: Three fields — `annual_withdrawal` (plan-only, unchanged), `ss_annual_benefit` (SS estimate), and `total_retirement_income` (sum of both). Plan-only withdrawal is primary for plan design evaluation; total is a pre-computed convenience for frontend/charts.
- Q: Should SS income reduce the required plan drawdown or be purely additive? → A: Purely additive. Plan withdrawal is computed identically regardless of SS toggle. SS benefit is supplemental income reported alongside, not a factor in drawdown strategy.
- Q: Should the SS estimator be available standalone or only as part of simulation? → A: Both. Standalone endpoint for quick per-persona estimates, plus integrated into simulation. Same calculation logic shared between both paths.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any persona, the estimated monthly PIA is within 2% of a hand-calculated reference using the same AWI data and SSA bend-point formula.
- **SC-002**: Estimated benefits for claiming ages 62, 67 (FRA), and 70 differ by the expected SSA reduction/credit percentages (approximately 30% reduction at 62, 0% at 67, 24% increase at 70).
- **SC-003**: When Social Security is included for a persona, the reported total retirement income (plan withdrawal + SS benefit) is higher than plan withdrawal alone by the estimated annual SS benefit amount.
- **SC-004**: When Social Security is excluded for a persona, simulation results are identical to results without the SS estimator feature.
- **SC-005**: The estimator produces a result for all 8 default personas without errors, covering the full range of ages (25-58) and salaries ($40K-$210K).
- **SC-006**: Earnings in every year of the reconstructed history are capped at or below the SS taxable maximum for that year.
