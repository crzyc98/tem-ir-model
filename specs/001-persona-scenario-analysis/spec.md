# Feature Specification: Persona-Scenario Analysis Page

**Feature Branch**: `001-persona-scenario-analysis`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "i would like a new analyze page where i can compare all personas (that aren't hidden) across the scenarios I pick (from 2 to 8 scenarios) and analyze the outcomes"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select Scenarios and View Cross-Persona Results (Priority: P1)

A plan designer wants to see how all non-hidden personas in their workspace fare across multiple retirement plan scenarios simultaneously. They navigate to the Analyze page, select 2–8 scenarios, and run the analysis to get a side-by-side matrix showing every persona's retirement outcomes under each plan design.

**Why this priority**: This is the core value of the feature — enabling a holistic workforce view across plan designs in a single interaction. Without this, the feature does not exist.

**Independent Test**: Can be tested end-to-end by selecting 2 scenarios with at least 2 non-hidden personas present, running the analysis, and confirming that each persona's results appear for each selected scenario.

**Acceptance Scenarios**:

1. **Given** a workspace has 3 non-hidden personas and 4 scenarios, **When** the user selects 3 scenarios and runs the analysis, **Then** a matrix of 3 personas × 3 scenarios appears showing outcome values for each combination.
2. **Given** the user has selected fewer than 2 scenarios, **When** they attempt to run the analysis, **Then** the system prevents execution and displays a message indicating that at least 2 scenarios must be selected.
3. **Given** the user attempts to select a 9th scenario, **When** they try to add it, **Then** the system prevents the selection and informs them that the maximum is 8 scenarios.
4. **Given** a workspace has personas where some are hidden and some are visible, **When** the analysis runs, **Then** only non-hidden personas appear in the results matrix.

---

### User Story 2 - View Aggregate Workforce Summary per Scenario (Priority: P2)

After running the analysis, a plan designer wants to understand the overall impact of each scenario across the full workforce — not just individual outcomes. They can see summary statistics per scenario (e.g., the proportion of personas on track for retirement, median income replacement ratio across all personas) so they can evaluate which plan design best serves the broader workforce.

**Why this priority**: Aggregate metrics turn individual numbers into actionable workforce-level insight. This is the "analyze the outcomes" part of the request and transforms raw comparison into decision support.

**Independent Test**: Can be tested independently by running an analysis and verifying that each selected scenario has a summary row/card showing aggregate values computed from all non-hidden personas.

**Acceptance Scenarios**:

1. **Given** the analysis has run for 3 scenarios and 5 personas, **When** the results page renders, **Then** each scenario has a summary section showing: the percentage of personas assessed as "On Track," the median income replacement ratio across all personas, and the average annual employer cost per participant.
2. **Given** one of the scenarios yields no personas with a defined income replacement ratio (edge case), **When** the aggregate is computed, **Then** the system handles it gracefully and displays an appropriate indicator rather than an error.

---

### User Story 3 - Switch the Primary Comparison Metric (Priority: P3)

A plan designer wants to focus on different dimensions of retirement readiness — sometimes income replacement ratio, other times probability of success, retirement balance, or employer cost. They can toggle which metric is displayed in the comparison matrix without re-running the analysis.

**Why this priority**: Different stakeholders care about different metrics. Allowing metric switching after a single run avoids repetitive re-runs and increases the analytical depth of the page.

**Independent Test**: Can be tested independently by running an analysis and then switching between at least two available metrics and confirming that the matrix values update to reflect the new metric.

**Acceptance Scenarios**:

1. **Given** results are displayed showing income replacement ratio, **When** the user switches the active metric to "Probability of Success," **Then** all cells in the matrix update to show probability-of-success values without re-running the analysis.
2. **Given** the user selects the "Employer Cost (Annual)" metric, **When** the matrix renders, **Then** all cells show the employer cost value for each persona–scenario combination.

---

### User Story 4 - Adjust Confidence Level (Priority: P4)

A plan designer wants to view results under different market-return assumptions (optimistic vs. conservative). They can toggle the confidence level (50%, 75%, 90%) and the entire matrix — including both per-cell values and aggregates — updates to reflect the selected level of conservatism.

**Why this priority**: Confidence level is a core analytical lever already present in other pages. Consistency of this control across all result views is expected.

**Independent Test**: Can be tested by running an analysis and toggling from 75% to 90% confidence and confirming that numeric values shift in the conservative direction.

**Acceptance Scenarios**:

1. **Given** results are displayed at 75% confidence, **When** the user switches to 90% confidence, **Then** all metric values in the matrix and aggregates update to reflect the more conservative scenario (values should be ≤ their 75% counterparts for positive metrics like IR and balance).

---

### Edge Cases

