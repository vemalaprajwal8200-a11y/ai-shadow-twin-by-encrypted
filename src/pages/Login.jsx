import { useState } from 'react'
import { ArrowLeft, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { configured, requestEmailCode, verifyEmailCode } = useAuth()
  const [mode, setMode] = useState('signin')
  const [step, setStep] = useState('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [pendingRegistration, setPendingRegistration] = useState(false)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const sendCode = async (address, register, displayName) => {
    await requestEmailCode(address, { register, displayName })
    setPendingEmail(address.trim())
    setPendingRegistration(register)
    setStep('verify')
    setCode('')
    setMessage(`A verification code was sent to ${address.trim()}.`)
  }

  const handleRequestCode = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await sendCode(email, mode === 'register', name)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send a verification code.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await verifyEmailCode(pendingEmail, code)
      navigate('/dashboard', { replace: true })
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'That code could not be verified.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await sendCode(pendingEmail, pendingRegistration, name)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not resend the code.')
    } finally {
      setLoading(false)
    }
  }

  const changeEmail = () => {
    setStep('email')
    setCode('')
    setError('')
    setMessage('')
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4 sm:p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8" aria-labelledby="auth-title">
        <Link to="/" className="mb-8 block w-fit leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Faculty AI /</span>
          <span className="block text-lg font-bold text-heading">Shadow-Twin</span>
        </Link>

        <h1 id="auth-title" className="mb-2 text-2xl font-bold text-heading">
          {step === 'verify' ? 'Verify your email' : mode === 'register' ? 'Create your account' : 'Sign in'}
        </h1>

        {step === 'email' && (
          <>
            <p className="mb-6 text-sm text-muted">
              {mode === 'register' ? 'Create a student account with your email address.' : 'We will email you a one-time verification code.'}
            </p>
            <div className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-bg p-1" role="group" aria-label="Choose sign-in or registration">
              <button type="button" aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
                Sign in
              </button>
              <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
                Register
              </button>
            </div>

            <form onSubmit={handleRequestCode} className="space-y-4">
              {mode === 'register' && (
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
              )}
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
              <div aria-live="polite" aria-atomic="true" className="min-h-5">
                {!configured && <p className="text-sm text-danger">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the repository root .env.local file.</p>}
                {error && <p className="text-sm text-danger">{error}</p>}
                {message && <p className="text-sm text-primary">{message}</p>}
              </div>
              <button type="submit" disabled={loading || !configured} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70">
                <MailCheck aria-hidden="true" className="h-4 w-4" />
                {loading ? 'Sending code...' : mode === 'register' ? 'Create account and send code' : 'Email me a sign-in code'}
              </button>
              {mode === 'register' && <p className="text-xs leading-5 text-muted">New accounts start with student access. Faculty access must be assigned by an administrator.</p>}
            </form>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="mb-6 text-sm text-muted">Enter the one-time code sent to <span className="font-medium text-text">{pendingEmail}</span>.</p>
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label htmlFor="verification-code" className="mb-2 block text-sm font-medium text-text">Email verification code</label>
                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-center text-lg tracking-[0.25em] text-text placeholder:text-muted/75"
                  placeholder="000000"
                  aria-describedby="otp-help"
                />
                <p id="otp-help" className="mt-2 text-xs text-muted">Use the six-digit code from your email.</p>
              </div>
              <div aria-live="polite" aria-atomic="true" className="min-h-5">
                {error && <p className="text-sm text-danger">{error}</p>}
                {message && <p className="text-sm text-primary">{message}</p>}
              </div>
              <button type="submit" disabled={loading || code.length !== 6} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                {loading ? 'Verifying...' : 'Verify and continue'}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm">
              <button type="button" disabled={loading} onClick={handleResend} className="inline-flex items-center gap-2 font-medium text-primary hover:text-primary/80 disabled:opacity-60">
                <RefreshCw aria-hidden="true" className="h-4 w-4" />Resend code
              </button>
              <button type="button" disabled={loading} onClick={changeEmail} className="font-medium text-muted hover:text-heading">Change email</button>
            </div>
          </>
        )}

        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to About</Link>
      </section>
    </main>
  )
}