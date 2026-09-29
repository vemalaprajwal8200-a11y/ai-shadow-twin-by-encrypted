import { Card } from '../../components/dashboard/DashboardPrimitives'
import { StudentError, StudentSkeleton } from '../../components/student/StudentComponents'
import { mockCourses } from '../../data/mockData'
import { useAuth } from '../../auth/AuthContext'
import { useMyStudent } from '../../hooks/useMyStudent'

export default function StudentSettings() {
  const { user } = useAuth()
  const { student, loading, error, retry } = useMyStudent(user)
  if (loading) return <StudentSkeleton label="Loading account settings" />
  if (error) return <StudentError error={error} onRetry={retry} />
  if (!student) return null

  const course = mockCourses.find((item) => item.id === student.courseId)
  return (
    <div className="max-w-2xl space-y-5">
      <header><p className="text-sm uppercase tracking-[0.18em] text-muted">ACCOUNT</p><h1 className="mt-1 text-3xl font-bold text-heading">Settings</h1></header>
      <Card className="space-y-4 p-5"><div><p className="text-xs uppercase tracking-wide text-muted">Student</p><p className="mt-1 font-medium text-heading">{student.name}</p></div><div><p className="text-xs uppercase tracking-wide text-muted">Email</p><p className="mt-1 text-sm text-text">{student.email}</p></div><div><p className="text-xs uppercase tracking-wide text-muted">Course</p><p className="mt-1 text-sm text-text">{course?.title || student.courseId}</p></div></Card>
    </div>
  )
}