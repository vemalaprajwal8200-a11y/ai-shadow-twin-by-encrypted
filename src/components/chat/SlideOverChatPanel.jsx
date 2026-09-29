import { useState } from 'react'
import { Maximize2, Sparkles, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import ChatInterface from './ChatInterface'

/**
 * @param {{ courseId: string, onCourseChange: (id: string) => void }} props
 */
export default function SlideOverChatPanel({ courseId, onCourseChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Hide floating button when already on the /chat page
  if (location.pathname === '/chat') {
    return null
  }

  const handleOpenFullChat = () => {
    setIsOpen(false)
    navigate('/chat')
  }

  return (
    <>
      {/* Floating Round Chat Button (bottom-right, #2E6F40, sparkle icon) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open Ask the Twin Chat"
        aria-expanded={isOpen}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#2E6F40] text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-[#253D2C] focus-visible:outline-2 focus-visible:outline-[#68BA7F]"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* 400px Slide-Over Chat Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-border bg-surface shadow-2xl student-drawer">
          <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#CFFFDC] text-[#2E6F40]">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-bold text-sm text-heading">Ask the Twin</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleOpenFullChat}
                className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-text"
                title="Expand to full page"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-bg hover:text-text"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden p-2">
            <ChatInterface
              courseId={courseId}
              onCourseChange={onCourseChange}
              isCompact
              onNavigate={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
