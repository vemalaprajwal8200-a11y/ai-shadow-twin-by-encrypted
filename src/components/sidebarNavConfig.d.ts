import type { LucideIcon } from 'lucide-react'

export interface SidebarNavChild {
  label: string
  to: string
}

export interface SidebarNavGroup {
  label: string
  to: string
  icon: LucideIcon
  children: SidebarNavChild[]
}

export const sidebarNavGroups: SidebarNavGroup[]