# Component Contract: PlanDesignForm

**Branch**: `009-plan-design-form` | **Date**: 2026-02-24

## Props Interface

```typescript
interface PlanDesignFormProps {
  /** Pre-populated form values for edit mode. Omit for create (empty form). */
  initialValues?: PlanDesign

  /** Called with validated PlanDesign when user clicks Save. */
  onSubmit: (planDesign: PlanDesign) => void

  /** Called when user clicks Cancel. */
  onCancel: () => void

  /** When true, disables Save button and shows loading spinner. */
  isSubmitting: boolean
}
```

## Behavior Contract

### Create Mode (no `initialValues`)
- Form starts empty: no match tiers, 0% core, auto-enrollment off, 0-month eligibility
- Vesting fields hidden; hardcoded to `{ type: 'immediate' }` in submitted data
- Summary card shows $0 employer contribution at all deferral levels

### Edit Mode (`initialValues` provided)
- All fields pre-populated from `initialValues`
- Vesting fields from `initialValues` preserved in state but not shown in UI
- Summary card immediately reflects loaded plan design

### Validation
- Real-time: errors displayed inline as user modifies fields
- On submit: full validation pass; if errors exist, submission blocked
- Errors cleared per-field as user corrects values

### Submitted Data Shape
The `onSubmit` callback receives a complete `PlanDesign` object matching the backend API contract, including:
- `match_vesting: { type: 'immediate' }` (always)
- `core_vesting: { type: 'immediate' }` (always)
- All other fields as configured by the user

## Utility Function Contract: `calculateEmployerContribution`

```typescript
/**
 * Calculate total employer contribution for a given employee deferral rate.
 * Match tiers are applied in order, each consuming a sequential band of deferral.
 * Core contribution uses flat rate only (age/service tiers excluded from summary).
 */
function calculateEmployerContribution(
  matchTiers: MatchTier[],
  coreContributionPct: number,
  deferralRate: number
): {
  matchContribution: number    // sum of tier match amounts
  coreContribution: number     // flat core pct
  totalEmployer: number        // match + core
}
```

## Parent Page Integration

### ScenarioCreatePage
```typescript
// Assembles scenario payload and calls API
const handleSubmit = (planDesign: PlanDesign) => {
  createScenario(workspaceId, { name, description, plan_design: planDesign })
}
```

### ScenarioEditPage
```typescript
// Loads existing scenario, passes plan_design as initialValues
<PlanDesignForm
  initialValues={scenario.plan_design}
  onSubmit={handleSubmit}
  onCancel={() => navigate('/scenarios')}
  isSubmitting={saving}
/>
```
