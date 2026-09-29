import { useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Card } from '../../components/dashboard/DashboardPrimitives'
import { StudentEmpty, StudentError, StudentOutcomePill, StudentSkeleton } from '../../components/student/StudentComponents'
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
  if (error) return <StudentError error={error} onRetry={retry} />
  if (!student) return <StudentEmpty>Your missed items are unavailable.</StudentEmpty>

  return (
    <div className="space-y-6">
      <header><p className="text-sm uppercase tracking-[0.18em] text-muted">MY DASHBOARD</p><h1 className="mt-1 text-3xl font-bold text-heading">Missed items</h1><p className="mt-2 text-sm text-muted">Review your responses and the related course material.</p></header>
      <section aria-label="Filter missed items" className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1"><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input aria-label="Search missed items" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search missed items" className="w-full rounded-xl border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-muted/75" /></label>
        <label className="sr-only" htmlFor="missed-unit">Filter by unit</label><select id="missed-unit" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text"><option>All</option><option value="1">Unit 1</option><option value="2">Unit 2</option><option value="3">Unit 3</option></select>
        <label className="sr-only" htmlFor="missed-outcome">Filter by outcome</label><select id="missed-outcome" value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value)} className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text"><option>All</option><option>Question error</option><option>Needs practice</option><option>Under review</option></select>
        <p className="whitespace-nowrap text-sm text-muted" aria-live="polite">{items.length} items</p>
      </section>
      {items.length === 0 ? <StudentEmpty>No missed items - great work.</StudentEmpty> : <div className="space-y-3">{items.map((item) => {
        const isExpanded = Boolean(expanded[item.itemId])
        return <Card key={item.itemId} className="overflow-hidden"><button type="button" aria-expanded={isExpanded} onClick={() => setExpanded((current) => ({ ...current, [item.itemId]: !current[item.itemId] }))} className="flex w-full items-center justify-between gap-4 p-4 text-left"><span className="min-w-0"><span className="block truncate font-semibold text-heading">{item.title}</span><span className="mt-1 block text-xs text-muted">Unit {item.unit} · {item.type}</span></span><span className="flex shrink-0 items-center gap-3"><StudentOutcomePill outcome={item.studentOutcome} /><ChevronDown aria-hidden="true" className={`h-4 w-4 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></span></button>{isExpanded && <div className="space-y-3 border-t border-border/60 bg-bg p-4 text-sm"><div><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Question</h2><p className="mt-1">{item.questionText}</p></div><div><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Answer / key</h2><p className="mt-1">{item.correctAnswer}</p></div><div><h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Explanation</h2><p className="mt-1 text-muted">{item.explanation}</p></div></div>}</Card>
      })}</div>}
    </div>
  )
}