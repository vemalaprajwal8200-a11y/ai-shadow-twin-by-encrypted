import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../../components/dashboard/DashboardPrimitives'
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
  const studentNotLinked = error === 'Your account is active, but this student ID is not linked to an academic record.'
  if (error && !studentNotLinked) return <StudentError error={error} onRetry={retry} />
  if (!student) return <StudentEmpty description="Link your student record to see the course materials assigned to you." action={<Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">Open My details</Link>}>Course details unavailable</StudentEmpty>

  const title = type === 'slide' ? 'Slides' : 'Questions'
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Course content" title={title} description={`Read-only materials for ${student.courseId === 'intro-data-structures' ? 'Intro to Data Structures' : 'your course'}.`} />
      {items.length ? <div className="space-y-3">{items.map((item) => <Card key={item.id} className="p-4"><p className="text-xs uppercase tracking-wide text-muted">Unit {item.unit} · {item.section}</p><h2 className="mt-1 font-semibold text-heading">{item.title}</h2><p className="mt-3 text-sm leading-6 text-text">{item.content}</p></Card>)}</div> : <StudentEmpty>No {type}s are available for this course.</StudentEmpty>}
    </div>
  )
}