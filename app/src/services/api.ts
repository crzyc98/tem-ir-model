import type { WorkspaceSummary, HealthStatus, Workspace, WorkspaceCreate, WorkspaceUpdate } from '../types/workspace'
import type { GlobalSettings } from '../types/global-settings'
import type { Persona } from '../types/persona'
import type { ScenarioSummary, ScenarioResponse, ScenarioCreate, ScenarioUpdate } from '../types/scenario'
import type { SimulationRequest, SimulationResponse } from '../types/simulation'
import type { PlanComparison } from '../types/comparison'
import type { WorkforceAnalyzeResponse } from '../types/workforce_analysis'

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

export async function runSimulation(
  workspaceId: string,
  scenarioId: string,
  request?: SimulationRequest,
): Promise<SimulationResponse> {
  const response = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}/simulate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: request ? JSON.stringify(request) : undefined,
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to run simulation: HTTP ${response.status}`)
  }
  return response.json()
}

export async function exportSimulationExcel(
  workspaceId: string,
  scenarioId: string,
  simulationResult: SimulationResponse,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/scenarios/${scenarioId}/export`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simulationResult),
    },
  )
  if (!response.ok) {
    throw new Error(`Failed to export simulation: HTTP ${response.status}`)
  }
  return response.blob()
}

export async function runComparison(
  workspaceId: string,
  req: { scenario_ids: string[]; persona_id: string },
): Promise<PlanComparison> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/comparisons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!response.ok) {
    throw new Error(`Failed to run comparison: HTTP ${response.status}`)
  }
  return response.json()
}

export async function listComparisons(workspaceId: string): Promise<PlanComparison[]> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/comparisons`)
  if (!response.ok) {
    throw new Error(`Failed to fetch comparisons: HTTP ${response.status}`)
  }
  return response.json()
}

export async function deleteComparison(workspaceId: string, comparisonId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/comparisons/${comparisonId}`,
    { method: 'DELETE' },
  )
  if (!response.ok) {
    throw new Error(`Failed to delete comparison: HTTP ${response.status}`)
  }
}

// ============ WORKFORCE ANALYSIS (Feature 001-persona-scenario-analysis) ============

export async function runWorkforceAnalysis(
  workspaceId: string,
  req: { scenario_ids: string[] },
): Promise<WorkforceAnalyzeResponse> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as { detail?: string }).detail ?? `Analysis failed (${response.status})`)
  }
  return response.json()
}

// ============ WORKSPACE ARCHIVE (Feature 013) ============

export async function exportWorkspace(workspaceId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/export`)
  if (!response.ok) {
    throw new Error(`Failed to export workspace: HTTP ${response.status}`)
  }
  return response.blob()
}

export interface ImportResult {
  workspace_id: string
  workspace_name: string
  client_name: string
  scenario_count: number
  action: 'created' | 'replaced' | 'skipped'
}

export interface ImportConflictDetail {
  conflict_type: 'name_conflict'
  archive_workspace_name: string
  archive_client_name: string
  existing_workspace_id: string
}

export class ImportConflictError extends Error {
  conflict_type: 'name_conflict'
  archive_workspace_name: string
  archive_client_name: string
  existing_workspace_id: string

  constructor(detail: ImportConflictDetail) {
    super(`Workspace name conflict: '${detail.archive_workspace_name}' already exists`)
    this.name = 'ImportConflictError'
    this.conflict_type = detail.conflict_type
    this.archive_workspace_name = detail.archive_workspace_name
    this.archive_client_name = detail.archive_client_name
    this.existing_workspace_id = detail.existing_workspace_id
  }
}

// ============ GLOBAL SETTINGS (Feature 014) ============

export async function getGlobalSettings(): Promise<GlobalSettings> {
  const response = await fetch(`${API_BASE}/global-settings`)
  if (!response.ok) {
    throw new Error(`Failed to load global settings: HTTP ${response.status}`)
  }
  return response.json()
}

export async function saveGlobalSettings(settings: GlobalSettings): Promise<GlobalSettings> {
  const response = await fetch(`${API_BASE}/global-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!response.ok) {
    throw new Error(`Failed to save global settings: HTTP ${response.status}`)
  }
  return response.json()
}

export async function restoreGlobalSettings(): Promise<GlobalSettings> {
  const response = await fetch(`${API_BASE}/global-settings/restore`, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`Failed to restore global settings: HTTP ${response.status}`)
  }
  return response.json()
}

export async function importWorkspace(
  file: File,
  options?: { onConflict?: 'rename' | 'replace' | 'skip'; newName?: string },
): Promise<ImportResult> {
  const url = new URL(`${window.location.origin}${API_BASE}/workspaces/import`)
  if (options?.onConflict) url.searchParams.set('on_conflict', options.onConflict)
  if (options?.newName) url.searchParams.set('new_name', options.newName)

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url.toString(), { method: 'POST', body: formData })

  if (response.status === 409) {
    const body = await response.json()
    const detail = body.detail as ImportConflictDetail
    throw new ImportConflictError(detail)
  }

  if (!response.ok) {
    let message = `Failed to import workspace: HTTP ${response.status}`
    try {
      const body = await response.json()
      if (body.detail?.detail) message = body.detail.detail
      else if (typeof body.detail === 'string') message = body.detail
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  return response.json()
}
