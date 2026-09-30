import { useEffect, useState } from 'react'
import { Gauge, Plus, SlidersHorizontal, Users } from 'lucide-react'
import { getMyProfile, getPersonas, getUserSettings, savePersona, saveUserSettings, updateProfile } from '../data/supabaseData'
import { PageHeader } from '../components/dashboard/DashboardPrimitives'
import { useAuth } from '../auth/AuthContext'

export default function SettingsPage() {
  const { refreshUserProfile } = useAuth()
  const [settings, setSettings] = useState(null)
  const [personas, setPersonas] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [personaName, setPersonaName] = useState('')
  const [personaPrompt, setPersonaPrompt] = useState('')
  const [editingPersonaId, setEditingPersonaId] = useState(null)

  useEffect(() => {
    let active = true
    const fetchSettings = async () => {
      setLoading(true)
      setError('')
      try {
        const [settingsRow, personaRows, profileRow] = await Promise.all([
          getUserSettings(),
          getPersonas(),
          getMyProfile(),
        ])
        if (active) {
          setSettings(settingsRow)
          setPersonas(personaRows)
          setProfile({
            full_name: profileRow.full_name || profileRow.display_name || '',
            institution: profileRow.institution || '',
            department: profileRow.department || '',
          })
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load settings.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchSettings()
    return () => {
      active = false
    }
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await saveUserSettings({
        runs_per_item: Number(settings.runs_per_item),
        confidence_threshold: Number(settings.confidence_threshold),
      })
      setSettings(saved)
      setNotice('Analysis settings saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await updateProfile(profile)
      setProfile((current) => ({ ...current, ...(saved || {}) }))
      await refreshUserProfile()
      setNotice('Profile saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  const submitPersona = async (event) => {
    event.preventDefault()
    if (!personaName.trim() || !personaPrompt.trim()) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const saved = await savePersona({
        ...(editingPersonaId ? { persona_id: editingPersonaId } : {}),
        name: personaName.trim(),
        prompt: personaPrompt.trim(),
        is_active: true,
      })
      setPersonas((current) => [saved, ...current.filter((persona) => persona.persona_id !== saved.persona_id)])
      setPersonaName('')
      setPersonaPrompt('')
      setEditingPersonaId(null)
      setNotice('Persona saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save persona.')
    } finally {
      setSaving(false)
    }
  }

  const togglePersona = async (persona) => {
    if (persona.faculty_id == null) return
    setSaving(true)
    setError('')
    try {
      const saved = await savePersona({ ...persona, is_active: !persona.is_active })
      setPersonas((current) => current.map((entry) => entry.persona_id === saved.persona_id ? saved : entry))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update persona.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="h-60 animate-pulse rounded-2xl bg-border/30" />
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader eyebrow="System" title="Settings" description="Configure the analysis behavior for the selected course." />
      {(error || notice) && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-danger/30 bg-danger/10 text-danger' : 'border-primary/30 bg-primary/10 text-primary'}`}>{error || notice}</div>}

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-heading">
          <SlidersHorizontal className="h-5 w-5 text-muted" />
          Twin configuration
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-text">
              <span>Runs per item</span>
              <span className="font-semibold">{settings?.runs_per_item ?? 3}</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={settings?.runs_per_item ?? 3}
              onChange={(event) => setSettings({ ...settings, runs_per_item: Number(event.target.value) })}
              className="w-full accent-primary"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-text">
              <span className="inline-flex items-center gap-2"><Gauge className="h-4 w-4" /> Confidence threshold</span>
              <span>{Number(settings?.confidence_threshold ?? 0.65).toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings?.confidence_threshold ?? 0.65}
              onChange={(event) => setSettings({ ...settings, confidence_threshold: Number(event.target.value) })}
              className="w-full accent-primary"
            />
          </div>
          <button type="button" onClick={saveSettings} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-50">
            {saving ? 'Saving...' : 'Save analysis settings'}
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-heading"><Users className="h-5 w-5 text-muted" /> Personas</div>
        <p className="mb-4 text-sm text-muted">Built-in personas are read-only. Your personas can be edited and activated for analysis.</p>
        {personas.length === 0 ? <p className="py-4 text-sm text-muted">No personas available yet.</p> : <div className="divide-y divide-border/60">
          {personas.map((persona) => {
            const builtIn = persona.faculty_id == null
            return <div key={persona.persona_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="font-medium text-heading">{persona.name}{builtIn && <span className="ml-2 text-xs text-muted">Built-in</span>}</p><p className="mt-1 max-w-xl text-xs text-muted">{persona.description || persona.prompt}</p></div>
              <div className="flex items-center gap-2">
                {!builtIn && <button type="button" onClick={() => { setEditingPersonaId(persona.persona_id); setPersonaName(persona.name || ''); setPersonaPrompt(persona.prompt || '') }} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium">Edit</button>}
                <label className="inline-flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={Boolean(persona.is_active)} disabled={builtIn || saving} onChange={() => togglePersona(persona)} />Active</label>
              </div>
            </div>
          })}
        </div>}
        <form onSubmit={submitPersona} className="mt-5 grid gap-3 border-t border-border pt-5">
          <h3 className="font-medium text-heading">{editingPersonaId ? 'Edit persona' : 'Add persona'}</h3>
          <input className="ui-input" value={personaName} onChange={(event) => setPersonaName(event.target.value)} placeholder="Persona name" aria-label="Persona name" required />
          <textarea className="ui-input min-h-24" value={personaPrompt} onChange={(event) => setPersonaPrompt(event.target.value)} placeholder="Describe how this persona reasons" aria-label="Persona instructions" required />
          <button type="submit" disabled={saving} className="inline-flex w-fit items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Saving...' : 'Save persona'}</button>
        </form>
      </div>

      <form className="card space-y-4 p-5" onSubmit={saveProfile}>
        <h2 className="text-lg font-semibold text-heading">My profile</h2>
        <label className="block text-sm font-medium text-text">Full name<input className="ui-input mt-1 w-full" value={profile?.full_name || ''} onChange={(event) => setProfile({ ...profile, full_name: event.target.value })} required /></label>
        <label className="block text-sm font-medium text-text">Institution<input className="ui-input mt-1 w-full" value={profile?.institution || ''} onChange={(event) => setProfile({ ...profile, institution: event.target.value })} /></label>
        <label className="block text-sm font-medium text-text">Department<input className="ui-input mt-1 w-full" value={profile?.department || ''} onChange={(event) => setProfile({ ...profile, department: event.target.value })} /></label>
        <button type="submit" disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text disabled:opacity-50">Save profile</button>
      </form>
    </div>
  )
}
