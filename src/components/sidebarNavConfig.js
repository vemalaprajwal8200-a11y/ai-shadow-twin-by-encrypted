import { BarChart3, FileText, FolderOpen, Settings, ShieldCheck } from 'lucide-react'

/** @typedef {'overview' | 'flagged-units' | 'verdicts' | 'attention' | 'courses' | 'upload' | 'progress' | 'content' | 'accuracy' | 'defect-rate' | 'review' | 'export' | 'runs' | 'personas' | 'confidence'} SidebarSubtopicKind */
/** @typedef {{ id: string, label: string, to: string, kind: SidebarSubtopicKind, description: string, filter?: 'all' | 'slide' | 'question' | 'flagged' }} SidebarNavChild */
/** @typedef {{ label: string, to: string, icon: import('lucide-react').LucideIcon, children: SidebarNavChild[] }} SidebarNavGroup */

/** @type {SidebarNavGroup[]} */
export const sidebarNavGroups = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: BarChart3,
    children: [
      { id: 'dashboard-overview', label: 'Overview', to: '/topics/dashboard/overview', kind: 'overview', description: 'Course health, analysis totals, flagged count and twin confidence.' },
      { id: 'dashboard-flagged-units', label: 'Flagged items per unit', to: '/topics/dashboard/flagged-units', kind: 'flagged-units', description: 'Compare flagged content defects and ability gaps across course units.' },
      { id: 'dashboard-verdicts', label: 'Verdict split', to: '/topics/dashboard/verdicts', kind: 'verdicts', description: 'Review the count and share of each analysis verdict.' },
      { id: 'dashboard-attention', label: 'Needs attention', to: '/topics/dashboard/attention', kind: 'attention', description: 'Review the highest-priority flagged items first.' },
    ],
  },
  {
    label: 'Courses & Upload',
    to: '/courses',
    icon: FolderOpen,
    children: [
      { id: 'courses-all', label: 'All courses', to: '/topics/courses/all', kind: 'courses', description: 'Browse courses and their latest analysis status.' },
      { id: 'courses-upload', label: 'Upload materials', to: '/topics/courses/upload', kind: 'upload', description: 'Choose source files for the selected course.' },
      { id: 'courses-progress', label: 'Analysis progress', to: '/topics/courses/progress', kind: 'progress', description: 'See each stage of the Shadow-Twin analysis workflow.' },
    ],
  },
  {
    label: 'Course Content',
    to: '/content',
    icon: FileText,
    children: [
      { id: 'content-all', label: 'All items', to: '/topics/content/all', kind: 'content', filter: 'all', description: 'Browse every slide and assessment question in the selected course.' },
      { id: 'content-slides', label: 'Slides', to: '/topics/content/slides', kind: 'content', filter: 'slide', description: 'Review the course slide materials.' },
      { id: 'content-questions', label: 'Questions', to: '/topics/content/questions', kind: 'content', filter: 'question', description: 'Review the course assessment questions.' },
      { id: 'content-flagged', label: 'Flagged only', to: '/topics/content/flagged', kind: 'content', filter: 'flagged', description: 'Focus on items with a content defect or ability gap verdict.' },
    ],
  },
  {
    label: 'Quality Report',
    to: '/report',
    icon: ShieldCheck,
    children: [
      { id: 'report-accuracy', label: 'Accuracy metrics', to: '/topics/report/accuracy', kind: 'accuracy', description: 'See agreement and faculty review metrics for analysed items.' },
      { id: 'report-defect-rate', label: 'Defect rate per unit', to: '/topics/report/defect-rate', kind: 'defect-rate', description: 'Compare reported content defect rates between course units.' },
      { id: 'report-review', label: 'Flag review table', to: '/topics/report/review', kind: 'review', description: 'Inspect verdict, severity, agreement and faculty decision together.' },
      { id: 'report-export', label: 'Export CSV', to: '/topics/report/export', kind: 'export', description: 'Download the current mock quality report as a CSV file.' },
    ],
  },
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
    children: [
      { id: 'settings-runs', label: 'Runs per item', to: '/topics/settings/runs', kind: 'runs', description: 'Adjust how many twin runs are used to analyse each item.' },
      { id: 'settings-personas', label: 'Personas', to: '/topics/settings/personas', kind: 'personas', description: 'Choose the learner personas used during analysis.' },
      { id: 'settings-confidence', label: 'Confidence threshold', to: '/topics/settings/confidence', kind: 'confidence', description: 'Set the confidence level used to surface a review flag.' },
    ],
  },
]

/** @typedef {SidebarNavChild & { groupLabel: string, groupTo: string }} SidebarNavSubtopic */

/** @type {SidebarNavSubtopic[]} */
export const sidebarNavSubtopics = sidebarNavGroups.flatMap((group) => (
  group.children.map((child) => ({ ...child, groupLabel: group.label, groupTo: group.to }))
))