import { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { FolderOpen, Plus, Upload } from 'lucide-react'
import { listScenarios, deleteWorkspace, exportWorkspace } from '../services/api'
import type { ImportResult } from '../services/api'
import WorkspaceCard from '../components/WorkspaceCard'
import ConfirmDialog from '../components/ConfirmDialog'
import CreateWorkspaceModal from '../components/CreateWorkspaceModal'
import ImportWorkspaceModal from '../components/ImportWorkspaceModal'
import type { WorkspaceSummary, Workspace, LayoutContext } from '../types/workspace'

export default function DashboardPage() {
  const { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces } =
    useOutletContext<LayoutContext>()
  const navigate = useNavigate()

  const [scenarioCounts, setScenarioCounts] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingWorkspace, setDeletingWorkspace] = useState<WorkspaceSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [exportingWorkspaceId, setExportingWorkspaceId] = useState<string | null>(null)

  // Fetch scenario counts for each workspace
  useEffect(() => {
    if (workspaces.length === 0) return

    setLoading(true)
    const initial: Record<string, number | null> = {}
    workspaces.forEach((ws) => {
      initial[ws.id] = null
    })
    setScenarioCounts(initial)

    Promise.allSettled(
      workspaces.map((ws) =>
        listScenarios(ws.id).then((scenarios) => ({
          id: ws.id,
          count: scenarios.length,
        })),
      ),
    )
      .then((results) => {
        const counts: Record<string, number | null> = {}
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            counts[result.value.id] = result.value.count
          }
        })
        setScenarioCounts((prev) => ({ ...prev, ...counts }))
      })
      .catch(() => {
        setError('Failed to load scenario counts')
      })
      .finally(() => setLoading(false))
  }, [workspaces])

  const handleCardClick = (ws: WorkspaceSummary) => {
    setActiveWorkspace(ws)
    navigate('/scenarios')
  }

  const handleDelete = async () => {
    if (!deletingWorkspace) return
    setIsDeleting(true)
    try {
      await deleteWorkspace(deletingWorkspace.id)
      if (activeWorkspace?.id === deletingWorkspace.id) {
        setActiveWorkspace(null)
      }
      await refreshWorkspaces()
      setDeletingWorkspace(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async (ws: WorkspaceSummary) => {
    setExportingWorkspaceId(ws.id)
    setError(null)
    try {
      const blob = await exportWorkspace(ws.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${ws.client_name}_export.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(`Export failed: ${(err as Error).message}`)
    } finally {
      setExportingWorkspaceId(null)
    }
  }

  const handleImported = async (result: ImportResult) => {
    await refreshWorkspaces()
    if (result.workspace_id) {
      setActiveWorkspace({
        id: result.workspace_id,
        name: result.workspace_name,
        client_name: result.client_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      navigate('/scenarios')
    }
  }

  const handleWorkspaceCreated = async (workspace: Workspace) => {
    await refreshWorkspaces()
    setActiveWorkspace({
      id: workspace.id,
      name: workspace.name,
      client_name: workspace.client_name,
      created_at: workspace.created_at,
      updated_at: workspace.updated_at,
    })
    navigate('/scenarios')
  }

  const sortedWorkspaces = [...workspaces].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Workspaces</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => {
              setError(null)
              refreshWorkspaces()
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state or grid of workspace cards */}
      {workspaces.length === 0 && !loading ? (
        <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-white p-12 shadow-sm">
          <FolderOpen className="h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-800">No workspaces yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first workspace.
          </p>
          <button
            type="button"
            className="mt-4 flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create your first workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedWorkspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              workspace={ws}
              scenarioCount={scenarioCounts[ws.id] ?? null}
              onClick={() => handleCardClick(ws)}
              onDelete={() => setDeletingWorkspace(ws)}
              onExport={() => handleExport(ws)}
              isExporting={exportingWorkspaceId === ws.id}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deletingWorkspace !== null}
        title="Delete Workspace"
        message={`Are you sure you want to delete '${deletingWorkspace?.client_name}'? This will permanently remove all scenarios within this workspace.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeletingWorkspace(null)}
        isLoading={isDeleting}
      />

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleWorkspaceCreated}
      />

      <ImportWorkspaceModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={handleImported}
      />
    </div>
  )
}
