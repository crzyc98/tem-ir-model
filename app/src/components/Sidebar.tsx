import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GitCompare,
  FolderOpen,
  Globe,
  Settings,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import WorkspaceSelector from './WorkspaceSelector'
import type { WorkspaceSummary } from '../types/workspace'

type NavEntry =
  | { kind: 'section'; label: string }
  | { kind: 'link'; label: string; icon: LucideIcon; to: string; end?: boolean }

const navEntries: NavEntry[] = [
  { kind: 'link', label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', end: true },
  { kind: 'section', label: 'Modeling' },
  { kind: 'link', label: 'Persona Modeling', icon: Users, to: '/personas' },
  { kind: 'link', label: 'Plan Comparison', icon: GitCompare, to: '/plans' },
  { kind: 'link', label: 'Scenarios', icon: FolderOpen, to: '/scenarios' },
  { kind: 'link', label: 'Settings', icon: Settings, to: '/settings' },
  { kind: 'link', label: 'Global Settings', icon: Globe, to: '/global-settings' },
]

interface SidebarProps {
  workspaces: WorkspaceSummary[]
  activeWorkspace: WorkspaceSummary | null
  onWorkspaceSelect: (ws: WorkspaceSummary) => void
  isWorkspaceLoading: boolean
  workspaceError: string | null
  onWorkspaceRetry: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function Sidebar({
  workspaces,
  activeWorkspace,
  onWorkspaceSelect,
  isWorkspaceLoading,
  workspaceError,
  onWorkspaceRetry,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col overflow-hidden border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Header — 64px tall */}
      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-3">
        {collapsed ? (
          <div className="flex w-full justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              P
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-1 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
                P
              </div>
              <span className="whitespace-nowrap text-lg font-semibold tracking-tight text-brand-500">
                PlanAlign
              </span>
            </div>
            <button
              onClick={onToggleCollapsed}
              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Expand toggle — shown only when collapsed */}
      {collapsed && (
        <div className="flex justify-center border-b border-gray-200 py-2">
          <button
            onClick={onToggleCollapsed}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Workspace Selector — hidden when collapsed */}
      {!collapsed && (
        <div className="border-b border-gray-200 px-3 py-3">
          <WorkspaceSelector
            workspaces={workspaces}
            activeWorkspace={activeWorkspace}
            onSelect={onWorkspaceSelect}
            isLoading={isWorkspaceLoading}
            error={workspaceError}
            onRetry={onWorkspaceRetry}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {navEntries.map((entry, i) => {
            if (entry.kind === 'section') {
              if (collapsed) return null
              return (
                <li
                  key={`section-${i}`}
                  className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400"
                >
                  {entry.label}
                </li>
              )
            }

            const Icon = entry.icon
            return (
              <li key={entry.to}>
                <NavLink
                  to={entry.to}
                  end={entry.end}
                  title={collapsed ? entry.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      collapsed ? 'justify-center' : 'gap-3'
                    } ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-brand-50 hover:text-brand-700'
                    }`
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{entry.label}</span>}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-gray-200 px-5 py-3">
          <p className="text-xs text-gray-400">v0.1.0</p>
        </div>
      )}
    </aside>
  )
}
