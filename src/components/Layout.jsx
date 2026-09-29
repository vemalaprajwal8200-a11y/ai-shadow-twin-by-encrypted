import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import SidebarNav, { StudentBottomNav } from './SidebarNav'
import TopBar from './TopBar'
import { useAuth } from '../auth/AuthContext'

export default function Layout({ course, courses, onCourseChange, darkMode, setDarkMode }) {
  const { user } = useAuth()
  const isStudent = user?.role === 'student'

  return (
    <div className="app-shell flex min-h-screen bg-bg text-text">
      <Sidebar setDarkMode={setDarkMode}>
        <SidebarNav />
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar course={course} courses={courses} onCourseChange={onCourseChange} />
        <main className={`min-w-0 flex-1 overflow-auto p-5 md:p-6 ${isStudent ? 'pb-24 lg:pb-6' : ''}`}>
          <Outlet />
        </main>
      </div>
      {isStudent && <StudentBottomNav />}
    </div>
  )
}
