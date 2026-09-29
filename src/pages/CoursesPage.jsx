import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, CloudUpload, FileText, LayoutGrid, Sparkles } from 'lucide-react'
import mockApi from '../api/mock'

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
        <div className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Course library</p>
          <h2 className="mt-1 text-3xl font-bold dark:text-white">Courses and upload</h2>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.5fr]">
        <div className="space-y-4">
          {courses.map((course) => (
            <div key={course.id} className={`card p-4 ${course.id === courseId ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{course.code}</p>
                  <h3 className="mt-1 text-xl font-semibold dark:text-white">{course.title}</h3>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                  {course.status}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-300">
                <span>{course.units} units</span>
                <span>Last analysed {course.lastAnalysis}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold dark:text-white">Upload materials</h3>
              <p className="text-sm text-slate-500 dark:text-slate-300">Slides and assessment items for {currentCourse?.title}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
              <CloudUpload className="h-5 w-5 text-slate-600 dark:text-slate-200" />
            </div>
          </div>

          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-blue-500">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => handleFiles(Array.from(event.target.files || []))}
            />
            <CloudUpload className="mb-3 h-8 w-8 text-blue-500" />
            Drag and drop slides or question files here
            <span className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">PPT / PDF / CSV</span>
          </label>

          <div className="mt-5 space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.name} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="truncate font-medium dark:text-white">{file.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-300">{file.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${file.progress}%` }} />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={runAnalysis}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-sky-500 dark:text-slate-950"
          >
            <Sparkles className="h-4 w-4" />
            Run Shadow-Twin
          </button>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">Analysis progress</p>
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
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {active ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-300">{step}</span>
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
