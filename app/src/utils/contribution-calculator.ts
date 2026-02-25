import type { MatchTier } from '../types/plan-design'

export interface ContributionSummaryRow {
  deferralRate: number
  matchContribution: number
  coreContribution: number
  totalEmployer: number
}

export const SAMPLE_DEFERRAL_RATES = [0, 0.03, 0.06, 0.10, 0.15]

export function calculateEmployerContribution(
  matchTiers: MatchTier[],
  coreContributionPct: number,
  deferralRate: number,
): { matchContribution: number; coreContribution: number; totalEmployer: number } {
  let consumed = 0
  let matchTotal = 0

  for (const tier of matchTiers) {
    const applicable = Math.min(Math.max(deferralRate - consumed, 0), tier.on_first_pct)
    matchTotal += applicable * tier.match_rate
    consumed += tier.on_first_pct
  }

  const coreContribution = coreContributionPct
  const totalEmployer = matchTotal + coreContribution

  return {
    matchContribution: matchTotal,
    coreContribution,
    totalEmployer,
  }
}

export function calculateSummaryRows(
  matchTiers: MatchTier[],
  coreContributionPct: number,
): ContributionSummaryRow[] {
  return SAMPLE_DEFERRAL_RATES.map((deferralRate) => {
    const result = calculateEmployerContribution(matchTiers, coreContributionPct, deferralRate)
    return {
      deferralRate,
      ...result,
    }
  })
}
