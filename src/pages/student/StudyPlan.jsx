import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { Card } from '../../components/dashboard/DashboardPrimitives'
import { StudentEmpty, StudentError, StudentSkeleton } from '../../components/student/StudentComponents'
import { useAuth } from '../../auth/AuthContext'
import { useMyStudent } from '../../hooks/useMyStudent'

export default function StudyPlan() {
  const { user } = useAuth()
  const { student, loading, error, retry } = useMyStudent(user)
  const [completed, setCompleted] = useState({})

  const plan = useMemo(() => {
    if (!student) return []
    const focus = student.missedItems.map((item) => ({ unit: item.unit, title: item.title }))
    const unique = [...new Map(focus.map((item) => [`${item.unit}-${item.title}`, item])).values()]
    if (!unique.some((item) => item.title === student.weakestTopic)) {
      unique.unshift({ unit: student.unitScores.indexOf(Math.min(...student.unitScores)) + 1, title: student.weakestTopic })
    }
    return unique.slice(0, 5)
  }, [student])

  useEffect(() => setCompleted({}), [student?.id])

  if (loading) return <StudentSkeleton label="Loading your study plan" />
  if (error) return <StudentError error={error} onRetry={retry} />
  if (!student) return <StudentEmpty>Your study plan is unavailable.</StudentEmpty>

  const doneCount = plan.filter((_, index) => completed[index]).length
  const progress = plan.length ? Math.round((doneCount / plan.length) * 100) : 0

  return (
    <div className="space-y-6">
      <header><p className="text-sm uppercase tracking-[0.18em] text-muted">MY DASHBOARD</p><h1 className="mt-1 text-3xl font-bold text-heading">Study plan</h1><p className="mt-2 text-sm text-muted">A short checklist based on your own recent results.</p></header>
      <Card className="p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-heading">Progress</h2><span className="tabular-nums text-sm text-muted">{doneCount} of {plan.length}</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-border/30" role="progressbar" aria-label="Study plan progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div></Card>
      {plan.length === 0 ? <StudentEmpty>No study topics yet. Keep up the good work.</StudentEmpty> : <Card className="divide-y divide-border/50 p-5"><ol>{plan.map((item, index) => <li key={`${item.unit}-${item.title}`} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><button type="button" aria-pressed={Boolean(completed[index])} aria-label={`${completed[index] ? 'Mark incomplete' : 'Mark complete'}: ${item.title}`} onClick={() => setCompleted((current) => ({ ...current, [index]: !current[index] }))} className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${completed[index] ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-bg text-muted'}`}>{completed[index] && <Check aria-hidden="true" className="h-4 w-4" />}</button><div><p className={`text-sm font-medium ${completed[index] ? 'text-muted line-through' : 'text-heading'}`}>{item.title}</p><p className="mt-1 text-xs text-muted">Unit {item.unit} · Step {index + 1}</p></div></li>)}</ol></Card>}
    </div>
  )
}