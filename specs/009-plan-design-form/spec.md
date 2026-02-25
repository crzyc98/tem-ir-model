# Feature Specification: Plan Design Configuration Form

**Feature Branch**: `009-plan-design-form`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Build the plan design configuration form used when creating or editing a scenario. The form should be a card-based layout with sections for: employer match formula (add/remove tiers, each with match rate and 'on first X%' input), employer non-elective core contribution (fixed % or age/service-tiered schedule), auto-enrollment toggle with default deferral rate, auto-escalation toggle with rate and cap, vesting schedule selectors for both match and core, and eligibility waiting period dropdowns. Include real-time validation and a summary card that shows the effective employer contribution at various deferral levels."

## Clarifications

### Session 2026-02-24

- Q: How many years should the graded vesting schedule support? → A: Vesting schedules are out of scope entirely. The model assumes participants stay at the same employer until retirement, so contributions are always fully vested.
- Q: When creating a new scenario, should the plan design form start empty or pre-populated with defaults? → A: Empty form — user adds all tiers and settings from scratch.

## Out of Scope

- **Vesting schedules**: Not modeled because the simulation assumes participants remain with the same employer until retirement (always 100% vested). The form does not include vesting configuration for match or core contributions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Employer Match Formula (Priority: P1)

A plan consultant opens the scenario creation or edit screen and configures the employer matching contribution formula. They add one or more match tiers, specifying for each tier the match rate (e.g., 100%) and the portion of salary it applies to (e.g., "on first 3%"). They can add up to 3 tiers to create a tiered match formula (e.g., 100% on the first 3%, then 50% on the next 2%). They can also remove tiers they no longer need. As they make changes, the contribution summary card updates in real time to show effective employer cost at sample deferral levels.

**Why this priority**: The employer match is the most common and impactful plan design element. Nearly every 401(k) plan has a match formula, and it directly drives participant behavior and employer cost. Without this, the form has no core functionality.

**Independent Test**: Can be fully tested by creating a scenario with a multi-tier match formula and verifying the summary card correctly calculates employer contributions at different deferral levels.

**Acceptance Scenarios**:

1. **Given** a user is on the scenario create/edit form, **When** they add a match tier with 100% match rate on the first 3% of salary, **Then** the summary card shows "If employee defers 3%, employer contributes 3%" and "If employee defers 6%, employer contributes 3%".
2. **Given** a form with one match tier (100% on first 3%), **When** the user adds a second tier (50% on next 2%), **Then** the summary card updates to show "If employee defers 6%, employer contributes 4%" (3% from tier 1 + 1% from 50% of the next 2%).
3. **Given** a form with 3 match tiers configured, **When** the user tries to add a fourth tier, **Then** the add button is disabled and/or a message indicates the maximum of 3 tiers has been reached.
4. **Given** a form with 2 match tiers, **When** the user removes the second tier, **Then** the tier is removed, the summary card recalculates, and the add button becomes available again.

---

### User Story 2 - Configure Core Contribution and Eligibility (Priority: P2)

A plan consultant configures the employer's non-elective core contribution. They choose between a flat percentage (e.g., 3% for all participants) or an age/service-tiered schedule where different contribution rates apply based on participant age and/or years of service. They also set eligibility waiting periods for both the match and core contribution types.

**Why this priority**: Core contributions are critical plan design elements that affect employer cost modeling and participant outcomes. They complete the full employer contribution picture alongside the match formula.

**Independent Test**: Can be tested by configuring a core contribution with age/service tiers, setting eligibility waiting periods, and verifying the form correctly captures and saves all values.

**Acceptance Scenarios**:

1. **Given** a user is on the plan design form, **When** they enter a flat core contribution of 3%, **Then** the value is accepted, the summary card includes the core contribution in total employer cost, and the age/service tier section is hidden or inactive.
2. **Given** a user enables age/service tiers for core contribution, **When** they add a tier with ages 25–34 and 0–4 years of service at 2%, **Then** the tier is displayed with all bounds and the contribution rate.
3. **Given** a user adds two core contribution tiers with overlapping age ranges, **When** the overlap is detected, **Then** a validation error is displayed indicating which tiers overlap and on which dimension.
4. **Given** a user sets the match eligibility waiting period to 6 months and core to 12 months, **When** they save the scenario, **Then** both waiting periods are persisted correctly.

---

### User Story 3 - Configure Auto-Enrollment and Auto-Escalation (Priority: P3)

A plan consultant toggles auto-enrollment on and sets a default deferral rate for new participants. They then enable auto-escalation, specifying the annual escalation rate and the cap at which escalation stops. The form validates that the escalation cap is at least as high as the auto-enrollment rate.

**Why this priority**: Auto-enrollment and auto-escalation are important plan features that drive participation rates, but they are secondary to the employer contribution configuration (match + core) in terms of cost modeling.

