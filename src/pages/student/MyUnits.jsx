import { Card } from '../../components/dashboard/DashboardPrimitives'
import { StudentEmpty, StudentError, StudentSkeleton } from '../../components/student/StudentComponents'
import { useAuth } from '../../auth/AuthContext'
import { useMyStudent } from '../../hooks/useMyStudent'

const unitTotals = [8, 7, 5]

export default function MyUnits() {
  const { user } = useAuth()
  const { student, loading, error, retry } = useMyStudent(user)
  if (loading) return <StudentSkeleton label="Loading your unit performance" />
  if (error) return <StudentError error={error} onRetry={retry} />
  if (!student) return <StudentEmpty>Your unit results are unavailable.</StudentEmpty>

  return (
    <div className="space-y-6">
      <header><p className="text-sm uppercase tracking-[0.18em] text-muted">MY DASHBOARD</p><h1 className="mt-1 text-3xl font-bold text-heading">My units</h1><p className="mt-2 text-sm text-muted">Your scores and topics to revisit by unit.</p></header>
      <div className="grid gap-4 lg:grid-cols-3">
        {student.unitScores.map((score, index) => {
          const unit = index + 1
          const items = student.missedItems.filter((item) => item.unit === unit)
          const topics = [...new Set(items.map((item) => item.title))]
          const correct = Math.round((score / 100) * unitTotals[index])
          return <Card key={unit} className="p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-heading">Unit {unit}</h2><span className="text-2xl font-bold tabular-nums text-heading">{score}%</span></div><div className="mt-4 h-2 rounded-full bg-border/30" role="progressbar" aria-label={`Unit ${unit} score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}><div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} /></div><p className="mt-3 text-sm text-muted">{correct} of {unitTotals[index]} items correct</p><h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">Topic breakdown</h3>{topics.length ? <ul className="mt-2 space-y-2">{topics.map((topic) => <li key={topic} className="rounded-lg border border-border/70 bg-bg px-3 py-2 text-sm">{topic}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No missed topics in this unit.</p>}</Card>
        })}
      </div>
    </div>
  )
}