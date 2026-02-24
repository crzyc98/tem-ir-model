import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GitCompare,
  FolderOpen,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Placeholder pages
// ---------------------------------------------------------------------------

function PlaceholderPage({ name }: { name: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800">{name}</h2>
      <p className="mt-2 text-sm text-gray-500">Coming Soon</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard page with health check
// ---------------------------------------------------------------------------

interface HealthStatus {
  status: string
  version?: string
  environment?: string
}

function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: HealthStatus) => {
        setHealth(data)
        setError(null)
      })
      .catch((err: Error) => {
        setError(err.message)
        setHealth(null)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
        <p className="mt-2 text-sm text-gray-500">
          Welcome to RetireModel. Your retirement planning command center.
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

// ---------------------------------------------------------------------------
// Navigation definition
// ---------------------------------------------------------------------------

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/personas', label: 'Persona Modeling', icon: Users },
  { to: '/plans', label: 'Plan Comparison', icon: GitCompare },
  { to: '/scenarios', label: 'Scenarios', icon: FolderOpen },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 border-b border-gray-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
            R
          </div>
          <span className="text-lg font-semibold tracking-tight text-brand-500">
            RetireModel
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3">
          <p className="text-xs text-gray-400">v0.1.0</p>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center border-b border-gray-200 bg-white px-6 shadow-sm">
          <h1 className="text-sm font-medium text-gray-700">
            Retirement Income Modeling
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 bg-gray-50 p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/personas"
              element={<PlaceholderPage name="Persona Modeling" />}
            />
            <Route
              path="/plans"
              element={<PlaceholderPage name="Plan Comparison" />}
            />
            <Route
              path="/scenarios"
              element={<PlaceholderPage name="Scenarios" />}
            />
            <Route
              path="/settings"
              element={<PlaceholderPage name="Settings" />}
            />
          </Routes>
        </main>
      </div>
    </div>
  )
}
