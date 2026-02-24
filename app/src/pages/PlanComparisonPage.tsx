import { GitCompare } from 'lucide-react'

export default function PlanComparisonPage() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <GitCompare className="h-6 w-6 text-brand-500" />
        <h2 className="text-lg font-semibold text-gray-800">Plan Comparison</h2>
      </div>
      <p className="mt-3 text-sm text-gray-500">
        Compare retirement plan designs side by side. Analyze contribution
        structures, vesting schedules, and projected outcomes across scenarios.
      </p>
    </div>
  )
}
