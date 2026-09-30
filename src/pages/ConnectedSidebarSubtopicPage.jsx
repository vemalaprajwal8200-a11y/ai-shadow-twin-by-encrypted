import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card, PageHeader, SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'
import { EmptyState } from '../components/ui/Primitives'
import CoursesPage from './CoursesPage'
import QualityReportPage from './QualityReportPage'
import SettingsPage from './SettingsPage'
import ConnectedFacultyDashboard from './faculty/ConnectedFacultyDashboard'
import {
  getContentItems,
  getCourseOverview,
  getFlaggedPerUnit,
  getNeedsAttention,
  getVerdictSplit,
  updateFlagReview,
} from '../data/supabaseData'

function label(row, ...keys) {
  for (const key of keys) if (row?.[key] !== null && row?.[key] !== undefined) return row[key]
  return ''
}

export default function ConnectedSidebarSubtopicPage({ topic, courseId, onCourseChange }) {
  const [searchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const attentionItemId = searchParams.get('itemId')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let result = []
      if (topic.kind === 'overview' || topic.kind === 'courses') result = await getCourseOverview()
      else if (topic.kind === 'flagged-units') result = await getFlaggedPerUnit(courseId)
      else if (topic.kind === 'verdicts') result = await getVerdictSplit(courseId)
      else if (topic.kind === 'attention') result = await getNeedsAttention(courseId)
      else if (topic.kind === 'content') result = await getContentItems(courseId, {
        itemType: topic.filter === 'slide' || topic.filter === 'question' ? topic.filter : undefined,
        flaggedOnly: topic.filter === 'flagged',
      })
      setRows(result)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this view.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [courseId, topic.filter, topic.kind])

  useEffect(() => { load() }, [load, retryKey])

  if (topic.kind === 'courses' || topic.kind === 'upload' || topic.kind === 'progress') return <CoursesPage courseId={courseId} onCourseChange={onCourseChange} />
  if (topic.kind === 'runs' || topic.kind === 'personas' || topic.kind === 'confidence') return <SettingsPage />
  if (topic.kind === 'accuracy' || topic.kind === 'defect-rate' || topic.kind === 'review' || topic.kind === 'export') return <QualityReportPage courseId={courseId} />
  if (topic.kind === 'student-details') return <ConnectedFacultyDashboard courseId={courseId} />
  if (loading) return <div className="space-y-4 animate-pulse"><div className="h-16 rounded-2xl bg-border/30" /><div className="h-64 rounded-2xl bg-border/30" /></div>

  const showError = error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"><p>{error}</p><button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-2 font-semibold underline">Retry</button></div>
  const noRows = (title) => <EmptyState title={title} description="No matching Supabase data is available yet." />

  if (topic.kind === 'overview') {
    return <div className="space-y-6"><PageHeader eyebrow={topic.groupLabel} title={topic.label} description={topic.description} />{showError}{rows.length === 0 ? noRows('No courses yet') : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{rows.map((row) => <Card key={label(row, 'course_id', 'id')} className="p-5"><p className="text-sm text-muted">{label(row, 'course_name', 'title', 'name')}</p><p className="mt-3 text-3xl font-bold text-heading">{label(row, 'item_count', 'total_items') ?? 0}</p><p className="mt-1 text-sm text-muted">items · {label(row, 'unit_count', 'units_count') ?? 0} units</p><p className="mt-3 text-xs capitalize text-primary">{label(row, 'status_label', 'status') || 'Not analysed'}</p></Card>)}</div>}</div>
  }

  if (topic.kind === 'flagged-units') {
    return <div className="space-y-6"><PageHeader eyebrow={topic.groupLabel} title={topic.label} description={topic.description} />{showError}{rows.length === 0 ? noRows('No unit flags yet') : <div className="space-y-3">{rows.map((row) => {
      const total = Number(label(row, 'item_count', 'total_items', 'count') || 0)
      const flagged = Number(label(row, 'flagged_count', 'flag_count') || 0)
      const unitId = label(row, 'unit_id', 'unit_order', 'unit_name')
      return <Card key={unitId} className="p-5"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-heading">{label(row, 'unit_name', 'unit_title') || `Unit ${label(row, 'unit_order', 'unit_number')}`}</h2><p className="mt-1 text-sm text-muted">{flagged} of {total} items flagged</p></div><span className="text-sm font-semibold text-danger">{total ? Math.round(flagged / total * 100) : 0}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-border/30"><div className="h-full bg-danger" style={{ width: `${total ? Math.min(100, flagged / total * 100) : 0}%` }} /></div></Card>
    })}</div>}</div>
  }

  if (topic.kind === 'verdicts') {
    return <div className="space-y-6"><PageHeader eyebrow={topic.groupLabel} title={topic.label} description={topic.description} />{showError}{rows.length === 0 ? noRows('No verdicts yet') : <div className="grid gap-3 md:grid-cols-3">{rows.map((row) => <Card key={label(row, 'verdict', 'label')} className="p-5"><VerdictChip verdict={label(row, 'verdict', 'label') || 'Unknown'} /><p className="mt-3 text-3xl font-bold text-heading">{label(row, 'item_count', 'count') ?? 0}</p><p className="mt-1 text-sm text-muted">{Number(label(row, 'pct', 'percentage') || 0).toFixed(1)}% of items</p></Card>)}</div>}</div>
  }

  if (topic.kind === 'attention') {
    return <div className="space-y-6"><PageHeader eyebrow={topic.groupLabel} title={topic.label} description={topic.description} />{showError}{rows.length === 0 ? noRows('Nothing needs attention') : <div className="space-y-3">{rows.map((row) => {
      const flagId = label(row, 'flag_id', 'id')
      const status = String(label(row, 'status') || 'open').toLowerCase()
      return <Card id={String(label(row, 'content_item_id', 'item_id')) === attentionItemId ? `attention-${attentionItemId}` : undefined} key={flagId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-heading">{label(row, 'title', 'item_title', 'content_item_id') || 'Flagged item'}</h2><p className="mt-1 text-sm text-muted">{label(row, 'unit_name') || ''} · {label(row, 'reason', 'flag_reason') || 'Review flagged content.'}</p><div className="mt-2 flex gap-2"><VerdictChip verdict={label(row, 'verdict') || 'Unknown'} /><SeverityChip severity={label(row, 'severity') || 'Low'} /></div></div><div className="flex gap-2">{['confirmed', 'dismissed', 'resolved'].map((next) => <button key={next} type="button" disabled={status === next} onClick={async () => { try { const updated = await updateFlagReview(flagId, next); setRows((current) => current.map((item) => (label(item, 'flag_id', 'id') === flagId ? { ...item, ...updated } : item))) } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : 'Could not update flag.') } }} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-40">{next === 'resolved' ? 'Resolve' : next[0].toUpperCase() + next.slice(1)}</button>)}</div></Card>
    })}</div>}</div>
  }

  if (topic.kind === 'content') {
    return <div className="space-y-6"><PageHeader eyebrow={topic.groupLabel} title={topic.label} description={topic.description} />{showError}{rows.length === 0 ? noRows('No items in this view') : <div className="space-y-3">{rows.map((row) => <Card key={label(row, 'content_item_id', 'item_id', 'id')} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs uppercase text-muted">{label(row, 'item_type', 'type')} · {label(row, 'unit_name') || ''}</span><h2 className="mt-1 font-semibold text-heading">{label(row, 'title', 'item_title', 'file_name') || 'Course item'}</h2><p className="mt-2 text-sm text-muted">{label(row, 'content_text', 'content', 'text') || ''}</p><p className="mt-2 text-xs text-muted">Confidence: {label(row, 'confidence') == null ? 'Not scored' : `${Math.round(Number(label(row, 'confidence')) * (Number(label(row, 'confidence')) <= 1 ? 100 : 1))}%`} · {Array.isArray(row.flags) ? row.flags.length : 0} flags</p></div><VerdictChip verdict={label(row, 'verdict') || 'clear'} /></div></Card>)}</div>}</div>
  }

  return <div className="space-y-6"><PageHeader eyebrow={topic.groupLabel} title={topic.label} description={topic.description} />{showError}{noRows('This view is not available')}</div>
}
