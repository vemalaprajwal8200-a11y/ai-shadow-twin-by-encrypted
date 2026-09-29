import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password, role)
      navigate('/dashboard', { replace: true })
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4 sm:p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8" aria-labelledby="sign-in-title">
        <Link to="/" className="mb-8 block w-fit leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Faculty AI /</span>
          <span className="block text-lg font-bold text-heading">Shadow-Twin</span>
        </Link>
        <h1 id="sign-in-title" className="mb-6 text-2xl font-bold text-heading">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-text">Sign in as</legend>
            <div className="grid grid-cols-2 rounded-xl border border-border bg-bg p-1" role="group" aria-label="Choose account role">
              {['student', 'faculty'].map((option) => <button key={option} type="button" aria-pressed={role === option} onClick={() => setRole(option)} className={`rounded-lg px-3 py-2 text-sm font-medium capitalize transition-colors ${role === option ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>{option}</button>)}
            </div>
          </fieldset>
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={4}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 pr-12 text-sm text-text placeholder:text-muted/75"
                placeholder="Password"
              />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div aria-live="polite" aria-atomic="true" className="min-h-5">
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <button type="button" onClick={() => { setRole('student'); setEmail('student.demo@campus.edu'); setPassword('student123') }} className="text-muted underline underline-offset-2 hover:text-heading">Use demo student</button>
          <button type="button" onClick={() => { setRole('faculty'); setEmail('faculty@campus.edu'); setPassword('faculty123') }} className="text-muted underline underline-offset-2 hover:text-heading">Use demo faculty</button>
        </div>

        <Link to="/" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to About</Link>
      </section>
    </main>
  )
}