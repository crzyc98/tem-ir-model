import { useEffect, useState, useCallback } from 'react'
import { useOutletContext, useNavigate, Link } from 'react-router-dom'
import { Plus, FolderOpen } from 'lucide-react'
import { listScenarios, getScenario, duplicateScenario, deleteScenario } from '../services/api'
import ScenarioCard from '../components/ScenarioCard'
import ConfirmDialog from '../components/ConfirmDialog'
import { formatPlanDesignSummary } from '../utils/plan-design-summary'
import type { LayoutContext } from '../types/workspace'
import type { ScenarioSummary, ScenarioResponse } from '../types/scenario'

export default function ScenariosPage() {
  const { activeWorkspace } = useOutletContext<LayoutContext>()
  const navigate = useNavigate()

  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [fullScenarios, setFullScenarios] = useState<Record<string, ScenarioResponse>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [deletingScenario, setDeletingScenario] = useState<ScenarioSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchScenarios = useCallback(async () => {
    if (!activeWorkspace) return
    setLoading(true)
    setError(null)
    try {
      const summaries = await listScenarios(activeWorkspace.id)
      setScenarios(summaries)

      const results = await Promise.allSettled(
        summaries.map((s) => getScenario(activeWorkspace.id, s.id)),
      )
      const full: Record<string, ScenarioResponse> = {}
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          full[result.value.id] = result.value
        }
      })
      setFullScenarios(full)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace])

  useEffect(() => {
    fetchScenarios()
  }, [fetchScenarios])

  const handleDuplicate = async (scenarioId: string) => {
    if (!activeWorkspace) return
    setDuplicatingId(scenarioId)
    try {
      await duplicateScenario(activeWorkspace.id, scenarioId)
      await fetchScenarios()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setDuplicatingId(null)
    }
  }

  const handleDelete = async () => {
    if (!activeWorkspace || !deletingScenario) return
    setIsDeleting(true)
    try {
      await deleteScenario(activeWorkspace.id, deletingScenario.id)
      setDeletingScenario(null)
      await fetchScenarios()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm text-gray-500">
          Select a workspace to view scenarios.{' '}
          <Link to="/dashboard" className="font-medium text-brand-500 hover:text-brand-600">
            Go to Dashboard
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Scenarios</h2>
          <p className="text-sm text-gray-500">{activeWorkspace.client_name}</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          onClick={() => navigate('/scenarios/new')}
        >
          <Plus className="h-4 w-4" />
          New Scenario
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => {
              setError(null)
              fetchScenarios()
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="h-5 w-2/3 rounded bg-gray-200" />
              <div className="mt-3 flex gap-2">
                <div className="h-5 w-24 rounded-full bg-gray-200" />
                <div className="h-5 w-20 rounded-full bg-gray-200" />
              </div>
              <div className="mt-4 h-3 w-1/4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-gray-100 bg-white p-12 shadow-sm">
          <FolderOpen className="h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-800">No scenarios yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first scenario to start modeling.
          </p>
          <button
            type="button"
            className="mt-4 flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            onClick={() => navigate('/scenarios/new')}
          >
            <Plus className="h-4 w-4" />
            Create your first scenario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((scenario) => {
            const full = fullScenarios[scenario.id]
            const summary = full ? formatPlanDesignSummary(full.plan_design) : null
            return (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                planDesignSummary={summary}
                onClick={() => navigate(`/scenarios/${scenario.id}`)}
                onDuplicate={() => handleDuplicate(scenario.id)}
                onDelete={() => setDeletingScenario(scenario)}
                isDuplicating={duplicatingId === scenario.id}
              />
            )
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deletingScenario !== null}
        title="Delete Scenario"
        message={`Are you sure you want to delete '${deletingScenario?.name}'? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeletingScenario(null)}
        isLoading={isDeleting}
      />
    </div>
  )
}
