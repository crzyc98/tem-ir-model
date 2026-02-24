import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Activity, CheckCircle, XCircle } from 'lucide-react'
import { getHealthStatus } from '../services/api'
import type { HealthStatus, LayoutContext } from '../types/workspace'

export default function DashboardPage() {
  const { activeWorkspace } = useOutletContext<LayoutContext>()
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHealthStatus()
      .then((data) => {
        setHealth(data)
        setError(null)
      })
      .catch((err: Error) => {
        setError(err.message)
        setHealth(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const title = activeWorkspace
    ? `Dashboard — ${activeWorkspace.name}`
    : 'Dashboard'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">
          Overview of your retirement income modeling workspace. Monitor
          simulation status, recent activity, and key metrics.
        </p>
      </div>

      {/* API Health Check */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Activity className="h-4 w-4" />
          API Health Check
        </div>

        <div className="mt-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gray-300" />
              Checking backend status...
            </div>
          )}

          {!loading && health && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>
                Status: <span className="font-semibold">{health.status}</span>
                {health.version && (
                  <span className="ml-3 text-gray-400">v{health.version}</span>
                )}
                {health.environment && (
                  <span className="ml-3 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                    {health.environment}
                  </span>
                )}
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <XCircle className="h-4 w-4" />
              <span>
                Unable to reach API &mdash;{' '}
                <span className="font-mono text-xs">{error}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
