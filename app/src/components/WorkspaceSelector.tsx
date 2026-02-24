import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import type { WorkspaceSummary } from '../types/workspace'

interface WorkspaceSelectorProps {
  workspaces: WorkspaceSummary[]
  activeWorkspace: WorkspaceSummary | null
  onSelect: (ws: WorkspaceSummary) => void
  isLoading: boolean
  error: string | null
  onRetry: () => void
}

export default function WorkspaceSelector({
  workspaces,
  activeWorkspace,
  onSelect,
  isLoading,
  error,
  onRetry,
}: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading workspaces...
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-2 py-2">
        <p className="text-xs text-red-500">{error}</p>
        <button
          onClick={onRetry}
          className="mt-1 text-xs font-medium text-brand-500 hover:text-brand-600"
        >
          Retry
        </button>
      </div>
    )
  }

  if (workspaces.length === 0) {
    return (
      <div className="px-2 py-2 text-sm text-gray-400">
        No workspaces found
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <span className="flex-1 truncate text-left">
          {activeWorkspace?.name ?? 'Select Workspace'}
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => {
                onSelect(ws)
                setIsOpen(false)
              }}
              className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
                activeWorkspace?.id === ws.id
                  ? 'bg-brand-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-medium text-gray-700">{ws.name}</span>
              <span className="text-xs text-gray-400">{ws.client_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
