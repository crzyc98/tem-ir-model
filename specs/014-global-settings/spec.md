# Feature Specification: Global Settings Page

**Feature Branch**: `014-global-settings`
**Created**: 2026-02-25
**Status**: Draft
**Input**: User description: "Build the global settings page with two sections: Economic & IRS assumption defaults for new workspaces, and simulation configuration defaults. Persisted to ~/.retiremodel/global_defaults.yaml."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Economic & IRS Defaults (Priority: P1)

A planner wants to set their preferred economic assumptions and IRS limits that will automatically populate every new workspace, eliminating the need to re-enter the same values repeatedly. They navigate to the Global Settings page, review the current defaults under the "Economic & IRS Assumptions" section, and update values such as inflation rate, salary growth rate, and current-year IRS contribution limits. They save their changes, then create a new workspace and confirm the values are pre-filled with their configured defaults.

**Why this priority**: This is the core value proposition of the feature. Without the ability to persist economic and IRS assumptions, every new workspace requires manual re-entry of stable assumptions, increasing friction and the risk of inconsistency.

**Independent Test**: Can be fully tested by navigating to Global Settings, updating at least one economic or IRS value, saving, creating a new workspace, and verifying the new workspace reflects the saved value.

**Acceptance Scenarios**:

1. **Given** the user is on the Global Settings page, **When** they change the inflation rate from 2.5% to 3.0% and save, **Then** the setting is persisted and the next new workspace is created with a 3.0% inflation rate.
2. **Given** the user has changed the 402(g) deferral limit, **When** they navigate away and return to Global Settings, **Then** the updated value is displayed (not the original default).
3. **Given** the user is on the Global Settings page, **When** they view the IRS limits section, **Then** the following fields are present and editable: compensation limit ($360,000), 402(g) deferral limit ($24,500), 415 annual additions limit ($72,000), catch-up contribution 50+ ($8,000), super catch-up 60-63 ($11,250), and SS taxable maximum ($184,500).
4. **Given** a user enters a non-numeric value in any numeric field, **When** they attempt to save, **Then** the system shows a validation error and does not persist the invalid value.

---

### User Story 2 - Configure Target Replacement Ratio Mode (Priority: P2)

A planner wants to control how target replacement ratios are determined for all personas in new workspaces. By default the system uses an income-based lookup table. The planner wants the option to override this with a single flat percentage that applies uniformly to all personas (e.g., 80% for all income levels). They select the flat-percentage override mode, enter their preferred percentage, and save. New workspaces subsequently use the flat percentage rather than the lookup table.

**Why this priority**: The replacement ratio mode directly affects every simulation output. Planners who disagree with the income-based lookup table need this override to conduct meaningful analysis, but it is secondary to the core assumption configuration.

**Independent Test**: Can be fully tested by switching the replacement ratio mode to "flat percentage," entering a value, saving, and verifying the mode and value are reflected when creating a new workspace.

**Acceptance Scenarios**:

1. **Given** the user is on Global Settings, **When** they view the Target Replacement Ratio section, **Then** two mode options are displayed: "Use income-based lookup table" (default) and "Override with flat percentage."
2. **Given** the user selects "Override with flat percentage" mode, **When** the mode is selected, **Then** a numeric input field appears where they can enter a percentage value (e.g., 80%).
3. **Given** the user saves a flat-percentage override of 75%, **When** a new workspace is created, **Then** the workspace uses 75% as the replacement ratio for all personas instead of the income-based table.
4. **Given** the user switches back to "Use income-based lookup table," **When** they save, **Then** new workspaces use the lookup table and the flat percentage is no longer applied.

---

### User Story 3 - Configure Simulation Configuration Defaults (Priority: P2)

A planner wants to set default values for retirement age, planning age, and Social Security claiming age that apply to all new workspaces. They navigate to the "Simulation Configuration" section of Global Settings, update the values, and save. They also see the fixed simulation count (250) displayed as a read-only informational field, confirming the architecture constraint is transparent.

**Why this priority**: These defaults shape every simulation run and save time when a planner consistently uses the same retirement assumptions. Sharing priority with the replacement ratio mode as both affect simulation quality but neither blocks core assumption editing.

