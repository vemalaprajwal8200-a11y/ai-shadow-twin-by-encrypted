import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, TrendingUp } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import mockApi from '../api/mock'
import { SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'
import { chartPalette } from '../data/chartPalette'
import { useThemeMode } from '../hooks/useThemeMode'

export default function QualityReportPage() {
  const darkMode = useThemeMode()
  const palette = chartPalette[darkMode ? 'dark' : 'light']
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [unitFilter, setUnitFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    let active = true
    const fetchRows = async () => {
      setLoading(true)
      try {
        const response = await mockApi.getReportData()
        if (active) setRows(response)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchRows()
    return () => {
      active = false
    }
  }, [])

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesUnit = unitFilter === 'All' || row.unit === unitFilter
      const matchesStatus = statusFilter === 'All' || row.status === statusFilter
      return matchesUnit && matchesStatus
    })
  }, [rows, unitFilter, statusFilter])

  const exportCsv = () => {
    const headers = ['item', 'unit', 'verdict', 'severity', 'agreement', 'status']
    const csv = [headers.join(',')]
      .concat(
        filteredRows.map((row) =>
          [row.item, row.unit, row.verdict, row.severity, row.agreement, row.status].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','),
        ),
      )
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'shadow-twin-report.csv'
    link.click()
    URL.revokeObjectURL(url)
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

  const chartData = [
    { name: 'Unit 1', rate: 38 },
    { name: 'Unit 2', rate: 29 },
    { name: 'Unit 3', rate: 21 },
  ]

  const timeSeries = [
    { month: 'Jul', confirmed: 4, dismissed: 2 },
    { month: 'Aug', confirmed: 6, dismissed: 3 },
    { month: 'Sep', confirmed: 8, dismissed: 5 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted">Reporting</p>
          <h2 className="mt-1 text-3xl font-bold text-heading">Content quality report</h2>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary/90">
          <Download className="h-4 w-4" /> CSV export
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-muted">Known-bad items flagged</p>
          <p className="mt-2 text-3xl font-bold text-primary">87%</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Label accuracy</p>
          <p className="mt-2 text-3xl font-bold text-primary">94%</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Flags confirmed</p>
          <p className="mt-2 text-3xl font-bold text-primary">44%</p>
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
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text">
            <option>All</option>
            <option>Unit 1</option>
            <option>Unit 2</option>
            <option>Unit 3</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text">
            <option>All</option>
            <option>Open</option>
            <option>Confirmed</option>
            <option>Dismissed</option>
            <option>Fixed</option>
          </select>
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
              {filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="py-3 pr-3 font-medium text-text">{row.item}</td>
                  <td className="py-3 pr-3">{row.unit}</td>
                  <td className="py-3 pr-3">
                    <VerdictChip verdict={row.verdict} />
                  </td>
                  <td className="py-3 pr-3">
                    <SeverityChip severity={row.severity} />
                  </td>
                  <td className="py-3 pr-3">{row.agreement}%</td>
                  <td className="py-3 pr-3">
                    <span className="rounded-full bg-surface px-2 py-1 text-xs font-medium text-muted">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
