# Feature Specification: Results Dashboard

**Feature Branch**: `011-results-dashboard`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Build the results dashboard for persona modeling. After running a simulation for all active personas against the current scenario's plan design, display: (1) a grouped bar chart of income replacement ratio by persona with 70% and 80% reference lines, (2) a line chart showing balance accumulation trajectories from current age through retirement with shaded confidence bands, (3) a summary data table with columns for persona name, projected balance at retirement, annual retirement income, income replacement ratio, probability of success, total employer contributions, and total employee contributions. Include a confidence level toggle (50% | 75% | 90%) that updates all visualizations. Use Recharts for all charts."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Simulation and View Summary Table (Priority: P1)

A plan sponsor has configured a plan design and set up personas representing their workforce. They want to run the simulation and immediately see a comprehensive summary of projected retirement outcomes for every active persona. The summary table is the most important deliverable because it provides the detailed, per-persona data needed for plan design decisions.

**Why this priority**: The summary table is the foundational view that delivers all key metrics at a glance. Without it, users cannot assess whether their plan design adequately serves their workforce. Every other visualization is a more digestible representation of the same underlying data.

**Independent Test**: Can be fully tested by running a simulation for a scenario with 2+ active personas and verifying that the results table displays all required columns with correct values.

**Acceptance Scenarios**:

1. **Given** a scenario with a configured plan design and 3 active personas, **When** the user initiates a simulation run, **Then** the system displays a summary table with one row per active persona showing: persona name, projected balance at retirement, annual retirement income, income replacement ratio, probability of success, total employer contributions, and total employee contributions.
2. **Given** a completed simulation, **When** the user views the summary table, **Then** all monetary values are formatted as currency and percentages are formatted with one decimal place.
3. **Given** a scenario with a persona that has Social Security enabled, **When** the simulation completes, **Then** the annual retirement income column includes both withdrawal income and Social Security benefits.
4. **Given** a scenario with a persona that has Social Security disabled, **When** the simulation completes, **Then** the annual retirement income column reflects withdrawal income only.

---

### User Story 2 - Assess Income Replacement Adequacy (Priority: P2)

After viewing the summary table, the plan sponsor wants to quickly identify which personas are projected to achieve adequate income replacement in retirement and which fall short. A bar chart with industry-standard reference thresholds (70% and 80%) lets them visually spot gaps across the workforce.

**Why this priority**: The income replacement ratio is the single most important metric for evaluating plan design adequacy. The visual comparison across personas with reference lines enables rapid identification of at-risk employee segments without reading individual numbers.

**Independent Test**: Can be fully tested by running a simulation for 3+ personas with varying salaries and deferral rates, then verifying the bar chart renders one bar per persona with correct height relative to the 70% and 80% reference lines.

**Acceptance Scenarios**:

1. **Given** a completed simulation with 4 active personas, **When** the results dashboard is displayed, **Then** a bar chart shows one bar per persona representing their income replacement ratio.
2. **Given** the income replacement ratio chart, **When** the user views the chart, **Then** horizontal reference lines are visible at 70% and 80% with clear labels.
3. **Given** a persona with an income replacement ratio below 70%, **When** the bar chart renders, **Then** the persona's bar is visually distinguishable as below both reference thresholds.
4. **Given** a persona with an income replacement ratio between 70% and 80%, **When** the bar chart renders, **Then** the persona's bar is visually positioned between the two reference lines.

---

### User Story 3 - Analyze Balance Growth Trajectories (Priority: P3)

The plan sponsor wants to understand how each persona's retirement balance is projected to grow over time from their current age through retirement. A trajectory chart with confidence bands shows not just the expected path but the range of likely outcomes, helping sponsors understand the uncertainty in projections.

**Why this priority**: While the summary table shows the end result, the trajectory chart provides insight into the accumulation journey - when growth accelerates, how different personas diverge, and how wide the range of outcomes is. This helps sponsors understand the dynamics behind the final numbers.

