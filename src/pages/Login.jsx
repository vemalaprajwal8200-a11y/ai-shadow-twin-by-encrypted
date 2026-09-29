import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function getPasswordStrength(password) {
  const checks = [
    password.length >= 8,
    password.length >= 12,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const label = !password ? 'Not entered' : score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong'
  return { checks, score, label }
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailVerified = searchParams.get('verified') === '1'
  const { configured, registerWithEmail, verifySignupOtp, resendSignupOtp, loginWithEmail } = useAuth()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(emailVerified ? 'Email verified. Sign in with your email and password.' : '')
  const passwordStrength = getPasswordStrength(password)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
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
        await registerWithEmail(email, password, name, studentId)
        setMode('verify')
        setPassword('')
        setConfirmPassword('')
        setMessage(`Enter the verification code sent to ${email.trim()}.`)
        return
      }
      if (mode === 'verify') {
        await verifySignupOtp(email, otp)
        setOtp('')
        setMode('signin')
        setMessage('Email verified. Sign in with your email and password.')
        navigate('/login?verified=1', { replace: true })
        return
      }
      await loginWithEmail(email, password)
      navigate('/dashboard', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : mode === 'register' ? 'Could not create your account.' : mode === 'verify' ? 'Could not verify your email.' : 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await resendSignupOtp(email)
      setMessage(`A new verification code was sent to ${email.trim()}.`)
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Could not resend the verification code.')
    } finally {
      setLoading(false)
    }
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
    setOtp('')
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg p-4 sm:p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8" aria-labelledby="auth-title">
        <Link to="/" className="mb-8 block w-fit leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Faculty AI /</span>
          <span className="block text-lg font-bold text-heading">Shadow-Twin</span>
        </Link>

        <h1 id="auth-title" className="mb-2 text-2xl font-bold text-heading">
          {mode === 'register' ? 'Create your account' : mode === 'verify' ? 'Verify your email' : 'Sign in'}
        </h1>

        <p className="mb-6 text-sm text-muted">
          {mode === 'register' ? 'Create a student account with your details.' : mode === 'verify' ? `Enter the one-time code sent to ${email}.` : 'Sign in with your email and password.'}
        </p>
        {mode !== 'verify' && <div className="mb-5 grid grid-cols-2 rounded-xl border border-border bg-bg p-1" role="group" aria-label="Choose sign-in or registration">
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
            Sign in
          </button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')} className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-text'}`}>
            Register
          </button>
        </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'verify' ? (
            <>
              <div>
                <label htmlFor="signup-otp" className="mb-2 block text-sm font-medium text-text">Email verification code</label>
                <input
                  id="signup-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-sm tracking-widest text-text placeholder:text-muted/75"
                  placeholder="Enter 6-digit code"
                />
              </div>
              <button type="button" onClick={handleResendOtp} disabled={loading || !configured} className="text-sm font-medium text-primary hover:underline disabled:opacity-70">
                Resend verification code
              </button>
            </>
          ) : <>
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 pr-12 text-sm text-text placeholder:text-muted/75"
              />
              <button type="button" onClick={() => setShowPassword((shown) => !shown)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-text" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
            {mode === 'register' && <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">Password strength</span>
                <span className={passwordStrength.score <= 1 ? 'font-semibold text-danger' : passwordStrength.score === 2 ? 'font-semibold text-warn' : 'font-semibold text-primary'}>{passwordStrength.label}</span>
              </div>
              <div className="flex gap-1" role="progressbar" aria-label="Password strength" aria-valuemin={0} aria-valuemax={5} aria-valuenow={passwordStrength.score} aria-valuetext={passwordStrength.label}>
                {passwordStrength.checks.map((_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index < passwordStrength.score ? passwordStrength.score <= 1 ? 'bg-danger' : passwordStrength.score === 2 ? 'bg-warn' : 'bg-primary' : 'bg-border/40'}`} />)}
              </div>
              <p className="text-xs leading-5 text-muted">Use 8+ characters, mixed case, a number, and a symbol. Longer passwords are stronger.</p>
            </div>}
          </div>
          {mode === 'register' && <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-text">Confirm password</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-border bg-bg px-4 py-3 pr-12 text-sm text-text placeholder:text-muted/75"
              />
              <button type="button" onClick={() => setShowConfirmPassword((shown) => !shown)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-text" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} aria-pressed={showConfirmPassword}>
                {showConfirmPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
              </button>
            </div>
          </div>}
          </>}
          <div aria-live="polite" aria-atomic="true" className="min-h-5">
            {!configured && <p className="text-sm text-danger">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the repository root .env.local file.</p>}
            {error && <p className="text-sm text-danger">{error}</p>}
            {message && <p className="text-sm text-primary">{message}</p>}
          </div>
          <button type="submit" disabled={loading || !configured} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors duration-200 hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70">
            <MailCheck aria-hidden="true" className="h-4 w-4" />
            {loading ? mode === 'register' ? 'Creating account...' : mode === 'verify' ? 'Verifying code...' : 'Signing in...' : mode === 'register' ? 'Send verification code' : mode === 'verify' ? 'Verify email' : 'Sign in'}
          </button>
          {mode === 'register' && <p className="text-xs leading-5 text-muted">New accounts start with student access. Faculty access must be assigned by an administrator.</p>}
        </form>

        {mode === 'verify' ? <button type="button" onClick={() => changeMode('register')} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to registration</button> : <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to About</Link>}
      </section>
    </main>
  )
}