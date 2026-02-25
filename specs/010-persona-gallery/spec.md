# Feature Specification: Persona Gallery

**Feature Branch**: `010-persona-gallery`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Build the persona gallery: a grid of persona cards showing name, label (e.g., 'Early Career Entry-Level'), age, salary, deferral rate, and current balance. Clicking a card opens an inline editor to modify any field. Users can add custom personas (up to 12 total), delete/hide personas from the active set, and reset to the workspace defaults. Asset allocation is configured as either a target-date fund vintage selector or a custom stock/bond/cash percentage split with a visual donut chart. Include a Social Security toggle per persona."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Persona Gallery (Priority: P1)

A plan designer navigates to the personas page and sees all personas for the current workspace displayed as a grid of cards. Each card summarizes the persona at a glance: name, label (e.g., "Early Career Entry-Level"), age, salary, deferral rate, and current balance. The grid layout allows the user to quickly scan and compare personas side by side. Cards for hidden (inactive) personas appear visually distinct so the user can tell which personas are included in simulations.

**Why this priority**: The gallery view is the foundation of the entire feature — every other interaction (editing, adding, deleting) depends on being able to see and identify personas.

**Independent Test**: Can be fully tested by loading a workspace with pre-configured personas and verifying all cards render with correct data. Delivers immediate value by giving users visibility into their persona configuration.

**Acceptance Scenarios**:

1. **Given** a workspace with 8 default personas, **When** the user navigates to the personas page, **Then** 8 persona cards are displayed in a responsive grid showing name, label, age, salary, deferral rate, and current balance for each.
2. **Given** a workspace with both active and hidden personas, **When** the gallery loads, **Then** hidden personas appear visually dimmed or badged to indicate they are excluded from simulations.
3. **Given** a workspace with no personas (all deleted), **When** the gallery loads, **Then** an empty state message is displayed with a prompt to add personas or reset to defaults.

---

### User Story 2 - Inline Edit Persona Fields (Priority: P2)

A plan designer clicks on a persona card to open an inline editor directly within the card. The editor exposes all editable fields: name, label, age, salary, deferral rate, and current balance. The user modifies one or more fields and saves. Changes are validated in real time (e.g., age within valid range, salary non-negative, deferral rate between 0–100%) and persisted to the workspace configuration.

**Why this priority**: Editing existing personas is the most common interaction after viewing. Inline editing keeps users in context without navigating away from the gallery.

**Independent Test**: Can be tested by clicking a persona card, changing a field value, saving, and verifying the updated value appears on the card and persists after page reload.

**Acceptance Scenarios**:

1. **Given** the gallery is displayed, **When** the user clicks a persona card, **Then** the card transitions to an inline edit mode showing editable fields for name, label, age, salary, deferral rate, and current balance.
2. **Given** an inline editor is open, **When** the user modifies the salary to a valid value and saves, **Then** the card returns to display mode showing the updated salary, and the change persists to the workspace.
3. **Given** an inline editor is open, **When** the user enters an invalid deferral rate (e.g., 150%), **Then** a validation error is displayed immediately and the save action is blocked.
4. **Given** an inline editor is open, **When** the user clicks cancel or clicks outside the card, **Then** any unsaved changes are discarded and the card returns to display mode with original values.

---

### User Story 3 - Add, Delete, Hide, and Reset Personas (Priority: P3)

A plan designer manages the persona set for their workspace. They can add new custom personas (up to 12 total), delete personas permanently, hide personas to exclude them from simulations without losing their configuration, and reset the entire set to the workspace defaults. The 12-persona limit is enforced with a clear message when reached.

**Why this priority**: Managing the persona set (add/remove/reset) is essential for customizing analyses but is less frequent than viewing and editing existing personas.

**Independent Test**: Can be tested by adding a persona, verifying it appears in the gallery, hiding it, verifying it shows as inactive, deleting another persona, and then resetting to defaults to confirm the original set is restored.

**Acceptance Scenarios**:

