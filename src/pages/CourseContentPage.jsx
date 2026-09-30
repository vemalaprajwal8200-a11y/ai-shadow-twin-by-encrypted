import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Filter, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getContentItems } from '../data/supabaseData'
import { PageHeader, SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'
import { Badge, Input, Select } from '../components/ui/Primitives'

const verdictOptions = ['All', 'clear', 'ambiguous', 'flawed']
const severityOptions = ['All', 'High', 'Medium', 'Low']

export default function CourseContentPage({ courseId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [verdictFilter, setVerdictFilter] = useState('All')
  const [severityFilter, setSeverityFilter] = useState('All')
  const [unitFilter, setUnitFilter] = useState('All')
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    const fetchItems = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await getContentItems(courseId, {
          itemType: typeFilter === 'slide' || typeFilter === 'question' ? typeFilter : undefined,
          flaggedOnly: typeFilter === 'flagged',
        })
        if (active) setItems(result.map((row) => ({
          ...row,
          id: row.content_item_id || row.item_id || row.id,
          type: row.item_type || row.type || 'slide',
          unit: row.unit_name || row.unit_order || row.unit_number || '',
          title: row.title || row.item_title || row.file_name || 'Course item',
          content: row.content_text || row.content || row.text || '',
          section: row.section || row.unit_name || '',
          verdict: row.verdict || 'clear',
          severity: row.severity || row.flags?.[0]?.severity || 'Low',
          confidence: row.confidence ?? row.verdict_confidence ?? null,
          flags: Array.isArray(row.flags) ? row.flags : [],
          is_flagged: Boolean(row.is_flagged),
        })))
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load course content.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchItems()
    return () => {
      active = false
    }
  }, [courseId, typeFilter, retryKey])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = search ? `${item.title} ${item.content}`.toLowerCase().includes(search.toLowerCase()) : true
      const matchesType = typeFilter === 'All' || typeFilter === 'flagged' || item.type === typeFilter
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
      <PageHeader eyebrow="Content review" title="Course content" description="Search and filter course materials by type and review status." actions={<Badge>{filteredItems.length} items shown</Badge>} />
      {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"><p>{error}</p><button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-2 font-semibold underline">Retry</button></div>}

      <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
        <aside className="card p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-text">
            <Filter className="h-4 w-4" />
            Filters
          </div>

          <div className="space-y-4">
            <div>
              <Select label="Type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option>All</option>
                <option value="slide">Slides</option>
                <option value="question">Questions</option>
                <option value="flagged">Flagged only</option>
              </Select>
            </div>

            <div>
              <Select label="Verdict" value={verdictFilter} onChange={(e) => setVerdictFilter(e.target.value)}>
                {verdictOptions.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </div>

            <div>
              <Select label="Severity" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                {severityOptions.map((option) => <option key={option}>{option}</option>)}
              </Select>
            </div>

            <div>
              <Select label="Unit" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                <option>All</option>
                <option>1</option>
                <option>2</option>
                <option>3</option>
              </Select>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <Input type="search" aria-label="Search course content" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search slide or question text" leadingIcon={Search} />

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
                    <div className="max-w-xl"><p className="text-sm text-muted">{item.content}</p><p className="mt-2 text-xs text-muted">Confidence: {item.confidence == null ? 'Not scored' : `${Math.round(Number(item.confidence) * (Number(item.confidence) <= 1 ? 100 : 1))}%`} · {item.flags.length} flags</p></div>
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
