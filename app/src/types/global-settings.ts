export type ReplacementRatioMode = 'lookup_table' | 'flat_percentage'

export interface GlobalSettings {
  // Economic assumptions
  inflation_rate: number
  salary_real_growth_rate: number

  // IRS annual limits
  comp_limit: number
  deferral_limit: number
  additions_limit: number
  catchup_limit: number
  super_catchup_limit: number
  ss_taxable_max: number

  // Target replacement ratio
  target_replacement_ratio_mode: ReplacementRatioMode
  target_replacement_ratio_override: number | null

  // Simulation configuration
  retirement_age: number
  planning_age: number
  ss_claiming_age: number
}

/** Hardcoded system defaults — mirrors api/models/global_defaults.py SYSTEM_DEFAULTS */
export const SYSTEM_DEFAULTS: GlobalSettings = {
  inflation_rate: 0.025,
  salary_real_growth_rate: 0.015,
  comp_limit: 360000,
  deferral_limit: 24500,
  additions_limit: 72000,
  catchup_limit: 8000,
  super_catchup_limit: 11250,
  ss_taxable_max: 184500,
  target_replacement_ratio_mode: 'lookup_table',
  target_replacement_ratio_override: null,
  retirement_age: 67,
  planning_age: 93,
  ss_claiming_age: 67,
}

/** Fixed by scenario matrix architecture — not configurable. */
export const NUM_SIMULATIONS = 250
