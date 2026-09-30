import { useEffect } from 'react'
import { AlertCircle, Check, Info, ShieldAlert } from 'lucide-react'
import { Alert, Badge, EmptyState } from '../ui/Primitives'

/** @param {{ status: import('../../data/students').StudentStatus }} props */
export function StudentStatusPill({ status }) {
  const Icon = status === 'On track' ? Check : status === 'At risk' ? AlertCircle : ShieldAlert
  const tone = status === 'On track' ? 'success' : status === 'At risk' ? 'danger' : 'warning'
  return <Badge tone={tone} icon={Icon}>{status}</Badge>
}

const outcomeStyles = {
  content_defect_confirmed: 'border-danger/30 bg-danger/10 text-danger',
  ability_gap_confirmed: 'border-ability-gap-border bg-ability-gap-bg text-ability-gap-text',
  genuine_miss: 'border-warn/30 bg-warn/20 text-ink dark:bg-warn dark:text-ink',
}

const outcomeLabels = {
  content_defect_confirmed: 'Question error - not your fault',
  ability_gap_confirmed: 'Needs practice',
  genuine_miss: 'Needs practice',
}

/** @param {{ outcome: import('../../data/students').StudentOutcome }} props */
export function StudentOutcomePill({ outcome }) {
  const tone = outcome === 'content_defect_confirmed' ? 'danger' : outcome === 'ability_gap_confirmed' ? 'abilityGap' : 'warning'
  return <Badge tone={tone} className={`max-w-full border ${outcomeStyles[outcome]}`}>{outcomeLabels[outcome]}</Badge>
}

/** @param {{ label?: string }} props */
export function StudentSkeleton({ label = 'Loading your details' }) {
  return <div aria-label={label} aria-busy="true" className="space-y-4 animate-pulse motion-reduce:animate-none"><div className="h-24 rounded-xl border border-border bg-surface" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 rounded-xl border border-border bg-surface" />)}</div><div className="h-56 rounded-xl border border-border bg-surface" /></div>
}

/** @param {{ error: string, onRetry: () => void }} props */
export function StudentError({ error, onRetry }) {
  return <Alert variant="danger" title="Could not load student data" action={<button type="button" onClick={onRetry} className="min-h-10 rounded-lg border border-danger/20 px-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/10">Retry</button>}>{error}</Alert>
}

/** @param {{ children: import('react').ReactNode, description?: string, action?: import('react').ReactNode }} props */
export function StudentEmpty({ children, description = 'Your student information will appear here when it is available.', action }) {
  return <EmptyState icon={Info} title={children} description={description} action={action} />
}