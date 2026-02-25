# Data Model: Plan Design Configuration Form

**Branch**: `009-plan-design-form` | **Date**: 2026-02-24

## Entities

### PlanDesign (existing — modifications noted)

The root form data structure. Maps 1:1 to the backend `PlanDesign` Pydantic model.

| Field | Type | Constraints | Form Visibility | Notes |
| ----- | ---- | ----------- | --------------- | ----- |
| name | string | required | Hidden (set by parent page as scenario name) | |
| match_tiers | MatchTier[] | 0–3 items | Visible — add/remove UI | |
| match_vesting | VestingSchedule | required | **Hidden** — hardcoded `{ type: 'immediate' }` | Out of scope per clarification |
| match_eligibility_months | number | 0–12 | Visible — dropdown | |
| core_contribution_pct | number | 0.0–1.0 | Visible — percentage input | Used when tiers are off |
| core_age_service_tiers | CoreContributionTier[] \| null | 0–5 items when enabled | Visible — toggle + add/remove UI | null = flat rate mode |
| core_vesting | VestingSchedule | required | **Hidden** — hardcoded `{ type: 'immediate' }` | Out of scope per clarification |
| core_eligibility_months | number | 0–12 | Visible — dropdown | |
| auto_enroll_enabled | boolean | — | Visible — toggle | Default: false (empty form) |
| auto_enroll_rate | number | 0.0–1.0 | Visible when enabled | Default: 0.06 when first enabled |
| auto_escalation_enabled | boolean | — | Visible when auto-enroll on | Default: false |
| auto_escalation_rate | number | 0.0–1.0 | Visible when escalation on | Default: 0.01 when first enabled |
| auto_escalation_cap | number | 0.0–1.0, >= auto_enroll_rate | Visible when escalation on | Default: 0.10 when first enabled |

### MatchTier (existing — no changes)

| Field | Type | Constraints |
| ----- | ---- | ----------- |
| match_rate | number | 0.0–1.0 |
| on_first_pct | number | 0.0–1.0 |

### CoreContributionTier (existing — no changes)

| Field | Type | Constraints |
| ----- | ---- | ----------- |
| min_age | number \| null | >= 0, < max_age when both set |
| max_age | number \| null | >= 0 |
| min_service | number \| null | >= 0, < max_service when both set |
| max_service | number \| null | >= 0 |
| contribution_pct | number | 0.0–1.0 |

**Validation rules:**
- At least one dimension (age or service) must have non-null bounds
- No pairwise overlap on shared dimensions (age, service)

### ContributionSummaryRow (new — display-only, not persisted)

Computed for each sample deferral level. Not sent to API.

| Field | Type | Description |
| ----- | ---- | ----------- |
| deferralRate | number | Sample employee deferral rate (e.g., 0.03) |
| matchContribution | number | Employer match amount at this deferral level |
| coreContribution | number | Flat core contribution (same for all rows) |
| totalEmployer | number | matchContribution + coreContribution |

**Sample deferral levels**: [0, 0.03, 0.06, 0.10, 0.15]

## Validation Rules (Frontend)

### Cross-Field Rules

| Rule | Fields | Error Message |
| ---- | ------ | ------------- |
| Escalation cap >= enroll rate | auto_escalation_cap, auto_enroll_rate | "Escalation cap must be at least the auto-enroll rate" |
| Core tier: at least one dimension | min_age, max_age, min_service, max_service | "Each tier must have at least age or service bounds" |
| Core tier: min < max (age) | min_age, max_age | "Min age must be less than max age" |
| Core tier: min < max (service) | min_service, max_service | "Min service must be less than max service" |
| Core tier: no pairwise overlap | all core tiers | "Tiers {i} and {j} have overlapping {dimension} ranges" |

### Collection Rules

| Rule | Collection | Error Message |
| ---- | ---------- | ------------- |
| Max 3 match tiers | match_tiers | "Maximum 3 match tiers allowed" |
| Max 5 core tiers | core_age_service_tiers | "Maximum 5 core contribution tiers allowed" |

## State Transitions

### Auto-Enrollment Toggle

```
OFF → ON:  Set auto_enroll_rate = 0.06 (default), show rate input
ON → OFF:  Hide rate input, disable auto-escalation section
```

### Auto-Escalation Toggle (only available when auto-enroll ON)

```
OFF → ON:  Set auto_escalation_rate = 0.01, auto_escalation_cap = 0.10, show inputs
ON → OFF:  Hide rate/cap inputs
```

### Core Contribution Mode Toggle

```
Flat → Tiered:  Initialize core_age_service_tiers with one empty tier, keep flat rate visible
Tiered → Flat:  Set core_age_service_tiers = null (discard tier data)
```
