# Feature Specification: Scenario Management

**Feature Branch**: `003-scenario-management`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Build scenario management within a workspace: create, list, get, update, delete, and duplicate scenarios. Each scenario contains a plan design (match formula with up to 3 tiers, non-elective core contribution with optional age/service tiers, auto-enrollment settings, auto-escalation settings, vesting schedules, and eligibility waiting periods) and optional assumption overrides. Duplicating a scenario copies the plan design so users can create variants quickly."

## Clarifications

### Session 2026-02-24

- Q: Should the GET scenario response include resolved effective assumptions (workspace base merged with overrides), raw overrides only, or both? → A: Return both raw overrides AND resolved effective assumptions in the GET response, so clients can render scenarios without additional calls.
- Q: Should IRS limit validation cover employee deferrals in addition to employer contributions? → A: Yes, validate both sides. Employee-side: use each persona's configured deferral rate (not auto-enroll rate), project forward with auto-escalation (+1%/year to cap) if enabled, and check against applicable deferral/catch-up/super catch-up limits by age. Employer-side: match + core at comp limit vs. annual additions limit. IRS limits are single-year (2026) held constant — no multi-year schedule. All checks produce warnings, not blocking errors.
- Q: What default sort order should the scenario list use? → A: Last modified date, newest first — active scenarios surface to the top for iterative plan design workflows.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Retrieve a Scenario (Priority: P1)

A financial advisor creates a new scenario within an existing workspace by providing a scenario name and a plan design. The plan design includes the employer match formula, non-elective core contribution settings, auto-enrollment and auto-escalation configuration, vesting schedules, and eligibility waiting periods. The system validates the plan design (including checks against IRS contribution limits), persists the scenario within the workspace, and returns it with a unique ID. The advisor can then retrieve the scenario by ID to review or continue editing.

**Why this priority**: Creating and retrieving scenarios is the foundational capability. All other scenario operations (update, delete, duplicate, list) depend on the ability to create and fetch scenarios.

**Independent Test**: Can be fully tested by sending a create request with a scenario name and plan design for an existing workspace, then retrieving the scenario by ID and verifying all fields match. Delivers a working scenario persistence layer.

**Acceptance Scenarios**:

1. **Given** an existing workspace, **When** a user creates a scenario with name "Base Plan" and a plan design containing a 2-tier match formula, 3-year cliff vesting, and auto-enrollment at 6%, **Then** the system returns a scenario with a unique ID, the provided name, the full plan design, no assumption overrides, and timestamps
2. **Given** a scenario was created, **When** the user retrieves it by workspace ID and scenario ID, **Then** the response includes all scenario fields (plan design, raw assumption overrides, timestamps) plus the resolved effective assumptions (workspace base merged with overrides)
3. **Given** a workspace that does not exist, **When** the user attempts to create a scenario in it, **Then** the system returns a clear error indicating the workspace was not found
4. **Given** a plan design where the total maximum employer contribution (match + core at the compensation limit) would exceed the IRS annual additions limit, **When** the user creates the scenario, **Then** the system returns validation warnings identifying which IRS limits may be exceeded, but still saves the scenario
5. **Given** a workspace with personas and a plan design with auto-escalation enabled, **When** a persona's configured deferral rate projected forward with auto-escalation (+1%/year to the cap) would exceed the IRS deferral limit for that persona's age group, **Then** the system returns a warning identifying the persona and the year at which the limit is exceeded

---

### User Story 2 - List Scenarios Within a Workspace (Priority: P1)

A financial advisor views all scenarios within a workspace to compare different plan design options for a client. The list shows summary information (name, description, creation date, last modified date) so the advisor can quickly identify and select the scenario they want to work with.

**Why this priority**: Listing scenarios is essential for navigating between plan design alternatives. Without it, users must remember scenario IDs, making comparison workflows impractical.

**Independent Test**: Can be tested by creating multiple scenarios in a workspace and listing them, verifying all are returned with correct summary information.

**Acceptance Scenarios**:

