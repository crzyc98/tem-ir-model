# Feature Specification: Simulation Results Excel Export

**Feature Branch**: `012-excel-export`
**Created**: 2026-02-25
**Status**: Draft
**Input**: User description: "Add the ability to export simulation results from a scenario as a Excel file. The Excel should include one row per persona with columns for all key metrics (projected balance, income replacement ratio at each confidence level, probability of success, total contributions). Include a header section with the plan design summary and assumptions used. Accessible via a download button on the results dashboard."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Download Excel Report from Results Dashboard (Priority: P1)

A plan sponsor or advisor has run a simulation for a scenario and is reviewing the results dashboard. They want to share or archive the results — they click a "Download Excel" button and receive a formatted spreadsheet with a plan design summary header and one data row per persona showing all key retirement metrics.

**Why this priority**: This is the core value of the feature — enabling users to export and share simulation output in a portable, widely-used format. All other stories depend on or extend this capability.

**Independent Test**: Can be fully tested by running a simulation with multiple personas, navigating to the results dashboard, clicking "Download Excel", and verifying the downloaded file contains the correct structure and data.

**Acceptance Scenarios**:

1. **Given** a scenario with completed simulation results, **When** the user clicks "Download Excel" on the results dashboard, **Then** the browser downloads an `.xlsx` file named after the scenario (e.g., `scenario-name-results.xlsx`).
2. **Given** a downloaded Excel file, **When** the file is opened, **Then** it contains a header section with plan design summary and assumptions, followed by a data table with one row per persona.
3. **Given** a downloaded Excel file, **When** the data table is inspected, **Then** each row contains: persona name, projected balance, income replacement ratio at each supported confidence level (e.g., 10th, 25th, 50th, 75th, 90th percentile), probability of success, and total contributions.
4. **Given** a scenario with a single persona, **When** the Excel is downloaded, **Then** the data table contains exactly one data row (plus a header row).

---

### User Story 2 - Plan Design Summary Header in Export (Priority: P2)

A user opens the downloaded Excel file and needs to understand the context in which the simulation was run — the header section at the top of the spreadsheet shows the plan design parameters and key assumptions so the report is self-contained.

**Why this priority**: Without context, the data rows are hard to interpret. The header makes the export useful as a standalone artifact for sharing with stakeholders who may not have access to the application.

**Independent Test**: Can be tested independently by downloading the Excel and verifying the header section content matches the scenario's plan design configuration and documented assumptions.

**Acceptance Scenarios**:

1. **Given** a downloaded Excel file, **When** the header section is inspected, **Then** it contains the plan design summary (e.g., contribution rates, match formula, vesting schedule, deferral defaults).
2. **Given** a downloaded Excel file, **When** the assumptions section is inspected, **Then** it contains the simulation assumptions used (e.g., investment return assumptions, inflation rate, retirement age, salary growth).
3. **Given** a scenario where the plan design has been updated since a prior export, **When** a new export is downloaded, **Then** the header reflects the current plan design at the time of export.

---

### User Story 3 - Export Not Available Without Results (Priority: P3)

A user navigates to the results dashboard before a simulation has been run for the scenario. The export button is either hidden or visually disabled so they are not able to attempt to download an empty or invalid file.

**Why this priority**: Defensive UX to prevent confusing error states. Lower priority because it only affects users who access the dashboard without results.

**Independent Test**: Can be tested by navigating to a scenario's results dashboard with no simulation run, and verifying the download button is absent or disabled.

**Acceptance Scenarios**:

1. **Given** a scenario with no simulation results, **When** the user views the results dashboard, **Then** the "Download Excel" button is either hidden or visibly disabled with an explanatory tooltip or message.
2. **Given** a scenario with results, **When** the simulation is re-run, **Then** the download button remains available and produces the updated results.

---

### Edge Cases

- What happens when a scenario has zero personas defined? The export should produce only the header section with an empty data table (or a note indicating no personas are configured).
- How does the system handle persona names with special characters (e.g., commas, quotes, Unicode)? Names must be safely encoded in the Excel cells without breaking the file structure.
- What happens if the simulation results contain missing or null values for some metrics? Cells with unavailable data must display a clear placeholder (e.g., "N/A") rather than an error or empty cell.
- What happens if the user clicks the download button multiple times rapidly? Each click should trigger one download; duplicate requests should not produce corrupted files.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Download Excel" button on the results dashboard that initiates an export of the current scenario's simulation results.
- **FR-002**: The exported file MUST be in `.xlsx` format compatible with Microsoft Excel, LibreOffice Calc, and Google Sheets.
- **FR-003**: The exported file MUST include a header section containing the plan design summary (contribution rates, match formula, vesting schedule, deferral defaults) and the simulation assumptions used (return assumptions, inflation rate, retirement age, salary growth).
- **FR-004**: The exported file MUST include a data table with one row per persona containing: persona name, projected balance, income replacement ratio at each supported confidence level, probability of success, and total contributions.
- **FR-005**: The data table MUST include clearly labeled column headers identifying each metric and confidence level.
- **FR-006**: The "Download Excel" button on the results dashboard MUST be unavailable (hidden or disabled with explanatory label) when no simulation results exist for the scenario.
- **FR-007**: The downloaded file MUST be named to identify the scenario (e.g., using the scenario name or ID) to avoid ambiguity when multiple exports are saved locally.
- **FR-008**: The header section and data table MUST be visually distinct in the spreadsheet (e.g., separated by blank rows) so users can easily navigate the file.

### Key Entities

- **SimulationExport**: The complete exported artifact — comprises a plan design header block and a persona results table derived from an existing simulation result.
- **PlanDesignSummary**: The subset of plan configuration fields surfaced in the export header (contribution rates, match formula, vesting schedule, deferral defaults, and key simulation assumptions).
- **PersonaResultRow**: One row in the data table — persona name plus all reportable metrics (projected balance, income replacement ratios by confidence level, probability of success, total contributions).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can initiate and receive a completed Excel download in under 5 seconds for scenarios with up to 20 personas.
- **SC-002**: 100% of key metrics defined in FR-004 (projected balance, income replacement ratios, probability of success, total contributions) are present and correctly labeled in every exported file.
- **SC-003**: The exported `.xlsx` file opens without errors in Microsoft Excel, LibreOffice Calc, and Google Sheets.
- **SC-004**: The plan design header in the export matches the scenario configuration at the time of export with zero data discrepancies.
- **SC-005**: Users can locate and click the download button without instruction — the affordance is discoverable on first visit to the results dashboard.

## Assumptions

- Confidence levels supported in the export match those already computed by the simulation engine (e.g., 10th, 25th, 50th, 75th, 90th percentile) — no new percentiles need to be added.
- The results dashboard already renders simulation output; this feature adds an export action to that existing view rather than creating a new page.
- No authentication or access-control changes are required — export access follows the same permissions as viewing the results dashboard.
- File generation happens server-side and the file is streamed as a download response; no intermediate file storage is required.
- Currency values in the export use the application's default locale formatting (USD, two decimal places).
- The export is on-demand and synchronous — no scheduling, queuing, or email delivery is required.
