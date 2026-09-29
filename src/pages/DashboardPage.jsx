import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Percent, TriangleAlert } from 'lucide-react'
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import mockApi from '../api/mock'

const cardMeta = [
  { key: 'totalItems', label: 'Items analysed', icon: FileText, accent: 'bg-blue-100 text-blue-700' },
  { key: 'flaggedItems', label: 'Flagged defects', icon: AlertTriangle, accent: 'bg-red-100 text-red-700' },
  { key: 'facultyConfirmed', label: '% faculty confirmed', icon: Percent, accent: 'bg-amber-100 text-amber-700' },
  { key: 'averageTwinConfidence', label: 'Avg twin confidence', icon: CheckCircle2, accent: 'bg-emerald-100 text-emerald-700' },
]

export default function DashboardPage({ courseId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await mockApi.getDashboardData(courseId)
        if (active) setData(result)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()
    return () => {
      active = false
    }
  }, [courseId])

  if (loading || !data) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    )
  }

  const summary = data.summary
  const summaryCards = [
    { ...cardMeta[0], value: summary.totalItems },
    { ...cardMeta[1], value: summary.flaggedItems },
    {
      ...cardMeta[2],
      value: `${Math.round((summary.facultyConfirmed / summary.flaggedItems) * 100) || 0}%`,
    },
    { ...cardMeta[3], value: `${summary.averageTwinConfidence}%` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Overview</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">Course dashboard</h2>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          Last analysis: 28 Sep 2026
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ key, label, icon: Icon, accent, value }) => (
          <div key={key} className="card p-5">
            <div className="flex items-center justify-between">
              <div className={`rounded-xl p-2 ${accent}`}><Icon className="h-5 w-5" /></div>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Live</span>
            </div>
            <p className="mt-5 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Flagged items per unit</h3>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">This term</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.flaggedByUnit}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.5} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="flagged" radius={[8, 8, 0, 0]} fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Verdict split</h3>
            <TriangleAlert className="h-5 w-5 text-slate-400" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data.verdictBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                {data.verdictBreakdown.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid gap-2 pt-2 text-sm">
            {data.verdictBreakdown.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                  {entry.name}
                </div>
                <span className="font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Needs attention</h3>
          <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Top 5</span>
        </div>

        <div className="space-y-3">
          {data.needsAttention.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/80">
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{item.item}</p>
                <p className="text-sm text-slate-500 dark:text-slate-300">{item.unit}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${item.verdict === 'Content defect' ? 'badge-defect' : 'badge-ability'}`}>
                  {item.verdict}
                </span>
                <span className={`badge ${item.severity === 'High' ? 'badge-high' : 'badge-medium'}`}>
                  {item.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