1. **Given** a workspace with three scenarios named "Conservative", "Moderate", and "Aggressive" where "Moderate" was most recently modified, **When** the user lists all scenarios in the workspace, **Then** all three are returned with their IDs, names, descriptions, and timestamps, with "Moderate" appearing first
2. **Given** a workspace with no scenarios, **When** the user lists scenarios, **Then** an empty list is returned
3. **Given** a workspace that does not exist, **When** the user lists scenarios in it, **Then** the system returns a clear error indicating the workspace was not found

---

### User Story 3 - Update a Scenario (Priority: P2)

A financial advisor modifies an existing scenario's name, description, plan design, or assumption overrides. The advisor may adjust the match formula, change vesting schedules, modify auto-enrollment settings, or add assumption overrides that differ from the workspace base configuration. The system re-validates the updated plan design against IRS limits and persists the changes.

**Why this priority**: Updating scenarios is critical for the iterative plan design process — advisors refine plan parameters through multiple rounds of analysis. However, it depends on scenarios being creatable first.

**Independent Test**: Can be tested by creating a scenario, updating its plan design (e.g., adding a match tier), then retrieving it and verifying the changes persisted.

**Acceptance Scenarios**:

1. **Given** a scenario with a 2-tier match formula, **When** the user updates it to a 3-tier match formula, **Then** the scenario reflects the new match tiers and the `updated_at` timestamp is refreshed
2. **Given** a scenario with no assumption overrides, **When** the user adds an override for inflation rate (3.0%), **Then** the scenario stores the override and the effective configuration reflects the overridden value while inheriting all other assumptions from the workspace
3. **Given** a scenario that does not exist, **When** the user attempts to update it, **Then** the system returns a clear error indicating the scenario was not found
4. **Given** a partial update containing only a new name, **When** the user submits the update, **Then** only the name changes; the plan design and all other fields remain unchanged

---

### User Story 4 - Duplicate a Scenario (Priority: P2)

A financial advisor duplicates an existing scenario to create a variant quickly. The system copies the entire plan design and assumption overrides from the source scenario into a new scenario with a new unique ID and a derived name. The advisor can then modify the copy independently without affecting the original.

**Why this priority**: Duplication is the key productivity feature for "what-if" analysis — advisors typically start from a known baseline and make targeted changes rather than building each scenario from scratch.

**Independent Test**: Can be tested by creating a scenario with a detailed plan design, duplicating it, then verifying the copy has a different ID and name but identical plan design and overrides. Modifying the copy should not affect the original.

**Acceptance Scenarios**:

1. **Given** a scenario named "Base Plan" with a 3-tier match, 6-year graded vesting, and an inflation override, **When** the user duplicates it, **Then** a new scenario is created with name "Base Plan (Copy)", a new unique ID, an identical plan design, identical assumption overrides, and new timestamps
2. **Given** the duplicate scenario, **When** the user modifies its match formula, **Then** the original "Base Plan" scenario remains unchanged
3. **Given** a scenario that already has a copy named "Base Plan (Copy)", **When** the user duplicates "Base Plan" again, **Then** the new copy is named "Base Plan (Copy 2)"
4. **Given** a scenario that does not exist, **When** the user attempts to duplicate it, **Then** the system returns a clear error indicating the scenario was not found

---

### User Story 5 - Delete a Scenario (Priority: P3)

A financial advisor removes a scenario that is no longer needed. The system deletes the scenario and its data permanently from the workspace.

**Why this priority**: Deletion is necessary for keeping workspaces tidy but is the least frequently used operation compared to create, update, and duplicate.

**Independent Test**: Can be tested by creating a scenario, deleting it, then verifying it no longer appears in the scenario list.

**Acceptance Scenarios**:

1. **Given** a workspace with a scenario, **When** the user deletes the scenario by ID, **Then** the scenario is removed and no longer appears in the workspace's scenario list
2. **Given** a scenario that does not exist, **When** the user attempts to delete it, **Then** the system returns a clear error indicating the scenario was not found

---

### Edge Cases