**Independent Test**: Can be tested by toggling auto-enrollment on/off, setting the deferral rate, enabling escalation with rate and cap, and verifying validation prevents the cap from being lower than the enrollment rate.

**Acceptance Scenarios**:

1. **Given** a user is on the plan design form, **When** they toggle auto-enrollment on, **Then** the default deferral rate input becomes editable with a pre-populated default of 6%.
2. **Given** auto-enrollment is enabled at 6%, **When** the user toggles auto-escalation on, **Then** the escalation rate (default 1%/year) and cap (default 10%) inputs become editable.
3. **Given** auto-enrollment is set to 6% and auto-escalation is enabled, **When** the user sets the escalation cap to 4% (below the enrollment rate), **Then** a validation error appears stating the cap must be at least equal to the enrollment rate.
4. **Given** auto-enrollment is toggled off, **When** the user views the auto-escalation section, **Then** the auto-escalation toggle and inputs are disabled since escalation requires auto-enrollment.

---

### User Story 4 - Real-Time Contribution Summary (Priority: P2)

As a plan consultant makes changes to any part of the plan design (match tiers, core contribution, auto-enrollment rate), the summary card at the bottom or side of the form instantly recalculates and displays the effective total employer contribution at multiple sample employee deferral levels (e.g., 0%, 3%, 6%, 10%, 15%). This gives the consultant immediate feedback on the cost implications of their design choices.

**Why this priority**: Real-time feedback is essential for an efficient plan design workflow. Without it, users must mentally calculate contributions or save-and-check, significantly slowing the design process.

**Independent Test**: Can be tested by modifying match tiers and core contribution values and verifying the summary table updates immediately with correct calculations at each sample deferral level.

**Acceptance Scenarios**:

1. **Given** a plan design with a 100% match on the first 4% and a 3% core contribution, **When** the summary card is displayed, **Then** it shows: at 0% deferral the employer contributes 3% (core only), at 4% deferral the employer contributes 7% (4% match + 3% core), and at 10% deferral the employer still contributes 7% (match capped at tier limit).
2. **Given** the user changes the match formula, **When** they modify a match rate or add/remove a tier, **Then** the summary card values update within 1 second without requiring a save or page refresh.
3. **Given** a plan design with age/service-tiered core contributions, **When** the summary card is displayed, **Then** it uses the flat core contribution rate (not tiered) for the summary since the summary applies to a generic participant without specific age/service attributes.

---

### User Story 5 - Save Plan Design to Scenario (Priority: P1)

A plan consultant completes the plan design form and saves it as part of a new scenario (during creation) or updates an existing scenario's plan design. The system validates all fields before saving, displays any validation errors inline, and upon successful save navigates the user back to the scenario list or detail view. If the save produces IRS compliance warnings (e.g., employer contributions exceed the annual additions limit for a persona), those warnings are displayed to the user.

**Why this priority**: Without save functionality, no plan design work can be persisted. This is a P1 alongside the match formula because the form must be able to create/update scenarios to deliver any value.

**Independent Test**: Can be tested by filling out the entire form, clicking save, and verifying the scenario is created/updated with the correct plan design values via the API.

**Acceptance Scenarios**:

1. **Given** a user fills out a valid plan design on the create scenario form, **When** they click save, **Then** the scenario is created and the user is navigated to the scenarios list showing the new scenario.
2. **Given** a user is editing an existing scenario, **When** they modify the match formula and save, **Then** the scenario is updated with only the changed fields and the updated timestamp reflects the change.
3. **Given** a user attempts to save with validation errors (e.g., overlapping core tiers, escalation cap below enrollment rate), **When** they click save, **Then** the save is prevented and all validation errors are displayed inline next to the relevant fields.
4. **Given** a user saves a scenario that triggers IRS compliance warnings, **When** the save succeeds, **Then** the warnings are displayed to the user as non-blocking alerts (the save still completes).
5. **Given** a user has unsaved changes and attempts to navigate away, **When** the navigation is triggered, **Then** a confirmation dialog warns them about losing unsaved changes.

---

### Edge Cases

- What happens when a user enters a match rate of 0% for a tier? The tier should be accepted (valid) but the summary should reflect zero contribution from that tier.
- What happens when all match tiers are removed? The match section should show an empty state prompting the user to add a tier, and the summary should only reflect core contributions.
- What happens when the user toggles core contribution tiers on, adds tiers, then toggles back to flat rate? The tier data should be cleared or hidden, and the flat rate should be used for calculations.
- What happens when the API returns an error during save (e.g., network failure)? The form should display an error message, retain all form data, and allow the user to retry.
- What happens when a user loads a scenario for editing that was created with a different version of the plan design model (e.g., missing a field)? The form should handle missing fields gracefully by applying defaults.
- What happens when a user tries to save a new scenario without configuring any plan design fields? The form should allow saving with an empty/minimal plan design (no match tiers, 0% core, auto-enrollment off) since a blank starting point is valid.

## Requirements *(mandatory)*

### Functional Requirements

