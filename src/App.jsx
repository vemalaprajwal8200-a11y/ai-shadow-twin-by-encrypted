import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { LoginRoute, ProtectedRoute, RoleRoute } from './components/RouteGuards'
import DashboardHome from './components/DashboardHome'
import { AuthProvider } from './auth/AuthContext'
import { useDarkMode } from './hooks/useDarkMode'

import About from './pages/About'
import CoursesPage from './pages/CoursesPage'
import CourseContentPage from './pages/CourseContentPage'
import ItemDetailPage from './pages/ItemDetailPage'
import QualityReportPage from './pages/QualityReportPage'
import SettingsPage from './pages/SettingsPage'
import MyUnits from './pages/student/MyUnits'
import MissedItems from './pages/student/MissedItems'
import StudyPlan from './pages/student/StudyPlan'
import StudentSettings from './pages/student/StudentSettings'
import StudentCourseContent from './pages/student/StudentCourseContent'
import SidebarSubtopicPage from './pages/SidebarSubtopicPage'
import { sidebarNavSubtopics } from './components/sidebarNavConfig'
import { mockCourses } from './data/mockData'
import { useEffect, useState } from 'react'
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
        <Route path="dashboard" element={<DashboardHome courseId={courseId} />} />

        <Route element={<RoleRoute allowedRoles={['student']} />}>
          <Route path="topics/dashboard/my-units" element={<MyUnits />} />
          <Route path="topics/dashboard/missed" element={<MissedItems />} />
          <Route path="topics/dashboard/plan" element={<StudyPlan />} />
          <Route path="topics/settings/student" element={<StudentSettings />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={['faculty']} />}>
          <Route path="courses" element={<CoursesPage courseId={courseId} />} />
          <Route path="content" element={<CourseContentPage courseId={courseId} />} />
          <Route path="content/:itemId" element={<ItemDetailPage />} />
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
  )
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>
}
