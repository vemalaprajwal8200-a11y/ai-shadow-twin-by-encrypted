import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Filter, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import mockApi from '../api/mock'
import { SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'

const verdictOptions = ['All', 'Content defect', 'Ability gap', 'Clean']
const severityOptions = ['All', 'High', 'Medium', 'Low']

export default function CourseContentPage({ courseId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [verdictFilter, setVerdictFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [unitFilter, setUnitFilter] = useState('All')

  useEffect(() => {
    let active = true
    const fetchItems = async () => {
      setLoading(true)
      try {
        const result = await mockApi.getCourseItems(courseId)
        if (active) setItems(result)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchItems()
    return () => {
      active = false
    }
  }, [courseId])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = search ? `${item.title} ${item.content}`.toLowerCase().includes(search.toLowerCase()) : true
      const matchesType = typeFilter === 'All' || item.type === typeFilter
      const matchesVerdict = verdictFilter === 'All' || item.verdict === verdictFilter
      const matchesSeverity = severityFilter === 'All' || item.severity === severityFilter
      const matchesUnit = unitFilter === 'All' || String(item.unit) === unitFilter
      return matchesSearch && matchesType && matchesVerdict && matchesSeverity && matchesUnit
    })
  }, [items, search, typeFilter, verdictFilter, severityFilter, unitFilter])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-16 rounded-2xl bg-border/30" />
        <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
          <div className="h-80 rounded-2xl bg-border/30" />
          <div className="h-80 rounded-2xl bg-border/30" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Content review</p>
          <h2 className="mt-1 text-3xl font-bold text-heading">Course content</h2>
        </div>
        <span className="rounded-xl bg-surface px-3 py-2 text-sm text-muted">
          {filteredItems.length} items shown
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
        <aside className="card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-muted">Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text">
                <option>All</option>
                <option>slide</option>
                <option>question</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-muted">Verdict</label>
              <select value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)} className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text">
                {verdictOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-muted">Severity</label>
              <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text">
                {severityOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.18em] text-muted">Unit</label>
              <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="w-full rounded-xl border border-border bg-surface p-2.5 text-sm text-text">
                <option>All</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
              </select>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
              <Search className="h-4 w-4 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search slide or question text"
                className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted"
              />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-lg font-semibold text-primary">No content matches your filters.</p>
              <p className="mt-2 text-sm text-muted">Try widening the search or clearing a filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <Link key={item.id} to={`/content/${item.id}`} className="card block p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-bg px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted">
                          {item.type}
                        </span>
                        <span className="text-xs text-muted">Unit {item.unit}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-heading">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted">{item.section}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <VerdictChip verdict={item.verdict} />
                      <SeverityChip severity={item.severity} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="max-w-xl text-sm text-muted">{item.content}</p>
                    <ArrowRight className="h-4 w-4 text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
