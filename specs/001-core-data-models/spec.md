# Feature Specification: Core Pydantic Data Models

**Feature Branch**: `001-core-data-models`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Define the core Pydantic data models for RetireModel: Workspace, Scenario, PlanDesign (with tiered match formula, non-elective core contribution, auto-enrollment and auto-escalation settings, vesting schedules), Persona (age, tenure, salary, deferral rate, current balance, asset allocation as target-date or custom mix), Assumptions (return/risk by asset class, IRS limits, inflation, wage growth), and MonteCarloConfig. All models should have sensible defaults and full validation. Include a default set of 8 employee personas spanning early career to near retirement."

## Clarifications

### Session 2026-02-24

- Q: What structure should each core contribution age/service tier have? → A: Option B — compound eligibility with nullable bounds. Each tier has `min_age` (optional), `max_age` (optional), `min_service` (optional), `max_service` (optional), and `contribution_pct` (required). At least one dimension (age or service) must have non-null bounds per tier. Tiers must not overlap on active dimensions. Use lower-bound-inclusive, upper-bound-exclusive intervals. This supports single-dimension use (set unused dimension bounds to null) and compound age+service eligibility. Informed by PlanAlign production experience with points-based match tiers and service-based core contributions.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import and Instantiate Data Models (Priority: P1)

A backend developer imports the RetireModel data models and creates valid instances of each model — Workspace, Scenario, PlanDesign, Persona, Assumptions, and MonteCarloConfig — using sensible defaults where available and explicit values where required. The models validate all inputs on creation, rejecting invalid data with clear error messages.

**Why this priority**: These models are the foundational data layer for the entire application. Every subsequent feature (CRUD endpoints, simulation engine, frontend forms) depends on having correct, validated data structures.

**Independent Test**: Can be fully tested by importing models from the package, instantiating them with valid and invalid data, and verifying that validation rules accept/reject appropriately. Delivers a complete, importable data layer.

**Acceptance Scenarios**:

1. **Given** a developer imports the models package, **When** they create a `PlanDesign` with 2 match tiers, a graded vesting schedule, and auto-enrollment enabled, **Then** the model validates successfully and all fields are accessible with correct types
2. **Given** a developer creates a `Persona` with the default 8 personas factory, **When** they inspect the list, **Then** all 8 personas are present with the correct attributes matching the specification
3. **Given** a developer creates an `Assumptions` instance with no arguments, **When** they inspect it, **Then** all fields have the documented default values (e.g., inflation 2.5%, wage growth 3.0%, equity return 7.5%)

---

### User Story 2 - Validation Rejects Invalid Data (Priority: P1)

When a user or system provides data that violates business rules — such as a negative salary, a deferral rate above 100%, asset allocation percentages that don't sum to 100%, or a vesting schedule with years outside the valid range — the model rejects it with a specific, human-readable error message indicating what was wrong and what values are acceptable.

**Why this priority**: Validation is the primary purpose of the data model layer. Invalid data flowing through the system would produce incorrect simulation results and undermine trust in the tool.

**Independent Test**: Can be tested by attempting to create model instances with each category of invalid data and verifying the correct validation error is raised.

**Acceptance Scenarios**:

1. **Given** invalid persona data (age < 18, salary < 0, deferral rate > 1.0), **When** the model is instantiated, **Then** a validation error is raised with a message indicating the constraint violated
2. **Given** a custom asset allocation where stock + bond + cash percentages do not sum to 1.0, **When** the `AssetAllocation` model is created, **Then** a validation error is raised indicating the allocation must sum to 100%
3. **Given** a `PlanDesign` with more than 3 match tiers, **When** the model is created, **Then** a validation error is raised indicating a maximum of 3 tiers is allowed
4. **Given** a `VestingSchedule` of type "cliff" without specifying `years`, **When** the model is created, **Then** a validation error is raised indicating that cliff vesting requires a years value
5. **Given** a `PlanDesign` with two `CoreContributionTier` entries whose age ranges overlap (e.g., both covering ages 30–50), **When** the model is created, **Then** a validation error is raised indicating which tiers have overlapping ranges
6. **Given** a `CoreContributionTier` with all bounds set to null, **When** the model is created, **Then** a validation error is raised indicating at least one dimension must have non-null bounds

---

### User Story 3 - Serialize Models to JSON and Back (Priority: P2)

A developer serializes any model instance to JSON (for API responses and filesystem persistence) and deserializes it back to a model instance without data loss. JSON schema can be exported for frontend consumption and documentation.

**Why this priority**: Serialization is essential for API communication and filesystem persistence (workspace storage), but is lower priority than model correctness and validation.

**Independent Test**: Can be tested by round-tripping model instances through JSON serialization/deserialization and verifying equality, and by exporting JSON schema and validating its structure.

**Acceptance Scenarios**:

1. **Given** a fully populated `Workspace` model with personas and assumptions, **When** it is serialized to JSON and deserialized back, **Then** the resulting model is equivalent to the original
2. **Given** any model class, **When** its JSON schema is exported, **Then** the schema is valid JSON Schema and includes all field descriptions, types, and constraints

