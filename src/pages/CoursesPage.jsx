import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, CloudUpload, FileText, LayoutGrid, Sparkles } from 'lucide-react'
import mockApi from '../api/mock'
import { PageHeader } from '../components/dashboard/DashboardPrimitives'
import { Badge, Button } from '../components/ui/Primitives'

export default function CoursesPage({ courseId }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadedFiles, setUploadedFiles] = useState([
    { name: 'Week 1 slides.pdf', progress: 100 },
    { name: 'Practice questions.csv', progress: 72 },
  ])
  const [analysisStatus, setAnalysisStatus] = useState(null)

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

  const handleFiles = (list) => {
    setUploadedFiles((existing) => [...existing, ...list.map((file) => ({ name: file.name, progress: 40 }))])
  }

  const runAnalysis = async () => {
    setAnalysisStatus({ state: 'Running', step: 'Twin attempts running' })
    const result = await mockApi.runShadowTwin(courseId, uploadedFiles)
    setAnalysisStatus(result)
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

          <Button
            onClick={runAnalysis}
            className="mt-5"
          >
            <Sparkles className="h-4 w-4" />
            Run Shadow-Twin
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
