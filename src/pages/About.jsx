import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Eyebrow } from '../components/about/AboutComponents'
import { useAuth } from '../auth/AuthContext'

export default function About() {
  const { isAuthenticated } = useAuth()
  const accountHref = isAuthenticated ? '/chat' : '/login'

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <header className="border-b border-border/60 bg-bg/90 backdrop-blur">
        <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="leading-tight">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Faculty AI /</span>
            <span className="block text-lg font-bold text-heading">Shadow-Twin</span>
          </Link>
          <Link to={accountHref} className="inline-flex min-h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-text transition-colors hover:bg-page">
            {isAuthenticated ? 'Ask the Twin' : 'Login'}
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 items-center px-4 py-10 sm:px-6 sm:py-14">
        <section className="mx-auto flex w-full max-w-4xl items-center">
          <div className="space-y-5">
            <Eyebrow>AI-POWERED ASSESSMENT QUALITY</Eyebrow>
            <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-heading">Is the question broken, or is the student behind?</h1>
            <p className="max-w-2xl text-[15px] leading-7 text-muted">
              Shadow-Twin checks your slides and exam questions to separate real content defects from learning gaps - before your exam paper is finalised.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Link to={accountHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-primary bg-primary px-5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover hover:text-primary-hover-fg">
                {isAuthenticated ? 'Ask the Twin' : 'Get started'} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-4 text-center text-xs text-muted">
        Shadow-Twin by Team Encrypted
      </footer>
    </div>
  )
}
