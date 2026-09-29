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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Faculty portal</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">AI Shadow-Twin</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Mail className="h-4 w-4" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none ring-0 transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <LockKeyhole className="h-4 w-4" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-sky-500 dark:text-slate-950"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
