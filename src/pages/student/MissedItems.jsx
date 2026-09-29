import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../../components/dashboard/DashboardPrimitives'
import { StudentEmpty, StudentError, StudentOutcomePill, StudentSkeleton } from '../../components/student/StudentComponents'
import { Input, Select } from '../../components/ui/Primitives'
import { useAuth } from '../../auth/AuthContext'
import { useMyStudent } from '../../hooks/useMyStudent'

export default function MissedItems() {
  const { user } = useAuth()
  const { student, loading, error, retry } = useMyStudent(user)
  const [search, setSearch] = useState('')
  const [unitFilter, setUnitFilter] = useState('All')
  const [outcomeFilter, setOutcomeFilter] = useState('All')
  const [expanded, setExpanded] = useState({})

  const items = useMemo(() => (student?.missedItems || []).filter((item) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || item.title.toLowerCase().includes(query) || item.questionText.toLowerCase().includes(query)
    const matchesUnit = unitFilter === 'All' || String(item.unit) === unitFilter
    const outcome = item.studentOutcome === 'content_defect_confirmed'
      ? 'Question error'
      : item.studentOutcome === 'under_review' ? 'Under review' : 'Needs practice'
    const matchesOutcome = outcomeFilter === 'All' || outcome === outcomeFilter
    return matchesSearch && matchesUnit && matchesOutcome
  }), [student, search, unitFilter, outcomeFilter])

  if (loading) return <StudentSkeleton label="Loading your missed items" />
  const studentNotLinked = error === 'Your account is active, but this student ID is not linked to an academic record.'
  if (error && !studentNotLinked) return <StudentError error={error} onRetry={retry} />
  if (!student) return <StudentEmpty description="Link your student record to see course items that need review." action={<Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">Open My details</Link>}>Missed items unavailable</StudentEmpty>

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My dashboard" title="Missed items" description="Review your responses and the related course material." />
      <section aria-label="Filter missed items" className="ui-card grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <Input type="search" aria-label="Search missed items" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search missed items" leadingIcon={Search} />
        <Select id="missed-unit" label="Unit" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}><option>All</option><option value="1">Unit 1</option><option value="2">Unit 2</option><option value="3">Unit 3</option></Select>
        <Select id="missed-outcome" label="Outcome" value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)}><option>All</option><option>Question error</option><option>Needs practice</option><option>Under review</option></Select>
        <p className="whitespace-nowrap text-sm text-muted" aria-live="polite">{items.length} items</p>
      </section>
      {items.length === 0 ? <StudentEmpty description="There are no missed items matching the current filters." action={<Link to="/topics/dashboard/plan" className="text-sm font-semibold text-primary hover:underline">Open study plan</Link>}>No missed items</StudentEmpty> : <div className="space-y-3">{items.map((item) => {
        const isExpanded = Boolean(expanded[item.itemId])
        return <Card key={item.itemId} className="overflow-hidden"><button type="button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => ({ ...current, [item.itemId]: !current[item.itemId] }))} className="flex w-full items-center justify-between gap-4 p-4 text-left"><span className="min-w-0"><span className="block truncate font-semibold text-heading">{item.title}</span><span className="mt-1 block text-xs text-muted">Unit {item.unit} · {item.type}</span></span><span className="flex shrink-0 items-center gap-3"><StudentOutcomePill outcome={item.studentOutcome} /><ChevronDown aria-hidden="true" className={`h-4 w-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></span></button>{isExpanded && <div className="space-y-3 border-t border-border/60 bg-bg p-4 text-sm"><div><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Question</h2><p className="mt-1">{item.questionText}</p></div><div><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Answer / key</h2><p className="mt-1">{item.correctAnswer}</p></div><div><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Explanation</h2><p className="mt-1 text-muted">{item.explanation}</p></div></div>}</Card>
      })}</div>}
    </div>
  )
}