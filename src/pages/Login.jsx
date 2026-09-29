import { useState } from 'react'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const { configured, sendMagicLink } = useAuth()
  const [mode, setMode] = useState('signin')
  const [accountType, setAccountType] = useState('student')
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [linkSent, setLinkSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const sendLink = async () => {
    setError('')
    setMessage('')
    if (mode === 'register' && (!name.trim() || (accountType === 'student' && !studentId.trim()))) {
      setError(accountType === 'student' ? 'Enter your name and USN / Student ID.' : 'Enter your name.')
      return
    }
    setLoading(true)
    try {
      await sendMagicLink(email, {
        shouldCreateUser: mode === 'register',
        displayName: name,
        studentId,
        requestedRole: accountType,
      })
      setLinkSent(true)
      setMessage('If this address can sign in, a one-time sign-in link has been emailed. Open it in this browser to continue.')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send a sign-in link.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    await sendLink()
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
    setLinkSent(false)
    setAccountType('student')
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
          {linkSent
            ? `Open the sign-in link sent to ${email} in this browser.`
            : mode === 'register'
              ? 'Choose your account type and enter your details.'
              : 'We will email you a one-time sign-in link.'}
        </p>
        {!linkSent && <div className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-bg p-1" role="group" aria-label="Choose sign-in or registration">
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
            Sign in
          </button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
            Register
          </button>
        </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!linkSent && mode === 'register' && <>
            <div>
              <label htmlFor="account-type" className="mb-2 block text-sm font-medium text-text">I am registering as</label>
              <select
                id="account-type"
                value={accountType}
                onChange={(event) => {
                  setAccountType(event.target.value)
                  setStudentId('')
                }}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty member</option>
              </select>
              {accountType === 'faculty' && <p className="mt-2 text-sm text-muted">Faculty access requires administrator approval after email verification.</p>}
            </div>
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
            {accountType === 'student' && <div>
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
            </div>}
          </>}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-text">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              readOnly={linkSent}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-muted/75"
              placeholder="you@university.edu"
            />
          </div>
          <div aria-live="polite" aria-atomic="true" className="min-h-5">
            {!configured && <p className="text-sm text-danger">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the repository root .env.local file.</p>}
            {error && <p className="text-sm text-danger">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}
          </div>
          <button type="submit" disabled={loading || !configured} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70">
            <MailCheck aria-hidden="true" className="h-4 w-4" />
            {loading ? 'Sending link...' : linkSent ? 'Send link again' : mode === 'register' ? 'Email me a registration link' : 'Email me a sign-in link'}
          </button>
        </form>

        {linkSent && <div className="mt-4 flex justify-end text-sm">
          <button type="button" onClick={() => { setLinkSent(false); setMessage(''); setError('') }} className="font-medium text-muted underline underline-offset-2">Change email</button>
        </div>}

        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to About</Link>
      </section>
    </main>
  )
}