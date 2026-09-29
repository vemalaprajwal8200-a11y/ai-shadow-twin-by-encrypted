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

export interface SidebarNavGroup {
  label: string
  to: string
  icon: LucideIcon
  children: SidebarNavChild[]
}

export const sidebarNavGroups: SidebarNavGroup[]

export interface SidebarNavSubtopic extends SidebarNavChild {
  groupLabel: string
  groupTo: string
}

export const sidebarNavSubtopics: SidebarNavSubtopic[]