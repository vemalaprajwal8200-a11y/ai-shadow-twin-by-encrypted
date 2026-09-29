import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const chipClasses = {
  verdict: {
    'Content defect': 'bg-danger/10 text-danger',
    'Ability gap': 'bg-warn/10 text-warn',
    Clean: 'bg-primary text-primary-fg',
  },
  severity: {
    High: 'bg-danger/10 text-danger',
    Medium: 'bg-warn/10 text-warn',
    Low: 'bg-primary text-primary-fg',
  },
  status: {
    Confirmed: 'bg-primary text-primary-fg',
    Dismissed: 'bg-surface text-muted',
  },
}

/** @param {'verdict' | 'severity' | 'status'} kind @param {string} value */
export function getChipClass(kind, value) {
  return chipClasses[kind][value] || 'bg-surface text-muted'
}

/** @param {{ children: import('react').ReactNode, className?: string }} props */
export function Card({ children, className = '' }) {
  return <div className={`card ${className}`}>{children}</div>
}

/** @param {{ id: string, eyebrow: string, title: string, aside?: import('react').ReactNode, children: import('react').ReactNode }} props */
export function Section({ id, eyebrow, title, aside, children }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-bold text-heading">{title}</h2>
        </div>
        {aside}
      </header>
      {children}
    </section>
  )
}

/** @param {{ children: import('react').ReactNode, kind: 'verdict' | 'severity' | 'status' }} props */
export function Chip({ children, kind }) {
  return <span className={`badge ${getChipClass(kind, String(children))}`}>{children}</span>
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