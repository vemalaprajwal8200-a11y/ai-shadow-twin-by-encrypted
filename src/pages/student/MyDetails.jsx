import { ArrowRight, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/dashboard/DashboardPrimitives'
import { StudentEmpty, StudentError, StudentOutcomePill, StudentSkeleton, StudentStatusPill } from '../../components/student/StudentComponents'
import { mockCourses } from '../../data/mockData'
import { useAuth } from '../../auth/AuthContext'
import { useMyStudent } from '../../hooks/useMyStudent'

const unitTotals = [8, 7, 5]

function Initials({ name }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2)
  return <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">{initials}</span>
}

export default function MyDetails() {
  const { user } = useAuth()
  const { student, loading, error, retry } = useMyStudent(user)

  if (loading) return <StudentSkeleton label="Loading your dashboard" />
  if (error) return <StudentError error={error} onRetry={retry} />
  if (!student) return <StudentEmpty>Your student details are unavailable.</StudentEmpty>

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
      <header>
        <p className="text-sm uppercase tracking-[0.18em] text-muted">MY DASHBOARD</p>
        <h1 className="mt-1 text-3xl font-bold text-heading">Hi, {student.name.split(' ')[0]}</h1>
        <p className="mt-2 text-sm text-muted">Here is how you are doing in {course.title}.</p>
      </header>

      <Card className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
        <Initials name={student.name} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-heading">{student.name}</h2>
          <p className="mt-1 text-sm text-muted">{student.rollNo} · Section {student.section}</p>
          <p className="mt-1 truncate text-sm text-muted">{student.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><StudentStatusPill status={student.status} /><span className="rounded-full border border-border bg-bg px-3 py-1 text-xs text-muted">{course.title}</span></div>
      </Card>

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