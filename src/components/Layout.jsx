import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout({ course, courses, onCourseChange, darkMode, setDarkMode }) {
  return (
    <div className="app-shell flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar course={course} courses={courses} onCourseChange={onCourseChange} />
        <main className="flex-1 overflow-auto p-5 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
