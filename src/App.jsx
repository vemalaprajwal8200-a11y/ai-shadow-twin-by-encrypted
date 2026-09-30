import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { LoginRoute, ProtectedRoute, RoleRoute } from './components/RouteGuards'
import DashboardHome from './components/DashboardHome'
import { AuthProvider } from './auth/AuthContext'
import { useDarkMode } from './hooks/useDarkMode'

import About from './pages/About'
const ChatPage = lazy(() => import('./pages/ChatPage'))
const CoursesPage = lazy(() => import('./pages/CoursesPage'))
const CourseContentPage = lazy(() => import('./pages/CourseContentPage'))
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage'))
const QualityReportPage = lazy(() => import('./pages/QualityReportPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MyUnits = lazy(() => import('./pages/student/MyUnits'))
const MissedItems = lazy(() => import('./pages/student/MissedItems'))
const StudyPlan = lazy(() => import('./pages/student/StudyPlan'))
const StudentSettings = lazy(() => import('./pages/student/StudentSettings'))
const StudentCourseContent = lazy(() => import('./pages/student/StudentCourseContent'))
const SidebarSubtopicPage = lazy(() => import('./pages/ConnectedSidebarSubtopicPage'))
const FacultyProfile = lazy(() => import('./pages/faculty/FacultyProfile'))
import { sidebarNavSubtopics } from './components/sidebarNavConfig'
import { getCourseOverview, getUserSettings } from './data/supabaseData'
import { useAuth } from './auth/AuthContext'

function NotFoundRedirect() {
  useEffect(() => {
    window.location.replace('/404.html')
  }, [])

  useEffect(() => {
    let active = true
    getUserSettings().then((settings) => {
      if (active && (settings.theme === 'light' || settings.theme === 'dark')) {
        setDarkMode(settings.theme === 'dark')
      }
    }).catch(() => {})
    return () => { active = false }
  }, [])

  return null
}

function SharedCourseTopic({ topic, courseId }) {
  const { user } = useAuth()
  if (user?.role === 'student') {
    if (topic.filter !== 'slide' && topic.filter !== 'question') {
      return <Navigate to="/dashboard" replace state={{ accessDenied: true, intendedRole: 'faculty' }} />
    }
    return <StudentCourseContent type={topic.filter} />
  }
  return <SidebarSubtopicPage topic={topic} courseId={courseId} />
}

function AppRoutes() {
  const [darkMode, setDarkMode] = useDarkMode()
  const [courseId, setCourseId] = useState('')
  const [courses, setCourses] = useState([])

  useEffect(() => {
    let active = true
    getCourseOverview()
      .then((rows) => {
        if (!active) return
        const mapped = rows.map((row) => ({
          ...row,
          id: row.course_id || row.id,
          title: row.course_name || row.title || row.name || 'Untitled course',
          code: row.course_code || row.code || '',
        }))
        setCourses(mapped)
        setCourseId((current) => mapped.some((course) => course.id === current) ? current : mapped[0]?.id || '')
      })
      .catch(() => {
        if (active) {
          setCourses([])
          setCourseId('')
        }
      })
    return () => { active = false }
  }, [])

  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-muted">Loading…</div>}>
    <Routes>
      <Route path="/" element={<About />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route
        element={
          <ProtectedRoute>
              <Layout
                course={courseId}
                courses={courses}
                onCourseChange={setCourseId}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
              />
          </ProtectedRoute>
        }
      >
        <Route path="chat" element={<ChatPage courseId={courseId} onCourseChange={setCourseId} />} />
        <Route path="dashboard" element={<DashboardHome courseId={courseId} />} />
        <Route path="content/:itemId" element={<ItemDetailPage />} />

        <Route element={<RoleRoute allowedRoles={['student']} />}>
          <Route path="student/dashboard" element={<DashboardHome courseId={courseId} />} />
          <Route path="topics/dashboard/my-units" element={<MyUnits />} />
          <Route path="topics/dashboard/missed" element={<MissedItems />} />
          <Route path="topics/dashboard/plan" element={<StudyPlan />} />
          <Route path="topics/settings/student" element={<StudentSettings />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={['faculty']} />}>
          <Route path="faculty/dashboard" element={<DashboardHome courseId={courseId} />} />
          <Route path="courses" element={<CoursesPage courseId={courseId} onCourseChange={setCourseId} />} />
          <Route path="content" element={<CourseContentPage courseId={courseId} />} />
          <Route path="report" element={<QualityReportPage courseId={courseId} />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="faculty/profile" element={<FacultyProfile />} />
          {sidebarNavSubtopics.filter((topic) => topic.kind !== 'student-details' && topic.kind !== 'content' && topic.kind !== 'faculty-profile').map((topic) => (
            <Route key={topic.id} path={topic.to.replace(/^\//, '')} element={<SidebarSubtopicPage topic={topic} courseId={courseId} onCourseChange={setCourseId} />} />
          ))}
        </Route>

        {sidebarNavSubtopics.filter((topic) => topic.kind === 'content').map((topic) => (
          <Route
            key={topic.id}
            path={topic.to.replace(/^\//, '')}
            element={<SharedCourseTopic topic={topic} courseId={courseId} />}
          />
        ))}
      </Route>
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
    </Suspense>
  )
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