1. **Given** a workspace with fewer than 12 personas, **When** the user clicks "Add Persona," **Then** a new persona card appears in the gallery with reasonable default values (pre-populated name, default age, salary, etc.) in edit mode.
2. **Given** a workspace with exactly 12 personas, **When** the user attempts to add another persona, **Then** the add action is disabled and a message indicates the maximum has been reached.
3. **Given** a persona card in the gallery, **When** the user chooses to hide the persona, **Then** the persona is marked as inactive, appears visually distinct, and is excluded from future simulations.
4. **Given** a hidden persona, **When** the user chooses to unhide it, **Then** the persona is restored to active status and included in simulations again.
5. **Given** a persona card in the gallery, **When** the user chooses to delete the persona and confirms the action, **Then** the persona is permanently removed from the workspace.
6. **Given** a modified persona set (some added, some deleted, some hidden), **When** the user clicks "Reset to Defaults" and confirms, **Then** all custom personas are removed and the workspace's default persona set is restored.

---

### User Story 4 - Configure Asset Allocation with Donut Chart (Priority: P4)

A plan designer configures each persona's investment asset allocation using one of two modes: selecting a target-date fund vintage year, or specifying a custom stock/bond/cash percentage split. When using the custom split, a donut chart provides a visual preview of the allocation in real time as percentages are adjusted. The three percentages must sum to 100%. The selected allocation mode and values persist with the persona.

**Why this priority**: Asset allocation is a key modeling input but is a secondary detail compared to the core persona demographics and contribution settings.

**Independent Test**: Can be tested by opening a persona's editor, switching between target-date and custom allocation modes, adjusting percentages, verifying the donut chart updates live, and confirming values persist after save.

**Acceptance Scenarios**:

1. **Given** an inline editor is open for a persona, **When** the user selects "Target-Date Fund" allocation mode, **Then** a vintage year selector is displayed with options in 5-year increments (e.g., 2025, 2030, 2035, ... 2070).
2. **Given** an inline editor is open for a persona, **When** the user selects "Custom" allocation mode, **Then** three percentage inputs (stock, bond, cash) are displayed alongside a donut chart.
3. **Given** the custom allocation mode is active, **When** the user adjusts the stock percentage to 60%, **Then** the donut chart updates immediately to reflect 60% stock and the remaining percentages.
4. **Given** the custom allocation mode is active, **When** the user enters percentages that do not sum to 100%, **Then** a validation error is displayed and the save action is blocked.
5. **Given** the user saves a custom allocation of 70% stock / 20% bond / 10% cash, **When** the editor is reopened for that persona, **Then** the custom allocation mode is selected and the saved percentages and donut chart are displayed correctly.

---

### User Story 5 - Social Security Toggle (Priority: P5)

A plan designer enables or disables the inclusion of Social Security benefits for each persona. When Social Security is enabled, the persona's estimated benefits are factored into simulation projections. The toggle state persists with the persona configuration.

**Why this priority**: The Social Security toggle is a simple on/off control that adds fidelity to the modeling but is not required for the core persona gallery functionality.

**Independent Test**: Can be tested by toggling Social Security on for a persona, saving, and verifying the toggle state persists and is reflected in the persona card display.

**Acceptance Scenarios**:

1. **Given** a persona card in display mode, **When** the user views the card, **Then** the current Social Security inclusion status is visible (e.g., an icon or label indicating on/off).
2. **Given** an inline editor is open for a persona, **When** the user toggles Social Security on, **Then** the toggle reflects the enabled state.
3. **Given** an inline editor is open with Social Security enabled, **When** the user saves, **Then** the persona's Social Security setting persists and is reflected on the card in display mode.

---

### Edge Cases

