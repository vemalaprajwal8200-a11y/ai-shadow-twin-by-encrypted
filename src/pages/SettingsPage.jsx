import { useEffect, useState } from 'react'
import { Gauge, SlidersHorizontal, Users } from 'lucide-react'
import mockApi from '../api/mock'
import { PageHeader } from '../components/dashboard/DashboardPrimitives'

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
    return <div className="h-60 animate-pulse rounded-2xl bg-border/30" />
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader eyebrow="System" title="Settings" description="Configure the analysis behavior for the selected course." />

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-heading">
          <SlidersHorizontal className="h-5 w-5 text-muted" />
          Twin configuration
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-text">
              <span>Runs per item</span>
              <span className="font-semibold">{settings.runsPerItem}</span>
            </label>
            <input
              type="range"
              min="3"
              max="10"
              value={settings.runsPerItem}
              onChange={(event) => setSettings({ ...settings, runsPerItem: Number(event.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-text">
              <Users className="h-4 w-4" /> Persona selection
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.personas.map((persona) => (
                <button
                  key={persona}
                  type="button"
                  className="rounded-full border border-surface-tint bg-surface-tint px-3 py-2 text-sm font-medium text-primary transition hover:border-primary hover:bg-surface-tint/80"
                >
                  {persona}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-text">
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
              className="w-full accent-primary"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
