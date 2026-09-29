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
const SidebarSubtopicPage = lazy(() => import('./pages/SidebarSubtopicPage'))
import { sidebarNavSubtopics } from './components/sidebarNavConfig'
import { mockCourses } from './data/mockData'
import { useAuth } from './auth/AuthContext'

function NotFoundRedirect() {
  useEffect(() => {
    window.location.replace('/404.html')
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
  const [courseId, setCourseId] = useState(mockCourses[0].id)

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
                courses={mockCourses}
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
          <Route path="topics/dashboard/my-units" element={<MyUnits />} />
          <Route path="topics/dashboard/missed" element={<MissedItems />} />
          <Route path="topics/dashboard/plan" element={<StudyPlan />} />
          <Route path="topics/settings/student" element={<StudentSettings />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={['faculty']} />}>
          <Route path="courses" element={<CoursesPage courseId={courseId} />} />
          <Route path="content" element={<CourseContentPage courseId={courseId} />} />
          <Route path="report" element={<QualityReportPage />} />
          <Route path="settings" element={<SettingsPage />} />
          {sidebarNavSubtopics.filter((topic) => topic.kind !== 'student-details' && topic.kind !== 'content').map((topic) => (
            <Route key={topic.id} path={topic.to.replace(/^\//, '')} element={<SidebarSubtopicPage topic={topic} courseId={courseId} />} />
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
