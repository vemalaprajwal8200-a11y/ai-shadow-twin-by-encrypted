import { ArrowUpRight, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Card as UiCard, PageHeader } from '../ui/Primitives'

const chipClasses = {
  verdict: {
    'Content defect': 'bg-danger/10 text-danger',
    'Ability gap': 'bg-ability-gap/10 text-ink ring-1 ring-ability-gap/35',
    Clean: 'bg-primary/10 text-primary',
    clear: 'bg-primary/10 text-primary',
    ambiguous: 'bg-ambiguous/15 text-ink',
    flawed: 'bg-danger/10 text-danger',
  },
  severity: {
    High: 'bg-danger/10 text-danger',
    Medium: 'bg-ambiguous/15 text-ink',
    Low: 'bg-page text-muted',
    high: 'bg-danger/10 text-danger',
    medium: 'bg-ambiguous/15 text-ink',
    low: 'bg-page text-muted',
  },
  status: {
    Confirmed: 'bg-primary/10 text-primary',
    Dismissed: 'bg-page text-muted',
  },
}

const chipTones = {
  verdict: { 'Content defect': 'danger', 'Ability gap': 'info', Clean: 'success', clear: 'success', ambiguous: 'warning', flawed: 'danger' },
  severity: { High: 'danger', Medium: 'warning', Low: 'neutral', high: 'danger', medium: 'warning', low: 'neutral' },
  status: { Confirmed: 'success', Dismissed: 'neutral' },
}

/** @param {'verdict' | 'severity' | 'status'} kind @param {string} value */
export function getChipClass(kind, value) {
  return chipClasses[kind][value] || 'bg-surface text-muted'
}

/** @param {import('react').HTMLAttributes<HTMLDivElement>} props */
export function Card({ children, className = '', ...attributes }) {
  return <UiCard {...attributes} className={`card ${className}`}>{children}</UiCard>
}

export { PageHeader }

/** @param {{ id: string, eyebrow: string, title: string, aside?: import('react').ReactNode, children: import('react').ReactNode }} props */
export function Section({ id, eyebrow, title, aside, children }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <PageHeader eyebrow={eyebrow} title={title} actions={aside} />
      {children}
    </section>
  )
}

/** @param {{ children: import('react').ReactNode, kind: 'verdict' | 'severity' | 'status' }} props */
export function Chip({ children, kind }) {
  const isClean = kind === 'verdict' && String(children) === 'Clean'
  const value = String(children)
  return <Badge tone={chipTones[kind]?.[value]} icon={isClean ? Check : undefined} className={getChipClass(kind, value)}>{children}</Badge>
}

/** @param {{ verdict: import('../../data/dashboardMockData').DashboardVerdict }} props */
export function VerdictChip({ verdict }) {
  return <Chip kind="verdict">{verdict}</Chip>
}

/** @param {{ severity: import('../../data/dashboardMockData').DashboardSeverity }} props */
export function SeverityChip({ severity }) {
  return <Chip kind="severity">{severity}</Chip>
}

/** @param {{ to: string, label: string, value: string | number, icon: import('lucide-react').LucideIcon, accent: string, description?: string }} props */
export function KpiCard({ to, label, value, icon: Icon, accent, description }) {
  return (
    <Link
      to={to}
      className="group block rounded-2xl"
    >
      <Card className="h-full p-5 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:shadow-md motion-reduce:transform-none motion-reduce:transition-none">
        <div className="flex items-center justify-between">
          <span className={`rounded-xl p-2 ${accent}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
        </div>
        <p className="mt-5 text-3xl font-bold text-primary">{value}</p>
        <p className="mt-1 text-sm font-medium text-text">{label}</p>
        {description && <p className="mt-2 text-xs text-muted">{description}</p>}
      </Card>
    </Link>
  )
}