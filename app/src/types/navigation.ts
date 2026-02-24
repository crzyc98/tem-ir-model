import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  icon: LucideIcon
  to?: string
  end?: boolean
  children?: NavItem[]
}