- What happens when all personas in the workspace are hidden? The system must display an empty state explaining that no visible personas are available, and prevent the analysis from running.
- What happens when a workspace has only one scenario? The analysis cannot run; the page should prompt the user to create at least one more scenario.
- What happens when a persona has no salary or zero balance (new hire edge case)? The system must still display their results; zero or near-zero outcome values are valid.
- What happens when the simulation takes a long time for many personas × many scenarios? The page should show a loading indicator and not time out for reasonable workspace sizes (up to 12 personas × 8 scenarios).
- What happens when the user navigates away while a simulation is running? The page may cancel the in-progress analysis; no partial results should be displayed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated "Analyze" page accessible from the workspace navigation.
- **FR-002**: The Analyze page MUST display all scenarios in the current workspace as selectable options for the comparison.
- **FR-003**: Users MUST be able to select between 2 and 8 scenarios (inclusive) for analysis; selection outside this range MUST be prevented.
- **FR-004**: When the analysis is run, the system MUST automatically include all personas in the workspace whose hidden flag is false; hidden personas MUST be excluded.
- **FR-005**: The system MUST run outcome simulations for every combination of non-hidden persona and selected scenario.
- **FR-006**: The system MUST display results in a matrix layout where rows represent personas and columns represent selected scenarios.
- **FR-007**: Each cell in the matrix MUST display the value of the currently selected metric for that persona–scenario combination.
- **FR-008**: The system MUST display per-scenario aggregate summary statistics computed across all non-hidden personas, including at minimum: percentage of personas "On Track," median income replacement ratio, and average annual employer cost per participant.
- **FR-009**: Users MUST be able to switch the primary comparison metric without re-running the analysis; available metrics MUST include at minimum: Income Replacement Ratio, Probability of Success, Retirement Balance (at median/selected confidence), and Employer Cost (Annual).
- **FR-010**: Users MUST be able to select a confidence level (50%, 75%, 90%) that applies uniformly to all matrix values and aggregate summaries.
- **FR-011**: The system MUST show a loading indicator while the analysis is running and prevent duplicate submissions.
- **FR-012**: The system MUST display an empty state with explanatory messaging when: (a) fewer than 2 scenarios exist in the workspace, or (b) no non-hidden personas exist in the workspace.
- **FR-013**: The matrix MUST visually differentiate cells by metric value (e.g., color-coding or iconography) to allow at-a-glance identification of strong vs. weak outcomes per persona–scenario combination.
- **FR-014**: The page MUST be accessible from an "Analyze" navigation item within the workspace sidebar or top navigation.

### Key Entities

- **Persona**: A hypothetical employee profile with demographic and financial attributes. For this feature, only personas with `hidden = false` are included. Key attributes: name, age, salary, deferral rate, current balance.
- **Scenario**: A retirement plan design configuration. Identified by name. Users select 2–8 scenarios to analyze.
- **Analysis Run**: An ephemeral computation (not persisted) that pairs all non-hidden personas with each selected scenario and returns simulation results for every combination.
- **Analysis Result Cell**: The outcome value for one persona under one scenario at a chosen confidence level and metric.
- **Aggregate Summary**: A per-scenario roll-up of outcome metrics across all non-hidden personas (median, percentage on track, average cost).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure and run a full analysis (select scenarios, trigger run, view results) in under 60 seconds for a workspace with up to 12 personas and 8 scenarios.
- **SC-002**: 100% of non-hidden personas appear in the results matrix when the analysis completes; 0% of hidden personas appear.
- **SC-003**: Users can switch between available metrics and confidence levels without re-running the analysis — metric/confidence changes reflect immediately (under 1 second).
- **SC-004**: The aggregate summary accurately reflects the displayed personas' data — values are consistent with per-cell values visible in the matrix (verifiable by spot-checking).
- **SC-005**: The page handles edge cases (all personas hidden, <2 scenarios, zero-value personas) without errors — users see an informative message rather than a broken interface in all such cases.
- **SC-006**: The visual differentiation in the matrix (color-coding or iconography) allows a first-time user to identify the best-performing scenario for a given persona within 10 seconds of viewing results.

## Assumptions

- **Simulation parity**: The analysis uses the same underlying simulation engine and Monte Carlo parameters (retirement age, planning age, number of simulations) as the existing Plan Comparison and Results Dashboard features.
- **No persistence**: Analysis results are compute-and-return; they are not saved or retrievable after navigating away. Users who want to preserve results should use the existing Excel export capability.
- **Confidence level default**: The page defaults to 75% confidence, consistent with other result pages in the application.
- **Default metric**: Income Replacement Ratio is the default displayed metric, as it is the primary retirement-readiness indicator used throughout the application.
- **Workspace scope**: The Analyze page operates within a single workspace; cross-workspace analysis is out of scope.
- **Navigation placement**: The Analyze page is added as a new route/navigation item alongside existing pages (Results Dashboard, Plan Comparison) within the workspace context.
- **Scenario naming**: Scenario column headers in the matrix use the scenario's user-defined name; if the name is long, it is truncated with a tooltip showing the full name.
