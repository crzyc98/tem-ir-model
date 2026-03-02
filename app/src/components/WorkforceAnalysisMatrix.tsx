import type { WorkforceScenarioResult, AnalysisMetric, PersonaEmployerCost } from '../types/workforce_analysis'
import type { PersonaSimulationResult, ConfidenceLevel, PercentileValues } from '../types/simulation'
import { CONFIDENCE_PERCENTILE_MAP } from '../types/simulation'
import { formatCurrency, formatPercent } from '../utils/formatters'

interface WorkforceAnalysisMatrixProps {
  results: WorkforceScenarioResult[]
  metric: AnalysisMetric
  confidenceLevel: ConfidenceLevel
  scenarioColors: string[]
}

function getCellValue(
  personaResult: PersonaSimulationResult,
  employerCost: PersonaEmployerCost,
  metric: AnalysisMetric,
  percentileKey: keyof PercentileValues,
): number | null {
  switch (metric) {
    case 'income_replacement_ratio':
      return personaResult.income_replacement_ratio?.[percentileKey] ?? null
    case 'probability_of_success':
      return personaResult.probability_of_success
    case 'retirement_balance':
      return personaResult.retirement_balance[percentileKey]
    case 'employer_cost_annual':
      return employerCost.employer_cost_annual
  }
}

function formatCellValue(value: number | null, metric: AnalysisMetric): string {
  if (value === null) return '—'
  switch (metric) {
    case 'income_replacement_ratio':
    case 'probability_of_success':
      return formatPercent(value)
    case 'retirement_balance':
    case 'employer_cost_annual':
      return formatCurrency(value)
  }
}

function getCellColorClass(value: number | null, metric: AnalysisMetric): string {
  if (value === null) return 'bg-gray-50'
  switch (metric) {
    case 'income_replacement_ratio':
    case 'probability_of_success':
      if (value >= 0.80) return 'bg-green-100'
      if (value >= 0.60) return 'bg-yellow-100'
      return 'bg-red-100'
    case 'retirement_balance':
      if (value >= 500_000) return 'bg-green-100'
      if (value >= 200_000) return 'bg-yellow-100'
      return 'bg-red-100'
    case 'employer_cost_annual':
      return 'bg-gray-50'
  }
}

// Persona names are consistent across all scenarios; use the first scenario's results.
function getPersonaRows(results: WorkforceScenarioResult[]) {
  if (results.length === 0) return []
  return results[0].persona_results.map((pr) => ({
    personaId: pr.persona_id,
    personaName: pr.persona_name,
  }))
}

export default function WorkforceAnalysisMatrix({
  results,
  metric,
  confidenceLevel,
  scenarioColors,
}: WorkforceAnalysisMatrixProps) {
  const percentileKey = CONFIDENCE_PERCENTILE_MAP[confidenceLevel]
  const personas = getPersonaRows(results)

  if (personas.length === 0 || results.length === 0) return null

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {/* Persona column header */}
            <th className="sticky left-0 z-10 w-40 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              Persona
            </th>
            {results.map((result, idx) => {
              const fullName = result.scenario_name
              const displayName =
                fullName.length > 22 ? fullName.slice(0, 22) + '…' : fullName
              return (
                <th
                  key={result.scenario_id}
                  title={fullName}
                  className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                  style={{ color: scenarioColors[idx] ?? '#6b7280' }}
                >
                  {displayName}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {personas.map(({ personaId, personaName }) => (
            <tr key={personaId} className="hover:bg-gray-50/50">
              {/* Persona name (sticky) */}
              <td className="sticky left-0 z-10 w-40 bg-white px-4 py-3 font-medium text-gray-800">
                {personaName}
              </td>
              {results.map((result, idx) => {
                const personaResult = result.persona_results.find(
                  (pr) => pr.persona_id === personaId,
                )
                const costRecord = result.employer_costs.find(
                  (ec) => ec.persona_id === personaId,
                )
                if (!personaResult || !costRecord) {
                  return (
                    <td
                      key={result.scenario_id}
                      className="px-4 py-3 text-center text-gray-400"
                    >
                      —
                    </td>
                  )
                }
                const value = getCellValue(personaResult, costRecord, metric, percentileKey)
                const colorClass = getCellColorClass(value, metric)
                return (
                  <td
                    key={result.scenario_id}
                    className={`px-4 py-3 text-center font-medium ${colorClass}`}
                    style={{ borderLeft: `2px solid ${scenarioColors[idx] ?? '#e5e7eb'}` }}
                  >
                    {formatCellValue(value, metric)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
