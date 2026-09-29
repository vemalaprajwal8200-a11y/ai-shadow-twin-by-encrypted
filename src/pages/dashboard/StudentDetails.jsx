import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  ChevronRight,
  Info,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/dashboard/DashboardPrimitives'
import { getStudents } from '../../data/api'
import { mockCourses } from '../../data/mockData'
import { useAuth } from '../../auth/AuthContext'

const statusRank = { 'At risk': 3, 'Needs support': 2, 'On track': 1 }
const statusStyle = {
  'On track': 'bg-primary/10 text-primary',
  'Needs support': 'bg-warn/10 text-warn',
  'At risk': 'bg-danger/10 text-danger',
}

/** @param {{ status: import('../../data/students').StudentStatus }} props */
function StudentStatusPill({ status }) {
  const Icon = status === 'On track' ? Check : status === 'At risk' ? AlertCircle : ShieldAlert
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[status]}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />{status}
    </span>
  )
}

/** @param {{ student: import('../../data/students').StudentRecord, adjustedScore: number, onOpen: () => void }} props */
function StudentMobileCard({ student, adjustedScore, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className="card w-full p-4 text-left transition-colors hover:bg-bg">
      <div className="flex items-start justify-between gap-3">
        <StudentIdentity student={student} />
        <ChevronRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-muted" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <span className="text-muted">Overall score</span><span className="text-right font-semibold tabular-nums">{student.overallScore}%</span>
        <span className="text-muted">Adjusted score</span><span className="text-right font-semibold tabular-nums">{adjustedScore}%</span>
        <span className="text-muted">Weakest topic</span><span className="truncate text-right">{student.weakestTopic}</span>
        <span className="text-muted">Missed items</span><span className="text-right tabular-nums">{student.missedItems.length}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <StudentStatusPill status={student.status} />
        <div className="flex gap-2 text-xs tabular-nums text-muted"><span>U1 {student.unitScores[0]}</span><span>U2 {student.unitScores[1]}</span><span>U3 {student.unitScores[2]}</span></div>
      </div>
    </button>
  )
}

/** @param {{ student: import('../../data/students').StudentRecord, titleId?: string }} props */
function StudentIdentity({ student, titleId }) {
  const initials = student.name.split(' ').map((part) => part[0]).join('').slice(0, 2)
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials}</span>
      <span className="min-w-0">
        <span id={titleId} className="block truncate font-semibold text-heading">{student.name}</span>
        <span className="block text-xs text-muted">{student.rollNo}</span>
      </span>
    </span>
  )
}

/** @param {{ score: number, label: string }} props */
function ScoreBar({ score, label }) {
  return (
    <div className="flex min-w-24 items-center gap-2">
      <span className="w-9 shrink-0 text-right text-sm tabular-nums">{score}%</span>
      <span className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-border/30" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
      </span>
    </div>
  )
}

