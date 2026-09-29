import { useState } from 'react'
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import mockApi from '../api/mock'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('faculty@campus.edu')
  const [password, setPassword] = useState('faculty123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await mockApi.loginFaculty({ email, password })
      localStorage.setItem('shadow-twin-token', result.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-surface p-8 shadow-soft">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-fg">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted">Faculty portal</p>
          <h1 className="mt-2 text-3xl font-bold text-heading">AI Shadow-Twin</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
              <Mail className="h-4 w-4" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg p-3 text-sm text-text transition focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
              <LockKeyhole className="h-4 w-4" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg p-3 text-sm text-text transition focus:border-primary"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