---

### User Story 4 - Default Persona Set (Priority: P2)

A developer or the workspace initialization flow retrieves the default set of 8 employee personas. Each persona represents a distinct career stage from early career to near retirement, with realistic demographic and financial attributes drawn from the product specification.

**Why this priority**: The default persona set provides immediate value for new workspaces and is essential for the persona modeling workflow. However, it depends on the Persona model being defined first.

**Independent Test**: Can be tested by calling the default personas factory function and verifying the count, names, and attribute ranges of the returned personas.

**Acceptance Scenarios**:

1. **Given** a request for default personas, **When** the defaults factory is called, **Then** exactly 8 personas are returned
2. **Given** the default persona set, **When** each persona's attributes are inspected, **Then** ages range from 25 to 58, salaries from $40,000 to $210,000, and all asset allocations are valid target-date funds with vintages between 2035 and 2065

---

### Edge Cases

- What happens when a `PlanDesign` has zero match tiers and zero core contribution? The model should allow this — it represents a plan with no employer contributions.
- What happens when a `Persona` is at the catch-up contribution age threshold (50) or super catch-up range (60-63)? The model should store age; the simulation engine (not the model) handles limit selection.
- What happens when `MonteCarloConfig` has `num_simulations` set to 1? The model should accept it — minimum is 1 simulation.
- What happens when an `Assumptions` model has a return rate that is negative? The model should allow negative returns (bear market scenarios are valid).
- What happens when a `VestingSchedule` of type "graded" has a schedule that doesn't end at 100%? The model should allow this, as partial vesting at the final year is a valid plan design.
- What happens when a target-date `AssetAllocation` has a vintage year in the past? The model should reject this — a target-date fund vintage must be in the current year or later.
- What happens when `CoreContributionTier` entries have overlapping ranges on the same dimension (e.g., two tiers both covering ages 30–40)? The model should reject this with a validation error indicating which tiers overlap.
- What happens when a `CoreContributionTier` has all four bounds (min_age, max_age, min_service, max_service) set to null? The model should reject this — at least one dimension must have non-null bounds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a `MatchTier` model with `match_rate` (0.0–1.0 inclusive) and `on_first_pct` (0.0–1.0 inclusive) fields, both required
- **FR-002**: System MUST define a `VestingSchedule` model with a `type` field constrained to "immediate", "cliff", or "graded"; a `years` field required when type is "cliff" (1–6 years); and a `schedule` field required when type is "graded" (mapping year integers to vested percentages 0.0–1.0)
- **FR-003**: System MUST define a `PlanDesign` model with: `name` (required), `match_tiers` (list of 0–3 `MatchTier` items), `match_vesting` (`VestingSchedule`), `match_eligibility_months` (0–12, default 0), `core_contribution_pct` (0.0–1.0, default 0.0), `core_age_service_tiers` (optional list of 0–5 `CoreContributionTier` items), `core_vesting` (`VestingSchedule`), `core_eligibility_months` (0–12, default 0), `auto_enroll_enabled` (default True), `auto_enroll_rate` (0.0–1.0, default 0.06), `auto_escalation_enabled` (default True), `auto_escalation_rate` (0.0–1.0, default 0.01), `auto_escalation_cap` (0.0–1.0, default 0.10)
- **FR-004**: System MUST define an `AssetAllocation` model with a `type` field constrained to "target_date" or "custom"; when type is "target_date", a `target_date_vintage` year is required and must be the current year or later; when type is "custom", `stock_pct`, `bond_pct`, and `cash_pct` fields are required and must sum to 1.0 (within a ±0.01 tolerance for floating point)
- **FR-005**: System MUST define a `Persona` model with: `id` (auto-generated UUID if not provided), `name` (required), `label` (required), `age` (18–80), `tenure_years` (0–60), `salary` (positive number), `deferral_rate` (0.0–1.0), `current_balance` (non-negative), `allocation` (`AssetAllocation`), `include_social_security` (default True)
- **FR-006**: System MUST define an `Assumptions` model with sensible defaults: `inflation_rate` (default 0.025), `wage_growth_rate` (default 0.03), asset class returns and standard deviations for U.S. equity (7.5%/17.0%), international equity (7.0%/19.0%), fixed income (4.0%/5.5%), cash/stable value (3.0%/1.0%), and 2026 IRS limits: `comp_limit` ($345,000), `deferral_limit` ($23,500), `additions_limit` ($70,000), `catchup_limit` ($7,500), `super_catchup_limit` ($11,250)
- **FR-007**: System MUST define a `MonteCarloConfig` model with: `num_simulations` (1–10,000, default 1,000), `seed` (optional integer for reproducibility), `retirement_age` (55–70, default 67), `planning_age` (85–100, default 93)
- **FR-008**: System MUST define a `Workspace` model with: `id` (auto-generated UUID if not provided), `name` (required), `client_name` (required), `created_at` and `updated_at` (auto-populated timestamps), `base_config` (`Assumptions`, default instance), `personas` (list of `Persona`, default empty list), `monte_carlo_config` (`MonteCarloConfig`, default instance)
- **FR-009**: System MUST define a `Scenario` model with: `id` (auto-generated UUID if not provided), `workspace_id` (required), `name` (required), `description` (optional), `plan_design` (`PlanDesign`, required), `overrides` (optional `Assumptions` for merging with workspace base config), `created_at` and `updated_at` (auto-populated timestamps), `last_run_at` (optional timestamp)
- **FR-010**: System MUST provide a factory function that returns the default set of 8 employee personas with attributes matching the product specification (Jordan age 25, Priya age 30, Marcus age 38, Sarah age 42, David age 48, Michelle age 52, Robert age 58, Linda age 55)
- **FR-011**: System MUST support JSON serialization and deserialization for all models, preserving all field values through a round trip
- **FR-012**: System MUST export valid JSON Schema for all models, suitable for frontend form generation and API documentation
- **FR-013**: System MUST validate that `planning_age` is greater than `retirement_age` in `MonteCarloConfig`
- **FR-014**: System MUST validate that `auto_escalation_cap` is greater than or equal to `auto_enroll_rate` in `PlanDesign` when both auto-enrollment and auto-escalation are enabled
- **FR-015**: System MUST define an `AssetClassReturn` model with `expected_return` (float) and `standard_deviation` (non-negative float) fields to structure return/risk assumptions per asset class within the `Assumptions` model
- **FR-016**: System MUST define a `CoreContributionTier` model with: `min_age` (optional integer), `max_age` (optional integer), `min_service` (optional integer), `max_service` (optional integer), and `contribution_pct` (0.0–1.0, required). At least one dimension (age or service) must have non-null bounds. Ranges use lower-bound-inclusive, upper-bound-exclusive intervals. When multiple tiers are present, they must not overlap on their active dimensions

