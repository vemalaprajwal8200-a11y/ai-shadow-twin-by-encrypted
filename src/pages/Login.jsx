import { useState } from 'react'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Card, Input, Select } from '../components/ui/Primitives'

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
    <main className="grid min-h-screen place-items-center bg-page px-4 py-10 sm:p-6">
      <Card className="w-full max-w-md p-6 sm:p-8" aria-labelledby="auth-title">
        <Link to="/" className="mb-7 block w-fit leading-tight">
          <span className="block text-[11px] font-semibold text-muted">Faculty AI</span>
          <span className="mt-1 block text-xl font-semibold text-heading">Shadow-Twin</span>
        </Link>

        <h1 id="auth-title" className="text-[22px] font-semibold text-heading">{mode === 'register' ? 'Create your account' : 'Sign in'}</h1>

        <p className="mb-6 text-sm text-muted">
          {codeSent
            ? `Enter the verification code sent to ${email}.`
            : mode === 'register'
              ? 'Choose your account type and enter your details.'
              : 'We will email you a one-time verification code.'}
        </p>
        {!codeSent && <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-page p-1" role="group" aria-label="Choose sign-in or registration">
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => changeMode('signin')} className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-text'}`}>
            Sign in
          </button>
          <button type="button" aria-pressed={mode === 'register'} onClick={() => changeMode('register')} className={`min-h-10 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-surface text-heading shadow-sm' : 'text-muted hover:text-text'}`}>
            Register
          </button>
        </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!codeSent && mode === 'register' && <>
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
              {accountType === 'faculty' && <p className="mt-2 text-sm text-muted">Faculty access requires administrator approval after email verification.</p>}
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
          <div>
            <Input
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              readOnly={codeSent}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@university.edu"
            />
          </div>
          {codeSent && <div>
            <Input
              id="verification-code"
              label="Verification code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\s/g, ''))}
              placeholder="Enter the code from your email"
            />
          </div>}
          <div aria-live="polite" aria-atomic="true" className="min-h-5">
            {!configured && <Alert variant="warning" title="Supabase is not configured">Set the Supabase project URL and anon key in the root environment file.</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            {message && <Alert variant="success">{message}</Alert>}
          </div>
          <Button type="submit" disabled={loading || !configured} className="w-full">
            <MailCheck aria-hidden="true" className="h-4 w-4" />
            {loading ? codeSent ? 'Verifying code...' : 'Sending code...' : codeSent ? 'Verify code' : mode === 'register' ? 'Email me a registration code' : 'Email me a sign-in code'}
          </Button>
        </form>

        {codeSent && <div className="mt-4 flex justify-between text-sm">
          <button type="button" onClick={() => void sendCode()} disabled={loading} className="font-medium text-primary underline underline-offset-2 disabled:opacity-60">Resend code</button>
          <button type="button" onClick={() => { setCodeSent(false); setCode(''); setMessage(''); setError('') }} className="font-medium text-muted underline underline-offset-2">Change email</button>
        </div>}

        <Link to="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-heading"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to About</Link>
      </Card>
    </main>
  )
}