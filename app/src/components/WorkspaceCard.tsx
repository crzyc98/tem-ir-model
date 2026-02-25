import { FolderOpen, Trash2 } from 'lucide-react'
import type { WorkspaceSummary } from '../types/workspace'

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

interface WorkspaceCardProps {
  workspace: WorkspaceSummary
  scenarioCount: number | null
  onClick: () => void
  onDelete: () => void
}

export default function WorkspaceCard({
  workspace,
  scenarioCount,
  onClick,
  onDelete,
}: WorkspaceCardProps) {
  return (
    <div
      className="relative cursor-pointer rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        aria-label="Delete workspace"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <h3 className="text-lg font-semibold text-gray-800">
        {workspace.client_name}
      </h3>
      <p className="mt-1 text-sm text-gray-500">{workspace.name}</p>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-1.5">
          <FolderOpen className="h-4 w-4" />
          {scenarioCount === null ? (
            <span className="inline-block h-4 w-8 animate-pulse rounded bg-gray-200" />
          ) : (
            <span>
              {scenarioCount} scenario{scenarioCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span>{formatRelativeTime(workspace.updated_at)}</span>
      </div>
    </div>
  )
}
