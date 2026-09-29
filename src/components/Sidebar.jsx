import { SunMoon } from 'lucide-react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/** @param {{ setDarkMode: (updater: (value: boolean) => boolean) => void, children: import('react').ReactNode }} props */
export default function Sidebar({ setDarkMode, children }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-sidebar bg-sidebar p-5 text-sidebar-fg backdrop-blur lg:flex">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sidebar-fg/75">Faculty AI</p>
          <h1 className="mt-1 text-2xl font-bold text-sidebar-fg">Shadow-Twin</h1>
        </div>
        <button
          type="button"
          onClick={() => setDarkMode((value) => !value)}
          className="rounded-lg border border-sidebar-fg/40 p-2 text-sidebar-fg transition hover:bg-sidebar/80"
          aria-label="Toggle theme"
        >
          <SunMoon className="h-4 w-4" />
        </button>
      </div>

      {children}

      <div className="mt-auto rounded-2xl border border-accent/40 bg-accent p-4 text-sm text-accent-fg">
        <p className="font-semibold">Twin status</p>
        <p className="mt-1 text-accent-fg">Ready for analysis</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sidebar-fg/40 px-3 py-2.5 text-sm font-medium text-sidebar-fg transition-colors duration-200 hover:bg-sidebar/80"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" /> Log out
      </button>
    </aside>
  )
}
