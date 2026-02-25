import type { PersonaSimulationResult, ConfidenceLevel, PercentileValues } from '../types/simulation'
import { CONFIDENCE_PERCENTILE_MAP } from '../types/simulation'
import { formatCurrency, formatPercent } from '../utils/formatters'

interface ResultsSummaryTableProps {
  personas: PersonaSimulationResult[]
  confidenceLevel: ConfidenceLevel
}

function getPercentileValue(pv: PercentileValues | null, field: keyof PercentileValues): number | null {
  if (!pv) return null
  return pv[field]
}

export default function ResultsSummaryTable({ personas, confidenceLevel }: ResultsSummaryTableProps) {
  const pField = CONFIDENCE_PERCENTILE_MAP[confidenceLevel]
  const sorted = [...personas].sort((a, b) => a.persona_name.localeCompare(b.persona_name))

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Persona</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Projected Balance</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Annual Income</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Replacement Ratio</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Success Prob.</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Employer Contributions</th>
            <th className="px-4 py-3 text-right font-medium text-gray-600">Employee Contributions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((p) => {
            const balance = getPercentileValue(p.retirement_balance, pField)
            const income = getPercentileValue(p.total_retirement_income, pField)
            const irr = getPercentileValue(p.income_replacement_ratio, pField)

            return (
              <tr key={p.persona_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{p.persona_name}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {balance !== null ? formatCurrency(balance) : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {income !== null ? formatCurrency(income) : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {irr !== null ? formatPercent(irr, 1) : 'N/A'}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {formatPercent(p.probability_of_success, 0)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {formatCurrency(p.total_employer_contributions)}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {formatCurrency(p.total_employee_contributions)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
