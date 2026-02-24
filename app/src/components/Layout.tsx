import { useEffect, useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { listWorkspaces } from '../services/api'
import type { WorkspaceSummary, LayoutContext } from '../types/workspace'

export default function Layout() {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([])
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkspaces = useCallback(() => {
    setIsLoading(true)
    setError(null)
    listWorkspaces()
      .then((data) => {
        setWorkspaces(data)
        if (data.length > 0) {
          setActiveWorkspace(data[0])
        }
      })
      .catch((err: Error) => {
        setError(err.message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  const context: LayoutContext = {
    activeWorkspace,
    setActiveWorkspace,
    workspaces,
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onWorkspaceSelect={setActiveWorkspace}
        isWorkspaceLoading={isLoading}
        workspaceError={error}
        onWorkspaceRetry={fetchWorkspaces}
      />

      <div className="flex flex-1 flex-col pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-gray-200 bg-white px-6 shadow-sm">
          <h1 className="text-sm font-medium text-gray-700">
            Retirement Income Modeling
          </h1>
        </header>

        <main className="flex-1 bg-gray-50 p-6">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  )
}
