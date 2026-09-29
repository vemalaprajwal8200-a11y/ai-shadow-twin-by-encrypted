import { useEffect, useState } from 'react'
import { Lock, LoaderCircle, UserCog } from 'lucide-react'
import { Card, PageHeader } from '../../components/dashboard/DashboardPrimitives'
import { Alert, Avatar, Badge, Button, Input, Toast } from '../../components/ui/Primitives'
import { useAuth } from '../../auth/AuthContext'

function FacultyProfileSummary({ user }) {
  const name = user?.name || 'Faculty'
  return (
    <Card className="h-full p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-heading">{name}</h2>
          <p className="mt-1 truncate text-sm text-muted">{user?.email || 'Email not available'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="brand">Faculty</Badge>
          </div>
        </div>
      </div>
      <dl className="mt-6 divide-y divide-border">
        {[
          ['Role', 'Faculty member'],
          ['Account email', user?.email || 'Not set'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="truncate text-right text-sm font-medium text-heading">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

function FacultyProfileEditor({ user }) {
  const { updateStudentDetails } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [savedName, setSavedName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    setName(user?.name || '')
    setSavedName(user?.name || '')
  }, [user?.id, user?.name])

  const hasChanges = name !== savedName

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      // Reuse updateStudentDetails — it updates the display_name in Supabase auth metadata
      await updateStudentDetails({ name, studentId: user?.studentId || '', semester: '', section: '' })
      setSavedName(name)
      setToast('Profile updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold text-heading">Edit profile</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="faculty-name"
            label="Full name"
            helper="Your display name visible to students and administrators."
            type="text"
            autoComplete="name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="space-y-1.5">
            <Input
              id="faculty-email"
              label="Email"
              type="email"
              value={user?.email || ''}
              readOnly
              leadingIcon={Lock}
            />
            <p className="text-xs text-muted flex items-center gap-1">
              <Lock className="h-3 w-3" /> Email is managed by your account provider.
            </p>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              onClick={() => { setName(savedName); setError('') }}
              disabled={!hasChanges || saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!hasChanges || saving}>
              {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
          </footer>
        </form>
      </Card>
      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}

export default function FacultyProfile() {
  const { user } = useAuth()

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="FACULTY"
        title="My profile"
        description="Manage your faculty profile and account information."
      />

      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <FacultyProfileSummary user={user} />
        <FacultyProfileEditor user={user} />
      </div>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <UserCog aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-heading">Faculty access</h2>
            <p className="mt-1 text-sm text-muted">
              You have full faculty access to the Shadow-Twin system. You can view all student analytics,
              review AI-flagged content items, and export reports.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
