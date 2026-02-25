import type { WorkspaceSummary, HealthStatus, Workspace, WorkspaceCreate, WorkspaceUpdate } from '../types/workspace'
import type { Persona } from '../types/persona'
import type { ScenarioSummary, ScenarioResponse, ScenarioCreate, ScenarioUpdate } from '../types/scenario'

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

export async function createWorkspace(data: WorkspaceCreate): Promise<Workspace> {
  const response = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to create workspace: HTTP ${response.status}`)
  }
  return response.json()
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch workspace: HTTP ${response.status}`)
  }
  return response.json()
}

export async function updateWorkspace(workspaceId: string, data: WorkspaceUpdate): Promise<Workspace> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to update workspace: HTTP ${response.status}`)
  }
  return response.json()
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete workspace: HTTP ${response.status}`)
  }
}

export async function updateWorkspacePersonas(workspaceId: string, personas: Persona[]): Promise<Workspace> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personas }),
  })
  if (!response.ok) {
    throw new Error(`Failed to update personas: HTTP ${response.status}`)
  }
  return response.json()
}

export async function resetWorkspacePersonas(workspaceId: string): Promise<Workspace> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/personas/reset`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to reset personas: HTTP ${response.status}`)
  }
  return response.json()
}

export async function listScenarios(workspaceId: string): Promise<ScenarioSummary[]> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/scenarios`)
  if (!response.ok) {
    throw new Error(`Failed to fetch scenarios: HTTP ${response.status}`)
  }
  return response.json()
}

export async function getScenario(workspaceId: string, scenarioId: string): Promise<ScenarioResponse> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch scenario: HTTP ${response.status}`)
  }
  return response.json()
}

export async function createScenario(workspaceId: string, data: ScenarioCreate): Promise<ScenarioResponse> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to create scenario: HTTP ${response.status}`)
  }
  return response.json()
}

export async function updateScenario(
  workspaceId: string,
  scenarioId: string,
  data: ScenarioUpdate,
): Promise<ScenarioResponse> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error(`Failed to update scenario: HTTP ${response.status}`)
  }
  return response.json()
}

export async function deleteScenario(workspaceId: string, scenarioId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error(`Failed to delete scenario: HTTP ${response.status}`)
  }
}

export async function duplicateScenario(workspaceId: string, scenarioId: string): Promise<ScenarioResponse> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}/duplicate`, {
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error(`Failed to duplicate scenario: HTTP ${response.status}`)
  }
  return response.json()
}
