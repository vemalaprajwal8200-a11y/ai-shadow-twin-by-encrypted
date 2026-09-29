import { Bell, ChevronDown, Search } from 'lucide-react'

export default function TopBar({ course, courses, onCourseChange }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-muted">
          Current course
        </div>
        <div className="relative">
          <select
            value={course}
            onChange={(event) => onCourseChange(event.target.value)}
            className="appearance-none rounded-xl border border-border bg-surface px-4 py-2.5 pr-10 text-sm font-medium text-text"
          >
            {courses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-muted md:flex">
          <Search className="h-4 w-4" />
          Search course materials
        </div>
        <button className="rounded-xl border border-border bg-bg p-2 text-text" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