/** @param {{ student: import('../../data/students').StudentRecord, students: import('../../data/students').StudentRecord[], onClose: () => void }} props */
function StudentDrawer({ student, students, onClose }) {
  const closeButtonRef = useRef(null)
  const adjustedScore = getAdjustedScore(student)
  const rank = [...students].sort((first, second) => second.overallScore - first.overallScore)
    .findIndex((row) => row.id === student.id) + 1

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const exportStudent = () => {
    const rows = [
      ['Student', student.name],
      ['Roll number', student.rollNo],
      ['Overall score', `${student.overallScore}%`],
      ['Adjusted score', `${adjustedScore}%`],
      ['Rank', `${rank} of ${students.length}`],
      ['Weakest topic', student.weakestTopic],
    ]
    const content = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${student.rollNo.toLowerCase()}-report.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button type="button" className="absolute inset-0 h-full w-full bg-bg/80 backdrop-blur-sm" aria-label="Close student details" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-labelledby="student-drawer-title" className="student-drawer relative flex h-full w-full max-w-[480px] flex-col border-l border-border bg-surface shadow-soft">
        <header className="flex items-start justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
          <div className="min-w-0">
            <StudentIdentity student={student} titleId="student-drawer-title" />
            <p className="mt-3 truncate text-sm text-muted">{student.email}</p>
            <div className="mt-3"><StudentStatusPill status={student.status} /></div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-muted" aria-label="Close student details">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Overall', `${student.overallScore}%`],
              ['Adjusted', `${adjustedScore}%`],
              ['Class rank', `${rank}/${students.length}`],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-bg p-3"><p className="text-[11px] text-muted">{label}</p><p className="mt-1 text-lg font-bold tabular-nums text-heading">{value}</p></div>)}
          </div>

          <section aria-labelledby="unit-performance-title">
            <h3 id="unit-performance-title" className="text-sm font-semibold text-heading">Performance by unit</h3>
            <div className="mt-3 space-y-3">
              {student.unitScores.map((score, index) => <ScoreBar key={index} score={score} label={`Unit ${index + 1} score`} />)}
            </div>
          </section>

          <section aria-labelledby="missed-items-title">
            <div className="flex items-center justify-between"><h3 id="missed-items-title" className="text-sm font-semibold text-heading">Missed items</h3><span className="text-xs text-muted">{student.missedItems.length} items</span></div>
            <ul className="mt-3 space-y-3">
              {student.missedItems.map((item) => {
                const verdict = item.verdict === 'content_defect'
                  ? { label: 'Content defect - not the student’s fault', classes: 'border-danger/30 bg-danger/10 text-danger' }
                  : item.verdict === 'ability_gap'
                    ? { label: 'Ability gap - needs practice', classes: 'border-warn/30 bg-warn/10 text-warn' }
                    : { label: 'Genuine miss', classes: 'border-border bg-bg text-muted' }
                const content = (
                  <>
                    <span className="block truncate text-sm font-medium text-heading">{item.title}</span>
                    <span className="mt-1 block text-xs text-muted">Unit {item.unit} · {item.type}</span>
                    <span className={`mt-2 inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-semibold ${verdict.classes}`}>{verdict.label}</span>
                  </>
                )
                return (
                  <li key={`${item.itemId}-${item.verdict}`} className="rounded-xl border border-border/70 bg-bg p-3">
                    {item.verdict === 'ok'
                      ? content
                      : <Link to={`/topics/dashboard/attention?itemId=${encodeURIComponent(item.itemId)}`} onClick={onClose} className="block rounded-md">{content}</Link>}
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rounded-xl border border-border bg-bg p-4" aria-labelledby="next-step-title">
            <h3 id="next-step-title" className="text-xs font-semibold uppercase tracking-wide text-muted">Recommended next step</h3>
            <p className="mt-2 text-sm font-medium text-heading">Revise Unit {student.unitScores.indexOf(Math.min(...student.unitScores)) + 1}: {student.weakestTopic}</p>
          </section>
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-border/60 p-4 sm:p-5">
          <button type="button" disabled title="Coming soon" className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted disabled:cursor-not-allowed disabled:opacity-60">Message student</button>
          <button type="button" onClick={exportStudent} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-text hover:bg-bg"><ArrowDownToLine aria-hidden="true" className="h-4 w-4" />Export report</button>
        </footer>
      </aside>
    </div>
  )
}

function getAdjustedScore(student) {
  const contentDefects = student.missedItems.filter((item) => item.verdict === 'content_defect').length
  return Math.min(100, student.overallScore + contentDefects * 3)
}

/** @param {{ courseId: string }} props */
export default function StudentDetails({ courseId }) {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [unitFilter, setUnitFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Name')
  const [visibleCount, setVisibleCount] = useState(10)
  const [selectedStudent, setSelectedStudent] = useState(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setSelectedStudent(null)
    getStudents(courseId, user)
      .then((result) => { if (active) setStudents(result) })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load student records.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [courseId, retryKey, user])

  useEffect(() => setVisibleCount(10), [search, statusFilter, unitFilter, sortBy, courseId])

  const course = mockCourses.find((item) => item.id === courseId) || mockCourses[0]
  const classAverage = students.length
    ? Math.round(students.reduce((total, student) => total + student.overallScore, 0) / students.length)
    : 0
  const supportCount = students.filter((student) => student.status !== 'On track').length
  const adjustedAverage = students.length
    ? Math.round(students.reduce((total, student) => total + getAdjustedScore(student), 0) / students.length)
    : 0

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = students.filter((student) => {
      const matchesSearch = !query || student.name.toLowerCase().includes(query) || student.rollNo.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'All' || student.status === statusFilter
      const matchesUnit = unitFilter === 'All' || student.unitScores[Number(unitFilter) - 1] < 75
      return matchesSearch && matchesStatus && matchesUnit
    })
    if (sortBy === 'Score') rows.sort((first, second) => second.overallScore - first.overallScore)
    else if (sortBy === 'Risk') rows.sort((first, second) => statusRank[second.status] - statusRank[first.status] || first.overallScore - second.overallScore)
    else rows.sort((first, second) => first.name.localeCompare(second.name))
    return rows
  }, [students, search, statusFilter, unitFilter, sortBy])

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setUnitFilter('All')
    setSortBy('Name')
  }

  const openStudent = (student) => setSelectedStudent(student)
  const closeStudent = () => setSelectedStudent(null)

  const kpis = [
    ['Total students', students.length],
    ['Class average score', `${classAverage}%`],
    ['Students needing support', supportCount],
    ['Score adjusted for defective items', `${adjustedAverage}%`],
  ]

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted">DASHBOARD</p>
          <h1 className="mt-1 text-3xl font-bold text-heading">Student details</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Track how each student performs and see whether missed items reflect a learning gap or a content defect.</p>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-muted">{course.title}</span>
      </header>

      <section aria-label="Class summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(([label, value]) => (
          <Card key={label} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-muted">{label}</p>
              {label === 'Score adjusted for defective items' && <span className="group relative"><Info aria-label="Class average after excluding items flagged as content defects." title="Class average after excluding items flagged as content defects." className="h-4 w-4 text-muted" /></span>}
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums text-heading">{value}</p>
          </Card>
        ))}
      </section>

      <section aria-label="Student filters" className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or roll no" aria-label="Search students by name or roll number" className="w-full rounded-xl border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-muted/75" />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
          <label className="sr-only" htmlFor="student-status-filter">Status</label>
          <select id="student-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text">
            {['All', 'On track', 'Needs support', 'At risk'].map((status) => <option key={status}>{status}</option>)}
          </select>
          <label className="sr-only" htmlFor="student-unit-filter">Unit</label>
          <select id="student-unit-filter" value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)} className="min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text">
            <option value="All">All units</option><option value="1">Unit 1</option><option value="2">Unit 2</option><option value="3">Unit 3</option>
          </select>
          <label className="sr-only" htmlFor="student-sort">Sort students</label>
          <select id="student-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="min-w-0 rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text">
            {['Name', 'Score', 'Risk'].map((sort) => <option key={sort} value={sort}>Sort: {sort}</option>)}
          </select>
        </div>
        <p className="whitespace-nowrap text-sm text-muted" aria-live="polite">{filteredStudents.length} students</p>
      </section>

      {loading ? (
        <Card className="space-y-3 p-4" aria-label="Loading students" aria-busy="true">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 animate-pulse rounded-lg bg-border/30 motion-reduce:animate-none" />)}
        </Card>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertCircle aria-hidden="true" className="mx-auto h-7 w-7 text-danger" />
          <p role="alert" className="mt-3 text-sm text-muted">{error}</p>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg">Retry</button>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="font-semibold text-heading">No students match your filters</h2>
          <button type="button" onClick={clearFilters} className="mt-4 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg">Clear filters</button>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <div className="max-h-[calc(100vh-25rem)] overflow-auto">
              <table className="w-full min-w-[1050px] text-left text-sm" aria-label="Student performance roster">
                <thead className="sticky top-0 z-10 bg-surface text-xs uppercase tracking-wide text-muted shadow-[0_1px_0_rgb(var(--border)_/_var(--border-opacity))]">
                  <tr>
                    <th scope="col" className="px-4 py-3">Student</th>
                    <th scope="col" className="px-3 py-3">Overall</th>
                    <th scope="col" className="px-3 py-3">Unit 1</th>
                    <th scope="col" className="px-3 py-3">Unit 2</th>
                    <th scope="col" className="px-3 py-3">Unit 3</th>
                    <th scope="col" className="px-3 py-3">Weakest topic</th>
                    <th scope="col" className="px-3 py-3">Missed</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-3 py-3"><span className="sr-only">Open student</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredStudents.slice(0, visibleCount).map((student) => (
                    <tr key={student.id} tabIndex={0} aria-label={`Open details for ${student.name}`} onClick={() => openStudent(student)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openStudent(student) } }} className="cursor-pointer transition-colors hover:bg-bg focus-visible:bg-bg">
                      <th scope="row" className="px-4 py-3 font-medium"><StudentIdentity student={student} /></th>
                      <td className="px-3 py-3"><ScoreBar score={student.overallScore} label={`${student.name} overall score`} /></td>
                      {student.unitScores.map((score, index) => <td key={index} className="px-3 py-3 tabular-nums text-muted">{score}%</td>)}
                      <td className="max-w-48 truncate px-3 py-3 text-text">{student.weakestTopic}</td>
                      <td className="px-3 py-3 tabular-nums text-text">{student.missedItems.length}</td>
                      <td className="px-3 py-3"><StudentStatusPill status={student.status} /></td>
                      <td className="px-3 py-3"><ChevronRight aria-hidden="true" className="h-4 w-4 text-muted" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="space-y-3 md:hidden">
            {filteredStudents.slice(0, visibleCount).map((student) => (
              <StudentMobileCard key={student.id} student={student} adjustedScore={getAdjustedScore(student)} onOpen={() => openStudent(student)} />
            ))}
          </div>

          {visibleCount < filteredStudents.length && <div className="text-center"><button type="button" onClick={() => setVisibleCount((count) => count + 10)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text hover:bg-surface">Show more</button></div>}
        </>
      )}

      {selectedStudent && <StudentDrawer student={selectedStudent} students={students} onClose={closeStudent} />}
    </div>
  )
}