import type { ComparisonScenarioDisplay } from '../types/comparison'
import type { ConfidenceLevel, PercentileValues } from '../types/simulation'
import { CONFIDENCE_PERCENTILE_MAP } from '../types/simulation'
import { formatCurrency, formatPercent } from '../utils/formatters'

interface ComparisonMetricsTableProps {
  scenarios: ComparisonScenarioDisplay[]
  confidenceLevel: ConfidenceLevel
}

function pVal(pv: PercentileValues | null, field: keyof PercentileValues): number | null {
  if (!pv) return null
  return pv[field]
}

function fmtCurrency(v: number | null): string {
  return v !== null ? formatCurrency(v) : 'N/A'
}

function fmtPct(v: number | null, decimals = 1): string {
  return v !== null ? formatPercent(v, decimals) : 'N/A'
}

function DeltaCell({ base, value, format }: { base: number | null; value: number | null; format: 'currency' | 'percent' | 'none' }) {
  if (base === null || value === null) return <td className="px-3 py-2.5 text-right text-xs text-gray-400">—</td>
  const delta = value - base
  const isPositive = delta > 0
  const isZero = Math.abs(delta) < 0.001

  let display: string
  if (format === 'currency') {
    display = `${isPositive ? '+' : ''}${formatCurrency(delta)}`
  } else if (format === 'percent') {
    display = `${isPositive ? '+' : ''}${formatPercent(delta)}`
  } else {
    display = `${isPositive ? '+' : ''}${delta.toFixed(4)}`
  }

  return (
    <td
      className={`px-3 py-2.5 text-right text-xs font-medium ${
        isZero ? 'text-gray-400' : isPositive ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {isZero ? '—' : display}
    </td>
  )
}

export default function ComparisonMetricsTable({
  scenarios,
  confidenceLevel,
}: ComparisonMetricsTableProps) {
  const pField = CONFIDENCE_PERCENTILE_MAP[confidenceLevel]
  const baseline = scenarios[0]
  const comparisons = scenarios.slice(1)

  function getValues(s: ComparisonScenarioDisplay) {
    const pr = s.result.persona_result
    return {
      irRatio: pVal(pr.income_replacement_ratio, pField),
      balance: pVal(pr.retirement_balance, pField),
      annualIncome: pVal(pr.total_retirement_income, pField),
      successProb: pr.probability_of_success,
      ssBenefit: pr.ss_annual_benefit,
      ssIr: pr.projected_salary_at_retirement > 0 ? pr.ss_annual_benefit / pr.projected_salary_at_retirement : null,
      employeeContrib: pr.total_employee_contributions,
      employerCostAnnual: s.result.employer_cost_annual,
      employerCostCumulative: s.result.employer_cost_cumulative,
      deferralFor80: s.result.deferral_rate_for_80pct_ir,
    }
  }

  type RowDef = {
    label: string
    getValue: (s: ComparisonScenarioDisplay) => number | null
    format: 'currency' | 'percent' | 'none'
    renderCell: (v: number | null) => string
    renderScenario?: (s: ComparisonScenarioDisplay) => string
    noDelta?: boolean
  }

  const rows: RowDef[] = [
    {
      label: 'Total IR',
      getValue: (s) => getValues(s).irRatio,
      format: 'percent',
      renderCell: (v) => fmtPct(v),
    },
    {
      label: "Retirement Balance (today's $)",
      getValue: (s) => getValues(s).balance,
      format: 'currency',
      renderCell: (v) => fmtCurrency(v),
    },
    {
      label: "Annual Income in Retirement (today's $)",
      getValue: (s) => getValues(s).annualIncome,
      format: 'currency',
      renderCell: (v) => fmtCurrency(v),
    },
    {
      label: "Pre-Retirement Salary (today's $)",
      getValue: (s) => s.result.persona_result.projected_salary_at_retirement,
      format: 'currency',
      renderCell: (v) => fmtCurrency(v),
      noDelta: true,
    },
    {
      label: 'Success Probability',
      getValue: (s) => getValues(s).successProb,
      format: 'percent',
      renderCell: (v) => fmtPct(v, 0),
    },
    {
      label: 'PoS Assessment',
      getValue: (_s) => null,
      format: 'none',
      renderCell: (_v) => '',
      renderScenario: (s) => s.result.persona_result.pos_assessment ?? 'N/A',
      noDelta: true,
    },
    {
      label: "SS Annual Benefit (today's $)",
      getValue: (s) => getValues(s).ssBenefit,
      format: 'currency',
      renderCell: (v) => fmtCurrency(v),
      noDelta: true,
    },
    {
      label: 'SS IR',
      getValue: (s) => getValues(s).ssIr,
      format: 'percent',
      renderCell: (v) => fmtPct(v),
      noDelta: true,
    },
    {
      label: "Employee Contributions (today's $)",
      getValue: (s) => getValues(s).employeeContrib,
      format: 'currency',
      renderCell: (v) => fmtCurrency(v),
    },
    {
      label: "Employer Cost (Annual, today's $)",
      getValue: (s) => getValues(s).employerCostAnnual,
      format: 'currency',
      renderCell: (v) => fmtCurrency(v),
    },
    {
      label: "Employer Cost (Cumulative, today's $)",
      getValue: (s) => getValues(s).employerCostCumulative,
      format: 'currency',
      renderCell: (v) => fmtCurrency(v),
    },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left font-medium text-gray-600 w-48">Metric</th>
            {/* Baseline column */}
            <th className="px-3 py-3 text-right font-medium text-gray-800">
              <div className="flex items-center justify-end gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: baseline.color }}
                />
                {baseline.scenarioName}
              </div>
            </th>
            {/* Comparison columns */}
            {comparisons.map((s) => (
              <>
                <th key={`val_${s.scenarioId}`} className="px-3 py-3 text-right font-medium text-gray-800">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.scenarioName}
                  </div>
                </th>
                <th key={`delta_${s.scenarioId}`} className="px-3 py-3 text-right font-medium text-gray-500 text-xs">
                  vs. {baseline.scenarioName}
                </th>
              </>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const baseVal = row.getValue(baseline)
            return (
              <tr key={row.label} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium text-gray-700">{row.label}</td>
                <td className="px-3 py-2.5 text-right text-gray-800">
                  {row.renderScenario ? row.renderScenario(baseline) : row.renderCell(baseVal)}
                </td>
                {comparisons.map((s) => {
                  const val = row.getValue(s)
                  return (
                    <>
                      <td key={`val_${s.scenarioId}`} className="px-3 py-2.5 text-right text-gray-800">
                        {row.renderScenario ? row.renderScenario(s) : row.renderCell(val)}
                      </td>
                      {row.noDelta ? (
                        <td key={`delta_${s.scenarioId}`} className="px-3 py-2.5 text-right text-xs text-gray-400">—</td>
                      ) : (
                        <DeltaCell
                          key={`delta_${s.scenarioId}`}
                          base={baseVal}
                          value={val}
                          format={row.format}
                        />
                      )}
                    </>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
