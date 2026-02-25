import type { PlanDesign } from '../types/plan-design'

export function formatPlanDesignSummary(pd: PlanDesign): {
  matchFormula: string
  autoEnrollRate: string
  coreContribution: string
} {
  // Match formula
  let matchFormula: string
  if (pd.match_tiers.length === 0) {
    matchFormula = 'No match'
  } else {
    matchFormula = pd.match_tiers
      .map((tier) => {
        const rate = Math.round(tier.match_rate * 100)
        const pct = Math.round(tier.on_first_pct * 100)
        return `${rate}% on first ${pct}%`
      })
      .join(', ')
  }

  // Auto-enroll rate
  let autoEnrollRate: string
  if (pd.auto_enroll_enabled) {
    const rate = Math.round(pd.auto_enroll_rate * 100)
    autoEnrollRate = `${rate}% auto-enroll`
  } else {
    autoEnrollRate = 'Auto-enroll off'
  }

  // Core contribution
  let coreContribution: string
  if (pd.core_age_service_tiers !== null && pd.core_age_service_tiers.length > 0) {
    coreContribution = 'Age/service tiers'
  } else if (pd.core_contribution_pct > 0) {
    const pct = Math.round(pd.core_contribution_pct * 100)
    coreContribution = `${pct}% core`
  } else {
    coreContribution = 'No core'
  }

  return { matchFormula, autoEnrollRate, coreContribution }
}
