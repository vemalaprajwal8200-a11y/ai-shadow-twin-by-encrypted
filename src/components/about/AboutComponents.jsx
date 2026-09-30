/** @param {{ children: import('react').ReactNode, className?: string }} props */
export function Eyebrow({ children, className = '' }) {
  return <p className={`text-xs font-semibold text-muted ${className}`}>{children}</p>
}

/** @param {{ id?: string, eyebrow: string, title: string, children: import('react').ReactNode, className?: string }} props */
export function Section({ id, eyebrow, title, children, className = '' }) {
  return (
    <section id={id} data-reveal className={`reveal scroll-mt-24 space-y-6 py-14 sm:py-20 ${className}`}>
      <header className="max-w-3xl space-y-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="text-lg font-semibold leading-tight text-heading">{title}</h2>
      </header>
      {children}
    </section>
  )
}

/** @param {{ icon: import('react').ReactNode, title: string, children: import('react').ReactNode }} props */
export function FeatureCard({ icon, title, children }) {
  return (
    <article className="card h-full p-5 transition-colors duration-200 hover:border-primary/50">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-surface-tint text-soft-text" aria-hidden="true">{icon}</span>
      <h3 className="mt-4 text-base font-semibold text-heading">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{children}</p>
    </article>
  )
}