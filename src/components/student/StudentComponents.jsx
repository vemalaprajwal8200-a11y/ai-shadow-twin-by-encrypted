import { useEffect } from 'react'
import { AlertCircle, Check, ShieldAlert } from 'lucide-react'
import { Card } from '../dashboard/DashboardPrimitives'

const statusStyle = {
  'On track': 'bg-primary/10 text-primary',
  'Needs support': 'bg-warn/20 text-ink dark:bg-warn dark:text-ink',
  'At risk': 'bg-danger/10 text-danger',
}

/** @param {{ status: import('../../data/students').StudentStatus }} props */
export function StudentStatusPill({ status }) {
  const Icon = status === 'On track' ? Check : status === 'At risk' ? AlertCircle : ShieldAlert
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[status]}`}><Icon aria-hidden="true" className="h-3.5 w-3.5" />{status}</span>
}

const outcomeStyles = {
  content_defect_confirmed: 'border-danger/30 bg-danger/10 text-danger',
  ability_gap_confirmed: 'border-ability-gap/40 bg-ability-gap/10 text-ink dark:bg-surface dark:text-sidebar-fg',
  genuine_miss: 'border-warn/30 bg-warn/20 text-ink dark:bg-warn dark:text-ink',
}

const outcomeLabels = {
  content_defect_confirmed: 'Question error - not your fault',
  ability_gap_confirmed: 'Needs practice',
  genuine_miss: 'Needs practice',
}

/** @param {{ outcome: import('../../data/students').StudentOutcome }} props */
export function StudentOutcomePill({ outcome }) {
  return <span className={`inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-semibold ${outcomeStyles[outcome]}`}>{outcomeLabels[outcome]}</span>
}

/** @param {{ label?: string }} props */
export function StudentSkeleton({ label = 'Loading your details' }) {
  return <div aria-label={label} aria-busy="true" className="space-y-4 animate-pulse motion-reduce:animate-none"><div className="h-24 rounded-2xl bg-border/30" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 rounded-2xl bg-border/30" />)}</div><div className="h-56 rounded-2xl bg-border/30" /></div>
}

/** @param {{ error: string, onRetry: () => void }} props */
export function StudentError({ error, onRetry }) {
  return <Card className="p-8 text-center"><AlertCircle aria-hidden="true" className="mx-auto h-7 w-7 text-danger" /><p role="alert" className="mt-3 text-sm text-muted">{error}</p><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg">Retry</button></Card>
}

/** @param {{ children: import('react').ReactNode }} props */
export function StudentEmpty({ children }) {
  return <Card className="p-8 text-center"><p className="font-semibold text-heading">{children}</p></Card>
}