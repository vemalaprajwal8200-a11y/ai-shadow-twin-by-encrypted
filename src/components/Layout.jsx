import { useCallback, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import SidebarNav from './SidebarNav'
import TopBar from './TopBar'
import { useAuth } from '../auth/AuthContext'

export default function Layout({ course, courses, onCourseChange, darkMode, setDarkMode }) {
  const { user } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

  return (
    <div className="app-shell flex min-h-screen bg-bg text-text">
      <Sidebar setDarkMode={setDarkMode} isOpen={mobileNavOpen} onClose={closeMobileNav}>
        {(onNavigate) => <SidebarNav onNavigate={onNavigate} />}
      </Sidebar>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar course={course} courses={courses} onCourseChange={onCourseChange} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1100px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
