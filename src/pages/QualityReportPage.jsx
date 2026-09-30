import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, TrendingUp } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getAccuracyMetrics, getDefectRatePerUnit, getFlagReview, recordReportExport, updateFlagReview } from '../data/supabaseData'
import { PageHeader, SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'
import { Button, Select } from '../components/ui/Primitives'
import { chartPalette } from '../data/chartPalette'
import { useThemeMode } from '../hooks/useThemeMode'

export default function QualityReportPage({ courseId }) {
  const darkMode = useThemeMode()
  const palette = chartPalette[darkMode ? 'dark' : 'light']
  const [rows, setRows] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [defectRows, setDefectRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [unitFilter, setUnitFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [error, setError] = useState('')
  const [savingFlag, setSavingFlag] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    const fetchRows = async () => {
      setLoading(true)
      setError('')
      try {
        const [accuracy, defects, review] = await Promise.all([
          getAccuracyMetrics(courseId),
          getDefectRatePerUnit(courseId),
          getFlagReview(courseId),
        ])
        if (active) {
          setMetrics(accuracy[0] || null)
          setDefectRows(defects)
          setRows(review)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load quality report.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchRows()
    return () => {
      active = false
    }
  }, [courseId, retryKey])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesUnit = unitFilter === 'All' || String(row.unit_name || row.unit_order || row.unit) === unitFilter
      const matchesStatus = statusFilter === 'All' || String(row.status || '').toLowerCase() === statusFilter.toLowerCase()
      return matchesUnit && matchesStatus
    })
  }, [rows, unitFilter, statusFilter])

  const exportCsv = async () => {
    setError('')
    try {
      const headers = ['course_id', 'unit', 'item', 'item_type', 'verdict', 'confidence', 'status', 'review_note', 'reviewed_at']
      const rowsForCsv = filteredRows.map((row) => [
        row.course_id,
        row.unit_name || row.unit_order,
        row.title || row.item_title || row.content_item_id,
        row.item_type,
        row.verdict,
        row.confidence,
        row.status,
        row.review_note,
        row.reviewed_at,
      ])
      const csv = [headers, ...rowsForCsv].map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const fileName = `shadow-twin-report-${new Date().toISOString().slice(0, 10)}.csv`
      await recordReportExport({ courseId, fileName, rowCount: filteredRows.length })
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Could not export report.')
    }
  }

  const reviewFlag = async (row, status) => {
    const flagId = row.flag_id || row.id
    if (!flagId) return
    setSavingFlag(flagId)
    setError('')
    try {
      const updated = await updateFlagReview(flagId, status)
      setRows((current) => current.map((entry) => (entry.flag_id || entry.id) === flagId ? { ...entry, ...updated } : entry))
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not update flag review.')
    } finally {
      setSavingFlag('')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-20 rounded-2xl bg-border/30" />
        <div className="h-72 rounded-2xl bg-border/30" />
        <div className="h-72 rounded-2xl bg-border/30" />
      </div>
    )
  }

  const chartData = defectRows.map((row) => ({
    name: row.unit_name || `Unit ${row.unit_order || ''}`,
    rate: Number(row.defect_rate_pct ?? row.defect_rate ?? 0),
  }))
  const timeSeries = ['confirmed', 'dismissed', 'resolved'].map((status) => ({
    month: status,
    confirmed: status === 'confirmed' ? filteredRows.filter((row) => String(row.status).toLowerCase() === status).length : 0,
    dismissed: status === 'dismissed' ? filteredRows.filter((row) => String(row.status).toLowerCase() === status).length : 0,
  }))

  return (
    <div className="space-y-6">
        <PageHeader eyebrow="Reporting" title="Content quality report" description="Review verdict accuracy and tracked content issues." actions={<Button onClick={exportCsv} size="sm" disabled={filteredRows.length === 0}>
          <Download className="h-4 w-4" /> CSV export
      </Button>} />
        {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"><p>{error}</p><button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-2 font-semibold underline">Retry</button></div>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-muted">Flag reviews</p>
          <p className="mt-2 text-3xl font-bold text-primary">{metrics?.reviewed_count ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Flag confirmation rate</p>
          <p className="mt-2 text-3xl font-bold text-primary">{metrics?.confirmed_pct == null ? '—' : `${metrics.confirmed_pct}%`}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Model label accuracy</p>
          <p className="mt-2 text-3xl font-bold text-primary">{metrics?.accuracy_pct == null ? 'Not measured' : `${metrics.accuracy_pct}%`}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-heading">Defect rate per unit</h3>
            <TrendingUp className="h-5 w-5 text-muted" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} opacity={1} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: palette.axis }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: palette.axis }} />
              <Tooltip contentStyle={{ backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }} labelStyle={{ color: palette.text }} itemStyle={{ color: palette.text }} />
              <Bar dataKey="rate" fill={palette.contentDefect} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-heading">Confirmed vs dismissed flags</h3>
            <Filter className="h-5 w-5 text-muted" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={timeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} opacity={1} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: palette.axis }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: palette.axis }} />
              <Tooltip contentStyle={{ backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }} labelStyle={{ color: palette.text }} itemStyle={{ color: palette.text }} />
              <Area type="monotone" dataKey="confirmed" stroke={palette.confirmed} fill={palette.confirmed} fillOpacity={0.18} />
              <Area type="monotone" dataKey="dismissed" stroke={palette.dismissed} fill={palette.dismissed} fillOpacity={0.12} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex gap-3">
          <Select aria-label="Filter by unit" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option>All</option>
            {Array.from(new Set(rows.map((row) => row.unit_name || row.unit_order).filter(Boolean))).map((unit) => <option key={unit}>{unit}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            <option>Open</option>
            <option>Confirmed</option>
            <option>Dismissed</option>
            <option>Resolved</option>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="pb-3 pr-3">Item</th>
                <th className="pb-3 pr-3">Unit</th>
                <th className="pb-3 pr-3">Verdict</th>
                <th className="pb-3 pr-3">Severity</th>
                <th className="pb-3 pr-3">Twin agreement %</th>
                <th className="pb-3 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const flagId = row.flag_id || row.id
                const status = String(row.status || 'open').toLowerCase()
                return <tr key={flagId} className="border-b border-border/60">
                  <td className="py-3 pr-3 font-medium text-text">{row.title || row.item_title || row.content_item_id}</td>
                  <td className="py-3 pr-3">{row.unit_name || row.unit_order || '—'}</td>
                  <td className="py-3 pr-3"><VerdictChip verdict={row.verdict || 'Unknown'} /></td>
                  <td className="py-3 pr-3"><SeverityChip severity={row.severity || 'Low'} /></td>
                  <td className="py-3 pr-3">{row.confidence == null ? '—' : `${Math.round(Number(row.confidence) * (Number(row.confidence) <= 1 ? 100 : 1))}%`}</td>
                  <td className="py-3 pr-3"><div className="flex flex-wrap items-center gap-2"><span className="capitalize">{status}</span>{['confirmed', 'dismissed', 'resolved'].map((action) => <button key={action} type="button" disabled={savingFlag === flagId || status === action} onClick={() => reviewFlag(row, action)} className="rounded-md border border-border px-2 py-1 text-xs font-medium disabled:opacity-40">{action === 'resolved' ? 'Resolve' : action[0].toUpperCase() + action.slice(1)}</button>)}</div></td>
                </tr>
              })}
              {filteredRows.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-muted">No flags match this report.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
