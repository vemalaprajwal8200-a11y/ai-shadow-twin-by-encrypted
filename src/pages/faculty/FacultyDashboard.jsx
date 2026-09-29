import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../../components/dashboard/DashboardPrimitives'
import { EmptyState } from '../../components/ui/Primitives'
import { getStudents } from '../../data/api'
import { mockCourses, courseItems, dashboardMetrics } from '../../data/mockData'
import { dashboardMockItems } from '../../data/dashboardMockData'
import { useAuth } from '../../auth/AuthContext'

// ─── helpers ────────────────────────────────────────────────────────────────

const statusStyle = {
  'On track': { bg: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  'Needs support': { bg: 'bg-ambiguous/15 text-ink', dot: 'bg-ambiguous' },
  'At risk': { bg: 'bg-danger/10 text-danger', dot: 'bg-danger' },
}

function StatusPill({ status }) {
  const style = statusStyle[status] || statusStyle['On track']
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  )
}

function ScoreBar({ score, label }) {
  const color = score >= 75 ? 'bg-primary' : score >= 60 ? 'bg-ambiguous' : 'bg-danger'
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 shrink-0 text-right text-sm tabular-nums">{score}%</span>
      <span
        className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-border/30"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <span className={`block h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </span>
    </div>
  )
}

function KpiTile({ label, value, icon: Icon, accent, sub }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div className={`rounded-xl p-2 ${accent}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-heading">{value}</p>
      <p className="mt-1 text-sm font-medium text-text">{label}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  )
}

// ─── content-defect summary ──────────────────────────────────────────────────

function ContentHealthCard() {
  const flagged = dashboardMockItems.filter((i) => i.verdict !== 'Clean')
  const defects = flagged.filter((i) => i.verdict === 'Content defect').length
  const gaps = flagged.filter((i) => i.verdict === 'Ability gap').length
  const highSeverity = flagged.filter((i) => i.severity === 'High').length
  const confirmed = flagged.filter((i) => i.reviewStatus === 'Confirmed').length

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-heading">Content health</h2>
        <Link to="/report" className="text-xs font-medium text-primary hover:underline">
          Full report →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total items', value: dashboardMetrics.totalItems, color: 'text-heading' },
          { label: 'Flagged items', value: dashboardMetrics.flaggedItems, color: 'text-danger' },
          { label: 'Content defects', value: defects, color: 'text-danger' },
          { label: 'Ability gaps', value: gaps, color: 'text-warn' },
          { label: 'High severity', value: highSeverity, color: 'text-danger' },
          { label: 'Faculty confirmed', value: confirmed, color: 'text-primary' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-bg p-3">
            <p className="text-[11px] text-muted">{label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Items needing review</p>
        {dashboardMockItems
          .filter((i) => i.verdict !== 'Clean' && i.reviewStatus === 'Open')
          .slice(0, 4)
          .map((item) => (
            <Link
              key={item.id}
              to={`/topics/dashboard/attention?itemId=${encodeURIComponent(item.id)}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-surface px-3 py-2 text-sm hover:bg-surface-tint/40"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-heading">{item.title}</span>
                <span className="text-xs text-muted">Unit {item.unit} · {item.verdict}</span>
              </span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                item.verdict === 'Content defect' ? 'bg-danger/10 text-danger' : 'bg-ambiguous/15 text-ink'
              }`}>
                {item.severity}
              </span>
            </Link>
          ))}
        <Link to="/topics/dashboard/attention" className="block pt-1 text-center text-xs font-medium text-primary hover:underline">
          View all flagged items →
        </Link>
      </div>
    </Card>
  )
}

// ─── at-risk students panel ───────────────────────────────────────────────────

function AtRiskPanel({ students }) {
  const atRisk = students
    .filter((s) => s.status === 'At risk' || s.status === 'Needs support')
    .sort((a, b) => {
      const rank = { 'At risk': 2, 'Needs support': 1, 'On track': 0 }
      return rank[b.status] - rank[a.status] || a.overallScore - b.overallScore
    })
    .slice(0, 6)

  if (atRisk.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="mb-4 font-semibold text-heading">Students needing support</h2>
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted">All students are on track 🎉</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-heading">Students needing support</h2>
        <Link to="/dashboard" className="text-xs font-medium text-primary hover:underline">
          Full roster →
        </Link>
      </div>
      <ul className="space-y-2">
        {atRisk.map((student) => {
          const initials = student.name.split(' ').map((p) => p[0]).join('').slice(0, 2)
          return (
            <li key={student.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-bg p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-heading">{student.name}</p>
                  <p className="text-xs text-muted">{student.rollNo} · {student.overallScore}%</p>
                </div>
              </div>
              <StatusPill status={student.status} />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

// ─── unit performance heatmap ────────────────────────────────────────────────

function UnitHeatmap({ students }) {
  if (students.length === 0) return null

  const unitAverages = [0, 1, 2].map((unitIndex) => {
    const total = students.reduce((sum, s) => sum + (s.unitScores[unitIndex] || 0), 0)
    return Math.round(total / students.length)
  })

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-heading">Class performance by unit</h2>
      <div className="space-y-4">
        {unitAverages.map((avg, index) => (
          <div key={index}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium text-text">Unit {index + 1}</span>
              <span className={`tabular-nums font-semibold ${
                avg >= 75 ? 'text-primary' : avg >= 60 ? 'text-ambiguous' : 'text-danger'
              }`}>{avg}% avg</span>
            </div>
            <ScoreBar score={avg} label={`Unit ${index + 1} class average`} />
            <p className="mt-1 text-xs text-muted">
              {students.filter((s) => (s.unitScores[index] || 0) < 60).length} students below 60%
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── score distribution ───────────────────────────────────────────────────────

function ScoreDistribution({ students }) {
  const buckets = [
    { label: '90–100%', min: 90, max: 100, color: 'bg-primary' },
    { label: '75–89%', min: 75, max: 90, color: 'bg-primary/60' },
    { label: '60–74%', min: 60, max: 75, color: 'bg-ambiguous' },
    { label: 'Below 60%', min: 0, max: 60, color: 'bg-danger' },
  ]

  const total = students.length || 1
  const counts = buckets.map((b) => ({
    ...b,
    count: students.filter((s) => s.overallScore >= b.min && s.overallScore < b.max).length,
  }))

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-heading">Score distribution</h2>
      <div className="space-y-3">
        {counts.map(({ label, count, color }) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-text">{label}</span>
              <span className="tabular-nums text-muted">{count} students</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-border/30">
              <div
                className={`h-full rounded-full transition-all ${color}`}
                style={{ width: `${(count / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportRosterCsv(students, courseTitle) {
  const header = ['Name', 'Roll No', 'Section', 'Overall Score', 'Unit 1', 'Unit 2', 'Unit 3', 'Missed Items', 'Status']
  const rows = students.map((s) => [
    s.name, s.rollNo, s.section, `${s.overallScore}%`,
    `${s.unitScores[0]}%`, `${s.unitScores[1]}%`, `${s.unitScores[2]}%`,
    s.missedItems.length, s.status,
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${courseTitle.toLowerCase().replace(/\s+/g, '-')}-roster.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── main component ───────────────────────────────────────────────────────────

/** @param {{ courseId: string }} props */
export default function FacultyDashboard({ courseId }) {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const course = useMemo(
    () => mockCourses.find((c) => c.id === courseId) || mockCourses[0],
    [courseId],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getStudents(courseId, user)
      .then((data) => { if (active) setStudents(data) })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load students.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [courseId, retryKey, user])

  const classAverage = students.length
    ? Math.round(students.reduce((s, st) => s + st.overallScore, 0) / students.length)
    : 0

  const atRiskCount = students.filter((s) => s.status === 'At risk').length
  const needsSupportCount = students.filter((s) => s.status === 'Needs support').length
  const onTrackCount = students.filter((s) => s.status === 'On track').length

  const kpis = [
    {
      label: 'Total students',
      value: loading ? '—' : students.length,
      icon: Users,
      accent: 'bg-primary/10 text-primary',
      sub: course.title,
    },
    {
      label: 'Class average',
      value: loading ? '—' : `${classAverage}%`,
      icon: BarChart3,
      accent: 'bg-primary/10 text-primary',
      sub: 'Overall score',
    },
    {
      label: 'Needing support',
      value: loading ? '—' : atRiskCount + needsSupportCount,
      icon: ShieldAlert,
      accent: 'bg-danger/10 text-danger',
      sub: `${atRiskCount} at risk · ${needsSupportCount} needs support`,
    },
    {
      label: 'On track',
      value: loading ? '—' : onTrackCount,
      icon: GraduationCap,
      accent: 'bg-primary/10 text-primary',
      sub: students.length ? `${Math.round((onTrackCount / students.length) * 100)}% of class` : '',
    },
    {
      label: 'Flagged content items',
      value: dashboardMetrics.flaggedItems,
      icon: AlertCircle,
      accent: 'bg-danger/10 text-danger',
      sub: `${dashboardMetrics.defectRate}% defect rate`,
    },
    {
      label: 'Twin confidence',
      value: `${dashboardMetrics.averageTwinConfidence}%`,
      icon: ShieldCheck,
      accent: 'bg-primary/10 text-primary',
      sub: 'Average across analyses',
    },
    {
      label: 'Faculty confirmed',
      value: dashboardMetrics.facultyConfirmed,
      icon: CheckCircle2,
      accent: 'bg-primary/10 text-primary',
      sub: 'Items reviewed',
    },
    {
      label: 'Course units',
      value: course.units,
      icon: BookOpen,
      accent: 'bg-primary/10 text-primary',
      sub: `Last analysed ${course.lastAnalysis}`,
    },
  ]

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        eyebrow="FACULTY DASHBOARD"
        title="Class overview"
        description={`Monitor student performance and course content health for ${course.title}.`}
        actions={
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted">
              {course.code}
            </span>
            {!loading && students.length > 0 && (
              <button
                type="button"
                onClick={() => exportRosterCsv(students, course.title)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-tint/40"
              >
                <ArrowDownToLine aria-hidden="true" className="h-3.5 w-3.5" />
                Export CSV
              </button>
            )}
          </div>
        }
      />

      {/* KPI tiles */}
      <section aria-label="Summary metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ label, value, icon, accent, sub }) => (
          <KpiTile key={label} label={label} value={value} icon={icon} accent={accent} sub={sub} />
        ))}
      </section>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          <p className="font-medium">Could not load student data</p>
          <p className="mt-1 text-xs opacity-80">{error}</p>
          <button
            type="button"
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-3 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-border/30 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {/* Main content */}
      {!loading && !error && (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <UnitHeatmap students={students} />
            <ScoreDistribution students={students} />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <ContentHealthCard />
            <AtRiskPanel students={students} />
          </div>

          {/* Quick navigation links */}
          <Card className="p-5">
            <h2 className="mb-4 font-semibold text-heading">Quick access</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'Student roster', description: 'View all students with scores and status', to: '/dashboard' },
                { label: 'Flagged items', description: 'Highest priority items needing review', to: '/topics/dashboard/attention' },
                { label: 'Course overview', description: 'Analysis totals and twin confidence', to: '/topics/dashboard/overview' },
                { label: 'Course content', description: 'Browse all slides and questions', to: '/content' },
                { label: 'Quality report', description: 'Accuracy metrics and defect rates', to: '/report' },
                { label: 'Analysis settings', description: 'Adjust runs, personas, confidence', to: '/settings' },
              ].map(({ label, description, to }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-bg p-3.5 transition-colors hover:bg-surface-tint/40"
                >
                  <div>
                    <p className="text-sm font-medium text-heading">{label}</p>
                    <p className="mt-0.5 text-xs text-muted">{description}</p>
                  </div>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </Card>

          {students.length === 0 && !error && (
            <EmptyState
              title="No students enrolled yet"
              description="Students will appear here once they are enrolled in this course."
            />
          )}
        </>
      )}
    </div>
  )
}
