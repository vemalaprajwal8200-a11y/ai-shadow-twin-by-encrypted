import { useEffect, useState } from 'react'
import { Gauge, SlidersHorizontal, Users } from 'lucide-react'
import mockApi from '../api/mock'

export default function SettingsPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const fetchSettings = async () => {
      setLoading(true)
      try {
        const result = await mockApi.getSettings()
        if (active) setSettings(result)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchSettings()
    return () => {
      active = false
    }
  }, [])

  if (loading || !settings) {
    return <div className="h-60 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.22em] text-slate-400">System</p>
        <h2 className="mt-1 text-3xl font-bold dark:text-white">Settings</h2>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold dark:text-white">
          <SlidersHorizontal className="h-5 w-5 text-slate-500" />
          Twin configuration
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Runs per item</span>
              <span className="font-semibold">{settings.runsPerItem}</span>
            </label>
            <input
              type="range"
              min="3"
              max="10"
              value={settings.runsPerItem}
              onChange={(event) => setSettings({ ...settings, runsPerItem: Number(event.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Users className="h-4 w-4" /> Persona selection
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.personas.map((persona) => (
                <button
                  key={persona}
                  type="button"
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {persona}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-200">
              <span className="inline-flex items-center gap-2">
                <Gauge className="h-4 w-4" /> Confidence threshold
              </span>
              <span>{settings.confidenceThreshold}%</span>
            </label>
            <input
              type="range"
              min="40"
              max="95"
              value={settings.confidenceThreshold}
              onChange={(event) => setSettings({ ...settings, confidenceThreshold: Number(event.target.value) })}
              className="w-full accent-blue-600"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
