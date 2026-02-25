import type { Assumptions, AssumptionsOverride } from './assumptions'
import type { Persona } from './persona'

export interface WorkspaceSummary {
  id: string
  name: string
  client_name: string
  created_at: string
  updated_at: string
}

export interface MonteCarloConfig {
  num_simulations: number
  seed: number | null
  retirement_age: number
  planning_age: number
}

export interface Workspace {
  id: string
  name: string
  client_name: string
  created_at: string
  updated_at: string
  base_config: Assumptions
  personas: Persona[]
  monte_carlo_config: MonteCarloConfig
}

export interface WorkspaceCreate {
  client_name: string
  name?: string
}

export interface WorkspaceUpdate {
  name?: string
  client_name?: string
  base_config?: AssumptionsOverride
  personas?: Persona[]
}

export interface LayoutContext {
  activeWorkspace: WorkspaceSummary | null
  setActiveWorkspace: (ws: WorkspaceSummary | null) => void
  workspaces: WorkspaceSummary[]
  refreshWorkspaces: () => Promise<void>
}

export interface HealthStatus {
  status: string
  version?: string
  environment?: string
}
