export interface WorkspaceSummary {
  id: string
  name: string
  client_name: string
  created_at: string
  updated_at: string
}

export interface LayoutContext {
  activeWorkspace: WorkspaceSummary | null
  setActiveWorkspace: (ws: WorkspaceSummary) => void
  workspaces: WorkspaceSummary[]
}

export interface HealthStatus {
  status: string
  version?: string
  environment?: string
}
