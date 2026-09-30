import { useEffect, useState } from 'react'
import { BookOpen, Check, Edit2, FileText, Layers, Plus, Trash2, UserCheck, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getCourseOverview, getPersonas, getUnits } from '../../data/supabaseData'

/**
 * @param {{
 *   courseId: string,
 *   onCourseChange: (id: string) => void,
 *   unitId: string,
 *   onUnitChange: (unit: string) => void,
 *   persona: 'Beginner' | 'Average' | 'Careful',
 *   onPersonaChange: (p: 'Beginner' | 'Average' | 'Careful') => void,
 *   sources?: Array<{ id: string, title: string, type: string }>,
 *   chats: Array<any>,
 *   activeChatId: string,
 *   onSelectChat: (id: string) => void,
 *   onNewChat: () => void,
 *   onRenameChat: (id: string, newTitle: string) => void,
 *   onDeleteChat: (id: string) => void,
 *   onCloseDrawer?: () => void
 * }} props
 */
export default function TwinContextCard({
  courseId,
  onCourseChange,
  unitId,
  onUnitChange,
  persona,
  onPersonaChange,
  sources = [],
  chats = [],
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onCloseDrawer,
}) {
  const [editingChatId, setEditingChatId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [courses, setCourses] = useState([])
  const [units, setUnits] = useState([])
  const [personas, setPersonas] = useState([])
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([getCourseOverview(), getPersonas()]).then(([courseRows, personaRows]) => {
      if (!active) return
      setCourses(courseRows.map((course) => ({
        ...course,
        id: course.course_id || course.id,
        title: course.course_name || course.title || course.name || 'Untitled course',
        code: course.course_code || course.code || '',
      })))
      setPersonas(personaRows.filter((entry) => entry.is_active))
    }).catch((error) => {
      if (active) setDataError(error instanceof Error ? error.message : 'Could not load Twin context.')
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    if (!courseId) {
      setUnits([])
      return undefined
    }
    getUnits(courseId).then((rows) => { if (active) setUnits(rows) }).catch((error) => {
      if (active) setDataError(error instanceof Error ? error.message : 'Could not load units.')
    })
    return () => { active = false }
  }, [courseId])

  const handleStartRename = (chat, e) => {
    e.stopPropagation()
    setEditingChatId(chat.id)
    setEditingTitle(chat.title)
  }

  const handleSaveRename = (chatId, e) => {
    e.stopPropagation()
    if (editingTitle.trim()) {
      onRenameChat(chatId, editingTitle.trim())
    }
    setEditingChatId(null)
  }

  const handleDelete = (chatId, e) => {
    e.stopPropagation()
    if (window.confirm('Delete this chat history?')) {
      onDeleteChat(chatId)
    }
  }

  return (
    <aside className="card flex h-full flex-col p-4 sm:p-5 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg text-heading">Twin context</h3>
        </div>
        {onCloseDrawer && (
          <button
            type="button"
            onClick={onCloseDrawer}
            className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-text lg:hidden"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="space-y-4">
        {dataError && <p role="alert" className="text-xs text-danger">{dataError}</p>}
        <div>
          <label htmlFor="context-course-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            Course
          </label>
          <select
            id="context-course-select"
            value={courseId}
            onChange={(e) => onCourseChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-text outline-none focus:border-primary"
          >
            {courses.length === 0 ? <option value="">No courses yet</option> : courses.map((course) => (
              <option key={course.id} value={course.id}>{course.code ? `${course.code}: ` : ''}{course.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="context-unit-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            Unit Scope
          </label>
          <select
            id="context-unit-select"
            value={unitId}
            onChange={(e) => onUnitChange(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-text outline-none focus:border-primary"
          >
            <option value="all">All Units</option>
            {units.map((unit) => <option key={unit.unit_id || unit.id} value={unit.unit_id || unit.unit_order}>{unit.unit_name || unit.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="context-persona-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted">
            Active Persona
          </label>
          <div className="relative">
            <select
              id="context-persona-select"
              value={persona}
              onChange={(e) => onPersonaChange(/** @type {any} */ (e.target.value))}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-medium text-text outline-none focus:border-primary"
            >
              {personas.length === 0 ? <option value={persona}>{persona}</option> : personas.map((entry) => <option key={entry.persona_id} value={entry.name}>{entry.name}</option>)}
            </select>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {personas.find((entry) => entry.name === persona)?.description || personas.find((entry) => entry.name === persona)?.prompt || 'The selected persona shapes the Twin response.'}
          </p>
        </div>
      </div>

      {/* Sources Used */}
      <div className="border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Sources used</h4>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {sources.length} items
          </span>
        </div>

        {sources.length === 0 ? (
          <p className="py-2 text-xs italic text-muted">Sources cited by the Twin will appear here after an answer.</p>
        ) : (
          <div className="space-y-1.5">
            {sources.map((src, index) => (
              <Link
                key={`${src.id}-${index}`}
                to={`/content/${src.id}`}
                className="flex items-center gap-2 rounded-xl border border-border bg-bg p-2.5 text-xs text-text transition hover:border-primary/50 hover:bg-surface"
              >
                {src.type === 'slide' ? (
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <BookOpen className="h-4 w-4 shrink-0 text-accent" />
                )}
                <span className="truncate font-medium">{src.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Chats */}
      <div className="border-t border-border pt-4 flex-1 flex flex-col min-h-[160px]">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Recent chats</h4>
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[220px] pr-1">
          {chats.length === 0 ? (
            <p className="py-2 text-xs italic text-muted">No recent chat history.</p>
          ) : (
            chats.map((chat) => {
              const isSelected = chat.id === activeChatId
              const isEditing = editingChatId === chat.id

              if (isEditing) {
                return (
                  <div key={chat.id} className="flex items-center gap-1 rounded-xl border border-primary bg-bg p-1.5">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(chat.id, e)}
                      autoFocus
                      className="w-full rounded-lg bg-surface px-2 py-1 text-xs outline-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleSaveRename(chat.id, e)}
                      className="rounded-lg p-1 text-primary hover:bg-primary/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              }

              return (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium cursor-pointer transition ${
                    isSelected ? 'bg-primary text-primary-fg' : 'text-text hover:bg-bg'
                  }`}
                >
                  <span className="truncate pr-2">{chat.title || 'Untitled Conversation'}</span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(chat, e)}
                      className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
                      title="Rename"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(chat.id, e)}
                      className="rounded p-1 hover:bg-red-500/20"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </aside>
  )
}
