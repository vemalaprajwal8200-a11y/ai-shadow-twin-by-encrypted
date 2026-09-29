import { Bell, ChevronDown, Search } from 'lucide-react'

export default function TopBar({ course, courses, onCourseChange }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Current course
        </div>
        <div className="relative">
          <select
            value={course}
            onChange={(event) => onCourseChange(event.target.value)}
            className="appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 outline-none ring-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {courses.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 md:flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <Search className="h-4 w-4" />
          Search course materials
        </div>
        <button className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