- What happens when the user attempts to delete all personas? The system must retain at least one active persona or clearly communicate that simulations require at least one persona.
- How does the gallery behave when all personas are hidden? The gallery shows all cards (hidden ones are dimmed), and a message warns that no active personas are available for simulation.
- What happens if two personas are given the same name? Duplicate names are allowed — personas are identified internally by unique IDs, not names.
- What happens when a persona's salary is set to $0? The value is accepted (valid for modeling unpaid participants) with no validation error.
- What happens when the user resets to defaults while an inline editor is open? The editor closes, and the gallery refreshes with the default persona set.
- What happens when the user navigates away with unsaved inline edits? Unsaved changes in an open editor are discarded without a confirmation prompt (inline edits are lightweight, card-level operations).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all workspace personas as a grid of cards, each showing name, label, age, salary, deferral rate, and current balance.
- **FR-002**: System MUST visually distinguish hidden (inactive) personas from active personas in the gallery.
- **FR-003**: System MUST display an empty state with guidance when no personas exist in the workspace.
- **FR-004**: System MUST allow users to click a persona card to enter inline edit mode for that persona.
- **FR-005**: System MUST support editing of name, label, age, salary, deferral rate, and current balance fields in the inline editor.
- **FR-006**: System MUST validate edits in real time: age within 18–80, salary non-negative, deferral rate 0–100%, current balance non-negative.
- **FR-007**: System MUST allow users to cancel inline edits, discarding unsaved changes.
- **FR-008**: System MUST persist persona edits to the workspace configuration upon save.
- **FR-009**: System MUST allow users to add new personas with pre-populated default values when the total count is below 12.
- **FR-010**: System MUST prevent adding personas when the 12-persona maximum has been reached and display an informative message.
- **FR-011**: System MUST allow users to hide a persona (mark inactive), excluding it from simulations while retaining its configuration.
- **FR-012**: System MUST allow users to unhide a previously hidden persona, restoring it to active status.
- **FR-013**: System MUST allow users to permanently delete a persona, with a confirmation step.
- **FR-014**: System MUST allow users to reset the persona set to workspace defaults, with a confirmation step.
- **FR-015**: System MUST support asset allocation configuration in two mutually exclusive modes: target-date fund vintage selection or custom stock/bond/cash percentage split.
- **FR-016**: System MUST display a donut chart that updates in real time when the user adjusts custom allocation percentages.
- **FR-017**: System MUST validate that custom allocation percentages (stock, bond, cash) sum to 100%.
- **FR-018**: System MUST offer target-date fund vintages in 5-year increments from 2025 through 2070.
- **FR-019**: System MUST display a Social Security toggle for each persona in the inline editor.
- **FR-020**: System MUST persist the Social Security toggle state and asset allocation configuration with the persona.

### Key Entities

- **Persona**: An individual employee profile used for retirement modeling. Key attributes: name, label, age, salary, deferral rate, current balance, active/hidden status, asset allocation, and Social Security inclusion flag.
- **Asset Allocation**: The investment strategy for a persona's portfolio. Either a target-date fund (identified by vintage year) or a custom split across stock, bond, and cash asset classes (percentages summing to 100%).
- **Workspace Persona Set**: The collection of all personas belonging to a workspace, with a maximum of 12 and a resettable default configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view all workspace personas at a glance in under 2 seconds of page load.
- **SC-002**: Users can open an inline editor and modify any persona field in under 3 clicks from the gallery view.
- **SC-003**: Users can add a new persona, configure all fields, and save in under 60 seconds.
- **SC-004**: Users can distinguish active from hidden personas without reading supplementary text (visual distinction alone is sufficient).
- **SC-005**: Users can configure a custom asset allocation and see the donut chart update in real time (no perceptible delay between input and chart refresh).
- **SC-006**: 100% of persona changes (edits, additions, deletions, hides, resets) persist correctly across page reloads.
- **SC-007**: Users can reset to default personas and recover from any custom configuration in a single action (plus confirmation).
- **SC-008**: The gallery accommodates 1 to 12 personas with a responsive layout that remains usable across standard screen sizes.

## Assumptions

- The workspace already has a default set of pre-configured personas (8 defaults) that serve as the baseline for the "Reset to Defaults" action.
- Persona uniqueness is based on an internal identifier, not the display name. Duplicate names are permitted.
- Target-date fund vintages use standard 5-year increments from 2025 through 2070, consistent with industry conventions.
- "Hide" means the persona is excluded from simulation runs but remains in the workspace configuration and is visible (dimmed) in the gallery.
- Inline editing does not require a separate page or modal — the edit controls appear within the card itself.
- Validation ranges for persona fields follow existing system constraints: age 18–80, deferral rate 0–100%, salary and balance non-negative.
- The donut chart is a visual aid only — it does not support drag-to-resize interaction; percentages are entered via input fields.
- Social Security toggle is a simple on/off; claiming age configuration is a secondary detail managed elsewhere.
- Navigating away from the gallery with an unsaved inline editor discards changes without a confirmation dialog (consistent with lightweight inline edit patterns).