- What happens when a user creates a scenario with a plan design that has zero match tiers and zero core contribution? The system should allow this — it represents a plan with no employer contributions.
- What happens when a user attempts to create a scenario with a name that already exists within the workspace? The system should allow duplicate names — scenarios are identified by their unique ID, not their name.
- What happens when a user updates a scenario's plan design with an auto-escalation cap lower than the current auto-enroll rate? The system should reject this with a validation error explaining the constraint.
- What happens when a user duplicates a scenario and the workspace has reached a very large number of scenarios (e.g., 100+)? The system should still allow duplication — there is no hard limit on scenarios per workspace, though listing performance should remain reasonable.
- What happens when a user updates only the assumption overrides of a scenario without changing the plan design? The system should accept the partial update and only modify the overrides.
- What happens when a scenario's plan design has match tiers with rates that, combined with core contribution at the IRS compensation limit, exceed the annual additions limit? The system should surface a validation warning but still allow saving.
- What happens when a persona's deferral rate is already above the IRS deferral limit as a percentage of their salary? The system should immediately warn on that persona without needing to project auto-escalation forward.
- What happens when auto-escalation is disabled but a persona's configured deferral rate at their salary exceeds the deferral limit? The system should still check the current rate and warn if it exceeds the limit.
- What happens when the source scenario is deleted between the time the user initiates a duplicate and the system processes it? The system should return an error indicating the source scenario was not found.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create a scenario within an existing workspace by providing a scenario name and a plan design; the system generates a unique ID and sets creation and modification timestamps automatically
- **FR-002**: System MUST allow an optional description field when creating or updating a scenario
- **FR-003**: System MUST validate the plan design on scenario creation and update, enforcing all plan design constraints: maximum 3 match tiers, valid match rates (0–100%), valid contribution percentages, valid vesting schedule configurations, and eligibility months (0–12)
- **FR-004**: System MUST perform IRS limit validation on scenario creation and update, checking both employer and employee sides against the effective assumptions (2026 IRS limits held constant):
  - **Employer-side**: Compute the maximum employer contribution (match + core) at the IRS compensation limit and compare against the annual additions limit
  - **Employee-side**: For each persona in the workspace, use the persona's configured deferral rate, project forward with auto-escalation (+1%/year to the cap) if enabled, and check each projected year's deferral against the applicable IRS limit for that persona's age (base deferral limit, catch-up limit for age 50+, or super catch-up limit for ages 60–63)
  - All violations produce warnings returned alongside the saved scenario, not blocking errors
- **FR-005**: System MUST allow users to provide optional assumption overrides when creating or updating a scenario; these overrides are stored with the scenario and deep-merged with the workspace base assumptions to produce the effective configuration (as defined in feature 002)
- **FR-006**: System MUST allow users to retrieve a single scenario by workspace ID and scenario ID, returning all scenario data including plan design, raw assumption overrides, timestamps, AND the resolved effective assumptions (workspace base deep-merged with scenario overrides)
- **FR-007**: System MUST return a clear, descriptive error when a requested scenario ID or workspace ID does not exist
- **FR-008**: System MUST allow users to list all scenarios within a workspace, returning each scenario's ID, name, description, and timestamps, sorted by last modified date (newest first) by default
- **FR-009**: System MUST allow users to update a scenario's name, description, plan design, and/or assumption overrides using partial updates — only provided fields are modified, and the `updated_at` timestamp is refreshed
- **FR-010**: System MUST allow users to delete a scenario by workspace ID and scenario ID, removing all scenario data permanently
- **FR-011**: System MUST allow users to duplicate a scenario, creating a new scenario with a copy of the source scenario's plan design and assumption overrides, a new unique ID, and a derived name following the pattern "[Original Name] (Copy)", incrementing with "(Copy 2)", "(Copy 3)", etc., if copies already exist
- **FR-012**: The duplicated scenario MUST be fully independent from the source — changes to either scenario do not affect the other
- **FR-013**: System MUST expose REST endpoints for all scenario operations nested under the workspace path: create (POST), list (GET), get by ID (GET), update (PATCH), delete (DELETE), and duplicate (POST)
- **FR-014**: System MUST persist scenario data within the workspace's storage directory, consistent with the workspace storage pattern established in feature 002
- **FR-015**: System MUST use the core data models defined in feature 001 (Scenario, PlanDesign, Assumptions, MatchTier, VestingSchedule, CoreContributionTier) as the foundation for scenario data structures
- **FR-016**: System MUST validate that the workspace exists before performing any scenario operation; if the workspace does not exist, the system returns an error before attempting the operation

