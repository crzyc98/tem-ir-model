# Feature Specification: Workspace Management UI

**Feature Branch**: `008-workspace-management-ui`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Build the workspace management UI: a landing page showing recent workspaces as cards with client name, scenario count, and last modified date. Include create workspace flow (client name, optional base config customization), workspace settings page for editing base assumptions and the default persona set. Build the scenario list view within a workspace showing each scenario's plan design summary as a card, with create, duplicate, and delete actions."

## Clarifications

### Session 2026-02-24

- Q: Should clicking a scenario card navigate to a detail/edit page for modifying the plan design? → A: Yes — card click opens a scenario detail/edit page for viewing and modifying the full plan design.
- Q: What happens when a user clicks a workspace card on the dashboard? → A: Click selects the workspace as active and navigates to the scenario list page.
- Q: Should users be able to delete workspaces from the dashboard? → A: Yes — workspace cards have a delete action with a confirmation prompt (mirrors scenario deletion behavior).
- Q: What UX pattern should workspace and scenario creation use? → A: Modal dialog for workspace creation (lightweight); dedicated full page for scenario creation (complex plan design form).
- Q: Can users add or remove personas, or only edit existing ones? → A: Edit existing personas only — no add or remove capability.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Workspace Dashboard (Priority: P1)

A consultant opens the application and lands on a dashboard showing all their client workspaces as cards. Each card displays the client name, the number of scenarios within that workspace, and when it was last modified. The most recently modified workspaces appear first, giving the consultant quick access to active engagements.

**Why this priority**: This is the entry point to the entire application. Without a visible, navigable list of workspaces, the user cannot access any other functionality. It delivers immediate value by giving consultants an at-a-glance overview of all their client engagements.

**Independent Test**: Can be fully tested by creating several workspaces via the backend API and verifying the dashboard renders each as a card with the correct client name, scenario count, and last-modified date, sorted by recency.

**Acceptance Scenarios**:

1. **Given** the user has three workspaces with varying scenario counts, **When** they navigate to the dashboard, **Then** they see three cards showing each workspace's client name, scenario count, and last-modified date, ordered most-recent first.
2. **Given** the user has no workspaces, **When** they navigate to the dashboard, **Then** they see an empty state with a prompt to create their first workspace.
3. **Given** a workspace was just updated, **When** the user returns to the dashboard, **Then** that workspace's card reflects the updated modification date and appears first.
4. **Given** the user is on the dashboard, **When** they click a workspace card, **Then** that workspace is selected as the active workspace and the user is navigated to the scenario list page for that workspace.
5. **Given** the user is on the dashboard, **When** they initiate deletion of a workspace, **Then** they see a confirmation prompt. If they confirm, the workspace and all its scenarios are removed. If they cancel, the workspace remains.

---

### User Story 2 - Create a New Workspace (Priority: P1)

A consultant needs to start a new client engagement. From the dashboard, they click a create button which opens a modal dialog. They provide a client name and optionally customize the base economic assumptions (inflation rate, wage growth, asset class returns, IRS limits) before saving. If they skip customization, sensible defaults are applied. After creation, the new workspace appears on the dashboard and is automatically selected as the active workspace.

**Why this priority**: Creating workspaces is the foundational action — without it, no scenarios, simulations, or analysis can occur. Tied with the dashboard as the minimum viable feature set.

**Independent Test**: Can be fully tested by clicking the create action, entering a client name, submitting, and verifying the new workspace appears on the dashboard with correct details and becomes the active workspace.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they initiate workspace creation and enter a client name "Acme Corp", **Then** a workspace is created with that client name and default base assumptions, and appears on the dashboard.
2. **Given** the user is creating a workspace, **When** they customize the inflation rate to 3.0% and save, **Then** the workspace is created with the custom inflation rate while all other assumptions retain their defaults.
3. **Given** the user is in the create flow, **When** they submit without entering a client name, **Then** they see a validation message indicating client name is required.
4. **Given** workspace creation succeeds, **When** the dashboard refreshes, **Then** the newly created workspace is selected as the active workspace in the sidebar selector.

---

### User Story 3 - View Scenario List Within a Workspace (Priority: P2)

A consultant selects a workspace and navigates to the scenarios view. They see all scenarios for that workspace displayed as cards. Each card shows the scenario name, a summary of the plan design (e.g., match formula, auto-enrollment rate, core contribution), and creation/modification dates. This gives the consultant a quick visual comparison of different plan designs being modeled.

**Why this priority**: Once workspaces exist, the primary workflow involves comparing scenarios within a workspace. The scenario list is the gateway to scenario-level actions and analysis.

**Independent Test**: Can be fully tested by creating a workspace with multiple scenarios via the API, navigating to the scenario list, and verifying each card displays the correct scenario name, plan design summary, and dates.

**Acceptance Scenarios**:

