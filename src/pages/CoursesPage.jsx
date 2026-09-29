import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, CloudUpload, FileText, LayoutGrid, Sparkles } from 'lucide-react'
import { getSupabaseClient, isSupabaseConfigured } from '../api/supabase'
import mockApi from '../api/mock'
import { PageHeader } from '../components/dashboard/DashboardPrimitives'
import { Badge, Button } from '../components/ui/Primitives'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function getAuthHeaders() {
  const headers = { Accept: 'application/json' }
  try {
    if (!isSupabaseConfigured()) return headers
    const client = getSupabaseClient()
    const { data } = await client.auth.getSession()
    if (data.session?.access_token) {
      headers.Authorization = `Bearer ${data.session.access_token}`
    }
  } catch {
    // Graceful fallback for local/demo use without a configured auth session
  }
  return headers
}

async function uploadMaterialFile(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/courses`, {
    method: 'POST',
    body: formData,
    headers: await getAuthHeaders(),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'The upload failed. Please try a different file.')
  }

  return {
    name: file.name,
    courseId: payload.courseId,
    itemCount: payload.itemCount,
    progress: 100,
  }
}

export default function CoursesPage({ courseId }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [analysisStatus, setAnalysisStatus] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    let active = true
    const fetchCourses = async () => {
      setLoading(true)
      try {
        const result = await mockApi.getCourses()
        if (active) setCourses(result)
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchCourses()
    return () => {
      active = false
    }
  }, [])

  const currentCourse = useMemo(
    () => courses.find((course) => course.id === courseId) || courses[0],
    [courseId, courses],
  )

  const handleFiles = async (list) => {
    if (!list.length) return
    setUploadError('')
    setUploading(true)

    try {
      const results = await Promise.all(list.map((file) => uploadMaterialFile(file)))
      setUploadedFiles((existing) => [...existing, ...results])
      if (results[0]?.courseId) {
        const nextCourseId = results[0].courseId
        if (nextCourseId && nextCourseId !== courseId) {
          window.location.hash = `#course-${nextCourseId}`
        }
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload the selected material.')
    } finally {
      setUploading(false)
    }
  }

  const runAnalysis = async () => {
    const targetCourseId = uploadedFiles[0]?.courseId || courseId
    if (!targetCourseId) {
      setUploadError('Upload a file before starting analysis.')
      return
    }

    setAnalysisStatus({ state: 'Running', step: 'Twin attempts running' })

    try {
      const response = await fetch(`${API_BASE_URL}/courses/${targetCourseId}/analyze`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.detail || 'Analysis could not be started.')
      }
      setAnalysisStatus({
        status: payload.status || 'running',
        courseId: targetCourseId,
        progress: [
          { step: 'Uploaded', done: true },
          { step: 'Text extracted', done: false },
          { step: 'Twin attempts running', done: false },
          { step: 'Classifying', done: false },
          { step: 'Ready', done: false },
        ],
      })
      return
    } catch {
      const result = await mockApi.runShadowTwin(targetCourseId, uploadedFiles)
      setAnalysisStatus(result)
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

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.5fr]">
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className={`card p-4 ${course.id === courseId ? 'ring-2 ring-primary' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">{course.code}</p>
                  <h3 className="mt-1 text-xl font-semibold text-heading">{course.title}</h3>
                </div>
                <Badge tone="success">{course.status}</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-muted">
                <span>{course.units} units</span>
                <span>Last analysed {course.lastAnalysis}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-heading">Upload materials</h3>
              <p className="text-sm text-muted">Slides and assessment items for {currentCourse?.title}</p>
            </div>
            <div className="rounded-lg bg-bg p-2">
              <CloudUpload className="h-5 w-5 text-muted" />
            </div>
          </div>

          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-bg p-5 text-center text-muted transition hover:border-primary hover:bg-surface">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(Array.from(event.target.files || []))}
            />
            <CloudUpload className="mb-3 h-8 w-8 text-primary" />
            Drag and drop slides or question files here
            <span className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">PPT / PDF / CSV</span>
          </label>

          <div className="mt-5 space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.name} className="rounded-2xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="truncate font-medium text-text">{file.name}</span>
                  <span className="text-xs text-muted">{file.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-border/30">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${file.progress}%` }} />
                </div>
              </div>
            ))}
          </div>

          {uploadError && (
            <div className="mt-4 rounded-xl border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
              {uploadError}
            </div>
          )}

          <Button
            onClick={runAnalysis}
            className="mt-5"
            disabled={uploading || uploadedFiles.length === 0}
          >
            <Sparkles className="h-4 w-4" />
            {uploading ? 'Uploading...' : 'Run Shadow-Twin'}
          </Button>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm uppercase tracking-[0.18em] text-muted">Analysis progress</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {[
                'Uploaded',
                'Text extracted',
                'Twin attempts running',
                'Classifying',
                'Ready',
              ].map((step, index) => {
                const active = analysisStatus?.progress?.[index]?.done || index <= 2
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
