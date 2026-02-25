import type { AssetAllocation } from '../types/persona'
import AllocationDonutChart from './AllocationDonutChart'

interface AllocationEditorProps {
  allocation: AssetAllocation
  onChange: (allocation: AssetAllocation) => void
  errors: string[]
}

const VINTAGE_YEARS = Array.from({ length: 10 }, (_, i) => 2025 + i * 5) // 2025, 2030, ... 2070

export default function AllocationEditor({ allocation, onChange, errors }: AllocationEditorProps) {
  const isCustom = allocation.type === 'custom'

  const switchToTargetDate = () => {
    onChange({ type: 'target_date', target_date_vintage: 2060 })
  }

  const switchToCustom = () => {
    onChange({ type: 'custom', stock_pct: 0.6, bond_pct: 0.3, cash_pct: 0.1 })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <label className="block text-xs font-medium text-gray-600">Asset Allocation</label>

      {/* Mode toggle */}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={switchToTargetDate}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            !isCustom
              ? 'bg-brand-500 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Target-Date Fund
        </button>
        <button
          type="button"
          onClick={switchToCustom}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            isCustom
              ? 'bg-brand-500 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Target-Date mode */}
      {!isCustom && allocation.type === 'target_date' && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600">Vintage Year</label>
          <select
            value={allocation.target_date_vintage}
            onChange={(e) =>
              onChange({ type: 'target_date', target_date_vintage: parseInt(e.target.value) })
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {VINTAGE_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Custom mode */}
      {isCustom && allocation.type === 'custom' && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-blue-600">Stock %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(allocation.stock_pct * 100)}
                onChange={(e) =>
                  onChange({
                    ...allocation,
                    stock_pct: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-green-600">Bond %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(allocation.bond_pct * 100)}
                onChange={(e) =>
                  onChange({
                    ...allocation,
                    bond_pct: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-600">Cash %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(allocation.cash_pct * 100)}
                onChange={(e) =>
                  onChange({
                    ...allocation,
                    cash_pct: (parseFloat(e.target.value) || 0) / 100,
                  })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {errors.length > 0 && (
            <p className="text-xs text-red-600">{errors[0]}</p>
          )}

          <AllocationDonutChart
            stockPct={allocation.stock_pct}
            bondPct={allocation.bond_pct}
            cashPct={allocation.cash_pct}
          />
        </div>
      )}
    </div>
  )
}