**Independent Test**: Can be fully tested by changing retirement age, planning age, or SS claiming age, saving, creating a new workspace, and verifying the new defaults appear.

**Acceptance Scenarios**:

1. **Given** the user is on Global Settings, **When** they view the Simulation Configuration section, **Then** three editable fields are shown: Retirement Age (default 67), Planning Age (default 93), and Social Security Claiming Age (default 67).
2. **Given** the user is on Global Settings, **When** they view the Simulation Configuration section, **Then** a read-only field displays "Number of Simulations: 250" with a note explaining it is fixed by the scenario matrix architecture.
3. **Given** the user changes the planning age to 95 and saves, **When** a new workspace is created, **Then** the new workspace has a default planning age of 95.
4. **Given** the user enters an age below 50 or above 120 in any age field, **When** they attempt to save, **Then** the system shows a validation error and does not save the invalid value.

---

### User Story 4 - Restore System Defaults (Priority: P3)

A planner has made several changes to their global defaults but wants to revert everything back to the application's built-in defaults. They click the "Restore System Defaults" button, confirm the action via a confirmation prompt, and all fields reset to the original hardcoded values. Existing workspaces are not affected.

**Why this priority**: This is a safety valve that reduces the cost of experimentation, but it is not required for the core settings workflow.

**Independent Test**: Can be fully tested by changing at least one value, clicking "Restore System Defaults," confirming, and verifying all fields display the original hardcoded values.

**Acceptance Scenarios**:

1. **Given** the user has modified one or more global defaults, **When** they click "Restore System Defaults," **Then** a confirmation dialog appears asking them to confirm the reset.
2. **Given** the user confirms the reset, **When** the action completes, **Then** all editable fields display the original hardcoded application defaults.
3. **Given** the user cancels the confirmation dialog, **When** the dialog is dismissed, **Then** no values are changed and the current custom settings remain.
4. **Given** defaults have been restored, **When** the user views an existing workspace, **Then** that workspace's assumptions remain unchanged.

---

### Edge Cases

- What happens when the config file is missing or corrupted on application startup? The system should fall back to hardcoded defaults and notify the user.
- What happens when the user enters a salary growth rate lower than the inflation rate? The system should display an informational warning (not a hard error) since this may be intentional for conservative planning.
- What happens if the planning age is set lower than or equal to the retirement age? The system should show a validation error since this produces an invalid simulation window.
- What happens if the SS claiming age is set outside the valid Social Security claiming range (62-70)? The system should show a validation error.
- What happens when two browser tabs both have the Settings page open and one saves? The page should use the most recently saved state on next load.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated Global Settings page accessible from the application's main navigation.
- **FR-002**: The Global Settings page MUST contain a section titled "Economic & IRS Assumptions" with the following editable fields: inflation rate, salary growth rate, compensation limit (IRC §401(a)(17)), 402(g) elective deferral limit, 415 annual additions limit, catch-up contribution limit (age 50+), super catch-up contribution limit (age 60-63), and SS taxable wage base.
- **FR-003**: The system MUST pre-populate all editable fields with the current saved values (or hardcoded defaults on first use).
- **FR-004**: The Global Settings page MUST contain a section titled "Simulation Configuration" with editable fields for: default retirement age, default planning age, and default Social Security claiming age.
- **FR-005**: The Simulation Configuration section MUST display a read-only field showing the fixed number of simulations (250) with an explanatory note that this value is determined by the scenario matrix architecture and is not configurable.
- **FR-006**: The system MUST include a "Target Replacement Ratio" setting with two selectable modes: (a) "Use income-based lookup table" and (b) "Override with flat percentage applied to all personas."
- **FR-007**: When the user selects the "Override with flat percentage" mode, the system MUST display a numeric input for the flat percentage value.
- **FR-008**: The system MUST persist all saved global defaults to the application-wide configuration file at `~/.retiremodel/global_defaults.yaml`, separate from any workspace configuration.
- **FR-009**: The system MUST apply saved global defaults only to newly created workspaces; existing workspaces MUST NOT be retroactively modified.
- **FR-010**: The system MUST provide a "Restore System Defaults" button that, after user confirmation, resets all global default values to the hardcoded application defaults.
- **FR-011**: The system MUST validate all numeric inputs before saving: age fields must fall within plausible ranges (retirement age 50-85, planning age 60-120, SS claiming age 62-70), percentage fields must be positive numbers, and planning age must exceed retirement age.
- **FR-012**: The system MUST display clear validation error messages adjacent to invalid fields when the user attempts to save with invalid values.
- **FR-013**: The system MUST show a success confirmation when settings are saved successfully.
- **FR-014**: On startup, if the global defaults file is missing or unreadable, the system MUST fall back to hardcoded defaults and notify the user.

