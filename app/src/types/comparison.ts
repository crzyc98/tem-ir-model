import type { PersonaSimulationResult } from './simulation'

export interface ScenarioComparisonResult {
  scenario_id: string
  scenario_name: string
  persona_result: PersonaSimulationResult
  employer_cost_annual: number
  employer_cost_cumulative: number
  deferral_rate_for_80pct_ir: number | null
}

export interface PlanComparison {
  id: string
  workspace_id: string
  persona_id: string
  persona_name: string
  scenario_ids: string[]
  results: ScenarioComparisonResult[]
  num_simulations: number
  seed: number | null
  retirement_age: number
  planning_age: number
  created_at: string
}

// Frontend-only display type that merges color info
export interface ComparisonScenarioDisplay {
  scenarioId: string
  scenarioName: string
  color: string
  result: ScenarioComparisonResult
}