#### Employer Match Formula
- **FR-001**: Users MUST be able to add match tiers to the employer match formula, each specifying a match rate and the salary percentage it applies to ("on first X%").
- **FR-002**: Users MUST be able to remove any individual match tier from the formula.
- **FR-003**: The system MUST enforce a maximum of 3 match tiers per plan design.
- **FR-004**: Match rates and salary percentages MUST be constrained between 0% and 100%.

#### Employer Core Contribution
- **FR-005**: Users MUST be able to set a flat-rate core contribution percentage.
- **FR-006**: Users MUST be able to switch between a flat-rate core contribution and an age/service-tiered schedule.
- **FR-007**: When using age/service tiers, users MUST be able to add and remove tiers, each specifying optional age bounds, optional service-year bounds, and a contribution percentage.
- **FR-008**: The system MUST enforce a maximum of 5 core contribution tiers.
- **FR-009**: The system MUST validate that core contribution tiers do not have overlapping age or service ranges on shared dimensions.
- **FR-010**: Each core contribution tier MUST have at least one dimension (age or service) with non-null bounds.

#### Auto-Enrollment and Auto-Escalation
- **FR-011**: Users MUST be able to toggle auto-enrollment on or off, with a configurable default deferral rate.
- **FR-012**: Users MUST be able to toggle auto-escalation on or off, with configurable annual escalation rate and escalation cap.
- **FR-013**: The system MUST validate that the auto-escalation cap is greater than or equal to the auto-enrollment rate when both features are enabled.
- **FR-014**: Auto-escalation controls MUST be disabled when auto-enrollment is turned off.

#### Eligibility
- **FR-015**: Users MUST be able to set an eligibility waiting period for both match and core contributions, selectable from 0 to 12 months.

#### Validation
- **FR-016**: The system MUST perform real-time validation as the user edits fields, displaying errors inline next to the relevant input.
- **FR-017**: The system MUST prevent saving when validation errors exist.

#### Contribution Summary
- **FR-018**: The system MUST display a summary card that calculates and shows the effective total employer contribution (match + core) at multiple sample employee deferral levels.
- **FR-019**: The summary card MUST update in real time as the user modifies any plan design parameter.
- **FR-020**: The summary MUST show results at a minimum of 5 sample deferral levels (e.g., 0%, 3%, 6%, 10%, 15%).

#### Persistence
- **FR-021**: Users MUST be able to save the plan design as part of creating a new scenario.
- **FR-022**: Users MUST be able to update the plan design of an existing scenario.
- **FR-023**: The system MUST warn users about unsaved changes when navigating away from the form.
- **FR-024**: The system MUST display IRS compliance warnings returned from the server after a successful save.

### Key Entities

- **Plan Design**: The complete retirement plan configuration including match formula, core contribution, auto-enrollment settings, and eligibility rules. Belongs to a scenario.
- **Match Tier**: A single tier within the employer match formula, defined by a match rate and the salary percentage it applies to. A plan design can have 0–3 match tiers.
- **Core Contribution Tier**: A tier within an age/service-based core contribution schedule, defined by optional age bounds, optional service-year bounds, and a contribution percentage. A plan design can have 0–5 core tiers.
- **Scenario**: The parent entity that contains a plan design along with a name, description, and optional assumption overrides. Belongs to a workspace.

## Assumptions

- Default auto-enrollment rate is 6% when first enabled, consistent with industry common practice.
- Default auto-escalation rate is 1% per year with a 10% cap when first enabled.
- The contribution summary card uses only the flat core contribution rate (not age/service tiers) because the summary applies to a generic participant profile without specific demographic attributes.
- Sample deferral levels for the summary card are 0%, 3%, 6%, 10%, and 15% — covering the most common range of employee deferral behavior.
- The form reuses the existing scenario create/edit page structure and navigation patterns already established in the application.
- When creating a new scenario, the plan design form starts empty — no pre-populated match tiers, core contribution, or auto-enrollment settings. The user builds the plan design from scratch.
- IRS compliance warnings are non-blocking — they are informational alerts displayed after a successful save, not validation errors that prevent saving.
- When toggling from age/service-tiered core contributions back to flat rate, previously entered tier data is discarded.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can configure a complete plan design (match formula, core contribution, auto-enrollment, eligibility) and save it as a scenario in under 5 minutes.
- **SC-002**: 95% of users successfully complete plan design configuration on their first attempt without encountering confusing or unclear form elements.
- **SC-003**: The contribution summary card reflects correct employer contribution calculations at all displayed deferral levels, matching the configured match and core formulas exactly.
- **SC-004**: All validation errors are displayed within 1 second of the user making a change, with clear messages that identify the issue and the field it relates to.
- **SC-005**: Users can distinguish between match and core contribution sections, configure them independently, and understand the total employer cost from the summary card without external reference materials.
- **SC-006**: Form state is preserved during editing — toggling sections and adding/removing tiers does not cause unintended data loss in other sections.
