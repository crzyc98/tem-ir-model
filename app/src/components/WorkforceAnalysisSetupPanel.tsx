import { Play, Loader2 } from 'lucide-react'
import type { ScenarioSummary } from '../types/scenario'
import { SCENARIO_COLORS } from '../utils/chart-colors'

interface WorkforceAnalysisSetupPanelProps {
  scenarios: ScenarioSummary[]
  selectedScenarioIds: string[]
  onSelectionChange: (ids: string[]) => void
  visiblePersonaCount: number
  onRun: () => void
  loading: boolean
}

export default function WorkforceAnalysisSetupPanel({
  scenarios,
  selectedScenarioIds,
  onSelectionChange,
  visiblePersonaCount,
  onRun,
  loading,
}: WorkforceAnalysisSetupPanelProps) {
  const canRun = selectedScenarioIds.length >= 2 && visiblePersonaCount > 0 && !loading

  function handleToggle(id: string) {
    if (selectedScenarioIds.includes(id)) {
      onSelectionChange(selectedScenarioIds.filter((s) => s !== id))
    } else if (selectedScenarioIds.length < 8) {
      onSelectionChange([...selectedScenarioIds, id])
    }
  }

  return (
    <div className="w-80 shrink-0 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-800">Setup</h3>

      {/* Scenario selection */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">Scenarios</p>
          <span className="text-xs text-gray-400">{selectedScenarioIds.length}/8 selected</span>
        </div>
        <div className="mt-2 space-y-2">
          {scenarios.length === 0 ? (
            <p className="text-xs text-gray-400">No scenarios available</p>
          ) : (
            scenarios.map((scenario, idx) => {
              const isChecked = selectedScenarioIds.includes(scenario.id)
              const colorIdx = selectedScenarioIds.indexOf(scenario.id)
              const isDisabled = !isChecked && selectedScenarioIds.length >= 8
              return (
                <label
                  key={scenario.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isChecked
                      ? 'border-blue-200 bg-blue-50'
                      : isDisabled
                        ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => handleToggle(scenario.id)}
                    className="sr-only"
                  />
                  <span
                    className="inline-block h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: isChecked
                        ? SCENARIO_COLORS[colorIdx % SCENARIO_COLORS.length]
                        : SCENARIO_COLORS[idx % SCENARIO_COLORS.length],
                      opacity: isChecked ? 1 : 0.3,
                    }}
                  />
                  <span className={`flex-1 truncate ${isChecked ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                    {scenario.name}
                  </span>
                  {isChecked && <span className="text-xs text-blue-500">✓</span>}
                </label>
              )
            })
          )}
        </div>
      </div>

      {/* Persona info */}
      <p className="mt-4 text-xs text-gray-400">
        Analyzes {visiblePersonaCount} visible persona{visiblePersonaCount !== 1 ? 's' : ''}
      </p>

      {/* Run button */}
      <button
        type="button"
        onClick={onRun}
        disabled={!canRun}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Running…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run Analysis
          </>
        )}
      </button>

      {selectedScenarioIds.length < 2 && visiblePersonaCount > 0 && (
        <p className="mt-2 text-center text-xs text-gray-400">Select at least 2 scenarios</p>
      )}
    </div>
  )
}
