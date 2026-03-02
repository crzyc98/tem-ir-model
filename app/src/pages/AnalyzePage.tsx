import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BarChart3, AlertTriangle } from 'lucide-react'
import type { LayoutContext } from '../types/workspace'
import type { Workspace } from '../types/workspace'
import type { ScenarioSummary } from '../types/scenario'
import type { ConfidenceLevel } from '../types/simulation'
import type { WorkforceAnalyzeResponse, AnalysisMetric } from '../types/workforce_analysis'
import { ANALYSIS_METRIC_LABELS } from '../types/workforce_analysis'
import { getWorkspace, listScenarios, runWorkforceAnalysis } from '../services/api'
import { SCENARIO_COLORS } from '../utils/chart-colors'
import WorkforceAnalysisSetupPanel from '../components/WorkforceAnalysisSetupPanel'
import WorkforceAnalysisMatrix from '../components/WorkforceAnalysisMatrix'
import WorkforceAggregateSummary from '../components/WorkforceAggregateSummary'
import ConfidenceLevelToggle from '../components/ConfidenceLevelToggle'

const METRIC_OPTIONS: AnalysisMetric[] = [
  'income_replacement_ratio',
  'probability_of_success',
  'retirement_balance',
  'employer_cost_annual',
]

export default function AnalyzePage() {
  const { activeWorkspace } = useOutletContext<LayoutContext>()

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioSummary[]>([])
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([])
  const [analysisResult, setAnalysisResult] = useState<WorkforceAnalyzeResponse | null>(null)
  const [metric, setMetric] = useState<AnalysisMetric>('income_replacement_ratio')
  const [confidenceLevel, setConfidenceLevel] = useState<ConfidenceLevel>('75')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!activeWorkspace) return
    try {
      const [ws, scenarioList] = await Promise.all([
        getWorkspace(activeWorkspace.id),
        listScenarios(activeWorkspace.id),
      ])
      setWorkspace(ws)
      setScenarios(scenarioList)
      // Reset analysis when workspace changes
      setAnalysisResult(null)
      setSelectedScenarioIds([])
    } catch (err) {
      console.error('Failed to load workspace data:', err)
    }
  }, [activeWorkspace])

  useEffect(() => {
    loadData()
  }, [loadData])

  const visiblePersonaCount = workspace?.personas.filter((p) => !p.hidden).length ?? 0
  const scenarioColors = selectedScenarioIds.map((_, i) => SCENARIO_COLORS[i % SCENARIO_COLORS.length])

  async function handleRun() {
    if (!activeWorkspace || selectedScenarioIds.length < 2 || loading) return
    let cancelled = false
    setLoading(true)
    setError(null)
    try {
      const result = await runWorkforceAnalysis(activeWorkspace.id, {
        scenario_ids: selectedScenarioIds,
      })
      if (!cancelled) {
        setAnalysisResult(result)
      }
    } catch (err) {
      if (!cancelled) {
        setError((err as Error).message)
      }
    } finally {
      if (!cancelled) {
        setLoading(false)
      }
    }
    return () => {
      cancelled = true
    }
  }

  if (!activeWorkspace) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <p className="text-sm text-gray-500">Select a workspace to use Analyze.</p>
      </div>
    )
  }

  // Edge case: fewer than 2 scenarios in workspace
  const tooFewScenarios = scenarios.length < 2

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-brand-500" />
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Analyze</h2>
            <p className="text-sm text-gray-500">
              Compare all personas across selected scenarios to evaluate retirement outcomes
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={handleRun}
            className="text-sm font-medium text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Edge state: too few scenarios */}
      {tooFewScenarios && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            This workspace needs at least 2 scenarios to use Analyze. Create scenarios in the{' '}
            <a href="/scenarios" className="font-medium underline">
              Scenarios
            </a>{' '}
            section.
          </p>
        </div>
      )}

      {/* Edge state: no visible personas */}
      {!tooFewScenarios && visiblePersonaCount === 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-700">
            No visible personas available. Unhide at least one persona in{' '}
            <a href="/personas" className="font-medium underline">
              Persona Modeling
            </a>{' '}
            to use Analyze.
          </p>
        </div>
      )}

      {/* Main layout */}
      {!tooFewScenarios && (
        <div className="flex gap-4">
          {/* Setup panel */}
          <WorkforceAnalysisSetupPanel
            scenarios={scenarios}
            selectedScenarioIds={selectedScenarioIds}
            onSelectionChange={setSelectedScenarioIds}
            visiblePersonaCount={visiblePersonaCount}
            onRun={handleRun}
            loading={loading}
          />

          {/* Results area */}
          <div className="flex-1 space-y-4">
            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                <span className="text-sm text-gray-500">Running analysis…</span>
              </div>
            )}

            {/* Empty state */}
            {!loading && !analysisResult && (
              <div className="rounded-xl border border-gray-100 bg-white p-12 text-center shadow-sm">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-base font-medium text-gray-700">No results yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select 2–8 scenarios and click Run Analysis to compare retirement outcomes
                  across all visible personas.
                </p>
              </div>
            )}

            {/* Results */}
            {!loading && analysisResult && (
              <>
                {/* Controls bar */}
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
                  {/* Metric selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Metric</span>
                    <div className="inline-flex rounded-lg border border-gray-300">
                      {METRIC_OPTIONS.map((m, idx) => {
                        const isSelected = m === metric
                        const isFirst = idx === 0
                        const isLast = idx === METRIC_OPTIONS.length - 1
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMetric(m)}
                            className={`px-3 py-2 text-xs font-medium transition-colors ${
                              isFirst ? 'rounded-l-lg' : ''
                            } ${isLast ? 'rounded-r-lg' : ''} ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-50'
                            } ${!isFirst ? 'border-l border-gray-300' : ''}`}
                          >
                            {ANALYSIS_METRIC_LABELS[m]}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Confidence level toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Confidence Level</span>
                    <ConfidenceLevelToggle value={confidenceLevel} onChange={setConfidenceLevel} />
                  </div>
                </div>

                {/* Aggregate summary */}
                <WorkforceAggregateSummary
                  results={analysisResult.results}
                  scenarioColors={scenarioColors}
                />

                {/* Matrix */}
                <WorkforceAnalysisMatrix
                  results={analysisResult.results}
                  metric={metric}
                  confidenceLevel={confidenceLevel}
                  scenarioColors={scenarioColors}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
