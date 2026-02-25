import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { ComparisonScenarioDisplay } from '../types/comparison'
import type { ConfidenceLevel, PercentileValues } from '../types/simulation'
import { CONFIDENCE_PERCENTILE_MAP } from '../types/simulation'

interface ComparisonIncomeReplacementChartProps {
  scenarios: ComparisonScenarioDisplay[]
  confidenceLevel: ConfidenceLevel
}

export default function ComparisonIncomeReplacementChart({
  scenarios,
  confidenceLevel,
}: ComparisonIncomeReplacementChartProps) {
  const pField = CONFIDENCE_PERCENTILE_MAP[confidenceLevel]

  const data = scenarios
    .filter((s) => s.result.persona_result.income_replacement_ratio !== null)
    .map((s) => ({
      name: s.scenarioName,
      ratio: (s.result.persona_result.income_replacement_ratio as PercentileValues)[pField],
      color: s.color,
    }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={data.length > 3 ? -20 : 0}
          textAnchor={data.length > 3 ? 'end' : 'middle'}
          height={data.length > 3 ? 50 : 30}
        />
        <YAxis
          domain={[0, 1.2]}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Replacement Ratio']}
        />
        <ReferenceLine
          y={0.70}
          stroke="#ef4444"
          strokeDasharray="3 3"
          label={{ value: '70%', position: 'right', fill: '#ef4444', fontSize: 12 }}
        />
        <ReferenceLine
          y={0.80}
          stroke="#22c55e"
          strokeDasharray="3 3"
          label={{ value: '80%', position: 'right', fill: '#22c55e', fontSize: 12 }}
        />
        <Bar dataKey="ratio" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
