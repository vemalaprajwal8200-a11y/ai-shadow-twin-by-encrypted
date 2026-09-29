import { Card, PageHeader } from '../../components/dashboard/DashboardPrimitives'
import { StudentEmpty, StudentError, StudentSkeleton } from '../../components/student/StudentComponents'
import { Link } from 'react-router-dom'
import { mockCourses } from '../../data/mockData'
import { useAuth } from '../../auth/AuthContext'
import { useMyStudent } from '../../hooks/useMyStudent'

export default function StudentSettings() {
  const { user } = useAuth()
  const { student, loading, error, retry } = useMyStudent(user)
  if (loading) return <StudentSkeleton label="Loading account settings" />
  const studentNotLinked = error === 'Your account is active, but this student ID is not linked to an academic record.'
  if (error && !studentNotLinked) return <StudentError error={error} onRetry={retry} />
  if (!student) return <StudentEmpty description="Link your student record to see its assigned course." action={<Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">Open My details</Link>}>Student record unavailable</StudentEmpty>

  const course = mockCourses.find((item) => item.id === student.courseId)
  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader eyebrow="Account" title="Settings" description="Your account information and assigned course." />
      <Card className="space-y-4 p-5"><div><p className="text-xs uppercase tracking-wide text-muted">Student</p><p className="mt-1 font-medium text-heading">{student.name}</p></div><div><p className="text-xs uppercase tracking-wide text-muted">Email</p><p className="mt-1 text-sm text-text">{student.email}</p></div><div><p className="text-xs uppercase tracking-wide text-muted">Course</p><p className="mt-1 text-sm text-text">{course?.title || student.courseId}</p></div></Card>
    </div>
  )
}