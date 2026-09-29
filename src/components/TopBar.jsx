import { Bell, ChevronDown, LogOut, Menu, UserRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getSidebarNavGroups } from './sidebarNavConfig'
import { Avatar, Badge } from './ui/Primitives'

function getPageContext(pathname, role) {
  const groups = getSidebarNavGroups(role)
  if (pathname === '/dashboard') return { group: 'Dashboard', title: role === 'student' ? 'My details' : 'Student details' }
  if (pathname === '/courses') return { group: 'Courses & Upload', title: 'Courses and upload' }
  if (pathname === '/content') return { group: 'Course Content', title: 'Course content' }
  if (pathname.startsWith('/content/')) return { group: 'Course Content', title: 'Item details' }
  if (pathname === '/report') return { group: 'Quality Report', title: 'Content quality report' }
  if (pathname === '/settings' || pathname === '/topics/settings/student') return { group: 'Settings', title: 'Settings' }

  for (const group of groups) {
    const child = group.children.find((entry) => entry.to === pathname)
    if (child) return { group: group.label, title: child.label }
  }
  return { group: 'Dashboard', title: 'Dashboard' }
}

export default function TopBar({ course, courses, onCourseChange, onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const selectedCourse = courses.find((entry) => entry.id === (user?.courseId || course)) || courses[0]
  const page = getPageContext(location.pathname, user?.role === 'student' ? 'student' : 'faculty')

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-[76px] items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onMenuClick} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-text transition-colors hover:bg-page lg:hidden" aria-label="Open navigation">
          <Menu aria-hidden="true" className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs text-muted">{page.group}<span className="mx-1.5 text-border">/</span><span className="text-text">{page.title}</span></p>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
        {user?.role === 'student' ? (
          <Badge tone="brand" className="hidden max-w-52 truncate sm:inline-flex">{selectedCourse?.title}</Badge>
        ) : <>
          <div className="relative flex min-w-0 items-center">
            <label htmlFor="active-course" className="sr-only">Current course</label>
            <select id="active-course" value={course} onChange={(event) => onCourseChange(event.target.value)} className="ui-input min-h-9 w-[34vw] min-w-24 max-w-44 appearance-none truncate pr-8 text-xs font-medium sm:min-h-10 sm:text-sm">
              {courses.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
        </>}
        {user?.role === 'faculty' && <button type="button" className="hidden h-10 w-10 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-page hover:text-text md:grid" aria-label="Notifications"><Bell aria-hidden="true" className="h-4 w-4" /></button>}
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-page focus-visible:outline-none sm:gap-3">
            <Avatar name={user?.name} size="sm" />
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-32 truncate text-sm font-medium text-heading">{user?.name}</span>
              <span className="block text-xs capitalize text-muted">{user?.role}</span>
            </span>
            <ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-muted sm:block" />
          </summary>
          <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-border bg-surface p-1.5 shadow-soft">
            <Link to={user?.role === 'student' ? '/dashboard' : '/settings'} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-text transition-colors hover:bg-page">
              <UserRound aria-hidden="true" className="h-4 w-4 text-muted" /> {user?.role === 'student' ? 'My details' : 'Profile settings'}
            </Link>
            <button type="button" onClick={handleLogout} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-danger transition-colors hover:bg-danger/5">
              <LogOut aria-hidden="true" className="h-4 w-4" /> Log out
            </button>
          </div>
        </details>
      </div>
    </header>
  )
}
