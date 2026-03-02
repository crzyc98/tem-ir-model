import type { PersonaSimulationResult } from './simulation'

export interface WorkforceAnalyzeRequest {
  scenario_ids: string[]
}

export interface PersonaEmployerCost {
  persona_id: string
  employer_cost_annual: number
  employer_cost_cumulative: number
}

export interface WorkforceAggregate {
  pct_on_track: number
  median_ir: number | null
  avg_employer_cost_annual: number
}

export interface WorkforceScenarioResult {
  scenario_id: string
  scenario_name: string
  persona_results: PersonaSimulationResult[]
  employer_costs: PersonaEmployerCost[]
  aggregate: WorkforceAggregate
}

export interface WorkforceAnalyzeResponse {
  workspace_id: string
  scenario_ids: string[]
  results: WorkforceScenarioResult[]
  retirement_age: number
  planning_age: number
  num_simulations: number
  seed: number | null
}

export type AnalysisMetric =
  | 'income_replacement_ratio'
  | 'probability_of_success'
  | 'retirement_balance'
  | 'employer_cost_annual'

export const ANALYSIS_METRIC_LABELS: Record<AnalysisMetric, string> = {
  income_replacement_ratio: 'Income Replacement Ratio',
  probability_of_success: 'Probability of Success',
  retirement_balance: 'Retirement Balance',
  employer_cost_annual: 'Employer Cost (Annual)',
}