**Independent Test**: Can be fully tested by running a simulation for 2+ personas of different ages and verifying that each persona's trajectory line spans from their current age to retirement age with a visible shaded confidence band.

**Acceptance Scenarios**:

1. **Given** a completed simulation with a 30-year-old and a 50-year-old persona, **When** the trajectory chart renders, **Then** each persona's line starts at their respective current age and extends to retirement age.
2. **Given** the trajectory chart, **When** the user views it, **Then** each persona's projected balance line is accompanied by a shaded band representing the range of likely outcomes.
3. **Given** two personas with different current balances and salaries, **When** the trajectory chart renders, **Then** their lines are visually distinguishable (different colors) with a legend identifying each persona.
4. **Given** the trajectory chart, **When** the user hovers over a data point, **Then** a tooltip displays the persona name, age, and projected balance at that point.

---

### User Story 4 - Adjust Confidence Level (Priority: P4)

The plan sponsor wants to view projections under different confidence assumptions. By toggling between 50%, 75%, and 90% confidence levels, they can see the median expectation, a moderately conservative estimate, and a highly conservative estimate. All charts and the summary table update simultaneously to maintain consistency.

**Why this priority**: Different stakeholders prefer different levels of conservatism. Actuaries may want the median (50%), while fiduciaries may prefer the conservative (90%) view. The toggle enables a single dashboard to serve all audiences without requiring separate simulation runs.

**Independent Test**: Can be fully tested by running a simulation, noting the values at the default confidence level, switching to a different confidence level, and verifying that the summary table values, bar chart heights, and trajectory lines all change consistently.

**Acceptance Scenarios**:

1. **Given** a completed simulation displayed at the default confidence level, **When** the user selects a different confidence level (e.g., switches from 75% to 90%), **Then** the summary table, income replacement ratio chart, and trajectory chart all update to reflect the new confidence level.
2. **Given** the confidence level toggle, **When** the user selects 90% confidence, **Then** all projected values are more conservative (lower balances, lower income, lower replacement ratios) compared to the 50% confidence view.
3. **Given** the confidence level toggle, **When** the user selects 50% confidence, **Then** all projected values represent the median outcome across simulation trials.
4. **Given** the confidence level toggle with three options (50%, 75%, 90%), **When** the user switches between levels, **Then** the currently selected level is visually indicated and the transition between views is smooth.

---

### Edge Cases

