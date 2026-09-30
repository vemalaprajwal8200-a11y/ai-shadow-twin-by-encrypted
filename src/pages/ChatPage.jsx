import { useEffect, useState } from 'react'
import ChatInterface from '../components/chat/ChatInterface'
import TwinContextCard from '../components/chat/TwinContextCard'
import {
  deleteChatSession,
  getActiveChatId,
  getStoredChats,
  loadRemoteChatSessions,
  renameChatSession,
  setActiveChatId,
} from '../services/chat'

/**
 * @param {{ courseId: string, onCourseChange: (id: string) => void }} props
 */
export default function ChatPage({ courseId, onCourseChange }) {
  const [unitId, setUnitId] = useState('all')
  const [persona, setPersona] = useState(/** @type {'Beginner' | 'Average' | 'Careful'} */ ('Beginner'))
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [chats, setChats] = useState(() => getStoredChats())
  const [activeChatId, setActiveId] = useState(() => getActiveChatId())

  useEffect(() => {
    let active = true
    loadRemoteChatSessions(courseId).then((remoteChats) => {
      if (!active) return
      setChats(remoteChats)
      const storedId = getActiveChatId()
      const currentId = remoteChats.some((chat) => chat.id === storedId || chat.sessionId === storedId)
        ? storedId
        : remoteChats[0]?.id || null
      setActiveChatId(currentId)
      setActiveId(currentId)
    }).catch(() => {
      if (active) setChats([])
    })
    return () => { active = false }
  }, [courseId])

  const reloadChats = () => {
    setChats(getStoredChats())
    setActiveId(getActiveChatId())
  }

  const handleSelectChat = (id) => {
    setActiveChatId(id)
    setActiveId(id)
    setIsDrawerOpen(false)
  }

  const handleNewChat = () => {
    // Reload chats list
    reloadChats()
    setIsDrawerOpen(false)
  }

  const handleRenameChat = (id, newTitle) => {
    renameChatSession(id, newTitle)
    reloadChats()
  }

  const handleDeleteChat = (id) => {
    deleteChatSession(id)
    reloadChats()
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-6 lg:h-[calc(100vh-4.5rem)]">
      <div className="grid h-full w-full flex-1 gap-6 min-h-0 min-w-0 xl:grid-cols-[1fr_340px]">
        {/* Main Column: Chat Card (about 70%) */}
        <div className="h-full min-h-0 min-w-0">
          <ChatInterface
            courseId={courseId}
            onCourseChange={onCourseChange}
            onToggleContextDrawer={() => setIsDrawerOpen(true)}
          />
        </div>

        {/* Right Column: Twin Context Card (desktop ~30%, >1100px) */}
        <div className="hidden h-full min-h-0 xl:block">
          <TwinContextCard
            courseId={courseId}
            onCourseChange={onCourseChange}
            unitId={unitId}
            onUnitChange={setUnitId}
            persona={persona}
            onPersonaChange={setPersona}
            chats={chats}
            activeChatId={activeChatId}
            onSelectChat={handleSelectChat}
            onNewChat={handleNewChat}
            onRenameChat={handleRenameChat}
            onDeleteChat={handleDeleteChat}
          />
        </div>
      </div>

      {/* Slide-over Drawer for Context Card on screens < 1100px */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-overlay/40 backdrop-blur-xs xl:hidden">
          <div className="h-full w-full max-w-sm p-4 student-drawer bg-bg">
            <TwinContextCard
              courseId={courseId}
              onCourseChange={onCourseChange}
              unitId={unitId}
              onUnitChange={setUnitId}
              persona={persona}
              onPersonaChange={setPersona}
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={handleSelectChat}
              onNewChat={handleNewChat}
              onRenameChat={handleRenameChat}
              onDeleteChat={handleDeleteChat}
              onCloseDrawer={() => setIsDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
