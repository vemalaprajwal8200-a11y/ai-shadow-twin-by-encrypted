import { BarChart3, FileText, FolderOpen, Settings, ShieldCheck } from 'lucide-react'

/** @typedef {{ label: string, to: string }} SidebarNavChild */
/** @typedef {{ label: string, to: string, icon: import('lucide-react').LucideIcon, children: SidebarNavChild[] }} SidebarNavGroup */

/** @type {SidebarNavGroup[]} */
export const sidebarNavGroups = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: BarChart3,
    children: [
      { label: 'Overview', to: '/dashboard#overview' },
      { label: 'Flagged items per unit', to: '/dashboard#flagged-items-per-unit' },
      { label: 'Verdict split', to: '/dashboard#verdict-split' },
      { label: 'Needs attention', to: '/dashboard#needs-attention' },
    ],
  },
  {
    label: 'Courses & Upload',
    to: '/courses',
    icon: FolderOpen,
    children: [
      { label: 'All courses', to: '/courses#all-courses' },
      { label: 'Upload materials', to: '/courses#upload-materials' },
      { label: 'Analysis progress', to: '/courses#analysis-progress' },
    ],
  },
  {
    label: 'Course Content',
    to: '/content',
    icon: FileText,
    children: [
      { label: 'All items', to: '/content' },
      { label: 'Slides', to: '/content?type=slide' },
      { label: 'Questions', to: '/content?type=question' },
      { label: 'Flagged only', to: '/content?verdict=Content%20defect' },
    ],
  },
  {
    label: 'Quality Report',
    to: '/report',
    icon: ShieldCheck,
    children: [
      { label: 'Accuracy metrics', to: '/report#accuracy-metrics' },
      { label: 'Defect rate per unit', to: '/report#defect-rate-per-unit' },
      { label: 'Flag review table', to: '/report#flag-review-table' },
      { label: 'Export CSV', to: '/report?export=csv' },
    ],
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    children: [
      { label: 'Runs per item', to: '/settings#runs-per-item' },
      { label: 'Personas', to: '/settings#personas' },
      { label: 'Confidence threshold', to: '/settings#confidence-threshold' },
    ],
  },
]