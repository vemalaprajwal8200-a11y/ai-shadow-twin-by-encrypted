import type { LucideIcon } from 'lucide-react'

export interface SidebarNavChild {
  id: string
  label: string
  to: string
  kind: SidebarSubtopicKind
  description: string
  filter?: 'all' | 'slide' | 'question' | 'flagged'
}

export type SidebarSubtopicKind =
  | 'student-details'
  | 'overview'
  | 'flagged-units'
  | 'verdicts'
  | 'attention'
  | 'courses'
  | 'upload'
  | 'progress'
  | 'content'
  | 'accuracy'
  | 'defect-rate'
  | 'review'
  | 'export'
  | 'runs'
  | 'personas'
  | 'confidence'
  | 'my-units'
  | 'missed'
  | 'plan'

export interface SidebarNavGroup {
  label: string
  to: string
  icon: LucideIcon
  children: SidebarNavChild[]
}

export const sidebarNavGroups: SidebarNavGroup[]
export const studentSidebarNavGroups: SidebarNavGroup[]
export function getSidebarNavGroups(role: 'student' | 'faculty'): SidebarNavGroup[]

export interface SidebarNavSubtopic extends SidebarNavChild {
  groupLabel: string
  groupTo: string
}

export const sidebarNavSubtopics: SidebarNavSubtopic[]
export const studentBottomTabs: Array<{ label: string, to: string, icon: LucideIcon }>