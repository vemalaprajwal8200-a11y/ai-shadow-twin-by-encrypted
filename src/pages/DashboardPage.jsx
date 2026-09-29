import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, ArrowRight, Check, CheckCircle2, FileText, Percent, RotateCcw, X } from 'lucide-react'
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
import { Link, useLocation } from 'react-router-dom'
import { Card, Chip, KpiCard, Section, SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'
import { getDashboardMockData } from '../data/dashboardMockData'
import { chartPalette } from '../data/chartPalette'
import { useThemeMode } from '../hooks/useThemeMode'

const verdictExplanations = {
  'Content defect': 'The item itself may be inaccurate or unclear.',
  'Ability gap': 'The content appears sound, but learners may need more support.',
  Clean: 'No consistent content issue was identified.',
}

const severityRank = { High: 3, Medium: 2, Low: 1 }

/** @param {{ active?: boolean, payload?: Array<{ name?: string, value?: number, color?: string }>, label?: string | number, palette: import('../data/chartPalette').ChartPaletteSet }} props */
function ChartTooltip({ active, payload, label, palette }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border px-3 py-2 text-sm shadow-lg" style={{ backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }}>
      {label != null && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}: {entry.value}</span>
        </p>
      ))}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse motion-reduce:animate-none" aria-label="Loading dashboard" aria-busy="true">
      <div className="space-y-2"><div className="h-3 w-24 rounded bg-border/30" /><div className="h-8 w-56 rounded bg-border/30" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 rounded-2xl bg-border/30" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-80 rounded-2xl bg-border/30" />
        <div className="h-80 rounded-2xl bg-border/30" />
      </div>
    </div>
  )
}

