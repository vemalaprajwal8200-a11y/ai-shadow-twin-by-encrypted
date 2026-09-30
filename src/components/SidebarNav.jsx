import { useRef, useState } from 'react'
import { ChevronDown, Circle } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { getSidebarNavGroups, studentBottomTabs } from './sidebarNavConfig'
import { useAuth } from '../auth/AuthContext'

/** @typedef {import('./sidebarNavConfig').SidebarNavGroup} SidebarNavGroup */

/**
 * @param {{ group: SidebarNavGroup, isOpen: boolean, onToggle: (open: boolean) => void }} props
 */
function NavGroup({ group, isOpen, onToggle, onNavigate }) {
  const closeTimer = useRef(null)
  const pointerType = useRef('')
  const openOnPointerDown = useRef(false)
  const location = useLocation()
  const panelId = `sidebar-submenu-${group.to.replace(/[^a-z0-9]+/gi, '-')}`
  const Icon = group.icon
  const hasActiveChild = group.children.some((child) => (
    new URL(child.to, window.location.origin).pathname === location.pathname
  ))

  const cancelClose = () => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  const scheduleClose = (groupElement) => {
    cancelClose()
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null
      if (groupElement.contains(document.activeElement)) return
      onToggle(false)
    }, 150)
  }

  return (
    <div
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return
        cancelClose()
        onToggle(true)
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse' && !event.currentTarget.contains(document.activeElement)) {
          scheduleClose(event.currentTarget)
        }
      }}
      onFocusCapture={() => {
        cancelClose()
        onToggle(true)
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onToggle(false)
      }}
      className="space-y-1"
    >
      <div className="flex items-center gap-1">
        <NavLink
          to={group.to}
          onClick={onNavigate}
          className={({ isActive }) => `sidebar-link min-w-0 flex-1 ${hasActiveChild ? 'parent-active' : isActive ? 'active' : ''}`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{group.label}</span>
          {group.badge && (
            <span className="ml-auto rounded-md bg-soft text-soft-text px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
              {group.badge}
            </span>
          )}
        </NavLink>
        {group.children.length > 0 && <button
          type="button"
          aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${group.label} submenu`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onPointerDown={(event) => {
            pointerType.current = event.pointerType
            openOnPointerDown.current = isOpen
          }}
          onClick={(event) => {
            if (event.detail > 0 && pointerType.current === 'mouse') return
            if (event.detail > 0 && pointerType.current === 'touch') {
              onToggle(!openOnPointerDown.current)
              return
            }
            onToggle(!isOpen)
          }}
          className="rounded-lg p-2 text-sidebar-fg/75 transition hover:bg-sidebar/80 hover:text-sidebar-fg"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
        </button>}
      </div>
      {group.children.length > 0 && <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            role="group"
            aria-label={`${group.label} submenu`}
            className="ml-5 space-y-1 pl-3"
            aria-hidden={!isOpen}
          >
            {group.children.map((child) => (
              <NavLink
                key={child.label}
                to={child.to}
                onClick={onNavigate}
                tabIndex={isOpen ? 0 : -1}
                className={() => {
                  const destination = new URL(child.to, window.location.origin)
                  const isActive = location.pathname === destination.pathname
                    && location.search === destination.search
                    && location.hash === destination.hash
                  return `sidebar-sub-link block rounded-r-lg px-3 py-2 text-sm text-sidebar-fg/80 transition hover:bg-sidebar/80 hover:text-sidebar-fg ${isActive ? 'active' : ''}`
                }}
              >
                <Circle aria-hidden="true" className="mr-2 inline h-2.5 w-2.5" />
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>}
    </div>
  )
}

/**
 * @param {{ groups?: SidebarNavGroup[] }} props
 */
export default function SidebarNav({ groups, onNavigate }) {
  const { user } = useAuth()
  const navGroups = groups || getSidebarNavGroups(user?.role === 'student' ? 'student' : 'faculty')
  const [openGroup, setOpenGroup] = useState('')

  return (
    <nav aria-label="Main" className="space-y-5">
      {navGroups.map((group) => (
        <section key={group.to} aria-label={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-fg">{group.label}</p>
          <NavGroup
            group={group}
            isOpen={openGroup === group.to}
            onNavigate={onNavigate}
            onToggle={(shouldOpen) => setOpenGroup((current) => (
              shouldOpen ? group.to : current === group.to ? '' : current
            ))}
          />
        </section>
      ))}
    </nav>
  )
}

export function StudentBottomNav() {
  const location = useLocation()

  return (
    <nav aria-label="Main student navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-7 border-t border-sidebar-fg/20 bg-sidebar px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {studentBottomTabs.map((tab) => {
        const Icon = tab.icon
        const active = location.pathname === tab.to
        return (
          <NavLink key={tab.to} to={tab.to} aria-current={active ? 'page' : undefined} className={`flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium ${active ? 'text-soft' : 'text-sidebar-fg'}`}>
            <Icon aria-hidden="true" className="h-4 w-4" />
            <span className="max-w-full truncate">{tab.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}