1. **Given** the active workspace has three scenarios with different plan designs, **When** the user navigates to the scenarios page, **Then** they see three cards each showing the scenario name, a human-readable plan design summary, and modification date.
2. **Given** the active workspace has no scenarios, **When** the user navigates to the scenarios page, **Then** they see an empty state encouraging them to create their first scenario.
3. **Given** a scenario card is displayed, **When** the user reads it, **Then** they can see at minimum: match tiers summary (e.g., "100% on first 6%"), auto-enrollment rate, and core contribution percentage.

---

### User Story 4 - Create, Edit, Duplicate, and Delete Scenarios (Priority: P2)

A consultant manages scenarios within a workspace. They can create a new scenario by navigating to a dedicated creation page where they provide a name and configure the plan design parameters (match tiers, vesting, auto-enrollment settings, core contributions). They can click on an existing scenario card to open a detail/edit page where they can view and modify the full plan design. They can duplicate an existing scenario to use as a starting point for a variation. They can delete scenarios they no longer need, with a confirmation step to prevent accidental loss.

**Why this priority**: CRUD operations on scenarios are essential for the core modeling workflow. Duplication is especially valuable for consultants exploring variations of a plan design.

**Independent Test**: Can be fully tested by creating a scenario with specific plan design parameters, duplicating it, verifying the copy has identical settings with a modified name, then deleting the copy and confirming it disappears from the list.

**Acceptance Scenarios**:

1. **Given** the user is on the scenario list, **When** they create a new scenario named "Base Plan" with a 100% match on first 6% of pay, **Then** the scenario appears in the list with the correct plan design summary.
2. **Given** a scenario "Base Plan" exists, **When** the user clicks the scenario card, **Then** they are navigated to a detail/edit page showing the full plan design with editable fields.
3. **Given** the user is on a scenario detail/edit page, **When** they change the auto-enrollment rate from 6% to 8% and save, **Then** the scenario is updated and the scenario list card reflects the new plan design summary.
4. **Given** a scenario "Base Plan" exists, **When** the user duplicates it, **Then** a new scenario appears named "Base Plan (Copy)" with identical plan design settings.
5. **Given** a scenario exists, **When** the user initiates deletion, **Then** they see a confirmation prompt. If they confirm, the scenario is removed from the list. If they cancel, the scenario remains.
6. **Given** the user is creating a scenario, **When** they submit without a scenario name, **Then** they see a validation message indicating the name is required.

---

### User Story 5 - Edit Workspace Settings (Priority: P3)

A consultant needs to adjust the economic assumptions or default persona set for a client engagement. They navigate to the workspace settings page where they can edit base assumptions (inflation rate, wage growth, asset class returns, IRS contribution limits) and manage the default persona set (view, edit individual persona details like age, salary, deferral rate, and allocation). Changes save and apply to any future scenario calculations within that workspace.

**Why this priority**: Settings editing is important for accuracy but not required for the initial modeling workflow. Defaults are sensible enough for early use, and consultants typically adjust settings after initial scenario exploration.

**Independent Test**: Can be fully tested by navigating to workspace settings, modifying the inflation rate and a persona's salary, saving, and verifying the changes persist when the page is reloaded.

**Acceptance Scenarios**:

1. **Given** the user is on the workspace settings page, **When** they change the inflation rate from 2.5% to 3.0% and save, **Then** the workspace's base config reflects the updated inflation rate.
2. **Given** the user is editing personas, **When** they change "Jordan"'s salary from $40,000 to $45,000 and save, **Then** the persona list reflects the updated salary.
3. **Given** the user has made unsaved changes, **When** they attempt to navigate away, **Then** they are warned about unsaved changes and given the option to stay or discard.
4. **Given** the user enters an invalid value (e.g., negative inflation rate), **When** they attempt to save, **Then** they see a validation error and the form is not submitted.

---

### Edge Cases