### Key Entities

- **Workspace**: Top-level organizational container representing a client or engagement. Contains base configuration, default persona set, and Monte Carlo settings. All scenarios inherit from the workspace.
- **Scenario**: A specific plan design configuration within a workspace. Contains the plan design and optional assumption overrides that merge with the workspace base config.
- **PlanDesign**: The full specification of a retirement plan's contribution structure — match formula (tiered), non-elective core contribution, auto-enrollment, auto-escalation, vesting schedules, and eligibility periods.
- **CoreContributionTier**: A single tier in an age/service-based core contribution schedule. Supports compound eligibility — each tier can filter on age range, service range, or both. Nullable bounds allow single-dimension use (e.g., service-only tiers set age bounds to null). Uses lower-bound-inclusive, upper-bound-exclusive intervals.
- **MatchTier**: A single tier in an employer match formula, defining the match rate and the deferral percentage it applies to.
- **VestingSchedule**: Defines how employer contributions become owned by the employee over time — immediate, cliff (all-at-once after N years), or graded (incremental over years).
- **Persona**: A hypothetical employee profile with demographic, compensation, and retirement savings attributes used for simulation.
- **AssetAllocation**: How a persona's retirement savings are invested — either a target-date fund (automatic glide path) or a custom stock/bond/cash split.
- **Assumptions**: Economic and regulatory assumptions used in simulations — asset class returns and risk, inflation, wage growth, and IRS contribution limits.
- **MonteCarloConfig**: Configuration for the simulation engine — number of runs, optional seed for reproducibility, retirement age, and planning age (mortality assumption).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 10+ data models can be instantiated with valid data and reject invalid data with descriptive error messages in 100% of defined validation scenarios
- **SC-002**: The default persona factory returns exactly 8 personas with attributes matching the product specification without any manual configuration
- **SC-003**: Every model instance can be serialized to JSON and deserialized back to an equivalent model with zero data loss
- **SC-004**: JSON Schema export produces valid schemas that accurately describe all field types, constraints, and defaults for every model
- **SC-005**: A developer unfamiliar with the codebase can import the models, create valid instances, and understand validation errors within 5 minutes of reading the module documentation

## Assumptions

- IRS limits are hardcoded to 2026 values as defaults; limit inflation projection is out of scope per PRD section 13
- All monetary values are in pre-tax, today's dollars — no tax modeling in v1
- The `Assumptions` model will use structured sub-models for asset class returns (U.S. equity, international equity, fixed income, cash) rather than flat fields, to improve clarity and extensibility
- Target-date fund vintage validation uses the current calendar year as the minimum valid value
- Persona age range (18–80) covers working-age adults; the simulation engine handles retirement age boundaries
- A floating-point tolerance of ±0.01 is used for asset allocation sum validation to accommodate typical floating-point arithmetic
- Vesting schedule "graded" type allows any year-to-percentage mapping; the schedule does not need to be monotonically increasing (plan designs may have step vesting)
- Social Security estimation is a toggle on the Persona model; the actual estimation logic is handled by a separate module (S07)
