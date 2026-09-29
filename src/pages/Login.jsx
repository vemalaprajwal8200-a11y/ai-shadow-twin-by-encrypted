import { useState } from 'react'
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { configured, registerWithEmail, loginWithEmail } = useAuth()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (mode === 'register' && (!name.trim() || !studentId.trim())) {
      setError('Enter your name and USN / Student ID.')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'register') {
        const result = await registerWithEmail(email, password, name, studentId)
        if (result.requiresEmailConfirmation) {
          setError('Email confirmation is enabled in Supabase. Turn it off to allow direct signup, then remove this unconfirmed account before retrying.')
          return
        }
      } else {
        await loginWithEmail(email, password)
      }
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : mode === 'register' ? 'Could not create your account.' : 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4 sm:p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8" aria-labelledby="auth-title">
        <Link to="/" className="mb-8 block w-fit leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Faculty AI /</span>
          <span className="block text-lg font-bold text-heading">Shadow-Twin</span>
        </Link>

        <h1 id="auth-title" className="mb-2 text-2xl font-bold text-heading">{mode === 'register' ? 'Create your account' : 'Sign in'}</h1>

        <p className="mb-6 text-sm text-muted">
          {mode === 'register' ? 'Enter your details to create a student account.' : 'Sign in with your email and password.'}
        </p>
        <div className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-bg p-1" role="group" aria-label="Choose sign-in or registration">
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
            Sign in
          </button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && <>
            <div>
              <label htmlFor="display-name" className="mb-2 block text-sm font-medium text-text">Full name</label>
              <input
                id="display-name"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-muted/75"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="student-id" className="mb-2 block text-sm font-medium text-text">USN / Student ID</label>
              <input
                id="student-id"
                type="text"
                autoComplete="off"
                required
                maxLength={64}
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-muted/75"
                placeholder="Your university ID"
              />
            </div>
          </>}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-text">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-muted/75"
              placeholder="you@university.edu"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-text">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 8 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-muted/75"
            />
          </div>
          {mode === 'register' && <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-text">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-muted/75"
            />
          </div>}
          <div aria-live="polite" aria-atomic="true" className="min-h-5">
            {!configured && <p className="text-sm text-danger">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the repository root .env.local file.</p>}
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
          <button type="submit" disabled={loading || !configured} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70">
            {mode === 'register' ? <UserPlus aria-hidden="true" className="h-4 w-4" /> : <LogIn aria-hidden="true" className="h-4 w-4" />}
            {loading ? mode === 'register' ? 'Creating account...' : 'Signing in...' : mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to About</Link>
      </section>
    </main>
  )
}