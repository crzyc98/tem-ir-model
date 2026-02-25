# Research: Plan Design Configuration Form

**Branch**: `009-plan-design-form` | **Date**: 2026-02-24

## R-001: Existing Scaffold Inventory

**Decision**: Build on the existing PlanDesignForm scaffold (551 lines) rather than rewriting from scratch.

**Rationale**: The scaffold already implements:
- Match tier CRUD (add/remove up to 3, rate + on_first_pct inputs)
- Core contribution with flat rate and age/service tier toggle
- Auto-enrollment and auto-escalation toggles with inputs
- Vesting selectors (to be removed)
- Eligibility waiting period dropdowns
- Form submission with basic validation
- `toPercent()`/`fromPercent()` helpers for 0–1 ↔ 0–100 conversion

The scaffold is ~80% complete for the spec requirements. Key gaps: no contribution summary card, vesting UI needs removal, validation is minimal, layout is flat (not card-based).

**Alternatives considered**: Full rewrite — rejected because the existing code follows project patterns and is functional.

## R-002: Vesting Fields — API Compatibility

**Decision**: Keep vesting fields in the TypeScript `PlanDesign` type and hardcode to `{ type: 'immediate' }` in the form defaults. Remove all vesting UI.

**Rationale**: The backend `PlanDesign` Pydantic model requires `match_vesting` and `core_vesting` fields. The API will reject payloads missing these fields. Since the simulation assumes same-employer-to-retirement (always 100% vested), we hardcode "immediate" vesting and hide the UI, satisfying the API contract without exposing irrelevant controls.

**Alternatives considered**:
- Remove vesting from backend model — rejected (out of scope for this frontend feature, would require API changes)
- Send vesting as `null` — rejected (backend requires non-null VestingSchedule)

## R-003: Contribution Summary Calculation Algorithm

**Decision**: Implement a pure function `calculateEmployerContribution(planDesign, deferrralRate)` that computes total employer contribution as match + core for a given deferral level.

**Rationale**: Match tiers are stacked sequentially — each tier's `on_first_pct` represents an incremental band after the previous tier. Verified against acceptance scenario: for tiers [100% on first 3%, 50% on next 2%] at 6% deferral → 3% + 1% = 4% match.

**Algorithm**:
```
consumed = 0
matchTotal = 0
for each tier in order:
  applicable = min(max(deferralRate - consumed, 0), tier.on_first_pct)
  matchTotal += applicable * tier.match_rate
  consumed += tier.on_first_pct
coreTotal = core_contribution_pct  (flat rate only; tiers excluded per spec)
total = matchTotal + coreTotal
```

**Sample deferral levels**: 0%, 3%, 6%, 10%, 15% (per spec assumption).

**Alternatives considered**: Including age/service-tiered core in summary — rejected per spec assumption (summary uses flat rate for generic participant).

## R-004: Form Default State

**Decision**: New scenario form starts completely empty: no match tiers, 0% core, auto-enrollment off, auto-escalation off, 0-month eligibility.

**Rationale**: Per clarification session — user builds plan design from scratch. This differs from the current scaffold which defaults `auto_enroll_enabled: true` with 6% rate. Defaults must be updated.

**Alternatives considered**: Pre-populated defaults — explicitly rejected by user in clarification.

## R-005: Card-Based Layout Pattern

**Decision**: Wrap each form section (Employer Match, Core Contribution, Auto-Enrollment, Eligibility, Contribution Summary) in a card component using Tailwind utility classes: `rounded-lg border border-gray-200 bg-white p-6 shadow-sm`.

**Rationale**: Spec requests "card-based layout with sections." The existing scaffold uses flat `<section>` elements with no visual separation. Cards provide clear visual grouping and match the card pattern already used in WorkspaceCard and ScenarioCard components.

**Alternatives considered**: Tabs — rejected (all sections need to be visible simultaneously for the real-time summary to be meaningful).

## R-006: Frontend Validation — Core Tier Overlap Detection

**Decision**: Port the backend's `_tiers_overlap()` logic to a frontend utility function to provide real-time overlap validation without waiting for API response.

**Rationale**: The backend validates core tier overlaps in `api/models/plan_design.py` (lines 58-92). Duplicating this on the frontend enables instant feedback per FR-016. The algorithm checks pairwise overlap on shared dimensions (age, service) using open-interval logic: `a_min < b_max AND b_min < a_max`.

**Alternatives considered**: Server-side validation only — rejected because it requires a save attempt, violating the real-time validation requirement.
