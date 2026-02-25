# Implementation Plan: Plan Design Configuration Form

**Branch**: `009-plan-design-form` | **Date**: 2026-02-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-plan-design-form/spec.md`

## Summary

Build the interactive plan design configuration form for creating and editing scenarios in the retirement income modeling tool. The form provides card-based sections for employer match formula (tiered), core contribution (flat or age/service-tiered), auto-enrollment/escalation toggles, and eligibility waiting periods. A real-time contribution summary card shows effective employer cost at sample deferral levels. The implementation builds on the existing 551-line PlanDesignForm scaffold, removing vesting UI (out of scope), fixing initial defaults (empty form), adding the contribution summary calculator, improving validation, and wrapping sections in cards.

## Technical Context

**Language/Version**: TypeScript 5.8.2 / React 19
**Primary Dependencies**: react-router-dom 7.1, lucide-react 0.469, tailwindcss 3.4.17, @tailwindcss/forms 0.5.9
**Storage**: N/A — frontend only; consumes backend REST API via Vite dev proxy (`/api` → `localhost:8000`)
**Testing**: Manual testing (no frontend test framework in project)
**Target Platform**: Web browser (Vite 6.2 dev server)
**Project Type**: Web application (SPA frontend)
**Performance Goals**: Real-time validation and summary updates within 1 second of user input
**Constraints**: No new dependencies; all existing deps sufficient
**Scale/Scope**: Single-user desktop tool; 1 form component + 1 utility function + updates to 2 parent pages

## Constitution Check

*No constitution file found (`/.specify/memory/constitution.md` does not exist). Proceeding without gate evaluation.*

## Project Structure

### Documentation (this feature)

```text
specs/009-plan-design-form/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── plan-design-form-props.md  # Component contract
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
app/src/
├── components/
│   ├── PlanDesignForm.tsx          # MODIFY: main form (remove vesting, add summary, card layout)
│   └── ConfirmDialog.tsx           # EXISTING: used for unsaved changes (no changes)
├── pages/
│   ├── ScenarioCreatePage.tsx      # MODIFY: update default state handling
│   └── ScenarioEditPage.tsx        # MODIFY: minor adjustments for vesting removal
├── services/
│   └── api.ts                      # EXISTING: scenario CRUD endpoints (no changes)
├── types/
│   └── plan-design.ts              # EXISTING: keep vesting types for API compat (no changes)
└── utils/
    ├── plan-design-summary.ts      # EXISTING: scenario card summaries (no changes)
    └── contribution-calculator.ts  # NEW: employer contribution calculation for summary card
```

**Structure Decision**: Frontend-only feature. All changes are within `app/src/`. No backend modifications needed. The existing project structure (components/, pages/, utils/, types/) is followed exactly.

## Implementation Approach

### Phase 1: Core Form Updates (P1 requirements)

**1.1 — Update form defaults and remove vesting UI**

Modify `PlanDesignForm.tsx`:
- Change `DEFAULT_PLAN_DESIGN` to start empty: `auto_enroll_enabled: false`, `auto_escalation_enabled: false`, `auto_enroll_rate: 0`, `auto_escalation_rate: 0`, `auto_escalation_cap: 0`
- Remove the `VestingSelector` component entirely (~70 lines)
- Remove the two `<VestingSelector>` invocations (match vesting, core vesting)
- Remove `DEFAULT_GRADED_SCHEDULE` constant
- Remove `VestingSchedule` from the import
- Keep `match_vesting: { type: 'immediate' }` and `core_vesting: { type: 'immediate' }` in defaults (API compatibility)

**1.2 — Add card-based section layout**

Wrap each form section in a card container:
```html
<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  <h3>Section Title</h3>
  <!-- section content -->
</div>
```

Sections (in order):
1. Employer Match — match tier CRUD + eligibility dropdown
2. Core Contribution — flat rate + age/service tier toggle + eligibility dropdown
3. Auto-Enrollment & Escalation — toggles + rate/cap inputs
4. Contribution Summary — real-time calculation table (new)

**1.3 — Create contribution calculator utility**

New file `app/src/utils/contribution-calculator.ts`:
- Pure function: `calculateEmployerContribution(matchTiers, corePct, deferralRate) → { match, core, total }`
- Match tiers applied sequentially (stacked bands)
- `SAMPLE_DEFERRAL_RATES = [0, 0.03, 0.06, 0.10, 0.15]`
- Helper: `calculateSummaryRows(matchTiers, corePct) → ContributionSummaryRow[]`

**1.4 — Add contribution summary card to form**

New section in `PlanDesignForm.tsx` (after auto-enrollment section):
- Table with columns: Employee Deferral, Match, Core, Total Employer
- Rows for each sample deferral level (0%, 3%, 6%, 10%, 15%)
- Computed reactively from current form state (no separate state needed)
- Display percentages as whole numbers with "%" suffix

### Phase 2: Validation Enhancements (P2 requirements)

**2.1 — Core tier overlap detection (frontend)**

Add to validation logic in `PlanDesignForm.tsx`:
- Port `_tiers_overlap()` algorithm from `api/models/plan_design.py`
- Check pairwise: do any two core tiers overlap on shared dimensions?
- Error message identifies which tiers overlap and on which dimension
- Validate on every core tier field change (real-time)

**2.2 — Core tier dimension validation**

- Each tier must have at least one dimension with non-null bounds
- If min and max both set: min < max
- Display inline errors per tier

**2.3 — Real-time validation trigger**

Currently validation only runs on submit. Change to:
- Run cross-field validation in a `useEffect` that watches the `form` state
- Clear field-specific errors when the user corrects a value (already implemented)
- Escalation cap validation triggers when any of: auto_enroll_rate, auto_escalation_cap, auto_enroll_enabled, auto_escalation_enabled changes

### Phase 3: Auto-Enrollment Default Behavior (P3 requirements)

**3.1 — Smart defaults on toggle**

When auto-enrollment is toggled ON (from OFF):
- Set `auto_enroll_rate` to 0.06 (6%) as the suggested default
- Keep auto-escalation OFF (user must opt in)

When auto-escalation is toggled ON:
- Set `auto_escalation_rate` to 0.01 (1%)
- Set `auto_escalation_cap` to 0.10 (10%)

When auto-enrollment is toggled OFF:
- Also disable auto-escalation
- Keep rate/cap values in state (in case user re-enables)

### Phase 4: Parent Page Updates

**4.1 — ScenarioCreatePage adjustments**

- Verify form starts empty (no `initialValues` prop passed)
- Ensure scenario name is required before save
- Navigation after save: `/scenarios` list

**4.2 — ScenarioEditPage adjustments**

- Existing load + pre-populate flow works correctly
- IRS warning display already implemented
- No significant changes needed beyond verifying vesting fields pass through correctly

## Key Design Decisions

| Decision | Rationale |
| -------- | --------- |
| Remove vesting UI, keep in data model | Backend API requires vesting fields; hardcode `immediate` since same-employer-to-retirement assumption |
| Empty form defaults | User explicitly requested build-from-scratch in clarification |
| Pure function for contribution calc | Enables reactive updates without extra state; easy to test |
| Card-based layout via Tailwind utilities | Consistent with existing card components; no new component needed |
| Frontend-side overlap detection | Real-time validation requirement; mirrors backend logic |
| No new dependencies | All needed functionality achievable with existing React + Tailwind |

## Complexity Tracking

No constitution violations to justify — no constitution file exists.
