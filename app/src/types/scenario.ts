import type { PlanDesign } from './plan-design'
import type { Assumptions, AssumptionsOverride } from './assumptions'

export interface IrsLimitWarning {
  type: 'employer_additions_limit' | 'employee_deferral_limit'
  message: string
  persona_id: string | null
  persona_name: string | null
  limit_name: string
  limit_value: number
  computed_value: number
  year: number | null
}

export interface ScenarioSummary {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ScenarioResponse {
  id: string
  workspace_id: string
  name: string
  description: string | null
  plan_design: PlanDesign
  overrides: AssumptionsOverride | null
  effective_assumptions: Assumptions
  created_at: string
  updated_at: string
  last_run_at: string | null
  warnings: IrsLimitWarning[]
}

export interface ScenarioCreate {
  name: string
  description?: string
  plan_design: PlanDesign
  overrides?: AssumptionsOverride
}

export interface ScenarioUpdate {
  name?: string
  description?: string
  plan_design?: PlanDesign
  overrides?: AssumptionsOverride
}
