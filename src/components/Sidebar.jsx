import { BarChart3, FileText, FolderOpen, Settings, ShieldCheck, SunMoon } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/courses', label: 'Courses & Upload', icon: FolderOpen },
  { to: '/content', label: 'Course Content', icon: FileText },
  { to: '/report', label: 'Quality Report', icon: ShieldCheck },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ darkMode, setDarkMode }) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-white/70 p-5 backdrop-blur lg:flex dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Faculty AI</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Shadow-Twin</h1>
        </div>
        <button
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          <SunMoon className="h-4 w-4" />
        </button>
      </div>

      <nav className="space-y-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
        <p className="font-semibold">Twin status</p>
        <p className="mt-1 text-blue-700 dark:text-blue-200">Ready for analysis</p>
      </div>
    </aside>
  )
}
