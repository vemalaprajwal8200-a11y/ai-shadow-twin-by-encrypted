import { useState } from 'react'
import { ArrowLeft, LogIn, UserPlus } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Card, Input, Select } from '../components/ui/Primitives'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { configured, registerWithEmail, loginWithEmail, sendPasswordReset, updatePassword } = useAuth()
  const [mode, setMode] = useState('signin')
  const [accountType, setAccountType] = useState('student')
  const [name, setName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [email, setEmail] = useState('')
  const [confirmationSent, setConfirmationSent] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const isRecoveryRequest = searchParams.get('recovery') === 'request'
  const isPasswordReset = searchParams.get('recovery') === 'complete'
  const isRecovery = isRecoveryRequest || isPasswordReset

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if ((mode === 'register' || isPasswordReset) && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if ((mode === 'register' || isPasswordReset) && password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }

    if (isRecoveryRequest) {
      setLoading(true)
      try {
        await sendPasswordReset(email)
        setRecoveryMessage('If an account exists for that email, a password reset link has been sent.')
      } catch (resetError) {
        setError(resetError instanceof Error ? resetError.message : 'Could not send a password reset link.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (isPasswordReset) {
      setLoading(true)
      try {
        await updatePassword(password)
        navigate('/dashboard', { replace: true })
      } catch (resetError) {
        setError(resetError instanceof Error ? resetError.message : 'Could not update your password.')
      } finally {
        setLoading(false)
      }
      return
    }

    setError('')
    setMessage('')
    if (mode === 'register' && (!name.trim() || (accountType === 'student' && !studentId.trim()))) {
      setError(accountType === 'student' ? 'Enter your name and USN / Student ID.' : 'Enter your name.')
      return
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      if (mode === 'register') {
        const result = await registerWithEmail(email, password, {
          displayName: name,
          studentId,
          requestedRole: accountType,
        })
        if (result.requiresEmailConfirmation) {
          setConfirmationSent(true)
          setMessage(`Check ${email} and confirm your account. The link will return you to the production sign-in page.`)
          return
        }

        navigate('/chat', { replace: true })
      } else {
        await loginWithEmail(email, password)
        navigate('/chat', { replace: true })
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : mode === 'register' ? 'Could not create your account.' : 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setMessage('')
    setConfirmationSent(false)
    setAccountType('student')
    setPassword('')
    setConfirmPassword('')
  }

  const beginPasswordReset = () => {
    setSearchParams({ recovery: 'request' })
    setError('')
    setMessage('')
  }

  const cancelPasswordReset = () => {
    setSearchParams({})
    setError('')
    setRecoveryMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <main className="grid min-h-screen place-items-center bg-page px-4 py-10 sm:p-6">
      <Card className="w-full max-w-md p-6 sm:p-8" aria-labelledby="auth-title">
        <Link to="/" className="mb-7 block w-fit leading-tight">
          <span className="block text-[11px] font-semibold text-muted">Faculty AI</span>
          <span className="mt-1 block text-xl font-semibold text-heading">Shadow-Twin</span>
        </Link>

  <h1 id="auth-title" className="mb-2 text-[22px] font-semibold text-heading">
          {isPasswordReset ? 'Choose a new password' : isRecoveryRequest ? 'Reset your password' : mode === 'register' ? 'Create your account' : 'Sign in'}
        </h1>

        <p className="mb-6 text-sm text-muted">
          {isPasswordReset
            ? 'Choose a new password for your account.'
            : isRecoveryRequest
              ? 'Enter your account email and we will send you a reset link.'
              : confirmationSent
            ? 'Confirm your email, then sign in with the email and password you registered.'
            : mode === 'register'
              ? 'Choose your account type and set a password.'
              : 'Sign in with your email and password.'}
        </p>
  {!confirmationSent && !isRecovery && <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-page p-1" role="group" aria-label="Choose sign-in or registration">
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')} className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-text'}`}>
            Sign in
          </button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')} className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-text'}`}>
            Register
          </button>
        </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!confirmationSent && !isRecovery && mode === 'register' && <>
            <div>
              <Select
                id="account-type"
                label="I am registering as"
                value={accountType}
                onChange={(event) => {
                  setAccountType(event.target.value)
                  setStudentId('')
                }}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty member</option>
              </Select>
              {accountType === 'faculty' && <p className="mt-2 text-sm text-muted">Faculty access requires administrator approval. Ask your administrator to approve your email before registering.</p>}
            </div>
            <div>
              <Input
                id="display-name"
                label="Full name"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </div>
            {accountType === 'student' && <div>
              <Input
                id="student-id"
                label="USN / Student ID"
                type="text"
                autoComplete="off"
                required
                maxLength={64}
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                placeholder="Your university ID"
              />
            </div>}
          </>}
          {!isPasswordReset && <div>
            <Input
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@university.edu"
            />
          </div>}
          {!confirmationSent && !isRecoveryRequest && <div>
            <Input
              id="password"
              label="Password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' || isPasswordReset ? 8 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>}
          {!confirmationSent && (mode === 'register' || isPasswordReset) && <div>
            <Input
              id="confirm-password"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>}
          <div aria-live="polite" aria-atomic="true" className="min-h-5">
            {!configured && <Alert variant="warning" title="Supabase is not configured">Set the Supabase project URL and anon key in the root environment file.</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}
            {recoveryMessage && <Alert variant="success">{recoveryMessage}</Alert>}
          </div>
          {!confirmationSent && <Button type="submit" disabled={loading || !configured} className="w-full">
            {mode === 'register' ? <UserPlus aria-hidden="true" className="h-4 w-4" /> : <LogIn aria-hidden="true" className="h-4 w-4" />}
            {loading
              ? isPasswordReset ? 'Updating password...' : isRecoveryRequest ? 'Sending reset link...' : mode === 'register' ? 'Creating account...' : 'Signing in...'
              : isPasswordReset ? 'Update password' : isRecoveryRequest ? 'Email reset link' : mode === 'register' ? 'Create account' : 'Sign in'}
          </Button>
          }
        </form>

        {!confirmationSent && mode === 'signin' && !isRecovery && <button type="button" onClick={beginPasswordReset} className="mt-4 text-sm font-medium text-primary underline underline-offset-2">Forgot password?</button>}
        {isRecovery && <button type="button" onClick={cancelPasswordReset} className="mt-4 text-sm font-medium text-muted underline underline-offset-2">Back to sign in</button>}

        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to About</Link>
      </Card>
    </main>
  )
}