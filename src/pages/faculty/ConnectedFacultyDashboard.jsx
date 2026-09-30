import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, BookOpen, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, PageHeader, VerdictChip } from '../../components/dashboard/DashboardPrimitives'
import { EmptyState } from '../../components/ui/Primitives'
import {
  getCourseOverview,
  getFlaggedPerUnit,
  getNeedsAttention,
  getPersonaPerformance,
  getTwinStatus,
  getVerdictSplit,
} from '../../data/supabaseData'

function field(row, ...names) {
  for (const name of names) {
    if (row?.[name] !== undefined && row[name] !== null) return row[name]
  }
  return null
}

function Metric({ label, value, icon: Icon }) {
  return <Card className="p-5"><div className="flex items-center justify-between text-muted"><span className="text-sm">{label}</span><Icon aria-hidden="true" className="h-4 w-4" /></div><p className="mt-3 text-3xl font-bold tabular-nums text-heading">{value}</p></Card>
}

export default function ConnectedFacultyDashboard({ courseId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [courses, units, verdicts, attention, personas, twinStatus] = await Promise.all([
        getCourseOverview(),
        getFlaggedPerUnit(courseId),
        getVerdictSplit(courseId),
        getNeedsAttention(courseId),
        getPersonaPerformance(courseId),
        getTwinStatus(),
      ])
      setData({ courses, units, verdicts, attention, personas, twinStatus })
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load dashboard data.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => { load() }, [load, retryKey])

  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-16 rounded-2xl bg-border/30" /><div className="grid gap-4 md:grid-cols-3"><div className="h-32 rounded-2xl bg-border/30" /><div className="h-32 rounded-2xl bg-border/30" /><div className="h-32 rounded-2xl bg-border/30" /></div></div>
  if (error) return <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"><p className="font-semibold">Could not load dashboard data</p><p className="mt-1">{error}</p><button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-danger/30 px-3 py-1.5 font-medium"><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>

  const courses = data?.courses || []
  const selected = courses.find((row) => String(field(row, 'course_id', 'id')) === String(courseId)) || courses[0]
  const units = data?.units || []
  const verdicts = data?.verdicts || []
  const attention = data?.attention || []
  const personas = data?.personas || []
  const itemCount = Number(field(selected, 'item_count', 'content_item_count', 'total_items') || 0)
  const flaggedCount = units.reduce((total, row) => total + Number(field(row, 'flagged_count', 'item_count', 'count') || 0), 0)
  const coursesCount = courses.length
  const twinLabel = field(data?.twinStatus?.[0], 'status_label') || 'Not started'

  return (
    <div className="space-y-6 pb-8">
      <PageHeader eyebrow="FACULTY DASHBOARD" title="Class overview" description={selected ? `Monitor course health for ${field(selected, 'course_name', 'title', 'name') || 'the selected course'}.` : 'Course metrics and flagged content from your Supabase data.'} />

      {courses.length === 0 ? <EmptyState icon={BookOpen} title="No courses yet" description="Create a course in Courses & Upload to see its dashboard." action={<Link to="/courses" className="text-sm font-semibold text-primary hover:underline">Open Courses & Upload</Link>} /> : <>
        <section aria-label="Summary metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Courses" value={coursesCount} icon={BookOpen} />
          <Metric label="Items analysed" value={itemCount} icon={ShieldCheck} />
          <Metric label="Flagged items" value={flaggedCount} icon={AlertCircle} />
          <Metric label="Persona results" value={personas.length} icon={Users} />
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-heading">Course overview</h2><span className="text-xs text-muted">Twin status: {twinLabel}</span></div>
            {courses.length === 0 ? <p className="text-sm text-muted">No courses yet.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-border text-muted"><tr><th className="pb-2 pr-3">Course</th><th className="pb-2 pr-3">Units</th><th className="pb-2 pr-3">Items</th><th className="pb-2">Status</th></tr></thead><tbody>{courses.map((row) => <tr key={field(row, 'course_id', 'id')} className="border-b border-border/50"><td className="py-3 pr-3 font-medium text-heading">{field(row, 'course_name', 'title', 'name') || 'Untitled course'}</td><td className="pr-3">{field(row, 'unit_count', 'units_count') ?? 0}</td><td className="pr-3">{field(row, 'item_count', 'content_item_count', 'total_items') ?? 0}</td><td className="capitalize">{field(row, 'status_label', 'status') || 'Not analysed'}</td></tr>)}</tbody></table></div>}
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-heading">Flagged items per unit</h2>
            {units.length === 0 ? <p className="text-sm text-muted">No unit analysis data yet.</p> : <div className="space-y-4">{units.map((row) => {
              const total = Number(field(row, 'item_count', 'total_items', 'count') || 0)
              const flagged = Number(field(row, 'flagged_count', 'flag_count') || 0)
              const label = field(row, 'unit_name', 'unit_title') || `Unit ${field(row, 'unit_order', 'unit_number') ?? ''}`
              return <div key={field(row, 'unit_id', 'unit_order', 'unit_name')}><div className="flex justify-between text-sm"><span className="font-medium text-text">{label}</span><span className="text-muted">{flagged} / {total} flagged</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-border/30"><div className="h-full rounded-full bg-danger" style={{ width: `${total ? Math.min(100, flagged / total * 100) : 0}%` }} /></div></div>
            })}</div>}
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-5"><h2 className="mb-4 font-semibold text-heading">Verdict split</h2>{verdicts.length === 0 ? <p className="text-sm text-muted">No verdicts yet.</p> : <div className="space-y-3">{verdicts.map((row) => <div key={field(row, 'verdict', 'label')} className="flex items-center justify-between gap-4 border-b border-border/50 pb-3"><VerdictChip verdict={field(row, 'verdict', 'label') || 'Unknown'} /><span className="text-sm tabular-nums text-text">{field(row, 'item_count', 'count') ?? 0} items</span><span className="text-sm text-muted">{Number(field(row, 'pct', 'percentage') || 0).toFixed(1)}%</span></div>)}</div>}</Card>
          <Card className="p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-heading">Needs attention</h2><Link to="/report" className="text-xs font-medium text-primary hover:underline">Quality report</Link></div>{attention.length === 0 ? <p className="text-sm text-muted">Nothing needs review yet.</p> : <ul className="space-y-3">{attention.slice(0, 6).map((row) => <li key={field(row, 'flag_id', 'item_id', 'id')} className="border-b border-border/50 pb-3"><p className="font-medium text-heading">{field(row, 'title', 'item_title', 'file_name') || 'Flagged item'}</p><p className="mt-1 text-xs text-muted">{field(row, 'unit_name') || ''} · {field(row, 'status') || 'open'}</p><p className="mt-2 text-sm text-text">{field(row, 'reason', 'flag_reason', 'review_note') || 'Review this flagged item.'}</p></li>)}</ul>}</Card>
        </div>

        <Card className="overflow-x-auto p-5"><h2 className="mb-4 font-semibold text-heading">Student details</h2>{personas.length === 0 ? <p className="text-sm text-muted">No persona performance results yet.</p> : <table className="min-w-full text-left text-sm"><thead className="border-b border-border text-muted"><tr><th className="pb-3 pr-3">Persona</th><th className="pb-3 pr-3">Runs</th><th className="pb-3 pr-3">Average confidence</th><th className="pb-3">Results</th></tr></thead><tbody>{personas.map((row) => <tr key={field(row, 'persona_id', 'persona_name', 'name')} className="border-b border-border/50"><td className="py-3 pr-3 font-medium text-heading">{field(row, 'persona_name', 'name') || 'Persona'}</td><td className="pr-3">{field(row, 'run_count', 'runs') ?? 0}</td><td className="pr-3">{field(row, 'avg_confidence', 'average_confidence') ?? 0}</td><td>{field(row, 'result_count', 'item_count') ?? 0}</td></tr>)}</tbody></table>}</Card>
      </>}
    </div>
  )
}
