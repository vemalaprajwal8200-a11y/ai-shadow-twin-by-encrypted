import { useState } from 'react'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { configured, sendEmailCode, verifyEmailCode } = useAuth()
  const [mode, setMode] = useState('signin')
  const [accountType, setAccountType] = useState('student')
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const sendCode = async () => {
    setError('')
    setMessage('')
    if (mode === 'register' && (!name.trim() || (accountType === 'student' && !studentId.trim()))) {
      setError(accountType === 'student' ? 'Enter your name and USN / Student ID.' : 'Enter your name.')
      return
    }
    setLoading(true)
    try {
      await sendEmailCode(email, {
        shouldCreateUser: mode === 'register',
        displayName: name,
        studentId,
        requestedRole: accountType,
      })
      setCodeSent(true)
      setMessage('If this address can sign in, a verification code has been sent. Check your inbox and spam folder.')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send a verification code.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!codeSent) {
      await sendCode()
      return
    }

    setError('')
    setMessage('')
    setLoading(true)
    try {
      const user = await verifyEmailCode(email, code)
      const facultyAccessPending = mode === 'register'
        && accountType === 'faculty'
        && user.role !== 'faculty'
      navigate('/dashboard', { replace: true, state: { facultyAccessPending } })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not verify that code.')
    } finally {
      setLoading(false)
    }
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
    setCode('')
    setCodeSent(false)
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
          {codeSent
            ? `Enter the verification code sent to ${email}.`
            : mode === 'register'
              ? 'Choose your account type and enter your details.'
              : 'We will email you a one-time verification code.'}
        </p>
        {!codeSent && <div className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-bg p-1" role="group" aria-label="Choose sign-in or registration">
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
            Sign in
          </button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
            Register
          </button>
        </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!codeSent && mode === 'register' && <>
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
              readOnly={codeSent}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-muted/75"
              placeholder="you@university.edu"
            />
          </div>
          {codeSent && <div>
            <label htmlFor="verification-code" className="mb-2 block text-sm font-medium text-text">Verification code</label>
            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder:text-muted/75"
              placeholder="Enter the code from your email"
            />
          </div>}
          <div aria-live="polite" aria-atomic="true" className="min-h-5">
            {!configured && <p className="text-sm text-danger">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the repository root .env.local file.</p>}
            {error && <p className="text-sm text-danger">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}
          </div>
          <button type="submit" disabled={loading || !configured} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70">
            <MailCheck aria-hidden="true" className="h-4 w-4" />
            {loading ? codeSent ? 'Verifying code...' : 'Sending code...' : codeSent ? 'Verify code' : mode === 'register' ? 'Email me a registration code' : 'Email me a sign-in code'}
          </button>
        </form>

        {codeSent && <div className="mt-4 flex justify-between text-sm">
          <button type="button" onClick={() => void sendCode()} disabled={loading} className="font-medium text-primary underline underline-offset-2 disabled:opacity-60">Resend code</button>
          <button type="button" onClick={() => { setCodeSent(false); setCode(''); setMessage(''); setError('') }} className="font-medium text-muted underline underline-offset-2">Change email</button>
        </div>}

        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to About</Link>
      </section>
    </main>
  )
}