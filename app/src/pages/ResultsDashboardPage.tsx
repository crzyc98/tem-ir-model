import { useState, useEffect, useCallback } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { BarChart3, Play, AlertTriangle, Download } from 'lucide-react'
import type { LayoutContext } from '../types/workspace'
import type { ScenarioResponse } from '../types/scenario'
import type { SimulationResponse, ConfidenceLevel } from '../types/simulation'
import { getScenario, runSimulation, exportSimulationExcel } from '../services/api'
import ResultsSummaryTable from '../components/ResultsSummaryTable'
import IncomeReplacementChart from '../components/IncomeReplacementChart'
import TrajectoryChart from '../components/TrajectoryChart'
import ConfidenceLevelToggle from '../components/ConfidenceLevelToggle'

export default function ResultsDashboardPage() {
  const { activeWorkspace } = useOutletContext<LayoutContext>()
  const { scenarioId } = useParams<{ scenarioId: string }>()

  const [scenario, setScenario] = useState<ScenarioResponse | null>(null)
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingScenario, setLoadingScenario] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('75')

  const loadScenario = useCallback(async () => {
    if (!activeWorkspace || !scenarioId) return
    setLoadingScenario(true)
    try {
      const result = await getScenario(activeWorkspace.id, scenarioId)
      setScenario(result)
    } catch (err) {
      console.error('Failed to load scenario:', err)
    } finally {
      setLoadingScenario(false)
    }
  }, [activeWorkspace, scenarioId])

  useEffect(() => {
    loadScenario()
  }, [loadScenario])

  const handleExportExcel = async () => {
    if (!activeWorkspace || !scenarioId || !simulationResult) return
    try {
      const blob = await exportSimulationExcel(activeWorkspace.id, scenarioId, simulationResult)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${scenario?.name ?? 'simulation'}_results.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handleRunSimulation = async () => {
    if (!activeWorkspace || !scenarioId) return
    setLoading(true)
    setError(null)
    try {
      const result = await runSimulation(activeWorkspace.id, scenarioId)
      setSimulationResult(result)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm text-gray-500">Select a workspace to view results.</p>
      </div>
    )
  }

  if (loadingScenario) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Loading scenario...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-brand-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Results Dashboard</h2>
              <p className="text-sm text-gray-500">
                {scenario ? scenario.name : 'Scenario'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={!simulationResult}
              aria-disabled={!simulationResult}
              title={simulationResult ? 'Download Excel report' : 'Run simulation first to enable export'}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Download Excel
            </button>
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Simulation
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={handleRunSimulation}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!simulationResult && !loading && (
        <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-base font-medium text-gray-700">No simulation results yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Run a simulation to see projected retirement outcomes for all personas.
          </p>
          <button
            type="button"
            onClick={handleRunSimulation}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <Play className="h-4 w-4" />
            Run Simulation
          </button>
        </div>
      )}

      {/* Results — no personas case */}
      {simulationResult && simulationResult.personas.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            No active personas found. Add or unhide personas to see simulation results.
          </p>
        </div>
      )}

      {/* Results */}
      {simulationResult && simulationResult.personas.length > 0 && (
        <>
          {/* Confidence Level Toggle */}
          <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
            <span className="text-sm font-medium text-gray-600">Confidence Level</span>
            <ConfidenceLevelToggle value={confidenceLevel} onChange={setConfidenceLevel} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Income Replacement Chart */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">Income Replacement Ratio</h3>
              <IncomeReplacementChart
                personas={simulationResult.personas}
                confidenceLevel={confidenceLevel}
              />
            </div>

            {/* Trajectory Chart */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-base font-semibold text-gray-800">Lifetime Balance Trajectory</h3>
              <TrajectoryChart
                personas={simulationResult.personas}
                confidenceLevel={confidenceLevel}
                retirementAge={simulationResult.retirement_age}
                planningAge={simulationResult.planning_age}
              />
            </div>
          </div>

          {/* Summary Table */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-800">Summary</h3>
            <ResultsSummaryTable
              personas={simulationResult.personas}
              confidenceLevel={confidenceLevel}
            />
          </div>
        </>
      )}
    </div>
  )
}
