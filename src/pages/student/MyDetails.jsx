import { useEffect, useState } from 'react'
import { ArrowRight, Info, Lock, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../../components/dashboard/DashboardPrimitives'
import { StudentError, StudentOutcomePill, StudentSkeleton, StudentStatusPill } from '../../components/student/StudentComponents'
import { Alert, Avatar, Badge, Button, Input, Select, Toast } from '../../components/ui/Primitives'
import { mockCourses } from '../../data/mockData'
import { useAuth } from '../../auth/AuthContext'
import { useMyStudent } from '../../hooks/useMyStudent'

const unitTotals = [8, 7, 5]

function getProfileValues(user) {
  return {
    name: user?.name || '',
    studentId: user?.studentId || '',
    semester: user?.semester || '',
    section: user?.section || '',
  }
}

function ProfileSummary({ user, student, course }) {
  const name = user?.name || student?.name || 'Student'
  const studentId = user?.studentId || student?.rollNo || 'Not set'
  const semester = user?.semester || student?.semester || 'Not set'
  const section = user?.section || student?.section || 'Not set'

  return (
    <Card className="h-full p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-heading">{name}</h2>
          <p className="mt-1 truncate text-sm text-muted">{user?.email || student?.email || 'Email not available'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="brand">Student</Badge>
            {student && <StudentStatusPill status={student.status} />}
          </div>
        </div>
      </div>
      <dl className="mt-6 divide-y divide-border">
        {[
          ['SAN / USN', studentId],
          ['Semester', semester],
          ['Section', section],
          ['Course', course?.title || 'Not assigned'],
        ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><dt className="text-[13px] text-muted">{label}</dt><dd className="truncate text-right text-sm font-medium text-heading">{value}</dd></div>)}
      </dl>
    </Card>
  )
}

function StudentProfileEditor({ user, updateStudentDetails }) {
  const [values, setValues] = useState(() => getProfileValues(user))
  const [savedValues, setSavedValues] = useState(() => getProfileValues(user))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [emailDetailsOpen, setEmailDetailsOpen] = useState(false)

  useEffect(() => {
    const nextValues = getProfileValues(user)
    setValues(nextValues)
    setSavedValues(nextValues)
  }, [user?.id, user?.name, user?.studentId, user?.semester, user?.section])

  const hasChanges = Object.keys(values).some((key) => values[key] !== savedValues[key])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await updateStudentDetails(values)
      setSavedValues(values)
      setToast('Your details were saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your details.')
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <>
      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold text-heading">Edit details</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="profile-name" label="Name" helper="Enter the name used for your academic records." type="text" autoComplete="name" required maxLength={100} value={values.name} onChange={updateField('name')} />
          <Input id="profile-student-id" label="SAN / USN" helper="Use the student ID assigned by your institution." type="text" required maxLength={64} value={values.studentId} onChange={updateField('studentId')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select id="profile-semester" label="Semester" required value={values.semester} onChange={updateField('semester')}>
              <option value="">Select semester</option>
              {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map((semester) => <option key={semester} value={semester}>{semester}</option>)}
            </Select>
            <Select id="profile-section" label="Section" required value={values.section} onChange={updateField('section')}>
              <option value="">Select section</option>
              {['A', 'B', 'C', 'D', 'E'].map((section) => <option key={section} value={section}>{section}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Input id="profile-email" label="Email" type="email" value={user?.email || ''} readOnly leadingIcon={Lock} />
            <button type="button" onClick={() => setEmailDetailsOpen(true)} aria-haspopup="dialog" className="inline-flex min-h-8 items-center gap-1.5 rounded-md text-xs font-medium text-muted underline decoration-border underline-offset-2 transition-colors hover:text-heading focus-visible:text-heading">
              <Lock aria-hidden="true" className="h-3.5 w-3.5" /> Managed by your account
            </button>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-danger">{error}</p>}
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <Button variant="secondary" onClick={() => { setValues(savedValues); setError('') }} disabled={!hasChanges || saving}>Cancel</Button>
            <Button type="submit" disabled={!hasChanges || saving}>
              {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save details'}
            </Button>
          </footer>
        </form>
      </Card>
      <Toast message={toast} onClose={() => setToast('')} />
      {emailDetailsOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/35 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEmailDetailsOpen(false) }}>
        <section role="dialog" aria-modal="true" aria-labelledby="email-details-title" className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-soft sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-tint text-ink"><Lock aria-hidden="true" className="h-4 w-4" /></span>
            <div className="min-w-0">
              <h2 id="email-details-title" className="text-lg font-semibold text-heading">Managed by your account</h2>
              <p className="mt-1 text-sm leading-5 text-muted">This email is used for sign-in and account messages. It can’t be changed from this profile form.</p>
            </div>
          </div>
          <div className="mt-5 rounded-lg border border-border bg-page p-3.5">
            <p className="text-xs font-medium text-muted">ACCOUNT EMAIL</p>
            <p className="mt-1 break-all text-sm font-medium text-heading">{user?.email || 'Not available'}</p>
          </div>
          <footer className="mt-5 flex justify-end">
            <Button variant="secondary" onClick={() => setEmailDetailsOpen(false)}>Close</Button>
          </footer>
        </section>
      </div>}
    </>
  )
}

function ProfileColumns({ user, student, course, updateStudentDetails, retry, academicRecordMissing }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-4">
        <ProfileSummary user={user} student={student} course={course} />
        {academicRecordMissing && <Alert
          variant="info"
          title="Academic record not linked"
          action={<Button size="sm" variant="secondary" onClick={retry}>Link account</Button>}
        >Your profile is active, but scores and course results are not connected yet.</Alert>}
      </div>
      <StudentProfileEditor user={user} updateStudentDetails={updateStudentDetails} />
    </div>
  )
}

export default function MyDetails() {
  const { user, updateStudentDetails } = useAuth()
  const { student, loading, error, retry } = useMyStudent(user)

  if (loading) return <StudentSkeleton label="Loading your dashboard" />
  const academicRecordMissing = !student
  if (error && error !== 'Your account is active, but this student ID is not linked to an academic record.') return <StudentError error={error} onRetry={retry} />
  if (academicRecordMissing) {
    return (
      <div className="space-y-6 pb-8">
        <PageHeader eyebrow="MY DASHBOARD" title="My details" description="Manage your profile and academic information." />
        <ProfileColumns user={user} updateStudentDetails={updateStudentDetails} retry={retry} academicRecordMissing />
      </div>
    )
  }

  const course = mockCourses.find((item) => item.id === student.courseId) || mockCourses[0]
  const strongestUnits = student.unitScores.map((score, index) => ({ name: `Unit ${index + 1} concepts`, score }))
    .sort((first, second) => second.score - first.score).slice(0, 2)
  const focusItems = student.missedItems
  const weakestItems = [...new Map(focusItems.map((item) => [item.title, item])).values()].slice(0, 2)
  const recommendation = student.weakestTopic || 'Review your recent practice items'

  const stats = [
    ['My overall score', `${student.overallScore}%`],
    ['Items answered correctly', `${student.itemsAnsweredCorrectly} of ${student.totalItems}`],
    ['Class position', student.classPositionBand],
    ['Adjusted score', `${student.adjustedScore}%`],
  ]

  return (
    <div className="space-y-6 pb-8">
      <PageHeader eyebrow="MY DASHBOARD" title="My details" description={`Your profile and performance in ${course.title}.`} />
      <ProfileColumns user={user} student={student} course={course} updateStudentDetails={updateStudentDetails} retry={retry} academicRecordMissing={false} />

      <section aria-label="Your scores" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => <Card key={label} className="p-4"><div className="flex items-start justify-between gap-2"><p className="text-sm text-muted">{label}</p>{label === 'Adjusted score' && <span title="Your score after excluding questions that were confirmed to have errors." className="group relative"><Info aria-label="Your score after excluding questions that were confirmed to have errors." className="h-4 w-4 text-muted" /></span>}</div><p className="mt-3 text-3xl font-bold tabular-nums text-heading">{value}</p></Card>)}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-heading">Performance by unit</h2>
          <div className="mt-5 space-y-4">
            {student.unitScores.map((score, index) => <div key={index}><div className="mb-2 flex justify-between text-sm"><span>Unit {index + 1}</span><span className="tabular-nums text-muted">{score}% · {Math.round((score / 100) * unitTotals[index])} of {unitTotals[index]} correct</span></div><div className="h-2 overflow-hidden rounded-full bg-border/30" role="progressbar" aria-label={`Unit ${index + 1} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}><div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} /></div></div>)}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-heading">Strengths and focus areas</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Strengths</p><ul className="mt-3 space-y-3">{strongestUnits.map((topic) => <li key={topic.name}><div className="flex justify-between gap-2 text-sm"><span className="truncate">{topic.name}</span><span className="tabular-nums text-muted">{topic.score}%</span></div><div className="mt-1.5 h-1.5 rounded-full bg-border/30"><div className="h-full rounded-full bg-primary" style={{ width: `${topic.score}%` }} /></div></li>)}</ul></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-warn">Focus areas</p><ul className="mt-3 space-y-3">{weakestItems.map((topic) => { const score = student.unitScores[topic.unit - 1] || 0; return <li key={topic.itemId}><div className="flex justify-between gap-2 text-sm"><span className="truncate">{topic.title}</span><span className="tabular-nums text-muted">{score}%</span></div><div className="mt-1.5 h-1.5 rounded-full bg-border/30"><div className="h-full rounded-full bg-warn" style={{ width: `${score}%` }} /></div></li> })}</ul>{weakestItems.length === 0 && <p className="mt-3 text-sm text-muted">No focus areas yet.</p>}</div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold text-heading">Recent missed items</h2><Link to="/topics/dashboard/missed" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80">View all <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></div>
        {student.missedItems.length === 0 ? <p className="mt-4 text-sm text-muted">No missed items - great work.</p> : <ul className="mt-3 divide-y divide-border/40">{student.missedItems.slice(0, 5).map((item) => <li key={item.itemId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-heading">{item.title}</p><p className="mt-1 text-xs text-muted">Unit {item.unit} · {item.type}</p></div><StudentOutcomePill outcome={item.studentOutcome} /></li>)}</ul>}
      </Card>

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-muted">NEXT STEP</p><h2 className="mt-1 font-semibold text-heading">Revise Unit {student.unitScores.indexOf(Math.min(...student.unitScores)) + 1}: {recommendation}</h2></div>
        <Link to="/topics/dashboard/plan" className="inline-flex shrink-0 items-center justify-center rounded-xl border border-surface-tint bg-surface-tint px-4 py-2.5 text-sm font-medium text-primary hover:bg-surface-tint/80">Open study plan</Link>
      </Card>
    </div>
  )
}