### Key Entities

- **GlobalDefaults**: The application-wide configuration record containing all default values for economic assumptions, IRS limits, target replacement ratio mode, and simulation parameters. Stored independently of any workspace.
- **IRS Limits Snapshot**: The set of current-year IRS-defined contribution and compensation limits stored within GlobalDefaults. Includes: compensation limit, 402(g) deferral limit, 415 annual additions limit, catch-up (50+) limit, super catch-up (60-63) limit, and SS taxable maximum.
- **ReplacementRatioConfig**: A sub-entity within GlobalDefaults that tracks the selected mode (lookup table vs. flat percentage) and the flat percentage value when the override mode is active.
- **SimulationDefaults**: A sub-entity within GlobalDefaults containing default retirement age, planning age, and SS claiming age. The fixed simulation count (250) is a read-only constant, not stored in the config.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view and update all global default values in under 2 minutes from navigating to the Global Settings page.
- **SC-002**: 100% of newly created workspaces reflect the saved global defaults without requiring manual re-entry.
- **SC-003**: The "Restore System Defaults" action completes immediately and displays hardcoded default values without requiring a page reload.
- **SC-004**: Invalid inputs are caught before saving in 100% of cases — no invalid values are ever persisted to the config file.
- **SC-005**: The read-only simulation count (250) is visible on the settings page 100% of the time, ensuring users understand the fixed architecture constraint without consulting documentation.
- **SC-006**: Existing workspaces are unaffected by changes to global defaults — 0 existing workspace records are modified when global settings are saved.

## Scope

### In Scope

- Global Settings page UI with two sections (Economic & IRS Assumptions; Simulation Configuration)
- Persistence of global defaults to `~/.retiremodel/global_defaults.yaml`
- Target replacement ratio mode selector (lookup table vs. flat percentage override)
- Read-only display of fixed simulation count (250)
- "Restore System Defaults" button with confirmation dialog
- Input validation with user-facing error messages
- Application of saved defaults to newly created workspaces only

### Out of Scope

- Retroactive modification of existing workspaces when global settings change
- Per-workspace override of global defaults on the Global Settings page (workspace-level overrides are handled within workspace configuration)
- Historical audit log of settings changes
- Multi-user or role-based access control for the settings page (single-user local application)
- Automatic annual update of IRS limits (user updates limits manually each year)
- Importing or syncing IRS limits from an external data source

## Dependencies

- The workspace creation flow must read from `~/.retiremodel/global_defaults.yaml` to pre-populate new workspace fields (depends on 002-workspace-management).
- The simulation engine must accept the default retirement age, planning age, and SS claiming age seeded from global defaults.

## Assumptions

- The application runs as a single-user local tool; no multi-user concurrency conflicts need to be handled beyond last-write-wins on save.
- YAML is an acceptable format for the global config file; no migration from an existing format is required.
- The hardcoded system defaults are: inflation rate 2.5%, salary growth rate 4.0%, compensation limit $360,000, 402(g) limit $24,500, 415 limit $72,000, catch-up 50+ $8,000, super catch-up 60-63 $11,250, SS taxable maximum $184,500, retirement age 67, planning age 93, SS claiming age 67, replacement ratio mode = income-based lookup table.
- Salary growth rate has no hard validation minimum relative to inflation rate; only an informational warning is shown if salary growth < inflation rate.
- The Global Settings page is accessible to all users without additional authentication or permission checks (single-user local application).
