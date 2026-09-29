import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Upload } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, Chip, PageHeader, SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'
import { Badge, EmptyState } from '../components/ui/Primitives'
import { chartPalette } from '../data/chartPalette'
import { dashboardMockItems } from '../data/dashboardMockData'
import { courseItems, mockCourses, reportRows, settingsConfig } from '../data/mockData'
import { useThemeMode } from '../hooks/useThemeMode'

const verdictLabels = ['Content defect', 'Ability gap', 'Clean']
const severityRank = { High: 3, Medium: 2, Low: 1 }
const reviewStorageKey = 'shadow-twin-review-decisions'

function readReviewDecisions() {
  try {
    return JSON.parse(localStorage.getItem(reviewStorageKey) || '{}')
  } catch {
    return {}
  }
}

function formatAnalysisDate(value) {
  const [year, month, day] = value.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`
}

/** @param {{ topic: import('../components/sidebarNavConfig').SidebarNavSubtopic, courseId: string }} props */
export default function SidebarSubtopicPage({ topic, courseId }) {
  const darkMode = useThemeMode()
  const palette = chartPalette[darkMode ? 'dark' : 'light']
  const [searchParams] = useSearchParams()
  const [files, setFiles] = useState([])
  const [runsPerItem, setRunsPerItem] = useState(settingsConfig.runsPerItem)
  const [selectedPersonas, setSelectedPersonas] = useState(settingsConfig.personas)
  const [confidenceThreshold, setConfidenceThreshold] = useState(settingsConfig.confidenceThreshold)
  const [reviewDecisions, setReviewDecisions] = useState(readReviewDecisions)
  const [undoDecisions, setUndoDecisions] = useState({})

  const currentCourse = mockCourses.find((course) => course.id === courseId) || mockCourses[0]
  const currentItems = courseItems.filter((item) => item.courseId === courseId)
  const attentionItemId = searchParams.get('itemId')

  useEffect(() => {
    if (topic.kind !== 'attention' || !attentionItemId) return undefined
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`attention-${attentionItemId}`)?.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth',
        block: 'center',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [topic.kind, attentionItemId])
  const verdictCounts = useMemo(() => dashboardMockItems.reduce((counts, item) => {
    counts[item.verdict] += 1
    return counts
  }, { 'Content defect': 0, 'Ability gap': 0, Clean: 0 }), [])
  const units = useMemo(() => [...new Set(dashboardMockItems.map((item) => item.unit))]
    .sort((first, second) => first - second)
    .map((unit) => {
      const rows = dashboardMockItems.filter((item) => item.unit === unit)
      const contentDefects = rows.filter((item) => item.verdict === 'Content defect').length
      const abilityGaps = rows.filter((item) => item.verdict === 'Ability gap').length
      return { unit, name: `Unit ${unit}`, total: rows.length, contentDefects, abilityGaps, flagged: contentDefects + abilityGaps }
    }), [])
  const summary = {
    total: dashboardMockItems.length,
    flagged: verdictCounts['Content defect'] + verdictCounts['Ability gap'],
    clean: verdictCounts.Clean,
    health: Math.round(((dashboardMockItems.length - verdictCounts['Content defect']) / dashboardMockItems.length) * 100),
    confirmed: dashboardMockItems.filter((item) => (reviewDecisions[item.id] || item.reviewStatus) === 'Confirmed').length,
    averageConfidence: Math.round(dashboardMockItems.reduce((total, item) => total + item.twinAgreement, 0) / dashboardMockItems.length),
  }
  const flaggedItems = [...dashboardMockItems]
    .filter((item) => item.verdict !== 'Clean')
    .sort((first, second) => severityRank[second.severity] - severityRank[first.severity]
      || first.twinAgreement - second.twinAgreement)
  const verdictData = verdictLabels.map((name) => ({
    name,
    value: verdictCounts[name],
    color: name === 'Content defect' ? palette.contentDefect : name === 'Ability gap' ? palette.abilityGap : palette.clean,
  }))

  const togglePersona = (persona) => {
    setSelectedPersonas((current) => current.includes(persona)
      ? current.filter((selected) => selected !== persona)
      : [...current, persona])
  }

  const decideReview = (itemId, status) => {
    const item = dashboardMockItems.find((entry) => entry.id === itemId)
    if (!item) return
    setUndoDecisions((current) => ({ ...current, [itemId]: reviewDecisions[itemId] || item.reviewStatus }))
    setReviewDecisions((current) => {
      const next = { ...current, [itemId]: status }
      try {
        localStorage.setItem(reviewStorageKey, JSON.stringify(next))
      } catch {
        // Keep this review decision active in memory when storage is unavailable.
      }
      return next
    })
  }

  const undoReview = (itemId) => {
    const previous = undoDecisions[itemId]
    if (!previous) return
    setReviewDecisions((current) => {
      const next = { ...current, [itemId]: previous }
      try {
        localStorage.setItem(reviewStorageKey, JSON.stringify(next))
      } catch {
        // Keep the undo in memory if storage is unavailable.
      }
      return next
    })
    setUndoDecisions((current) => {
      const next = { ...current }
      delete next[itemId]
      return next
    })
  }

  const exportReport = () => {
    const headers = ['item', 'unit', 'verdict', 'severity', 'agreement', 'status']
    const rows = reportRows.map((row) => [row.item, row.unit, row.verdict, row.severity, row.agreement, row.status]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    const url = URL.createObjectURL(new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'shadow-twin-report.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const renderContent = () => {
    if (topic.kind === 'overview') {
      const stats = [
        { label: 'Items analysed', value: summary.total },
        { label: 'Flagged defects', value: summary.flagged },
        { label: 'Faculty confirmed %', value: `${summary.flagged ? Math.round((summary.confirmed / summary.flagged) * 100) : 0}%` },
        { label: 'Avg twin confidence', value: `${summary.averageConfidence}%` },
      ]
      return (
        <div className="space-y-5">
          <div className="flex justify-end"><Badge tone="brand">Last analysis: {formatAnalysisDate(currentCourse.lastAnalysis)}</Badge></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => <Card key={stat.label} className="p-5"><p className="text-sm text-muted">{stat.label}</p><p className="mt-3 text-3xl font-bold text-heading">{stat.value}</p></Card>)}
          </div>
          <Card className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div><h3 className="text-lg font-semibold text-heading">Course health</h3><p className="mt-2 text-4xl font-bold tabular-nums text-heading">{summary.health}%</p><p className="mt-2 text-sm text-muted">Target: 90% before the exam paper is finalised</p></div>
              <div className="w-full sm:w-64"><div role="progressbar" aria-label="Course health" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.health} className="h-3 overflow-hidden rounded-full bg-border/30"><div className="h-full rounded-full bg-primary" style={{ width: `${summary.health}%` }} /></div><div className="mt-2 flex justify-between text-xs text-muted"><span>0%</span><span>100%</span></div></div>
            </div>
          </Card>
        </div>
      )
    }

    if (topic.kind === 'flagged-units') {
      return (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          <Card className="min-w-0 p-5">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={units}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis dataKey="name" tick={{ fill: palette.axis }} />
                <YAxis allowDecimals={false} tick={{ fill: palette.axis }} label={{ value: 'Items', angle: -90, position: 'insideLeft', fill: palette.axis }} />
                <Tooltip cursor={{ fill: 'rgb(var(--color-surface-tint) / 0.08)' }} contentStyle={{ backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }} />
                <Bar dataKey="contentDefects" name="Content defects" stackId="flagged" fill={palette.contentDefect} />
                <Bar dataKey="abilityGaps" name="Ability gaps" stackId="flagged" fill={palette.abilityGap} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="space-y-4 p-5">
            {units.map((unit) => <Link key={unit.unit} to={`/content?unit=${unit.unit}&verdict=flagged`} className="block rounded-lg p-2 hover:bg-bg"><div className="flex justify-between text-sm"><span>{unit.name}</span><span>{unit.flagged} of {unit.total} flagged</span></div><div className="mt-2 h-2 rounded-full bg-border/30"><div className="h-full rounded-full bg-danger" style={{ width: `${(unit.flagged / unit.total) * 100}%` }} /></div></Link>)}
          </Card>
        </div>
      )
    }

    if (topic.kind === 'verdicts') {
      return (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="p-5">
            <div className="relative h-72" role="img" aria-label={`Verdict split for ${summary.total} items`}>
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={verdictData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={4}>{verdictData.map((row) => <Cell key={row.name} fill={row.color} />)}</Pie><Tooltip contentStyle={{ backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }} /></PieChart></ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl">{summary.total}</strong><span className="text-sm text-muted">items</span></div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">{verdictData.map((row) => <span key={row.name} className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />{row.name}</span>)}</div>
          </Card>
          <Card className="overflow-x-auto p-5"><table className="min-w-[520px] w-full text-left text-sm"><thead className="border-b border-border text-muted"><tr><th className="pb-3">Verdict</th><th className="pb-3">Items</th><th className="pb-3">Share</th></tr></thead><tbody>{verdictData.map((row) => <tr key={row.name} className="border-b border-border/40"><td className="py-3"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} /><VerdictChip verdict={row.name} /></span></td><td>{row.value}</td><td>{Math.round((row.value / summary.total) * 100)}%</td></tr>)}</tbody></table></Card>
        </div>
      )
    }

    if (topic.kind === 'attention') {
      return <div className="space-y-3">{flaggedItems.map((item) => {
        const status = reviewDecisions[item.id] || item.reviewStatus
        return <Card id={`attention-${item.id}`} key={item.id} className="scroll-mt-24 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><Link to={`/content/${item.id}`} className="font-semibold text-heading hover:text-primary/80">{item.title}</Link><p className="mt-1 text-sm text-muted">Unit {item.unit} · Twin agreement {item.twinAgreement}%</p><p className="mt-2 text-sm text-text">{item.reason}</p><div className="mt-3 flex flex-wrap items-center gap-2"><VerdictChip verdict={item.verdict} /><SeverityChip severity={item.severity} />{status !== 'Open' && <Chip kind="status">{status}</Chip>}{status !== 'Open' && undoDecisions[item.id] && <button type="button" onClick={() => undoReview(item.id)} className="rounded-md px-2 py-1 text-xs font-semibold text-muted underline underline-offset-2 hover:text-text">Undo</button>}</div></div>{status === 'Open' && <div className="flex shrink-0 gap-2"><button type="button" onClick={() => decideReview(item.id, 'Confirmed')} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-fg">Confirm</button><button type="button" onClick={() => decideReview(item.id, 'Dismissed')} className="rounded-lg border border-surface-tint bg-surface-tint px-3 py-2 text-sm font-semibold text-primary hover:bg-surface-tint/80">Dismiss</button></div>}</Card>
      })}</div>
    }

    if (topic.kind === 'courses') {
      return <div className="grid gap-4 lg:grid-cols-2">{mockCourses.map((course) => <Card key={course.id} className="p-5"><p className="text-xs uppercase tracking-wider text-muted">{course.code}</p><h3 className="mt-2 text-xl font-semibold text-heading">{course.title}</h3><p className="mt-3 text-sm text-muted">{course.units} units · Last analysed {course.lastAnalysis}</p><span className="mt-4 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-fg">{course.status}</span></Card>)}</div>
    }

    if (topic.kind === 'upload') {
      return <Card className="max-w-3xl p-6"><h3 className="text-lg font-semibold text-heading">Upload to {currentCourse.title}</h3><label className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-bg p-6 text-center text-muted hover:border-primary"><Upload aria-hidden="true" className="mb-3 h-8 w-8 text-primary" /><span>Select slide decks or question files</span><input type="file" multiple className="sr-only" onChange={(event) => setFiles((existing) => [...existing, ...Array.from(event.target.files || []).map((file) => file.name)])} /></label>{files.length > 0 && <ul className="mt-5 divide-y divide-border/40">{files.map((file) => <li key={file} className="py-3 text-sm">{file}<span className="float-right text-muted">Ready</span></li>)}</ul>}</Card>
    }

    if (topic.kind === 'progress') {
      const steps = ['Uploaded', 'Text extracted', 'Twin attempts running', 'Classifying', 'Ready']
      return <Card className="p-6"><h3 className="text-lg font-semibold text-heading">{currentCourse.title}</h3><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">{steps.map((step, index) => <div key={step} className="flex items-center gap-3 lg:flex-col"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg">{index + 1}</span><span className="text-sm text-muted lg:text-center">{step}</span></div>)}</div></Card>
    }

    if (topic.kind === 'content') {
      const visibleItems = currentItems.filter((item) => (
        topic.filter === 'all'
        || (topic.filter === 'flagged' && item.verdict !== 'Clean')
        || item.type === topic.filter
      ))
      return visibleItems.length
        ? <div className="space-y-3">{visibleItems.map((item) => <Card key={item.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-xs uppercase tracking-wide text-muted">{item.type} · Unit {item.unit}</span><h3 className="mt-1 font-semibold text-heading"><Link to={`/content/${item.id}`}>{item.title}</Link></h3><p className="mt-2 text-sm text-muted">{item.content}</p></div><div className="flex gap-2"><VerdictChip verdict={item.verdict} /><SeverityChip severity={item.severity} /></div></div></Card>)}</div>
        : <EmptyState icon={FileText} title="No items in this view" description="Choose another course or view all course materials." action={<Link className="text-sm font-semibold text-primary hover:underline" to="/content">Open course content</Link>} />
    }

    if (topic.kind === 'accuracy') {
      const confirmed = reportRows.filter((row) => row.status === 'Confirmed').length
      const averageAgreement = Math.round(reportRows.reduce((total, row) => total + row.agreement, 0) / reportRows.length)
      const stats = [{ label: 'Items in review sample', value: reportRows.length }, { label: 'Faculty confirmed', value: `${Math.round((confirmed / reportRows.length) * 100)}%` }, { label: 'Avg twin agreement', value: `${averageAgreement}%` }]
      return <div className="grid gap-4 md:grid-cols-3">{stats.map((stat) => <Card key={stat.label} className="p-5"><p className="text-sm text-muted">{stat.label}</p><p className="mt-3 text-3xl font-bold text-heading">{stat.value}</p></Card>)}</div>
    }

    if (topic.kind === 'defect-rate') {
      const rates = [...new Set(reportRows.map((row) => row.unit))].map((unit) => {
        const rows = reportRows.filter((row) => row.unit === unit)
        const defects = rows.filter((row) => row.verdict === 'Content defect').length
        return { unit, rate: Math.round((defects / rows.length) * 100) }
      })
      return <Card className="p-5"><ResponsiveContainer width="100%" height={320}><BarChart data={rates}><CartesianGrid strokeDasharray="3 3" stroke={palette.grid} /><XAxis dataKey="unit" tick={{ fill: palette.axis }} /><YAxis unit="%" tick={{ fill: palette.axis }} /><Tooltip contentStyle={{ backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }} /><Bar dataKey="rate" name="Content defect rate" fill={palette.contentDefect} radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></Card>
    }

    if (topic.kind === 'review') {
      return <Card className="overflow-x-auto p-5"><table className="min-w-[680px] w-full text-left text-sm"><thead className="border-b border-border text-muted"><tr>{['Item', 'Unit', 'Verdict', 'Severity', 'Agreement', 'Status'].map((heading) => <th key={heading} className="pb-3 pr-4">{heading}</th>)}</tr></thead><tbody>{reportRows.map((row) => <tr key={row.id} className="border-b border-border/40"><td className="py-3 pr-4"><Link to={`/content/${row.id}`} className="font-medium text-heading">{row.item}</Link></td><td className="pr-4">{row.unit}</td><td className="pr-4"><VerdictChip verdict={row.verdict} /></td><td className="pr-4"><SeverityChip severity={row.severity} /></td><td className="pr-4">{row.agreement}%</td><td>{row.status}</td></tr>)}</tbody></table></Card>
    }

    if (topic.kind === 'export') {
      return <Card className="max-w-2xl p-6"><FileText aria-hidden="true" className="h-8 w-8 text-primary" /><h3 className="mt-4 text-lg font-semibold text-heading">Quality report export</h3><p className="mt-2 text-sm text-muted">Download {reportRows.length} reviewed sample rows with verdict, severity, agreement and status.</p><button type="button" onClick={exportReport} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-fg"><Download aria-hidden="true" className="h-4 w-4" />Export CSV</button></Card>
    }

    if (topic.kind === 'runs') {
      return <Card className="max-w-2xl p-6"><label htmlFor="runs-per-item" className="flex items-center justify-between font-medium"><span>Runs for each item</span><output htmlFor="runs-per-item" className="text-heading">{runsPerItem}</output></label><input id="runs-per-item" type="range" min="3" max="10" value={runsPerItem} onChange={(event) => setRunsPerItem(Number(event.target.value))} className="mt-6 w-full accent-primary" /><div className="mt-2 flex justify-between text-xs text-muted"><span>3 runs</span><span>10 runs</span></div></Card>
    }

    if (topic.kind === 'personas') {
      return <Card className="max-w-2xl p-6"><h3 className="font-semibold text-heading">Learner personas</h3><p className="mt-2 text-sm text-muted">Select the perspectives used during the next analysis.</p><div className="mt-5 flex flex-wrap gap-3">{settingsConfig.personas.map((persona) => { const selected = selectedPersonas.includes(persona); return <button key={persona} type="button" aria-pressed={selected} onClick={() => togglePersona(persona)} className={`rounded-full border px-4 py-2 text-sm font-medium ${selected ? 'border-accent bg-accent text-accent-fg' : 'border-surface-tint bg-surface-tint text-primary'}`}>{persona}</button> })}</div><p className="mt-4 text-sm text-muted">{selectedPersonas.length} personas selected</p></Card>
    }

    return <Card className="max-w-2xl p-6"><label htmlFor="confidence-threshold" className="flex items-center justify-between font-medium"><span>Confidence threshold</span><output htmlFor="confidence-threshold" className="text-heading">{confidenceThreshold}%</output></label><input id="confidence-threshold" type="range" min="40" max="95" value={confidenceThreshold} onChange={(event) => setConfidenceThreshold(Number(event.target.value))} className="mt-6 w-full accent-primary" /><div className="mt-2 flex justify-between text-xs text-muted"><span>40%</span><span>95%</span></div></Card>
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={topic.groupLabel} title={topic.label} description={topic.description} />
      {renderContent()}
    </div>
  )
}