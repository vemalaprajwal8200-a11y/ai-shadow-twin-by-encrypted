import { SunMoon, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function SidebarPanel({ user, setDarkMode, children, onNavigate, onClose, mobile = false }) {
  const nav = typeof children === 'function' ? children(onNavigate) : children

  return (
    <div className="flex h-full flex-col bg-sidebar px-4 py-5 text-sidebar-fg">
      <div className="mb-7 flex items-center justify-between px-2">
        <Link to="/" className="min-w-0 leading-tight" onClick={onNavigate}>
          <span className="block text-[11px] font-semibold text-sidebar-fg/65">Faculty AI</span>
          <span className="mt-1 block text-xl font-semibold text-white">Shadow-Twin</span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDarkMode((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-lg text-sidebar-fg/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Toggle theme"
          >
            <SunMoon aria-hidden="true" className="h-4 w-4" />
          </button>
          {mobile && <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-sidebar-fg/75 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close navigation">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1">{nav}</div>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-3.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary-light ring-4 ring-primary-light/15" />
          <p className="text-xs font-semibold text-white">Twin status</p>
        </div>
        <p className="mt-2 text-xs text-sidebar-fg/65">Ready for analysis</p>
      </div>
      <p className="mt-4 truncate px-2 text-xs text-sidebar-fg/55">{user?.name}</p>
    </div>
  )
}

/** @param {{ setDarkMode: (updater: (value: boolean) => boolean) => void, children: import('react').ReactNode, isOpen: boolean, onClose: () => void }} props */
export default function Sidebar({ setDarkMode, children, isOpen, onClose }) {
  const { user } = useAuth()
  const onNavigate = () => onClose()

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-white/10 bg-sidebar lg:block">
        <SidebarPanel user={user} setDarkMode={setDarkMode} onNavigate={() => {}} onClose={() => {}}>{children}</SidebarPanel>
      </aside>
      <div className={`fixed inset-0 z-50 lg:hidden ${isOpen ? 'visible' : 'invisible pointer-events-none'}`} aria-hidden={!isOpen}>
        <button type="button" tabIndex={isOpen ? 0 : -1} onClick={onClose} className={`absolute inset-0 bg-ink/40 transition-opacity duration-150 ${isOpen ? 'opacity-100' : 'opacity-0'}`} aria-label="Close navigation menu" />
        <aside className={`absolute inset-y-0 left-0 w-[min(19rem,88vw)] border-r border-white/10 bg-sidebar shadow-soft transition-transform duration-150 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarPanel user={user} setDarkMode={setDarkMode} onNavigate={onNavigate} onClose={onClose} mobile>{children}</SidebarPanel>
        </aside>
      </div>
    </>
  )
}
