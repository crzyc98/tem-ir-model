export interface MatchTier {
  match_rate: number
  on_first_pct: number
}

export interface ImmediateVesting {
  type: 'immediate'
}

export interface CliffVesting {
  type: 'cliff'
  years: number
}

export interface GradedVesting {
  type: 'graded'
  schedule: Record<string, number>
}

export type VestingSchedule = ImmediateVesting | CliffVesting | GradedVesting

export interface CoreContributionTier {
  min_age: number | null
  max_age: number | null
  min_service: number | null
  max_service: number | null
  contribution_pct: number
}

export interface PlanDesign {
  name: string
  match_tiers: MatchTier[]
  match_vesting: VestingSchedule
  match_eligibility_months: number
  core_contribution_pct: number
  core_age_service_tiers: CoreContributionTier[] | null
  core_vesting: VestingSchedule
  core_eligibility_months: number
  auto_enroll_enabled: boolean
  auto_enroll_rate: number
  auto_enroll_overrides_personal_rate: boolean
  auto_escalation_enabled: boolean
  auto_escalation_rate: number
  auto_escalation_cap: number
}
