# Tasks: Plan Design Configuration Form

**Input**: Design documents from `/specs/009-plan-design-form/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: No test framework in project. Manual testing only.

**Organization**: Tasks grouped by user story. US4 (Contribution Summary) is folded into US1 since it's required for US1 acceptance testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Clean up existing scaffold — remove vesting UI, update defaults, establish card layout, create contribution calculator utility

**Why blocking**: All user stories depend on the cleaned-up form structure and empty defaults. The contribution calculator is needed for the summary card (US1/US4).

- [x] T001 Remove VestingSelector component, vesting UI, and related constants from app/src/components/PlanDesignForm.tsx — delete the VestingSelector function component (~lines 50-120), remove both `<VestingSelector>` invocations (match vesting ~line 277, core vesting ~line 424), delete `DEFAULT_GRADED_SCHEDULE` constant, remove `VestingSchedule` from the import statement. Keep `match_vesting: { type: 'immediate' }` and `core_vesting: { type: 'immediate' }` in `DEFAULT_PLAN_DESIGN` for API compatibility.

- [x] T002 Update DEFAULT_PLAN_DESIGN to empty form state in app/src/components/PlanDesignForm.tsx — change `auto_enroll_enabled` from `true` to `false`, `auto_enroll_rate` from `0.06` to `0`, `auto_escalation_enabled` from `true` to `false`, `auto_escalation_rate` from `0.01` to `0`, `auto_escalation_cap` from `0.10` to `0`. Keep `match_tiers: []`, `core_contribution_pct: 0`, eligibility months at `0`. This ensures new scenarios start with an empty form per clarification.

- [x] T003 [P] Create contribution calculator utility in app/src/utils/contribution-calculator.ts — implement pure function `calculateEmployerContribution(matchTiers: MatchTier[], coreContributionPct: number, deferralRate: number)` returning `{ matchContribution: number, coreContribution: number, totalEmployer: number }`. Match tiers are stacked sequentially: for each tier in order, `applicable = min(max(deferralRate - consumed, 0), tier.on_first_pct)`, `matchTotal += applicable * tier.match_rate`, `consumed += tier.on_first_pct`. Core is flat `coreContributionPct`. Export `SAMPLE_DEFERRAL_RATES = [0, 0.03, 0.06, 0.10, 0.15]` and helper `calculateSummaryRows(matchTiers, coreContributionPct)` that returns an array of `{ deferralRate, matchContribution, coreContribution, totalEmployer }` for all sample levels. Import `MatchTier` from `../types/plan-design`.

- [x] T004 Wrap all form sections in card-based layout containers in app/src/components/PlanDesignForm.tsx — wrap each existing `<section>` (Employer Match, Core Contribution, Auto-Enrollment) in a card div with classes `rounded-lg border border-gray-200 bg-white p-6 shadow-sm`. Update section headings from `text-sm font-semibold text-gray-800` to `text-base font-semibold text-gray-900 mb-4` for better visual hierarchy. Change the outer `<form>` spacing from `space-y-8` to `space-y-6`.

**Checkpoint**: Scaffold cleaned — vesting removed, empty defaults, card layout, calculator utility ready. Form renders but summary card not yet added.

---

## Phase 2: User Story 1 - Configure Employer Match Formula (Priority: P1) + User Story 4 - Real-Time Contribution Summary (Priority: P2) 🎯 MVP

**Goal**: Users can add/remove match tiers (up to 3) and see the contribution summary card update in real time at sample deferral levels (0%, 3%, 6%, 10%, 15%).

**Independent Test**: Create a new scenario, add match tiers [100% on first 3%, 50% on next 2%], verify summary card shows: at 0% → 0%, at 3% → 3%, at 6% → 4%, at 10% → 4%, at 15% → 4%. Remove a tier and verify summary recalculates. Verify "Add Match Tier" button is disabled at 3 tiers.

**Why US4 is here**: US1 acceptance scenarios require the contribution summary card to show correct values. The summary is computed reactively from form state — no separate state or async calls needed.

### Implementation

- [x] T005 [US1] Refine match tier section with empty state and descriptive labels in app/src/components/PlanDesignForm.tsx — when `match_tiers` is empty, show a muted prompt text "No match tiers configured. Add a tier to define the employer match formula." below the section heading. Add helper text above the tier list: "Match tiers are applied sequentially — each tier matches on the next band of employee deferrals." Ensure the "Add Match Tier" button is hidden (not just disabled) when 3 tiers exist, and shows a `text-xs text-gray-400` note "Maximum 3 tiers" instead.

- [x] T006 [US1] Add contribution summary card section to the form in app/src/components/PlanDesignForm.tsx — after the Auto-Enrollment section, add a new card with heading "Contribution Summary". Import `calculateSummaryRows` and `SAMPLE_DEFERRAL_RATES` from `../utils/contribution-calculator`. Compute rows reactively: `const summaryRows = calculateSummaryRows(form.match_tiers, form.core_contribution_pct)`. Render an HTML table with columns: "Employee Deferral", "Employer Match", "Core Contribution", "Total Employer". For each row, display percentages as whole numbers with "%" suffix (e.g., `Math.round(row.totalEmployer * 100) + '%'`). Use `text-sm` table styling with `divide-y divide-gray-200` row separators and `bg-gray-50` header row. Add a `text-xs text-gray-500` footer note: "Summary uses flat core contribution rate. Age/service-tiered rates may vary by participant."

**Checkpoint**: Match tier CRUD works with card layout. Summary card displays and updates in real time. This is the MVP — a user can configure match tiers and see the cost impact immediately.

---

## Phase 3: User Story 5 - Save Plan Design to Scenario (Priority: P1)

**Goal**: Users can save the plan design as part of creating or editing a scenario. Validation errors block saving. IRS compliance warnings display after successful save.

**Independent Test**: Fill out a plan design on the create scenario page, click Save, verify the scenario appears in the list. Edit the scenario, change the match formula, save, verify the change persists. Try saving with the escalation cap below the enrollment rate and verify the save is blocked.

### Implementation

- [x] T007 [US5] Convert validation from submit-only to real-time via useEffect in app/src/components/PlanDesignForm.tsx — add a `useEffect` that depends on the `form` state and runs the `validate()` function on every form change. This replaces the current submit-only validation pattern. The existing `validate()` function already checks escalation cap >= enroll rate and match tier ranges. Clear errors when conditions are resolved (already implemented via `updateField`). Ensure the Save button remains disabled when `Object.keys(errors).length > 0`.

- [x] T008 [P] [US5] Verify create scenario page renders empty form and saves correctly in app/src/pages/ScenarioCreatePage.tsx — confirm the page does NOT pass `initialValues` to `PlanDesignForm` (so it uses the new empty defaults). Verify `handleSubmit` assembles the payload as `{ name, description, plan_design: planDesign }` and calls `createScenario`. Verify navigation to `/scenarios` after successful save. Verify the error state displays API errors and retains form data on failure. Ensure `useBlocker` is wired for unsaved changes detection.

- [x] T009 [P] [US5] Verify edit scenario page loads, pre-populates, and saves correctly in app/src/pages/ScenarioEditPage.tsx — confirm `initialValues={scenario.plan_design}` is passed to `PlanDesignForm`. Verify `handleSubmit` calls `updateScenario` with `{ name, description, plan_design: planDesign }`. Verify IRS limit warnings from `scenario.warnings` are displayed as non-blocking alerts (yellow/amber banner). Verify loading skeleton renders during fetch. Verify navigation to `/scenarios` after successful save.

**Checkpoint**: Full create and edit flows work. Validation blocks saving when errors exist. IRS warnings display after save.

---

## Phase 4: User Story 2 - Configure Core Contribution and Eligibility (Priority: P2)

**Goal**: Users can set flat or tiered core contributions with validation for overlapping tiers and proper dimension constraints. Eligibility waiting periods work for both match and core.

**Independent Test**: Enable age/service tiers, add two tiers with overlapping age ranges, verify a validation error appears identifying the overlap. Add a tier with no dimensions set and verify a validation error appears. Set eligibility months to 6 for match and 12 for core, save, and verify both persist.

### Implementation

- [x] T010 [US2] Add core tier overlap detection and dimension validation to the validate function in app/src/components/PlanDesignForm.tsx — extend `validate()` with three new checks for `core_age_service_tiers` when not null: (1) Each tier must have at least one dimension with non-null bounds — error key `core_tier_{i}_dimension`, message "Tier {i+1} must have at least age or service bounds". (2) If both min and max set for a dimension, min must be < max — error keys `core_tier_{i}_age` and `core_tier_{i}_service`. (3) Pairwise overlap detection: for each pair (i, j), check if they share a dimension (both have age bounds, or both have service bounds), and if so check overlap using `a_min < b_max AND b_min < a_max` with null treated as unbounded — error key `core_tier_overlap_{i}_{j}`, message "Tiers {i+1} and {j+1} have overlapping {dimension} ranges". Display errors inline below each tier row using the existing error display pattern (`{errors[key] && <p className="text-sm text-red-600">...`).

**Checkpoint**: Core contribution section validates tiers in real time. Overlapping tiers, missing dimensions, and invalid min/max ranges all produce inline errors.

---

## Phase 5: User Story 3 - Configure Auto-Enrollment and Auto-Escalation (Priority: P3)

**Goal**: Toggling auto-enrollment ON pre-fills the deferral rate at 6%. Toggling auto-escalation ON pre-fills the rate at 1% and cap at 10%. Toggling enrollment OFF disables escalation. Escalation cap validation is real-time.

**Independent Test**: Start from empty form. Toggle auto-enrollment ON — verify rate shows 6%. Toggle auto-escalation ON — verify rate shows 1% and cap shows 10%. Set cap to 4% — verify error appears. Toggle enrollment OFF — verify escalation section is hidden. Toggle enrollment ON again — verify rate is still 6% (preserved).

### Implementation

- [x] T011 [US3] Implement smart defaults on auto-enrollment toggle in app/src/components/PlanDesignForm.tsx — modify the auto-enrollment checkbox `onChange` handler: when toggling ON (`e.target.checked === true`), if `form.auto_enroll_rate === 0`, set it to `0.06` (6% default). When toggling OFF, also set `auto_escalation_enabled` to `false` to disable escalation (keep rate/cap values in state so they're preserved if re-enabled). Do NOT reset `auto_enroll_rate` to 0 when toggling off (preserve the user's last value).

- [x] T012 [US3] Implement smart defaults on auto-escalation toggle in app/src/components/PlanDesignForm.tsx — modify the auto-escalation checkbox `onChange` handler: when toggling ON, if `form.auto_escalation_rate === 0`, set it to `0.01` (1% default); if `form.auto_escalation_cap === 0`, set it to `0.10` (10% default). Preserve non-zero values the user previously entered.

**Checkpoint**: Auto-enrollment and escalation toggles provide smart defaults and properly cascade disable behavior. All acceptance scenarios for US3 pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling and final refinements across all stories

- [x] T013 Handle edge case: core tier toggle clears tier data when switching back to flat rate in app/src/components/PlanDesignForm.tsx — when the "Use age/service tiers" checkbox is unchecked, set `core_age_service_tiers` to `null` (already implemented in scaffold ~line 327). Verify the summary card recalculates correctly using only the flat rate. Clear any tier-related validation errors from the `errors` state (keys matching `core_tier_*`).

- [x] T014 Handle edge case: empty plan design save and API error display in app/src/components/PlanDesignForm.tsx — ensure saving with no match tiers, 0% core, and auto-enrollment off produces a valid payload (all zeros/empty arrays). The `name` field is required on the parent page (ScenarioCreatePage), not in PlanDesignForm. Verify that when the API returns an error (non-ok response), the error message is displayed in the parent page's error banner and form data is preserved for retry.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. T003 (calculator utility) is parallel with T001/T002/T004 (different file).
- **US1 + US4 (Phase 2)**: Depends on Phase 1 completion (T001-T004). T005 and T006 are sequential (same file).
- **US5 (Phase 3)**: Depends on Phase 2 (summary card must exist for full validation). T008 and T009 are parallel (different files), but T007 must complete first (same file as T006).
- **US2 (Phase 4)**: Depends on Phase 3 (real-time validation from T007 must be in place).
- **US3 (Phase 5)**: Depends on Phase 1 only (auto-enrollment section). Can run in parallel with Phases 3-4 if needed.
- **Polish (Phase 6)**: Depends on all prior phases.

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational. No cross-story dependencies.
- **US4 (P2)**: Satisfied by T003 + T006 in Phases 1-2. No additional implementation needed.
- **US5 (P1)**: Depends on US1 (form must render correctly before testing save).
- **US2 (P2)**: Depends on Foundational + US5 (real-time validation infrastructure from T007).
- **US3 (P3)**: Depends on Foundational only. Independent of other stories.

### Within Each Phase

- Same-file tasks must be sequential (almost all tasks touch PlanDesignForm.tsx)
- T003 is the only task on a different source file (contribution-calculator.ts) — parallelizable
- T008 and T009 are on different files (ScenarioCreatePage.tsx, ScenarioEditPage.tsx) — parallelizable

### Parallel Opportunities

```
Phase 1 parallelism:
  Sequential: T001 → T002 → T004 (all PlanDesignForm.tsx)
  Parallel:   T003 (contribution-calculator.ts) runs alongside T001-T004

Phase 3 parallelism:
  Sequential: T007 (PlanDesignForm.tsx)
  Parallel:   T008 (ScenarioCreatePage.tsx) + T009 (ScenarioEditPage.tsx) after T007
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. Complete Phase 1: Foundational (T001-T004) — clean scaffold, build calculator
2. Complete Phase 2: US1 + US4 (T005-T006) — match tiers + summary card
3. **STOP and VALIDATE**: Open `/scenarios/new`, add match tiers, verify summary card shows correct values
4. This is a functional MVP — user can configure a match formula and see cost impact

### Incremental Delivery

1. Phase 1 + Phase 2 → MVP: Match formula + contribution summary
2. Add Phase 3 (US5) → Can create and save scenarios end-to-end
3. Add Phase 4 (US2) → Core tier validation catches errors in real time
4. Add Phase 5 (US3) → Auto-enrollment smart defaults improve UX
5. Add Phase 6 → Edge cases handled, production ready

---

## Notes

- Almost all tasks modify `app/src/components/PlanDesignForm.tsx` — tasks within each phase MUST be sequential for this file
- The existing scaffold (551 lines) is ~80% complete — tasks are refinements and additions, not rewrites
- No backend changes needed — all API endpoints and models already exist
- Vesting fields are kept in TypeScript types and form state (hardcoded to `immediate`) for API compatibility
- Contribution calculator is a pure function — the summary card is reactive by design (no debounce needed)
