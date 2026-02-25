import { useState, useEffect } from 'react'
import { Trash2, FolderOpen } from 'lucide-react'
import type { PlanComparison } from '../types/comparison'
import { listComparisons, deleteComparison } from '../services/api'
import ConfirmDialog from './ConfirmDialog'

interface SavedComparisonsListProps {
  workspaceId: string
  onLoad: (comparison: PlanComparison) => void
  refreshKey: number
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function SavedComparisonsList({
  workspaceId,
  onLoad,
  refreshKey,
}: SavedComparisonsListProps) {
  const [comparisons, setComparisons] = useState<PlanComparison[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PlanComparison | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    listComparisons(workspaceId)
      .then(setComparisons)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [workspaceId, refreshKey])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteComparison(workspaceId, deleteTarget.id)
      setComparisons((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to delete comparison:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        Loading saved comparisons…
      </div>
    )
  }

  if (comparisons.length === 0) {
    return (
      <p className="py-4 text-sm text-gray-400">No saved comparisons yet. Run a comparison to save it.</p>
    )
  }

  return (
    <>
      <div className="divide-y divide-gray-100">
        {comparisons.map((comparison) => (
          <div key={comparison.id} className="flex items-center justify-between py-3 gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{comparison.persona_name}</p>
              <p className="text-xs text-gray-500 truncate">
                {comparison.results.map((r) => r.scenario_name).join(', ')}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {formatRelativeTime(comparison.created_at)}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => onLoad(comparison)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Load
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(comparison)}
                className="rounded-lg border border-red-200 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Comparison"
        message={`Delete the comparison for "${deleteTarget?.persona_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleting}
      />
    </>
  )
}
