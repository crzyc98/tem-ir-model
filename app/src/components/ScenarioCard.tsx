import { Copy, Trash2, BarChart3 } from 'lucide-react'
import type { ScenarioSummary } from '../types/scenario'

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

interface PlanDesignSummary {
  matchFormula: string
  autoEnrollRate: string
  coreContribution: string
}

interface ScenarioCardProps {
  scenario: ScenarioSummary
  planDesignSummary: PlanDesignSummary | null
  onClick: () => void
  onDuplicate: () => void
  onDelete: () => void
  onViewResults: () => void
  isDuplicating?: boolean
}

export default function ScenarioCard({
  scenario,
  planDesignSummary,
  onClick,
  onDuplicate,
  onDelete,
  onViewResults,
  isDuplicating = false,
}: ScenarioCardProps) {
  return (
    <div
      className="relative cursor-pointer rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <h3 className="text-lg font-semibold text-gray-800">{scenario.name}</h3>
      {scenario.description && (
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{scenario.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {planDesignSummary ? (
          <>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {planDesignSummary.matchFormula}
            </span>
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              {planDesignSummary.autoEnrollRate}
            </span>
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
              {planDesignSummary.coreContribution}
            </span>
          </>
        ) : (
          <>
            <span className="inline-block h-5 w-24 animate-pulse rounded-full bg-gray-200" />
            <span className="inline-block h-5 w-20 animate-pulse rounded-full bg-gray-200" />
            <span className="inline-block h-5 w-16 animate-pulse rounded-full bg-gray-200" />
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {formatRelativeTime(scenario.updated_at)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded p-1 text-gray-400 hover:bg-brand-50 hover:text-brand-500"
            onClick={(e) => {
              e.stopPropagation()
              onViewResults()
            }}
            aria-label="View results"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-500 disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
            disabled={isDuplicating}
            aria-label="Duplicate scenario"
          >
            {isDuplicating ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            aria-label="Delete scenario"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
