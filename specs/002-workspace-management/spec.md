# Feature Specification: Workspace Management

**Feature Branch**: `002-workspace-management`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Build workspace management: create, list, get, update, and delete workspaces. Each workspace has a client name, base configuration (assumptions + default personas), and stores as JSON/YAML files under ~/.retiremodel/workspaces/{workspace_id}/. Scenarios live inside workspaces. Support configuration inheritance where scenarios deep-merge their overrides with the workspace base config. Expose REST endpoints for all CRUD operations."

## Clarifications

### Session 2026-02-24

- Q: Should new workspaces auto-populate with the 8 default personas from feature 001's factory, or start with an empty persona list? → A: Auto-populate with 8 default personas from the factory on workspace creation.
- Q: Should the workspace storage base path be hardcoded to `~/.retiremodel/` or configurable? → A: Configurable base path with `~/.retiremodel/` as the default; overridable via settings or initialization.
- Q: Should workspace client names be unique, or can multiple workspaces share the same client name? → A: Allow duplicate client names with no uniqueness constraint. UUIDs ensure workspace identity; multiple workspaces per client are valid (e.g., different engagements).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Retrieve a Workspace (Priority: P1)

A financial advisor creates a new workspace for a client engagement by providing a client name. The system generates a unique workspace with default base configuration (assumptions, default personas, Monte Carlo settings) and persists it as files on disk. The advisor can then retrieve the workspace by its ID to review or continue working.

**Why this priority**: Creating and retrieving workspaces is the foundational capability. No other workspace operation (update, delete, list, scenarios) has value without the ability to create and fetch workspaces first.

**Independent Test**: Can be fully tested by sending a create request with a client name, then retrieving the workspace by ID and verifying all default values are present. Delivers a working workspace persistence layer.

**Acceptance Scenarios**:

1. **Given** no workspaces exist, **When** a user creates a workspace with client name "Acme Corp", **Then** the system returns a workspace with a unique ID, the provided client name, default assumptions, the 8 default personas, and timestamps
2. **Given** a workspace was created, **When** the user retrieves it by ID, **Then** all fields match the originally created workspace including client name, base configuration, and timestamps
3. **Given** a workspace was created, **When** the user inspects the filesystem at `~/.retiremodel/workspaces/{workspace_id}/`, **Then** a workspace configuration file exists containing the persisted workspace data

---

### User Story 2 - List and Search Workspaces (Priority: P1)

A financial advisor who manages multiple client engagements views a list of all their workspaces to find the one they want to work on. The list shows key identifying information (client name, creation date, last modified date) so they can quickly locate the correct workspace.

**Why this priority**: Listing workspaces is essential for navigation and usability. Without it, users must remember workspace IDs, making the system impractical for real use.

**Independent Test**: Can be tested by creating multiple workspaces and then listing them, verifying all are returned with correct summary information.

**Acceptance Scenarios**:

1. **Given** three workspaces exist for clients "Acme Corp", "Beta Inc", and "Gamma LLC", **When** the user lists all workspaces, **Then** all three are returned with their IDs, client names, and timestamps
2. **Given** no workspaces exist, **When** the user lists workspaces, **Then** an empty list is returned

---

### User Story 3 - Update Workspace Configuration (Priority: P2)

A financial advisor modifies an existing workspace's client name or base configuration (assumptions, personas). The updated values are persisted to disk, and all existing scenarios within the workspace will reflect the updated base configuration through inheritance.

**Why this priority**: Updating workspaces is important for iterating on client engagements but depends on workspaces already being creatable and retrievable.

**Independent Test**: Can be tested by creating a workspace, updating its client name and assumptions, then retrieving it and verifying the changes persisted.

**Acceptance Scenarios**:

1. **Given** a workspace exists with default assumptions, **When** the user updates the inflation rate to 3.0%, **Then** the updated workspace reflects the new inflation rate and the `updated_at` timestamp is refreshed
2. **Given** a workspace with client name "Acme Corp", **When** the user updates the client name to "Acme Corporation", **Then** the workspace reflects the new name
3. **Given** a workspace that does not exist, **When** the user attempts to update it, **Then** the system returns a clear error indicating the workspace was not found

---

### User Story 4 - Delete a Workspace (Priority: P2)

A financial advisor removes a workspace that is no longer needed. The system deletes the workspace and all its associated data (including any scenarios within it) from disk permanently.

**Why this priority**: Deletion is necessary for data hygiene but is less frequently used than create, read, and update operations.

**Independent Test**: Can be tested by creating a workspace, deleting it, then verifying it no longer appears in listings and its files are removed from disk.

**Acceptance Scenarios**:

1. **Given** a workspace exists, **When** the user deletes it by ID, **Then** the workspace and its directory are removed from disk
2. **Given** a workspace with scenarios inside it, **When** the user deletes the workspace, **Then** the workspace and all its scenarios are removed
3. **Given** a workspace that does not exist, **When** the user attempts to delete it, **Then** the system returns a clear error indicating the workspace was not found

---

### User Story 5 - Configuration Inheritance for Scenarios (Priority: P2)

A financial advisor creates a scenario within a workspace and provides optional assumption overrides. When the scenario's effective configuration is needed, the system deep-merges the scenario's overrides on top of the workspace's base configuration, so the scenario inherits all base values but can selectively override specific fields.

**Why this priority**: Configuration inheritance is a core differentiating capability that prevents duplication and enables efficient "what-if" analysis, but it depends on workspace CRUD being functional first.

**Independent Test**: Can be tested by creating a workspace with base assumptions, creating a scenario with partial overrides, then resolving the merged configuration and verifying that overrides take precedence while non-overridden values come from the workspace base.

**Acceptance Scenarios**:

