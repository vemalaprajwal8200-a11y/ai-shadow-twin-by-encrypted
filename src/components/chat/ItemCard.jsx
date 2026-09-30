import { AlertTriangle, ArrowRight, Check, HelpCircle, Info } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * @param {{
 *   id: string,
 *   title: string,
 *   verdict: 'Content defect' | 'Ambiguous' | 'Ability gap' | 'Clean' | string,
 *   reason: string,
 *   onNavigate?: () => void
 * }} props
 */
export default function ItemCard({ id, title, verdict, reason, onNavigate }) {
  const getBadgeStyle = (v) => {
    switch (v) {
      case 'Content defect':
        return {
          badgeClass: 'bg-danger-bg text-danger border-danger-border',
          icon: AlertTriangle,
          label: 'Content defect',
        }
      case 'Ambiguous':
        return {
          badgeClass: 'bg-ambiguous-bg text-ambiguous-text border-ambiguous-border',
          icon: HelpCircle,
          label: 'Ambiguous',
        }
      case 'Ability gap':
        return {
          badgeClass: 'bg-ability-gap-bg text-ability-gap-text border-ability-gap-border',
          icon: Info,
          label: 'Ability gap',
        }
      case 'Clean':
      default:
        return {
          badgeClass: 'bg-success-bg text-success-text border-success-border',
          icon: Check,
          label: 'Clean',
        }
    }
  }

  const config = getBadgeStyle(verdict)
  const Icon = config.icon

  return (
    <div className="my-3 rounded-xl border border-border bg-bg/80 p-3.5 shadow-sm transition hover:border-primary/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}>
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </span>
          <span className="text-xs font-semibold text-heading truncate max-w-[220px] sm:max-w-xs">{title}</span>
        </div>

        <Link
          to={`/content/${id}`}
          onClick={onNavigate}
          className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-primary border border-border transition hover:bg-primary hover:text-primary-fg"
        >
          View item
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {reason && (
        <p className="mt-2 text-xs text-muted leading-relaxed">
          {reason}
        </p>
      )}
    </div>
  )
}