### Key Entities

- **Scenario**: A specific plan design configuration that lives within a workspace. Contains a name, optional description, a complete plan design, and optional assumption overrides. Identified by a unique ID within the workspace. Inherits the workspace's base assumptions when overrides are not specified.
- **Plan Design**: The complete specification of a retirement plan's contribution structure within a scenario. Includes the employer match formula (up to 3 tiers), non-elective core contribution (with optional age/service-based tiers), auto-enrollment settings, auto-escalation settings, vesting schedules for both match and core contributions, and eligibility waiting periods.
- **Assumption Overrides**: Optional scenario-level modifications to the workspace's base assumptions. When present, these are deep-merged with the workspace base configuration so the scenario inherits all base values but can selectively override specific fields (e.g., different inflation rate, different IRS limits for future-year projections). Both the raw overrides and the resolved effective assumptions are returned when retrieving a scenario.
- **IRS Limit Validation Result**: A computed warning produced when a scenario's contribution potential exceeds IRS regulatory limits. Covers employer-side (match + core vs. additions limit) and employee-side (per-persona deferral projections vs. deferral/catch-up/super catch-up limits by age). Returned alongside scenario data but does not prevent saving.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new scenario with a complete plan design and retrieve it within a single session in under 5 seconds total
- **SC-002**: Users can duplicate an existing scenario and begin modifying the copy within 3 seconds, reducing scenario variant creation time by 80% compared to manual re-entry
- **SC-003**: Listing scenarios within a workspace returns accurate results for up to 50 scenarios within 2 seconds
- **SC-004**: 100% of plan design validation rules are enforced on every create and update operation, with no invalid plan designs persisted
- **SC-005**: IRS limit warnings are surfaced for 100% of scenarios where employer contributions exceed the annual additions limit or persona deferrals (current or projected with auto-escalation) exceed applicable deferral limits, with zero false negatives
- **SC-006**: All six scenario operations (create, list, get, update, delete, duplicate) return appropriate success or error responses for both valid and invalid inputs
- **SC-007**: Scenario data persists across application restarts — creating a scenario, stopping the application, restarting, and retrieving the scenario returns identical data
- **SC-008**: Duplicated scenarios are fully independent — modifying one never affects the other, verified through round-trip testing

## Assumptions

- The plan design structure and all related models (MatchTier, VestingSchedule, CoreContributionTier) are already defined in feature 001 and available for use
- The workspace storage layer and configuration inheritance (deep merge) mechanism from feature 002 are available and used for scenario persistence and assumption resolution
- Scenarios are stored within their parent workspace's directory, following the file-based persistence pattern established in feature 002
- IRS limit validation produces warnings (not blocking errors) and checks both sides: employer contributions (match + core) at the comp limit vs. the annual additions limit, and employee deferrals per persona (using each persona's configured deferral rate, projected with auto-escalation if enabled) vs. the applicable deferral/catch-up/super catch-up limit by age
- IRS limits use the single-year 2026 values from the Assumptions model, held constant across all projected years — no multi-year schedule
- Scenario names do not need to be unique within a workspace; scenarios are identified by their system-generated unique IDs
- There is no hard limit on the number of scenarios per workspace; the system should handle up to 50 scenarios per workspace with acceptable performance
- The duplicate operation copies the plan design and assumption overrides as a deep copy; it does not copy computed results or simulation history (the `last_run_at` field resets to empty on the duplicate)
- File locking for concurrent scenario access is out of scope, consistent with the single-user-per-workspace assumption from feature 002
