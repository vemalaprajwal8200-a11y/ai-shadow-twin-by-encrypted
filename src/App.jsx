import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useDarkMode } from './hooks/useDarkMode'

import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import CoursesPage from './pages/CoursesPage'
import CourseContentPage from './pages/CourseContentPage'
import ItemDetailPage from './pages/ItemDetailPage'
import QualityReportPage from './pages/QualityReportPage'
import SettingsPage from './pages/SettingsPage'
import { mockCourses } from './data/mockData'
import { useState } from 'react'

function ProtectedRoute({ children }) {
  const isAuthenticated = Boolean(localStorage.getItem('shadow-twin-token'))
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [darkMode, setDarkMode] = useDarkMode()
  const [courseId, setCourseId] = useState(mockCourses[0].id)

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
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
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage courseId={courseId} />} />
          <Route path="courses" element={<CoursesPage courseId={courseId} />} />
          <Route path="content" element={<CourseContentPage courseId={courseId} />} />
          <Route path="content/:itemId" element={<ItemDetailPage />} />
          <Route path="report" element={<QualityReportPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </div>
  )
}
