import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GitCompare,
  FolderOpen,
  Settings,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import WorkspaceSelector from './WorkspaceSelector'
import type { NavItem } from '../types/navigation'
import type { WorkspaceSummary } from '../types/workspace'

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard', end: true },
  {
    label: 'Modeling',
    icon: Users,
    children: [
      { label: 'Persona Modeling', icon: Users, to: '/personas' },
      { label: 'Plan Comparison', icon: GitCompare, to: '/plans' },
    ],
  },
  { label: 'Scenarios', icon: FolderOpen, to: '/scenarios' },
  { label: 'Settings', icon: Settings, to: '/settings' },
]

interface SidebarProps {
  workspaces: WorkspaceSummary[]
  activeWorkspace: WorkspaceSummary | null
  onWorkspaceSelect: (ws: WorkspaceSummary) => void
  isWorkspaceLoading: boolean
  workspaceError: string | null
  onWorkspaceRetry: () => void
}

export default function Sidebar({
  workspaces,
  activeWorkspace,
  onWorkspaceSelect,
  isWorkspaceLoading,
  workspaceError,
  onWorkspaceRetry,
}: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Modeling: true,
  })

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
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

      {/* Workspace Selector */}
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

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          if (item.children) {
            const isExpanded = expandedGroups[item.label] !== false
            const GroupIcon = item.icon
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <GroupIcon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to!}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-brand-50 text-brand-600'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`
                        }
                      >
                        <child.icon className="h-5 w-5 flex-shrink-0" />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 px-5 py-3">
        <p className="text-xs text-gray-400">v0.1.0</p>
      </div>
    </aside>
  )
}
