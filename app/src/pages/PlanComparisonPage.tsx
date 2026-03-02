import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { GitCompare, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LayoutContext, Workspace } from '../types/workspace'
import type { ScenarioSummary } from '../types/scenario'
import type { Persona } from '../types/persona'
import type { ConfidenceLevel } from '../types/simulation'
import type { PlanComparison, ComparisonScenarioDisplay } from '../types/comparison'
import { getWorkspace, listScenarios, runComparison } from '../services/api'
import { SCENARIO_COLORS } from '../utils/chart-colors'
import ComparisonSetupPanel from '../components/ComparisonSetupPanel'
import ComparisonIncomeReplacementChart from '../components/ComparisonIncomeReplacementChart'
import ComparisonTrajectoryChart from '../components/ComparisonTrajectoryChart'
import ComparisonMetricsTable from '../components/ComparisonMetricsTable'
import SavedComparisonsList from '../components/SavedComparisonsList'
import ConfidenceLevelToggle from '../components/ConfidenceLevelToggle'

function buildDisplayItems(comparison: PlanComparison): ComparisonScenarioDisplay[] {
  return comparison.results.map((result, idx) => ({
    scenarioId: result.scenario_id,
    scenarioName: result.scenario_name,
    color: SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
    result,
  }))
}

export default function PlanComparisonPage() {
  const { activeWorkspace } = useOutletContext<LayoutContext>()

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([])
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [personaIndex, setPersonaIndex] = useState(0)
  const [comparisonResult, setComparisonResult] = useState<PlanComparison | null>(null)
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('75')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const visiblePersonas: Persona[] = workspace?.personas.filter((p) => !p.hidden) ?? []

  // Load workspace and scenarios on mount
  const loadData = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const [ws, scenarioList] = await Promise.all([
        getWorkspace(activeWorkspace.id),
        listScenarios(activeWorkspace.id),
      ])
      setWorkspace(ws)
      setScenarios(scenarioList)
    } catch (err) {
      console.error('Failed to load workspace data:', err)
    }
  }, [activeWorkspace])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Sync selectedPersonaId from personaIndex
  useEffect(() => {
    const persona = visiblePersonas[personaIndex]
    if (persona) {
      setSelectedPersonaId(persona.id)
    }
  }, [personaIndex, workspace]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto re-run when persona changes (if we already have results)
  useEffect(() => {
    if (!selectedPersonaId || !comparisonResult || selectedScenarioIds.length < 2) return
    if (selectedPersonaId === comparisonResult.persona_id) return
    handleRunComparison(selectedPersonaId)
  }, [selectedPersonaId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScenarioToggle = (id: string) => {
    setSelectedScenarioIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id)
      }
      if (prev.length >= 8) return prev
      return [...prev, id]
    })
  }

  const handlePersonaSelect = (id: string) => {
    setSelectedPersonaId(id)
    const idx = visiblePersonas.findIndex((p) => p.id === id)
    if (idx !== -1) setPersonaIndex(idx)
  }

  const handleRunComparison = async (personaId?: string) => {
    const pid = personaId ?? selectedPersonaId
    if (!activeWorkspace || !pid || selectedScenarioIds.length < 2) return
    setLoading(true)
    setError(null)
    try {
      const result = await runComparison(activeWorkspace.id, {
        scenario_ids: selectedScenarioIds,
        persona_id: pid,
      })
      setComparisonResult(result)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadComparison = (comparison: PlanComparison) => {
    setComparisonResult(comparison)
    setSelectedScenarioIds(comparison.scenario_ids)
    setSelectedPersonaId(comparison.persona_id)
    const idx = visiblePersonas.findIndex((p) => p.id === comparison.persona_id)
    if (idx !== -1) setPersonaIndex(idx)
  }

  const displayItems = comparisonResult ? buildDisplayItems(comparisonResult) : []

  if (!activeWorkspace) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm text-gray-500">Select a workspace to compare plans.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <GitCompare className="h-6 w-6 text-brand-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Plan Comparison</h2>
            <p className="text-sm text-gray-500">Compare 2–8 plan designs side by side for a single persona</p>
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
            onClick={() => handleRunComparison()}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main layout: setup panel + results */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Setup panel — fixed width on large screens */}
        <div className="w-full lg:w-80 lg:flex-shrink-0">
          <ComparisonSetupPanel
            scenarios={scenarios}
            personas={visiblePersonas}
            selectedScenarioIds={selectedScenarioIds}
            selectedPersonaId={selectedPersonaId}
            onScenarioToggle={handleScenarioToggle}
            onPersonaSelect={handlePersonaSelect}
            onRun={() => handleRunComparison()}
            loading={loading}
          />
        </div>

        {/* Results area */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Persona cycling bar + confidence toggle */}
          {comparisonResult && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
              {/* Persona cycling */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPersonaIndex((i) => Math.max(0, i - 1))}
                  disabled={personaIndex === 0 || loading}
                  className="rounded-lg border border-gray-300 p-1 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {comparisonResult.persona_name}
                </span>
                <button
                  type="button"
                  onClick={() => setPersonaIndex((i) => Math.min(visiblePersonas.length - 1, i + 1))}
                  disabled={personaIndex >= visiblePersonas.length - 1 || loading}
                  className="rounded-lg border border-gray-300 p-1 hover:bg-gray-50 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-400">
                  {personaIndex + 1} / {visiblePersonas.length}
                </span>
              </div>
              {/* Confidence toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Confidence</span>
                <ConfidenceLevelToggle value={confidenceLevel} onChange={setConfidenceLevel} />
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white p-12 shadow-sm">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm text-gray-500">Running comparison…</span>
            </div>
          )}

          {/* Empty state */}
          {!comparisonResult && !loading && (
            <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <GitCompare className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-base font-medium text-gray-700">No comparison results yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select 2–8 scenarios and a persona, then click "Run Comparison".
              </p>
            </div>
          )}

          {/* Charts row */}
          {comparisonResult && !loading && displayItems.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-base font-semibold text-gray-800">Income Replacement Ratio</h3>
                  <ComparisonIncomeReplacementChart
                    scenarios={displayItems}
                    confidenceLevel={confidenceLevel}
                  />
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-base font-semibold text-gray-800">Balance Accumulation Trajectories</h3>
                  <ComparisonTrajectoryChart
                    scenarios={displayItems}
                    confidenceLevel={confidenceLevel}
                    retirementAge={comparisonResult.retirement_age}
                  />
                </div>
              </div>

              {/* Metrics table */}
              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-gray-800">Metrics Comparison</h3>
                <ComparisonMetricsTable
                  scenarios={displayItems}
                  confidenceLevel={confidenceLevel}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Saved comparisons — full width */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-800">Saved Comparisons</h3>
        <SavedComparisonsList
          workspaceId={activeWorkspace.id}
          onLoad={handleLoadComparison}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  )
}
