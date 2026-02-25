import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { PersonaSimulationResult, ConfidenceLevel } from '../types/simulation'
import { formatCompactCurrency } from '../utils/formatters'
import { SCENARIO_COLORS } from '../utils/chart-colors'

interface TrajectoryChartProps {
  personas: PersonaSimulationResult[]
  confidenceLevel: ConfidenceLevel
  retirementAge: number
}

interface ConfidenceConfig {
  line: 'p10' | 'p25' | 'p50'
  bandLower: 'p10' | 'p25' | null
  bandUpper: 'p50' | 'p75' | null
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, ConfidenceConfig> = {
  '50': { line: 'p50', bandLower: 'p25', bandUpper: 'p75' },
  '75': { line: 'p25', bandLower: 'p10', bandUpper: 'p50' },
  '90': { line: 'p10', bandLower: null, bandUpper: null },
}

export default function TrajectoryChart({ personas, confidenceLevel, retirementAge }: TrajectoryChartProps) {
  const config = CONFIDENCE_CONFIG[confidenceLevel]
  const hasBands = config.bandLower !== null && config.bandUpper !== null

  // Build unified dataset indexed by age
  const ageMap = new Map<number, Record<string, number>>()

  personas.forEach((persona, idx) => {
    persona.trajectory.forEach((snap) => {
      if (!ageMap.has(snap.age)) {
        ageMap.set(snap.age, { age: snap.age })
      }
      const row = ageMap.get(snap.age)!
      row[`p${idx}_line`] = snap[config.line]
      if (hasBands) {
        row[`p${idx}_upper`] = snap[config.bandUpper!]
        row[`p${idx}_lower`] = snap[config.bandLower!]
      }
    })
  })

  const data = Array.from(ageMap.values()).sort((a, b) => a.age - b.age)

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: number }) => {
    if (!active || !payload || !label) return null

    const lineEntries = payload.filter((p) => p.name?.endsWith('_line'))
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-md">
        <p className="mb-1 text-xs font-medium text-gray-600">Age {label}</p>
        {lineEntries.map((entry) => {
          const match = entry.name.match(/^p(\d+)_line$/)
          if (!match) return null
          const idx = parseInt(match[1])
          const persona = personas[idx]
          return (
            <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
              {persona?.persona_name}: {formatCompactCurrency(entry.value)}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="age"
          tick={{ fontSize: 12 }}
          label={{ value: 'Age', position: 'insideBottom', offset: -10, fontSize: 12 }}
        />
        <YAxis
          tickFormatter={formatCompactCurrency}
          tick={{ fontSize: 12 }}
          width={90}
          label={{ value: "Today's $", angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#6b7280' }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: string) => {
            const match = value.match(/^p(\d+)_line$/)
            if (match) {
              const idx = parseInt(match[1])
              return personas[idx]?.persona_name || value
            }
            return value
          }}
          wrapperStyle={{ fontSize: '12px' }}
        />
        <ReferenceLine
          x={retirementAge}
          stroke="#6b7280"
          strokeDasharray="3 3"
          label={{ value: 'Retirement', position: 'top', fill: '#6b7280', fontSize: 11 }}
        />
        {/* Render bands: upper area with color fill, then lower area with white fill to cut out */}
        {hasBands && personas.map((_, idx) => {
          const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length]
          return (
            <Area
              key={`upper_${idx}`}
              dataKey={`p${idx}_upper`}
              fill={color}
              fillOpacity={0.12}
              stroke="none"
              legendType="none"
              isAnimationActive={false}
            />
          )
        })}
        {hasBands && personas.map((_, idx) => (
          <Area
            key={`lower_${idx}`}
            dataKey={`p${idx}_lower`}
            fill="#ffffff"
            fillOpacity={1}
            stroke="none"
            legendType="none"
            isAnimationActive={false}
          />
        ))}
        {/* Render lines on top */}
        {personas.map((_, idx) => {
          const color = SCENARIO_COLORS[idx % SCENARIO_COLORS.length]
          return (
            <Line
              key={`line_${idx}`}
              dataKey={`p${idx}_line`}
              stroke={color}
              strokeWidth={2}
              dot={false}
              name={`p${idx}_line`}
              isAnimationActive={false}
            />
          )
        })}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