/** @param {{ courseId: string }} props */
export default function DashboardPage({ courseId }) {
  const location = useLocation()
  const darkMode = useThemeMode()
  const palette = chartPalette[darkMode ? 'dark' : 'light']
  const verdictColors = {
    'Content defect': palette.contentDefect,
    'Ability gap': palette.abilityGap,
    Clean: palette.clean,
  }
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryToken, setRetryToken] = useState(0)
  const [reviewDecisions, setReviewDecisions] = useState({})
  const [undoDecisions, setUndoDecisions] = useState({})

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      setLoading(true)
      setError('')
      try {
        const result = await getDashboardMockData(courseId)
        if (active) {
          setDashboard(result)
          setReviewDecisions({})
          setUndoDecisions({})
        }
      } catch (loadError) {
        if (active) {
          setDashboard(null)
          setError(loadError instanceof Error ? loadError.message : 'The dashboard could not be loaded.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadDashboard()
    return () => { active = false }
  }, [courseId, retryToken])

  useEffect(() => {
    if (loading) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = prefersReducedMotion ? 'auto' : 'smooth'
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior })
      return
    }

    const legacyTargets = {
      'flagged-items-per-unit': 'flagged',
      'verdict-split': 'verdicts',
      'needs-attention': 'attention',
    }
    const hashId = decodeURIComponent(location.hash.slice(1))
    const targetId = legacyTargets[hashId] || hashId
    document.getElementById(targetId)?.scrollIntoView({ behavior, block: 'start' })
  }, [location.hash, location.key, loading])

  const summary = useMemo(() => {
    if (!dashboard?.items.length) return null

    const { items } = dashboard
    const byVerdict = items.reduce((counts, item) => {
      counts[item.verdict] += 1
      return counts
    }, { 'Content defect': 0, 'Ability gap': 0, Clean: 0 })
    const unitIds = [...new Set(items.map((item) => item.unit))].sort((a, b) => a - b)
    const units = unitIds.map((unit) => {
      const unitItems = items.filter((item) => item.unit === unit)
      const contentDefects = unitItems.filter((item) => item.verdict === 'Content defect').length
      const abilityGaps = unitItems.filter((item) => item.verdict === 'Ability gap').length
      return {
        unit,
        name: `Unit ${unit}`,
        total: unitItems.length,
        contentDefects,
        abilityGaps,
        flagged: contentDefects + abilityGaps,
      }
    })
    const verdicts = ['Content defect', 'Ability gap', 'Clean'].map((name) => {
      const verdictItems = items.filter((item) => item.verdict === name)
      const count = verdictItems.length
      return {
        name,
        value: count,
        share: Math.round((count / items.length) * 100),
        avgAgreement: count
          ? Math.round(verdictItems.reduce((total, item) => total + item.twinAgreement, 0) / count)
          : 0,
        color: verdictColors[name],
        explanation: verdictExplanations[name],
      }
    })
    const flaggedItems = items.filter((item) => item.verdict !== 'Clean')
    const confirmedCount = flaggedItems.filter((item) => (
      (reviewDecisions[item.id] || item.reviewStatus) === 'Confirmed'
    )).length
    const averageTwinConfidence = Math.round(
      items.reduce((total, item) => total + item.twinAgreement, 0) / items.length,
    )
    const itemsWithoutContentDefect = items.length - byVerdict['Content defect']

    return {
      totalItems: items.length,
      flaggedItems: flaggedItems.length,
      confirmedCount,
      facultyConfirmedPercent: Math.round((confirmedCount / flaggedItems.length) * 100),
      averageTwinConfidence,
      healthScore: Math.round((itemsWithoutContentDefect / items.length) * 100),
      units,
      verdicts,
      flaggedForReview: [...flaggedItems]
        .sort((left, right) => severityRank[right.severity] - severityRank[left.severity]
          || left.twinAgreement - right.twinAgreement)
        .slice(0, 5),
    }
  }, [dashboard, reviewDecisions, palette])

  const handleDecision = (itemId, nextStatus) => {
    const item = dashboard.items.find((entry) => entry.id === itemId)
    if (!item) return
    const currentStatus = reviewDecisions[itemId] || item.reviewStatus
    setUndoDecisions((current) => ({ ...current, [itemId]: currentStatus }))
    setReviewDecisions((current) => ({ ...current, [itemId]: nextStatus }))
  }

  const undoDecision = (itemId) => {
    const previousStatus = undoDecisions[itemId]
    if (!previousStatus) return
    setReviewDecisions((current) => ({ ...current, [itemId]: previousStatus }))
    setUndoDecisions((current) => {
      const next = { ...current }
      delete next[itemId]
      return next
    })
  }

  if (loading) return <DashboardSkeleton />

  if (error) {
    return (
      <Card className="p-8 text-center">
        <AlertTriangle aria-hidden="true" className="mx-auto h-8 w-8 text-danger" />
        <h2 className="mt-3 text-xl font-bold text-heading">Dashboard unavailable</h2>
        <p role="alert" className="mt-2 text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={() => setRetryToken((token) => token + 1)}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" /> Retry
        </button>
      </Card>
    )
  }

  if (!dashboard?.items.length || !summary) {
    return (
      <Card className="p-8 text-center">
        <Activity aria-hidden="true" className="mx-auto h-8 w-8 text-primary" />
        <h2 className="mt-3 text-xl font-bold text-heading">No analysis yet</h2>
        <p className="mt-2 text-sm text-muted">Run an analysis to see course health and review flagged items.</p>
        <Link
          to="/courses"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg"
        >
          Go to courses <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Card>
    )
  }

  const kpis = [
    { label: 'Items analysed', value: summary.totalItems, to: '/content', icon: FileText, accent: 'bg-primary/10 text-primary' },
    { label: 'Flagged defects', value: summary.flaggedItems, to: '/content?verdict=flagged', icon: AlertTriangle, accent: 'bg-danger/10 text-danger' },
    { label: 'Faculty confirmed %', value: `${summary.facultyConfirmedPercent}%`, to: '/content?verdict=flagged', icon: Percent, accent: 'bg-warn/10 text-warn' },
    { label: 'Avg twin confidence', value: `${summary.averageTwinConfidence}%`, to: '/report', icon: CheckCircle2, accent: 'bg-primary text-primary-fg' },
  ]

  return (
    <div className="space-y-10 pb-8">
      <Section
        id="overview"
        eyebrow="Overview"
        title="Course dashboard"
        aside={<span className="inline-flex w-fit items-center rounded-lg border border-accent bg-accent px-3 py-2 text-sm font-medium text-accent-fg">Last analysis: {dashboard.lastAnalysis}</span>}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </div>
        <Card className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Course health</p>
            <p className="mt-2 text-4xl font-bold text-primary">{summary.healthScore}%</p>
            <p className="mt-2 text-sm text-muted">Target: 90% before the exam paper is finalised</p>
          </div>
          <div className="w-full md:w-64">
            <div
              role="progressbar"
              aria-label="Course health, items without content defects"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.healthScore}
              aria-valuetext={`${summary.healthScore}% of items have no content defect`}
              className="h-3 overflow-hidden rounded-full bg-border/30"
            >
              <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${summary.healthScore}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted"><span>0%</span><span>100%</span></div>
          </div>
        </Card>
      </Section>

      <Section id="flagged" eyebrow="Breakdown" title="Flagged items per unit">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[1.45fr_0.8fr]">
          <Card className="min-w-0 p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {['Content defect', 'Ability gap'].map((verdict) => (
                <span key={verdict} className="inline-flex items-center gap-2 text-text">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: verdictColors[verdict] }} />{verdict}
                </span>
              ))}
            </div>
            <div role="img" aria-label="Stacked bar chart showing content defects and ability gaps for each unit">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary.units} margin={{ top: 8, right: 12, bottom: 8, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} opacity={1} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: palette.axis, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: palette.axis, fontSize: 12 }} label={{ value: 'Items', angle: -90, position: 'insideLeft', fill: palette.axis }} />
                  <Tooltip content={<ChartTooltip palette={palette} />} />
                  <Bar dataKey="contentDefects" name="Content defects" stackId="flagged" fill={verdictColors['Content defect']} />
                  <Bar dataKey="abilityGaps" name="Ability gaps" stackId="flagged" fill={verdictColors['Ability gap']} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold text-heading">Unit review</h3>
            <div className="mt-4 space-y-5">
              {summary.units.map((unit) => (
                <Link
                  key={unit.unit}
                  to={`/content?unit=${unit.unit}&verdict=flagged`}
                  className="block rounded-lg"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-text">{unit.name}</span>
                    <span className="shrink-0 text-muted">{unit.flagged} of {unit.total} flagged</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${unit.name} flagged items`}
                    aria-valuemin={0}
                    aria-valuemax={unit.total}
                    aria-valuenow={unit.flagged}
                    className="mt-2 h-2 overflow-hidden rounded-full bg-border/30"
                  >
                    <div className="h-full rounded-full bg-danger" style={{ width: `${(unit.flagged / unit.total) * 100}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      <Section id="verdicts" eyebrow="Classification" title="Verdict split">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[0.8fr_1.5fr]">
          <Card className="p-4 sm:p-5">
            <h3 className="text-base font-semibold text-heading">All analysed items</h3>
            <div className="relative mt-2 h-60" role="img" aria-label={`Verdict distribution across ${summary.totalItems} analysed items`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.verdicts} dataKey="value" nameKey="name" innerRadius={66} outerRadius={96} paddingAngle={3}>
                    {summary.verdicts.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip palette={palette} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-primary">{summary.totalItems}</span>
                <span className="text-xs text-muted">items</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {summary.verdicts.map((entry) => (
                <span key={entry.name} className="inline-flex items-center gap-2 text-text">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name}
                </span>
              ))}
            </div>
          </Card>

          <Card className="min-w-0 p-4 sm:p-5">
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <caption className="sr-only">Verdict counts, share, average twin agreement, and interpretation</caption>
                <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="pb-3 pr-4">Verdict</th>
                    <th scope="col" className="pb-3 pr-4">Items</th>
                    <th scope="col" className="pb-3 pr-4">Share</th>
                    <th scope="col" className="pb-3 pr-4">Avg agreement</th>
                    <th scope="col" className="pb-3">Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {summary.verdicts.map((entry) => (
                    <tr key={entry.name}>
                      <th scope="row" className="py-3 pr-4 font-medium text-text">
                        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} /><VerdictChip verdict={entry.name} /></span>
                      </th>
                      <td className="py-3 pr-4 text-text">{entry.value}</td>
                      <td className="py-3 pr-4 text-text">{entry.share}%</td>
                      <td className="py-3 pr-4 text-text">{entry.avgAgreement}%</td>
                      <td className="py-3 text-muted">{entry.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 rounded-lg bg-bg p-3 text-sm text-muted">
              Content defects show lower twin agreement, while ability gaps show higher agreement that learners may need more support.
            </p>
          </Card>
        </div>
      </Section>

      <Section
        id="attention"
        eyebrow="Review queue"
        title="Needs attention"
        aside={<Link to="/content?verdict=flagged" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80">View all flagged <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>}
      >
        <div className="space-y-3">
          {summary.flaggedForReview.map((item) => {
            const status = reviewDecisions[item.id] || item.reviewStatus
            const undoStatus = undoDecisions[item.id]
            return (
              <Card key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link to={`/content/${item.id}`} className="text-base font-semibold text-primary hover:text-primary/80">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">Unit {item.unit} <span aria-hidden="true">·</span> Twin agreement {item.twinAgreement}%</p>
                    <p className="mt-2 text-sm text-text">{item.reason}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <VerdictChip verdict={item.verdict} />
                      <SeverityChip severity={item.severity} />
                      {status !== 'Open' && <Chip kind="status">{status}</Chip>}
                      {status !== 'Open' && undoStatus && (
                        <button
                          type="button"
                          onClick={() => undoDecision(item.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted underline decoration-muted underline-offset-2 hover:text-text"
                        >
                          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Undo
                        </button>
                      )}
                    </div>
                  </div>
                  {status === 'Open' && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecision(item.id, 'Confirmed')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-fg hover:bg-primary/90"
                      >
                        <Check aria-hidden="true" className="h-4 w-4" /> Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(item.id, 'Dismissed')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text hover:bg-surface"
                      >
                        <X aria-hidden="true" className="h-4 w-4" /> Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
