import type { WorkspaceSummary, HealthStatus } from '../types/workspace'

const API_BASE = '/api/v1'

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const response = await fetch(`${API_BASE}/workspaces`)
  if (!response.ok) {
    throw new Error(`Failed to fetch workspaces: HTTP ${response.status}`)
  }
  return response.json()
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/health`)
  if (!response.ok) {
    throw new Error(`Failed to fetch health status: HTTP ${response.status}`)
  }
  return response.json()
}
