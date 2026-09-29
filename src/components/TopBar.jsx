import { Bell, ChevronDown, LogOut, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function TopBar({ course, courses, onCourseChange }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const selectedCourse = courses.find((entry) => entry.id === (user?.courseId || course)) || courses[0]
  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3 py-3 backdrop-blur sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {user?.role === 'student' ? (
          <span className="max-w-[43vw] truncate rounded-xl border border-border bg-bg px-2.5 py-2 text-xs font-medium text-muted sm:max-w-none sm:px-3 sm:text-sm">{selectedCourse?.title}</span>
        ) : <>
          <div className="rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-muted">Current course</div>
          <div className="relative">
            <select value={course} onChange={(event) => onCourseChange(event.target.value)} className="appearance-none rounded-xl border border-border bg-surface px-4 py-2.5 pr-10 text-sm font-medium text-text">
              {courses.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted" />
          </div>
        </>}
      </div>

      <div className="flex items-center gap-2">
        {user?.role === 'faculty' && <div className="hidden items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-muted md:flex">
          <Search className="h-4 w-4" />
          Search course materials
        </div>}
        <div className="max-w-[76px] text-right sm:max-w-36"><p className="truncate text-xs font-medium text-text sm:text-sm">{user?.name}</p><span className="inline-flex rounded-full border border-border px-1.5 py-0.5 text-[9px] capitalize leading-none text-muted sm:px-2 sm:text-[10px]">{user?.role}</span></div>
        {user?.role === 'faculty' && <button type="button" className="rounded-xl border border-border bg-bg p-2 text-text" aria-label="Notifications"><Bell aria-hidden="true" className="h-4 w-4" /></button>}
        <button type="button" onClick={handleLogout} className="rounded-xl border border-border bg-bg p-2 text-text" aria-label="Log out"><LogOut aria-hidden="true" className="h-4 w-4" /></button>
      </div>
    </header>
  )
}
