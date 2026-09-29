import { useMemo } from 'react'
import { Card } from '../../components/dashboard/DashboardPrimitives'
import { StudentEmpty, StudentError, StudentSkeleton } from '../../components/student/StudentComponents'
import { courseItems } from '../../data/mockData'
import { useAuth } from '../../auth/AuthContext'
import { useMyStudent } from '../../hooks/useMyStudent'

/** @param {{ type: 'slide' | 'question' }} props */
export default function StudentCourseContent({ type }) {
  const { user } = useAuth()
  const { student, loading, error, retry } = useMyStudent(user)
  const items = useMemo(() => student
    ? courseItems.filter((item) => item.courseId === student.courseId && item.type === type)
    : [], [student, type])

  if (loading) return <StudentSkeleton label={`Loading your ${type}s`} />
  if (error) return <StudentError error={error} onRetry={retry} />
  if (!student) return <StudentEmpty>Your course details are unavailable.</StudentEmpty>

  const title = type === 'slide' ? 'Slides' : 'Questions'
  return (
    <div className="space-y-5">
      <header><p className="text-sm uppercase tracking-[0.18em] text-muted">COURSE CONTENT</p><h1 className="mt-1 text-3xl font-bold text-heading">{title}</h1><p className="mt-2 text-sm text-muted">Read-only materials for {student.courseId === 'intro-data-structures' ? 'Intro to Data Structures' : 'your course'}.</p></header>
      {items.length ? <div className="space-y-3">{items.map((item) => <Card key={item.id} className="p-4"><p className="text-xs uppercase tracking-wide text-muted">Unit {item.unit} · {item.section}</p><h2 className="mt-1 font-semibold text-heading">{item.title}</h2><p className="mt-3 text-sm leading-6 text-text">{item.content}</p></Card>)}</div> : <StudentEmpty>No {type}s are available for this course.</StudentEmpty>}
    </div>
  )
}