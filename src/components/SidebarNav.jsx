import { useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { sidebarNavGroups } from './sidebarNavConfig'

/** @typedef {import('./sidebarNavConfig').SidebarNavGroup} SidebarNavGroup */

/**
 * @param {{ group: SidebarNavGroup, isOpen: boolean, onToggle: (open: boolean) => void }} props
 */
function NavGroup({ group, isOpen, onToggle }) {
  const closeTimer = useRef(null)
  const pointerType = useRef('')
  const openOnPointerDown = useRef(false)
  const location = useLocation()
  const panelId = `sidebar-submenu-${group.to.replace(/[^a-z0-9]+/gi, '-')}`
  const Icon = group.icon

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
          className={({ isActive }) => `sidebar-link min-w-0 flex-1 ${isActive ? 'active' : ''}`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{group.label}</span>
        </NavLink>
        <button
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
        </button>
      </div>
      <div
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
                tabIndex={isOpen ? 0 : -1}
                className={() => {
                  const destination = new URL(child.to, window.location.origin)
                  const isActive = location.pathname === destination.pathname
                    && location.search === destination.search
                    && location.hash === destination.hash
                  return `block rounded-lg px-3 py-2 text-sm text-sidebar-fg/80 transition hover:bg-sidebar/80 hover:text-sidebar-fg ${isActive ? 'bg-accent text-accent-fg' : ''}`
                }}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{ groups?: SidebarNavGroup[] }} props
 */
export default function SidebarNav({ groups = sidebarNavGroups }) {
  const [openGroup, setOpenGroup] = useState('')

  return (
    <nav aria-label="Main" className="space-y-2">
      {groups.map((group) => (
        <NavGroup
          key={group.to}
          group={group}
          isOpen={openGroup === group.to}
          onToggle={(shouldOpen) => setOpenGroup((current) => (
            shouldOpen ? group.to : current === group.to ? '' : current
          ))}
        />
      ))}
    </nav>
  )
}