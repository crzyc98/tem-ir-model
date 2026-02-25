import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { PersonaSimulationResult, ConfidenceLevel, PercentileValues } from '../types/simulation'
import { CONFIDENCE_PERCENTILE_MAP } from '../types/simulation'

interface IncomeReplacementChartProps {
  personas: PersonaSimulationResult[]
  confidenceLevel: ConfidenceLevel
}

function getBarColor(ratio: number): string {
  if (ratio >= 0.80) return '#22c55e'
  if (ratio >= 0.70) return '#eab308'
  return '#ef4444'
}

// Renders a short horizontal dash at the target ratio position for each persona
const TargetDash = (props: { cx?: number; cy?: number }) => {
  const { cx, cy } = props
  if (typeof cx !== 'number' || typeof cy !== 'number') return null
  return (
    <line
      x1={cx - 14}
      x2={cx + 14}
      y1={cy}
      y2={cy}
      stroke="#1e3a5f"
      strokeWidth={2.5}
      strokeLinecap="round"
    />
  )
}

export default function IncomeReplacementChart({ personas, confidenceLevel }: IncomeReplacementChartProps) {
  const pField = CONFIDENCE_PERCENTILE_MAP[confidenceLevel]

  const data = personas
    .filter((p) => p.income_replacement_ratio !== null)
    .map((p) => ({
      name: p.persona_name,
      ratio: (p.income_replacement_ratio as PercentileValues)[pField],
      target: p.target_replacement_ratio ?? 0.70,
    }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={data.length > 6 ? -30 : 0}
          textAnchor={data.length > 6 ? 'end' : 'middle'}
          height={data.length > 6 ? 60 : 30}
        />
        <YAxis
          domain={[0, 1.2]}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            `${(value * 100).toFixed(1)}%`,
            name === 'target' ? 'Target Ratio' : 'Replacement Ratio',
          ]}
        />
        <Bar dataKey="ratio" name="ratio" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.ratio)} />
          ))}
        </Bar>
        {/* Per-persona target marker rendered as a horizontal dash */}
        <Line
          dataKey="target"
          name="target"
          stroke="none"
          dot={<TargetDash />}
          activeDot={false}
          legendType="none"
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