- What happens when the backend API is unreachable? The UI displays a clear error message with a retry option rather than a blank or broken page.
- What happens when another session deletes a workspace the user is currently viewing? The UI handles 404 responses gracefully, showing a "workspace not found" message and redirecting to the dashboard.
- What happens when a workspace has a very large number of scenarios (50+)? The scenario list remains performant and usable; scrolling is smooth.
- What happens when the user rapidly clicks create/delete actions? The UI prevents duplicate submissions by disabling action buttons while requests are in flight.
- What happens when two fields in the settings form have cross-validation rules (e.g., auto-escalation cap must be >= auto-enroll rate)? Validation errors appear inline with clear messaging about the constraint.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all workspaces as cards on the dashboard, each showing client name, scenario count, and last-modified date.
- **FR-002**: System MUST sort workspace cards by last-modified date, most recent first.
- **FR-022**: System MUST select the workspace as active and navigate to the scenario list page when a user clicks a workspace card on the dashboard.
- **FR-023**: System MUST provide a delete action on workspace cards with a confirmation prompt before deletion.
- **FR-024**: System MUST, upon workspace deletion, remove the workspace from the dashboard and clear the active workspace selection if the deleted workspace was active.
- **FR-003**: System MUST display an empty state on the dashboard when no workspaces exist, with a call-to-action to create one.
- **FR-004**: System MUST provide a create workspace flow via a modal dialog that requires a client name and optionally allows customization of base economic assumptions.
- **FR-005**: System MUST validate that client name is non-empty before workspace creation.
- **FR-006**: System MUST automatically select a newly created workspace as the active workspace.
- **FR-007**: System MUST display all scenarios within the active workspace as cards, each showing the scenario name, a plan design summary, and modification date.
- **FR-008**: The plan design summary on scenario cards MUST include at minimum: match formula, auto-enrollment rate, and core contribution percentage.
- **FR-009**: System MUST display an empty state on the scenario list when no scenarios exist.
- **FR-010**: System MUST provide a create scenario flow via a dedicated full page that requires a name and plan design configuration (match tiers, vesting schedules, auto-enrollment settings, core contributions).
- **FR-020**: System MUST navigate to a scenario detail/edit page when a user clicks a scenario card, displaying the full plan design with editable fields.
- **FR-021**: System MUST allow users to modify an existing scenario's plan design and save changes from the detail/edit page.
- **FR-011**: System MUST support duplicating an existing scenario, creating a copy with the name "[Original Name] (Copy)".
- **FR-012**: System MUST require user confirmation before deleting a scenario.
- **FR-013**: System MUST provide a workspace settings page for editing base economic assumptions (inflation rate, wage growth, asset class returns, IRS limits).
- **FR-014**: System MUST provide persona management on the settings page, allowing editing of each existing persona's attributes (name, age, tenure, salary, deferral rate, balance, allocation). Adding new personas or removing existing ones is not supported.
- **FR-015**: System MUST validate all form inputs against their domain constraints (e.g., non-negative rates, salary > 0, allocation percentages sum to 100%).
- **FR-016**: System MUST warn users about unsaved changes when navigating away from a settings form with modifications.
- **FR-017**: System MUST disable action buttons while API requests are in flight to prevent duplicate submissions.
- **FR-018**: System MUST display clear error messages when API calls fail, with a retry option where appropriate.
- **FR-019**: System MUST handle 404 responses (e.g., deleted workspace) gracefully by showing a "not found" message and redirecting to the dashboard.

### Key Entities

- **Workspace**: A container for a client engagement, holding base economic assumptions, a default persona set, and a collection of scenarios. Key display attributes: client name, scenario count, last-modified date.
- **Scenario**: A specific plan design configuration within a workspace, representing one retirement plan variant to model. Key display attributes: name, plan design summary (match formula, auto-enrollment, core contribution), dates.
- **Persona**: A representative participant profile with demographic and financial attributes, used across all scenarios within a workspace.
- **Base Config (Assumptions)**: Economic and regulatory parameters (inflation, wage growth, asset returns, IRS limits) that serve as defaults for all scenarios in a workspace.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their workspace dashboard and identify any client engagement within 5 seconds of page load.
- **SC-002**: Users can create a new workspace with default settings in under 30 seconds (client name entry through dashboard confirmation).
- **SC-003**: Users can view and understand the plan design differences between scenarios at a glance from the scenario list, without opening individual scenarios.
- **SC-004**: Users can duplicate an existing scenario and begin modifying it in under 10 seconds.
- **SC-005**: Users can modify workspace base assumptions and save successfully, with changes reflected in subsequent scenario calculations.
- **SC-006**: All forms validate input before submission, preventing invalid data from reaching the backend.
- **SC-007**: All error states (network failure, not found, validation) present actionable feedback to the user rather than blank screens or cryptic messages.
- **SC-008**: 90% of users can complete the create-workspace-then-create-scenario flow on their first attempt without external guidance.

## Assumptions

- The existing backend API (workspace CRUD, scenario CRUD including duplicate endpoint) is stable and fully functional. This feature is purely a frontend implementation consuming those APIs.
- The workspace sidebar selector (already implemented) will continue to work alongside the new dashboard, providing an alternative way to switch workspaces.
- The default persona set (8 personas) is created server-side on workspace creation. The settings page edits these personas via the workspace PATCH endpoint.
- Scenario creation requires the full PlanDesign object. The UI will provide sensible form defaults matching the backend model defaults (e.g., auto-enroll enabled at 6%, auto-escalation at 1% to 10% cap).
- The scenario list view does not need pagination for the initial release — workspaces are expected to have fewer than 50 scenarios in typical use.
- Monte Carlo configuration editing is out of scope for this feature (can be added to settings later).
