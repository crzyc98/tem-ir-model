import { PieChart, Pie, Cell, Legend } from 'recharts'

interface AllocationDonutChartProps {
  stockPct: number
  bondPct: number
  cashPct: number
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b'] // blue-500, green-500, amber-500

export default function AllocationDonutChart({ stockPct, bondPct, cashPct }: AllocationDonutChartProps) {
  const data = [
    { name: `Stock ${Math.round(stockPct * 100)}%`, value: stockPct || 0.001 },
    { name: `Bond ${Math.round(bondPct * 100)}%`, value: bondPct || 0.001 },
    { name: `Cash ${Math.round(cashPct * 100)}%`, value: cashPct || 0.001 },
  ]

  return (
    <div className="flex justify-center">
      <PieChart width={160} height={160}>
        <Pie
          data={data}
          cx={75}
          cy={70}
          innerRadius={35}
          outerRadius={55}
          dataKey="value"
          strokeWidth={1}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index]} />
          ))}
        </Pie>
        <Legend
          verticalAlign="bottom"
          height={20}
          iconSize={8}
          wrapperStyle={{ fontSize: '10px' }}
        />
      </PieChart>
    </div>
  )
}
