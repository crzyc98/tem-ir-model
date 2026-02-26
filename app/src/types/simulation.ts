export interface PercentileValues {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface YearSnapshot {
  age: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  withdrawal: PercentileValues | null
}

export interface PersonaSimulationResult {
  persona_id: string
  persona_name: string
  retirement_balance: PercentileValues
  annual_retirement_income: PercentileValues | null
  ss_annual_benefit: number
  total_retirement_income: PercentileValues | null
  trajectory: YearSnapshot[]
  total_employee_contributions: number
  total_employer_contributions: number
  probability_of_success: number
  income_replacement_ratio: PercentileValues | null
  projected_salary_at_retirement: number
  shortfall_age_p10: number | null
  shortfall_age_p25: number | null
  shortfall_age_p50: number | null
  pos_assessment: string
  target_replacement_ratio: number | null
}

export interface SimulationResponse {
  scenario_id: string
  num_simulations: number
  seed: number | null
  retirement_age: number
  planning_age: number
  personas: PersonaSimulationResult[]
}

export interface SimulationRequest {
  num_simulations?: number
  seed?: number | null
}

export type ConfidenceLevel = '50' | '75' | '90'

export const CONFIDENCE_PERCENTILE_MAP: Record<ConfidenceLevel, keyof PercentileValues> = {
  '50': 'p50',
  '75': 'p25',
  '90': 'p10',
}