- What happens when only one active persona exists? The bar chart displays a single bar and the trajectory chart displays a single line. All visualizations remain functional.
- What happens when a persona is already at or past retirement age? The trajectory chart shows no accumulation path for that persona. The summary table still displays their projected retirement income based on current balance.
- What happens when all personas have income replacement ratios above 80%? Both reference lines appear below all bars, clearly indicating all personas exceed target thresholds.
- What happens when the simulation has not yet been run for this scenario? The dashboard displays a clear prompt to run the simulation, with no empty or broken charts.
- What happens when a persona has a $0 current balance and $0 deferral rate? The system displays $0 projected balance and 0% income replacement ratio rather than errors.
- What happens when Social Security is enabled for some personas but not others? Each persona's metrics reflect their individual Social Security configuration. The income replacement ratio correctly includes or excludes Social Security benefits per persona.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST run the simulation for all active (non-hidden) personas in the current scenario using the scenario's plan design and assumptions.
- **FR-002**: System MUST display a summary data table with one row per active persona containing: persona name, projected balance at retirement, annual retirement income, income replacement ratio, probability of success, total employer contributions, and total employee contributions.
- **FR-003**: System MUST calculate income replacement ratio as: (annual retirement income / pre-retirement annual salary) expressed as a percentage. Annual retirement income includes withdrawal income plus Social Security benefits (if enabled for that persona).
- **FR-004**: System MUST calculate probability of success as: the percentage of simulation trials in which the persona's balance sustains withdrawals through the full planning horizon (retirement age through planning age) without depletion.
- **FR-005**: System MUST calculate and display total employer contributions as the cumulative sum of employer match and employer core contributions from current age through retirement age.
- **FR-006**: System MUST calculate and display total employee contributions as the cumulative sum of employee deferrals from current age through retirement age.
- **FR-007**: System MUST display a bar chart comparing income replacement ratios across all active personas, with each persona represented as a distinct bar.
- **FR-008**: System MUST display horizontal reference lines at 70% and 80% income replacement ratio on the bar chart, each clearly labeled.
- **FR-009**: System MUST display a line chart showing projected balance accumulation trajectories from each persona's current age through retirement age.
- **FR-010**: System MUST display shaded confidence bands on the trajectory chart representing the range of likely outcomes at the selected confidence level.
- **FR-011**: System MUST provide a confidence level toggle with three options: 50%, 75%, and 90%.
- **FR-012**: When the user changes the confidence level, ALL visualizations (summary table, bar chart, and trajectory chart) MUST update to reflect the selected level.
- **FR-013**: At 50% confidence, the system MUST display median outcomes (the middle value across all simulation trials). At higher confidence levels (75%, 90%), the system MUST display more conservative estimates representing the outcome that the specified percentage of trials meet or exceed.
- **FR-014**: The default confidence level MUST be 75%.
- **FR-015**: System MUST display a clear call-to-action to run the simulation when no results are available for the current scenario.
- **FR-016**: All monetary values MUST be displayed in today's dollars, formatted as currency. All ratios MUST be displayed as percentages.
- **FR-017**: The trajectory chart MUST include a legend identifying each persona by name and color.
- **FR-018**: The trajectory chart MUST display interactive tooltips showing persona name, age, and projected balance when hovering over data points.

### Key Entities

- **Simulation Result**: The complete output of running a simulation for a scenario, containing per-persona projections including balance trajectories, retirement income, contribution totals, and success probability.
- **Income Replacement Ratio**: A percentage expressing how much of a persona's pre-retirement salary is replaced by their projected annual retirement income (withdrawals + Social Security if applicable). Industry targets are typically 70%-80%.
- **Confidence Level**: Represents the degree of certainty that actual outcomes will meet or exceed the displayed projections. Higher confidence levels show more conservative (lower) estimates because they represent the threshold that a greater proportion of simulation trials exceed.
- **Balance Trajectory**: A year-by-year projection of a persona's retirement account balance from their current age through retirement age, showing how the balance is expected to grow over time.
- **Probability of Success**: The percentage of simulation trials in which the persona's retirement savings last through their entire planning horizon without depletion.

## Assumptions

- The simulation is run on-demand (not automatically) and results are not persisted between sessions; the user must re-run to refresh.
- Pre-retirement annual salary for income replacement ratio calculation uses the persona's projected salary at retirement age (after wage growth), not their current salary.
- The planning horizon for probability of success extends from retirement age to planning age as configured in the workspace assumptions.
- Hidden (inactive) personas are excluded from simulation and all dashboard visualizations.
- The confidence level toggle does not trigger a new simulation run; it changes which percentile of the already-computed results is displayed.
- Probability of success and total contribution amounts are single values that do not change with the confidence level toggle (probability is computed across all trials; contributions in the median scenario are shown).
- The user preference for Recharts as the charting library is noted for the planning phase.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can run a simulation and view complete results for all active personas from a single dashboard view without navigating to multiple pages.
- **SC-002**: Users can identify personas falling below the 70% or 80% income replacement thresholds within 5 seconds of viewing the dashboard.
- **SC-003**: Users can switch between all three confidence levels and see all visualizations update within 1 second, without requiring a new simulation run.
- **SC-004**: All values displayed in the summary table are consistent with the corresponding chart visualizations at every confidence level (no discrepancies between chart and table).
- **SC-005**: Users can trace each persona's projected balance growth from current age to retirement age and understand the range of likely outcomes via confidence bands.
- **SC-006**: The dashboard correctly handles edge cases (single persona, zero balance, persona at retirement age) without errors or broken visualizations.
