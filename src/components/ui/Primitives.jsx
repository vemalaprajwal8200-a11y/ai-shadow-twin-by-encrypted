import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const buttonStyles = {
  primary: 'border border-primary bg-primary text-primary-fg hover:bg-primary-hover hover:text-primary-hover-fg',
  secondary: 'border border-border bg-surface text-text hover:border-primary-light hover:bg-page',
  ghost: 'border border-transparent bg-transparent text-muted hover:bg-page hover:text-text',
  danger: 'border border-danger/20 bg-danger/10 text-danger hover:bg-danger/15',
}

const buttonSizes = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-5 text-sm',
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant] || buttonStyles.primary} ${buttonSizes[size] || buttonSizes.md} ${className}`}
      {...props}
    />
  )
}

export function Card({ as: Component = 'section', className = '', ...props }) {
  return <Component className={`ui-card ${className}`} {...props} />
}

export function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <header className={`page-header ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}

function Field({ as: Component = 'input', id, label, helper, error, leadingIcon: LeadingIcon, className = '', wrapperClassName = '', ...props }) {
  const inputId = id || props.name
  const helperId = helper ? `${inputId}-helper` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const describedBy = [props['aria-describedby'], helperId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={`ui-field ${wrapperClassName}`}>
      {label && <label htmlFor={inputId} className="ui-label">{label}{props.required && <span className="ml-1 text-danger">*</span>}</label>}
      <div className="relative">
        {LeadingIcon && <LeadingIcon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />}
        <Component
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`ui-input ${LeadingIcon ? 'pl-10' : ''} ${error ? 'ui-input-error' : ''} ${className}`}
          {...props}
        />
      </div>
      {helper && <p id={helperId} className="ui-helper">{helper}</p>}
      {error && <p id={errorId} className="ui-field-error">{error}</p>}
    </div>
  )
}

export function Input(props) {
  return <Field {...props} />
}

export function Select({ children, ...props }) {
  return <Field as="select" {...props}>{children}</Field>
}

const badgeStyles = {
  success: 'bg-primary/10 text-primary',
  warning: 'bg-ambiguous/15 text-ink',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-ability-gap/10 text-ink ring-1 ring-ability-gap/35',
  neutral: 'bg-page text-muted',
  brand: 'bg-surface-tint text-ink',
}

export function Badge({ tone = 'neutral', icon: Icon, className = '', children }) {
  return (
    <span className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeStyles[tone] || badgeStyles.neutral} ${className}`}>
      {Icon && <Icon aria-hidden="true" className="h-3.5 w-3.5" />}
      {children}
    </span>
  )
}

export function Avatar({ name = '', size = 'md', className = '' }) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ST'
  const dimensions = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' }
  return (
    <span aria-label={name ? `${name} avatar` : 'User avatar'} className={`inline-grid shrink-0 place-items-center rounded-full bg-surface-tint font-semibold text-ink ring-1 ring-border ${dimensions[size] || dimensions.md} ${className}`}>
      {initials}
    </span>
  )
}

const alertStyles = {
  info: { Icon: Info, classes: 'border-info/20 bg-info/5 text-info' },
  success: { Icon: CheckCircle2, classes: 'border-success/20 bg-success/5 text-success' },
  warning: { Icon: AlertTriangle, classes: 'border-ambiguous/25 bg-ambiguous/10 text-ink' },
  danger: { Icon: AlertCircle, classes: 'border-danger/20 bg-danger/5 text-danger' },
}

export function Alert({ variant = 'info', title, children, action, className = '' }) {
  const { Icon, classes } = alertStyles[variant] || alertStyles.info
  return (
    <div role={variant === 'danger' ? 'alert' : 'status'} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start ${classes} ${className}`}>
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <h2 className="text-sm font-semibold text-heading">{title}</h2>}
        <div className={`${title ? 'mt-1' : ''} text-sm leading-5 text-muted`}>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Toast({ message, onClose, variant = 'success' }) {
  if (!message) return null
  const Icon = variant === 'danger' ? AlertCircle : CheckCircle2
  const color = variant === 'danger' ? 'text-danger' : 'text-success'
  return (
    <div role="status" aria-live="polite" className="fixed right-4 top-20 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
      <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
      <p className="min-w-0 flex-1 text-sm font-medium text-heading">{message}</p>
      {onClose && <button type="button" onClick={onClose} aria-label="Dismiss notification" className="rounded-md p-1 text-muted hover:bg-page hover:text-text"><X aria-hidden="true" className="h-4 w-4" /></button>}
    </div>
  )
}

export function EmptyState({ icon: Icon = Info, title, description, action, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      <span className="empty-state-icon"><Icon aria-hidden="true" className="h-5 w-5" /></span>
      {title && <h2 className="mt-4 text-base font-semibold text-heading">{title}</h2>}
      {description && <p className="mt-1 max-w-md text-sm leading-5 text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
