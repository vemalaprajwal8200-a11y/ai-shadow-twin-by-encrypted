import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CloudUpload, Plus, Sparkles } from 'lucide-react'
import { createCourse, createUnit, getAnalysisProgress, getCourseOverview, getUnits, uploadCourseMaterial } from '../data/supabaseData'
import { PageHeader } from '../components/dashboard/DashboardPrimitives'
import { Badge, Button } from '../components/ui/Primitives'

export default function CoursesPage({ courseId, onCourseChange }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [analysisRows, setAnalysisRows] = useState([])
  const [units, setUnits] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState(courseId || '')
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [unitName, setUnitName] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [creatingFirstCourse, setCreatingFirstCourse] = useState(false)

  useEffect(() => {
    let active = true
    const loadCourses = async () => {
      setLoading(true)
      setError('')
      try {
        const result = await getCourseOverview()
        if (active) {
          setCourses(result)
          const firstId = result[0]?.course_id || result[0]?.id || ''
          setSelectedCourseId((current) => result.some((row) => (row.course_id || row.id) === current) ? current : firstId)
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load courses.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadCourses()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (courseId) setSelectedCourseId(courseId)
  }, [courseId])

  const currentCourse = useMemo(
    () => courses.find((course) => (course.course_id || course.id) === selectedCourseId),
    [selectedCourseId, courses],
  )

  const refreshUnitsAndProgress = async (targetCourseId) => {
    if (!targetCourseId) return
    try {
      const [unitRows, progressRows] = await Promise.all([
        getUnits(targetCourseId),
        getAnalysisProgress(targetCourseId),
      ])
      setUnits(unitRows)
      setAnalysisRows(progressRows)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load course progress.')
    }
  }

  useEffect(() => {
    if (selectedCourseId) refreshUnitsAndProgress(selectedCourseId)
  }, [selectedCourseId])

  const isRunActive = analysisRows.some((row) => ['queued', 'running'].includes(String(row.status || '').toLowerCase()))
  useEffect(() => {
    if (!selectedCourseId || !isRunActive) return undefined
    const timer = window.setInterval(() => refreshUnitsAndProgress(selectedCourseId), 3000)
    return () => window.clearInterval(timer)
  }, [selectedCourseId, isRunActive])

  const handleCreateCourse = async (event) => {
    if (event) event.preventDefault()
    const safeCourseName = (event ? courseName : 'My first course').trim() || 'My first course'
    setBusy(true)
    setCreatingFirstCourse(false)
    setError('')
    setNotice('')
    try {
      const created = await createCourse({ courseName: safeCourseName, courseCode })
      const id = created.course_id || created.id
      setCourseName('')
      setCourseCode('')
      setSelectedCourseId(id)
      onCourseChange?.(id)
      setCourses(await getCourseOverview())
      setNotice('Course created.')
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Could not create course.'
      console.error('Create course failed:', createError)
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const handleCreateUnit = async (event) => {
    event.preventDefault()
    if (!selectedCourseId || !unitName.trim()) return
    setBusy(true)
    setError('')
    try {
      await createUnit({ courseId: selectedCourseId, unitName, unitOrder: units.length + 1 })
      setUnitName('')
      await refreshUnitsAndProgress(selectedCourseId)
      setNotice('Unit added.')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not add unit.')
    } finally {
      setBusy(false)
    }
  }

  const handleFiles = async (list) => {
    if (!list.length) {
      setError('Choose a file to upload.')
      return
    }
    if (!selectedCourseId) {
      setError('Pick or create a course before uploading materials.')
      return
    }
    setError('')
    setNotice('')
    setBusy(true)

    try {
      const results = []
      for (const file of list) {
        const result = await uploadCourseMaterial({ courseId: selectedCourseId, unitId: selectedUnitId || null, file })
        results.push({ name: file.name, status: result.analysis.status || 'queued' })
      }
      setUploadedFiles((existing) => [...existing, ...results])
      await refreshUnitsAndProgress(selectedCourseId)
      setNotice('Upload complete. Analysis has been queued.')
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Could not upload the selected material.'
      console.error('Upload failed:', uploadError)
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-20 rounded-2xl bg-border/30" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-border/30" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Course library" title="Courses and upload" description="Manage course materials and start an analysis." />
      {(error || notice) && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-danger/30 bg-danger/10 text-danger' : 'border-primary/30 bg-primary/10 text-primary'}`}>{error || notice}</div>}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.5fr]">
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="card p-6 text-sm text-muted">
              <p className="mb-3">No courses yet.</p>
              <Button type="button" onClick={() => { setCreatingFirstCourse(true); void handleCreateCourse() }} disabled={busy || creatingFirstCourse}>
                Create your first course
              </Button>
            </div>
          ) : courses.map((course) => {
            const id = course.course_id || course.id
            const title = course.course_name || course.title || course.name || 'Untitled course'
            return <button type="button" key={id} onClick={() => { setSelectedCourseId(id); onCourseChange?.(id) }} className={`card w-full p-4 text-left ${id === selectedCourseId ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">{course.course_code || course.code || ''}</p>
                  <h3 className="mt-1 text-xl font-semibold text-heading">{title}</h3>
                </div>
                <Badge tone="success">{course.status_label || course.status || 'Ready'}</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted">
                <span>{course.unit_count ?? course.units_count ?? 0} units</span>
                <span>{course.last_analyzed_at ? new Date(course.last_analyzed_at).toLocaleDateString() : 'Not analysed'}</span>
              </div>
            </button>
          })}
          <form onSubmit={handleCreateCourse} className="card space-y-3 p-4">
            <h3 className="font-semibold text-heading">Create course</h3>
            <input className="ui-input w-full" aria-label="Course name" placeholder="Course name" value={courseName} onChange={(event) => setCourseName(event.target.value)} required />
            <input className="ui-input w-full" aria-label="Course code" placeholder="Course code" value={courseCode} onChange={(event) => setCourseCode(event.target.value)} />
            <Button type="submit" disabled={busy}><Plus className="h-4 w-4" />Create course</Button>
          </form>
          {currentCourse && <form onSubmit={handleCreateUnit} className="card space-y-3 p-4">
            <h3 className="font-semibold text-heading">Manage units</h3>
            {units.map((unit) => <p key={unit.unit_id || unit.id} className="text-sm text-muted">{unit.unit_order}. {unit.unit_name || unit.name}</p>)}
            <input className="ui-input w-full" aria-label="New unit name" placeholder="New unit name" value={unitName} onChange={(event) => setUnitName(event.target.value)} required />
            <Button type="submit" disabled={busy}><Plus className="h-4 w-4" />Add unit</Button>
          </form>}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-heading">Upload materials</h3>
              <p className="text-sm text-muted">Slides and assessment items for {currentCourse?.course_name || currentCourse?.title || 'the selected course'}</p>
            </div>
            <div className="rounded-lg bg-bg p-2">
              <CloudUpload className="h-5 w-5 text-muted" />
            </div>
          </div>

          <label className={`flex min-h-28 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-bg p-5 text-center transition ${selectedCourseId ? 'cursor-pointer text-muted hover:border-primary hover:bg-surface' : 'cursor-not-allowed opacity-60 text-muted/80'}`}>
            <input
              type="file"
              multiple
              accept=".pptx,.pdf,.csv,.txt"
              className="hidden"
              disabled={!selectedCourseId}
              onChange={(event) => handleFiles(Array.from(event.target.files || []))}
            />
            <CloudUpload className="mb-3 h-8 w-8 text-primary" />
            {selectedCourseId ? 'Drag and drop slides or question files here' : 'Select or create a course before uploading'}
            <span className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">PPTX / PDF / CSV / TXT</span>
          </label>

          {units.length > 0 && <label className="mt-3 block text-sm text-muted">Unit for upload<select className="ui-input mt-1 w-full" value={selectedUnitId} onChange={(event) => setSelectedUnitId(event.target.value)}><option value="">No specific unit</option>{units.map((unit) => <option key={unit.unit_id || unit.id} value={unit.unit_id || unit.id}>{unit.unit_name || unit.name}</option>)}</select></label>}

          <div className="mt-5 space-y-3">
            {uploadedFiles.map((file) => (
              <div key={`${file.name}-${file.status}`} className="rounded-2xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-text">{file.name}</span>
                  <span className="text-xs text-muted">{file.status}</span>
                </div>
              </div>
            ))}
          </div>

          {busy && <p className="mt-3 text-sm text-muted">Uploading and starting analysis...</p>}

          <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm uppercase tracking-[0.18em] text-muted">Analysis progress</p>
            {analysisRows.length === 0 ? <p className="mt-3 text-sm text-muted">No analysis runs for this course yet.</p> : analysisRows.map((row) => {
              const status = String(row.status || 'queued').toLowerCase()
              const total = Number(row.total_items || 0)
              const processed = Number(row.processed_items || 0)
              const progress = total > 0 ? Math.max(0, Math.min(100, (processed / total) * 100)) : Number(row.progress_pct ?? 0)
              const statusLabel = status === 'failed' ? `Failed${row.error_message ? `: ${row.error_message}` : ''}` : status === 'completed' ? 'Ready' : status === 'running' ? 'Running' : status === 'queued' ? 'Queued' : status
              return <div key={row.analysis_run_id || row.id} className="mt-4">
                <div className="flex justify-between gap-3 text-sm"><span className="capitalize">{statusLabel}</span><span>{Math.round(progress)}%</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-border/30"><div className={`h-full rounded-full transition-all ${status === 'failed' ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${Math.round(progress)}%` }} /></div>
              </div>
            })}
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {[
                'Uploaded',
                'Text extracted',
                'Twin attempts running',
                'Classifying',
                'Ready',
              ].map((step, index) => {
                const active = analysisRows.some((row) => ['running', 'completed'].includes(String(row.status || '').toLowerCase())) && index <= 2
                return (
                  <div key={step} className="flex flex-col items-center gap-2 text-center">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? 'bg-primary text-primary-fg' : 'bg-border/30 text-muted'}`}>
                      {active ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className="text-xs text-muted">{step}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
