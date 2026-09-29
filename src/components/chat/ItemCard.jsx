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
          badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
          icon: AlertTriangle,
          label: 'Content defect',
        }
      case 'Ambiguous':
        return {
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
          icon: HelpCircle,
          label: 'Ambiguous',
        }
      case 'Ability gap':
        return {
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
          icon: Info,
          label: 'Ability gap',
        }
      case 'Clean':
      default:
        return {
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
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
          className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-xs font-medium text-primary border border-border transition hover:bg-primary hover:text-white"
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
