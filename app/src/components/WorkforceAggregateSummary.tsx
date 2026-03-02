import type { WorkforceScenarioResult } from '../types/workforce_analysis'
import { formatCurrency, formatPercent } from '../utils/formatters'

interface WorkforceAggregateSummaryProps {
  results: WorkforceScenarioResult[]
  scenarioColors: string[]
}

export default function WorkforceAggregateSummary({
  results,
  scenarioColors,
}: WorkforceAggregateSummaryProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
        {results.map((result, idx) => {
          const color = scenarioColors[idx] ?? '#6b7280'
          const { aggregate } = result
          const fullName = result.scenario_name
          const displayName = fullName.length > 24 ? fullName.slice(0, 24) + '…' : fullName
          return (
            <div
              key={result.scenario_id}
              className="w-52 shrink-0 rounded-xl border border-gray-100 bg-white shadow-sm"
              style={{ borderTop: `4px solid ${color}` }}
            >
              <div className="p-4">
                <p
                  className="truncate text-sm font-semibold"
                  title={fullName}
                  style={{ color }}
                >
                  {displayName}
                </p>
                <dl className="mt-3 space-y-2">
                  <div>
                    <dt className="text-xs text-gray-400">On Track</dt>
                    <dd className="text-base font-bold text-gray-800">
                      {(aggregate.pct_on_track * 100).toFixed(0)}%
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Median IR</dt>
                    <dd className="text-base font-bold text-gray-800">
                      {aggregate.median_ir != null
                        ? formatPercent(aggregate.median_ir)
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Avg Employer Cost</dt>
                    <dd className="text-base font-bold text-gray-800">
                      {formatCurrency(aggregate.avg_employer_cost_annual)}/yr
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
