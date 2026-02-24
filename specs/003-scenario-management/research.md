# Research: 003-scenario-management

**Date**: 2026-02-24

## R1: Scenario Storage Pattern

**Decision**: Store each scenario as an individual JSON file within the workspace directory at `{base_path}/workspaces/{workspace_id}/scenarios/{scenario_id}.json`.

**Rationale**: Follows the existing workspace storage pattern (one JSON file per entity). Individual files allow independent read/write per scenario without loading all scenarios. The flat `scenarios/` directory within the workspace keeps scenarios co-located with their parent workspace, and the `{scenario_id}.json` naming is simple and collision-free (UUID-based).

**Alternatives considered**:
- Directory per scenario (`scenarios/{scenario_id}/scenario.json`): More extensible but over-engineered for current scope — scenarios don't need associated files yet.
- Single file for all scenarios (`scenarios.json`): Simpler but creates contention for concurrent reads/writes and doesn't scale to 50+ scenarios.

## R2: IRS Limit Validation Approach

**Decision**: Implement a stateless validation function that takes a plan design, personas, and effective assumptions, then returns a list of warning objects. Two independent checks:

1. **Employer-side**: Compute max employer match (sum of `tier.match_rate * tier.on_first_pct * comp_limit` across all tiers) plus max core contribution (`core_contribution_pct * comp_limit`). Compare against `additions_limit`. This is a single-point check — no projection needed.

2. **Employee-side**: For each persona, start from `persona.deferral_rate`, project forward applying auto-escalation (+`auto_escalation_rate` per year up to `auto_escalation_cap`) if enabled. For each projected year, compute `deferral_rate * min(persona.salary, comp_limit)` and compare against the applicable deferral limit for the persona's age in that year:
   - Age < 50: `deferral_limit`
   - Age 50–59 or 64+: `deferral_limit + catchup_limit`
   - Age 60–63: `deferral_limit + super_catchup_limit`

   Projection stops at the workspace's Monte Carlo `retirement_age` or when the deferral rate reaches the cap (whichever comes first). IRS limits are held constant (2026 values).

**Rationale**: Separating employer and employee checks keeps the logic clean and testable. Returning warning objects (not exceptions) allows the create/update flow to save the scenario and return warnings alongside it. The stateless function can be unit-tested without persistence.

**Alternatives considered**:
- Blocking validation (reject on IRS violations): Rejected per clarification — warnings only.
- Multi-year IRS limits from CSV: Rejected per clarification — single-year held constant.
- Checking total 415 additions (employee + employer combined): More accurate but adds complexity; the spec separates the two checks.

## R3: Duplicate Naming Convention

**Decision**: When duplicating a scenario named `X`:
1. Generate candidate `X (Copy)`
2. If a scenario with that name exists in the workspace, try `X (Copy 2)`, `X (Copy 3)`, etc.
3. Query existing scenario names once, extract the highest copy number, and use N+1.

**Rationale**: Matches common UX patterns (Google Docs, macOS Finder). Querying existing names once avoids race conditions in the single-user context and is efficient.

**Alternatives considered**:
- Timestamp suffix (`X - 2026-02-24`): Less intuitive, harder to identify copies visually.
- UUID suffix: Not human-friendly.
- Always use `X (Copy)` without incrementing: Would create duplicate names that confuse users.

## R4: Scenario Response Shape with Resolved Assumptions

**Decision**: The GET scenario response returns the full `Scenario` object plus a computed `effective_assumptions` field (the result of `resolve_config(workspace.base_config, scenario.overrides)`). This is computed on read, not stored.

**Rationale**: Per clarification, clients need both raw overrides and resolved assumptions. Computing on read (rather than persisting) ensures consistency — if the workspace base config changes, the resolved view is always current. The `resolve_config` function from feature 002 already handles the deep merge.

**Alternatives considered**:
- Persist resolved assumptions alongside scenario: Stale if workspace base changes; requires sync logic.
- Separate endpoint for resolved config: Extra round-trip; per clarification, include in GET response.

## R5: Scenario Service Pattern

**Decision**: Create a `ScenarioService` class following the existing `WorkspaceService` pattern:
- Constructor takes `WorkspaceStore` and `ScenarioStore`
- Methods: `create_scenario`, `get_scenario`, `list_scenarios`, `update_scenario`, `delete_scenario`, `duplicate_scenario`
- Each method validates workspace existence first via `WorkspaceStore.exists()`
- IRS validation is called from create and update methods, with warnings returned alongside the result

**Rationale**: Consistent with established service layer patterns. Separating `ScenarioStore` from `WorkspaceStore` keeps storage concerns isolated while allowing the service to coordinate between them.

**Alternatives considered**:
- Extend `WorkspaceService` with scenario methods: Violates single-responsibility; would grow too large.
- No service layer (router calls storage directly): Inconsistent with existing architecture; harder to test business logic.