1. **Given** a workspace with base inflation rate 2.5% and wage growth 3.0%, **When** a scenario overrides only inflation to 3.5%, **Then** the resolved configuration has inflation 3.5% (from override) and wage growth 3.0% (inherited from workspace)
2. **Given** a workspace with base assumptions including all asset class returns, **When** a scenario overrides the U.S. equity return to 6.0%, **Then** the resolved configuration has U.S. equity at 6.0% and all other asset class returns unchanged from the workspace base
3. **Given** a scenario with no overrides, **When** the resolved configuration is requested, **Then** it matches the workspace base configuration exactly

---

### Edge Cases

- What happens when a workspace ID contains special characters or is excessively long? The system should generate IDs internally (UUID) and not rely on user-provided IDs for filesystem paths.
- What happens when the `~/.retiremodel/workspaces/` directory does not exist on first use? The system should create the directory structure automatically.
- What happens when two workspaces are created simultaneously? Each should receive a unique ID and be persisted independently without conflicts.
- What happens when the filesystem is read-only or the disk is full? The system should return a clear error indicating the storage operation failed.
- What happens when a workspace file on disk is corrupted or contains invalid data? The system should return an error for that specific workspace rather than failing the entire list operation.
- What happens when a scenario's override contains a nested field (e.g., a specific asset class return)? The deep merge should replace only that specific nested value, preserving all sibling fields.
- What happens when updating a workspace and providing only partial fields? Only the provided fields should be updated; omitted fields should retain their current values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create a workspace by providing a client name; the system generates a unique ID, populates default base configuration (assumptions, the 8 default personas from the factory function, default Monte Carlo config), and sets creation and modification timestamps automatically
- **FR-002**: System MUST persist each workspace as files within a dedicated directory at `{base_path}/workspaces/{workspace_id}/`, where the base path defaults to `~/.retiremodel/` but is configurable via settings or initialization
- **FR-003**: System MUST create the `{base_path}/workspaces/` directory structure automatically if it does not exist
- **FR-004**: System MUST allow users to retrieve a workspace by its unique ID, returning all workspace data including client name, base configuration, personas, and timestamps
- **FR-005**: System MUST return a clear, descriptive error when a requested workspace ID does not exist
- **FR-006**: System MUST allow users to list all workspaces, returning each workspace's ID, client name, creation timestamp, and last modification timestamp
- **FR-007**: System MUST allow users to update a workspace's client name and/or base configuration using partial updates — only provided fields are modified, and the `updated_at` timestamp is refreshed
- **FR-008**: System MUST allow users to delete a workspace by ID, removing the workspace directory and all contained files (including scenario data) from disk
- **FR-009**: System MUST provide a configuration resolution function that deep-merges a scenario's assumption overrides on top of the workspace's base assumptions, where override values take precedence and non-overridden values are inherited from the workspace base
- **FR-010**: Deep merge MUST operate recursively on nested objects (e.g., individual asset class returns within assumptions) so that overriding a single nested field does not discard sibling fields
- **FR-011**: System MUST expose REST endpoints for all workspace operations: create (POST), list (GET), get by ID (GET), update (PATCH), and delete (DELETE)
- **FR-012**: System MUST validate that the client name is a non-empty string when creating or updating a workspace; duplicate client names across workspaces are permitted
- **FR-013**: System MUST store workspace data in JSON format for interoperability and human readability
- **FR-014**: System MUST use the core data models defined in feature 001 (Workspace, Scenario, Assumptions) as the foundation for workspace data structures

### Key Entities

- **Workspace**: Top-level organizational container for a client engagement. Has a unique ID, client name, base configuration (assumptions + default personas + Monte Carlo settings), and timestamps. Stored as a directory under `~/.retiremodel/workspaces/{workspace_id}/` with a JSON configuration file.
- **Scenario**: A specific plan design configuration that lives within a workspace. Inherits the workspace's base configuration but can selectively override assumptions. Stored within the workspace directory.
- **Resolved Configuration**: The effective assumptions for a scenario after deep-merging the scenario's overrides with the workspace's base configuration. This is a computed result, not a persisted entity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new workspace and retrieve it by ID within a single session, with all default values correctly populated, in under 5 seconds total
- **SC-002**: Listing workspaces returns accurate results for collections of up to 100 workspaces within 2 seconds
- **SC-003**: Workspace data survives application restarts — creating a workspace, stopping the application, restarting, and retrieving the workspace returns identical data
- **SC-004**: Configuration inheritance correctly resolves 100% of override scenarios, including nested field overrides, with no unintended data loss from sibling fields
- **SC-005**: All five REST operations (create, list, get, update, delete) return appropriate success or error responses for both valid and invalid inputs
- **SC-006**: Deleting a workspace with scenarios removes all associated files, leaving no orphaned data on disk

## Assumptions

- The default storage base path is `~/.retiremodel/`, resolved to the current user's home directory at runtime; this path is configurable via settings or initialization to support testing and alternative deployments
- Workspace data is stored in JSON format (not YAML) for consistency with the existing model serialization from feature 001; YAML support may be added later if needed
- Workspace IDs are UUIDs generated by the system, not user-provided strings, to avoid filesystem path issues
- The core data models from feature 001 (Workspace, Scenario, Assumptions, etc.) are available and used directly; this feature builds the persistence and API layer on top of them
- File locking for concurrent access is out of scope for this feature; the system assumes single-user access per workspace
- Scenario CRUD endpoints are out of scope for this feature; this feature focuses on workspace-level operations and the configuration inheritance mechanism that scenarios will use
- The deep merge for configuration inheritance applies only to the Assumptions model; persona lists and Monte Carlo config are workspace-level settings not overridable at the scenario level
