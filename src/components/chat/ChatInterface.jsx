import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Paperclip, Plus, RefreshCcw, Send, Sparkles, Square, X } from 'lucide-react'
import MessageBubble from './MessageBubble'
import { useAuth } from '../../auth/AuthContext'
import {
  createNewChatSession,
  deleteChatSession,
  getActiveChatId,
  loadRemoteChatSessions,
  getStoredChats,
  renameChatSession,
  saveStoredChats,
  sendChatMessageStream,
  setActiveChatId,
  updateChatSession,
} from '../../services/chat'
import { checkApiHealth } from '../../services/api'

/**
 * @param {{
 *   courseId: string,
 *   onCourseChange: (id: string) => void,
 *   isCompact?: boolean,
 *   onToggleContextDrawer?: () => void,
 *   onNavigate?: () => void
 * }} props
 */
export default function ChatInterface({
  courseId,
  onCourseChange,
  isCompact = false,
  onToggleContextDrawer,
  onNavigate,
}) {
  const { user } = useAuth()
  const isStudent = user?.role === 'student'

  const [chats, setChats] = useState([])
  const [activeChat, setActiveChat] = useState(null)
  const [input, setInput] = useState('')
  const [unitId, setUnitId] = useState('all')
  const [persona, setPersona] = useState(/** @type {'Beginner' | 'Average' | 'Careful'} */ ('Beginner'))
  const [attachments, setAttachments] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [offlineError, setOfflineError] = useState(null)
  const [isApiHealthy, setIsApiHealthy] = useState(false)
  const [sources, setSources] = useState([])

  const abortControllerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const lastFailedMessageRef = useRef(null)

  const refreshApiHealth = async () => {
    setIsApiHealthy(await checkApiHealth())
  }

  useEffect(() => {
    let active = true
    const initializeChat = async () => {
      let loadedChats = []
      try {
        loadedChats = await loadRemoteChatSessions(courseId)
      } catch (loadError) {
        if (active) setOfflineError(loadError instanceof Error ? `Could not load chat history: ${loadError.message}` : 'Could not load chat history.')
      }
      if (!active) return
      setChats(loadedChats)
      const activeId = getActiveChatId()
      let current = loadedChats.find((chat) => chat.id === activeId || chat.sessionId === activeId)
      if (!current) current = loadedChats[0]
      if (!current) current = createNewChatSession({ courseId, unitId, persona })
      setActiveChatId(current.id)
      setActiveChat(current)
      setPersona(current.persona || 'Beginner')
      setUnitId(current.unitId || 'all')
      setChats(getStoredChats())
    }
    void initializeChat()
    return () => { active = false }
  }, [courseId])

  useEffect(() => {
    refreshApiHealth()
    const interval = window.setInterval(refreshApiHealth, 15000)
    return () => window.clearInterval(interval)
  }, [])

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeChat?.messages, streamingContent])

  // Sync active chat state changes to localStorage
  const updateCurrentChatMessages = (messagesUpdater) => {
    if (!activeChat) return
    const updated = updateChatSession(activeChat.id, (chat) => {
      const nextMsgs = typeof messagesUpdater === 'function' ? messagesUpdater(chat.messages) : messagesUpdater
      return { ...chat, messages: nextMsgs, courseId, unitId, persona }
    })
    if (updated) {
      setActiveChat(updated)
      setChats(getStoredChats())
    }
  }

  const handleNewChat = () => {
    if (isStreaming) handleStopStreaming()
    const newChat = createNewChatSession({ courseId, unitId, persona })
    setActiveChat(newChat)
    setChats(getStoredChats())
    setInput('')
    setAttachments([])
    setOfflineError(null)
    setSources([])
  }

  const handleSelectChat = (id) => {
    if (isStreaming) handleStopStreaming()
    setActiveChatId(id)
    const found = chats.find((c) => c.id === id)
    if (found) {
      setActiveChat(found)
      if (found.persona) setPersona(found.persona)
      if (found.unitId) setUnitId(found.unitId)
    }
  }

  const handlePersonaChange = (newPersona) => {
    setPersona(newPersona)
    if (activeChat) {
      updateChatSession(activeChat.id, { persona: newPersona })
      setActiveChat((c) => c ? { ...c, persona: newPersona } : c)
    }
  }

  const handleUnitChange = (newUnit) => {
    setUnitId(newUnit)
    if (activeChat) {
      updateChatSession(activeChat.id, { unitId: newUnit })
      setActiveChat((c) => c ? { ...c, unitId: newUnit } : c)
    }
  }

  // Handle Textarea Auto-growth up to 6 lines (~144px)
  const handleTextareaInput = (e) => {
    setInput(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`
    }
  }

  // File Attachment Handling
  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newAtts = files.map((file) => ({
      name: file.name,
      type: file.type || 'document',
      size: file.size,
    }))
    setAttachments((prev) => [...prev, ...newAtts])
  }

  const handleRemoveAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx))
  }

  // Send Message Logic
  const handleSendMessage = async (textToSend = input, retrying = false) => {
    const trimmed = textToSend.trim()
    if (!trimmed || isStreaming || !activeChat) return

    setOfflineError(null)
    const userMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
      attachments: [...attachments],
    }

    // Auto-title chat on first message
    if (!retrying && activeChat.messages.length === 0) {
      const autoTitle = trimmed.length > 32 ? `${trimmed.substring(0, 32)}...` : trimmed
      renameChatSession(activeChat.id, autoTitle)
    }

    const nextMessages = retrying ? activeChat.messages : [...activeChat.messages, userMessage]
    if (!retrying) updateCurrentChatMessages(nextMessages)

    setInput('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    // Start streaming Twin reply
    setIsStreaming(true)
    setStreamingContent('')

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    await sendChatMessageStream({
      messages: nextMessages,
      courseId,
      unitId,
      persona,
      role: user?.role || 'student',
      sessionId: activeChat.sessionId,
      signal: abortController.signal,
      onToken: (token) => {
        setStreamingContent((prev) => prev + token)
      },
      onComplete: ({ text, itemCards, sources: replySources, isOffline, errorCode, warning, sessionId }) => {
        setIsStreaming(false)
        setStreamingContent('')
        abortControllerRef.current = null

        if (replySources && replySources.length > 0) {
          setSources(replySources)
        }

        const assistantMessage = {
          id: `msg_twin_${Date.now()}`,
          role: 'assistant',
          content: text,
          timestamp: new Date().toISOString(),
          itemCards: itemCards || [],
          sources: replySources || [],
          isOffline: Boolean(isOffline),
        }

        updateCurrentChatMessages((currentMsgs) => [...currentMsgs, assistantMessage])
        if (sessionId && sessionId !== activeChat.sessionId) {
          const syncedChat = updateChatSession(activeChat.id, { sessionId })
          if (syncedChat) setActiveChat(syncedChat)
        }

        if (isOffline && warning) {
          setOfflineError(warning)
        } else {
          // Successful live reply — clear any stale offline banner
          setOfflineError(null)
          lastFailedMessageRef.current = null
        }
      },
      onError: (err) => {
        setIsStreaming(false)
        setStreamingContent('')
        abortControllerRef.current = null
        const codeStr = err.code ? ` [${err.code}]` : ''
        setOfflineError(`${err.message || 'Twin API is unavailable.'}${codeStr}`)
        lastFailedMessageRef.current = trimmed
        refreshApiHealth()
      },
    })
  }

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (streamingContent && activeChat) {
      const partialMsg = {
        id: `msg_twin_${Date.now()}`,
        role: 'assistant',
        content: `${streamingContent} [Stopped]`,
        timestamp: new Date().toISOString(),
      }
      updateCurrentChatMessages((msgs) => [...msgs, partialMsg])
    }
    setIsStreaming(false)
    setStreamingContent('')
  }

  const handleRegenerate = () => {
    if (!activeChat || activeChat.messages.length === 0 || isStreaming) return
    // Find last user message
    const msgs = [...activeChat.messages]
    const lastUserMsgIdx = msgs.map((m) => m.role).lastIndexOf('user')
    if (lastUserMsgIdx === -1) return

    const lastUserMsg = msgs[lastUserMsgIdx]
    // Remove messages after last user message
    const trimmedMsgs = msgs.slice(0, lastUserMsgIdx + 1)
    updateCurrentChatMessages(trimmedMsgs)
    handleSendMessage(lastUserMsg.content)
  }

  const handleFeedback = (msgId, rating) => {
    updateCurrentChatMessages((msgs) =>
      msgs.map((m) => (m.id === msgId ? { ...m, feedback: m.feedback === rating ? null : rating } : m))
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Suggested Prompts based on user role (Faculty vs Student)
  const facultySuggestedPrompts = [
    'Which items in Unit 2 look ambiguous?',
    'Explain why this question was flagged',
    'Work through this slide as a beginner',
    'Suggest a clearer rewrite',
  ]

  const studentSuggestedPrompts = [
    'Help me review missed items from Unit 1',
    'Explain recursion and stack frames simply',
    'What are the common pitfalls in BST searches?',
    'Create a 3-step study plan for my next check-in',
  ]

  const suggestedPrompts = isStudent ? studentSuggestedPrompts : facultySuggestedPrompts
  const messages = activeChat?.messages || []

  return (
    <div className="card flex flex-col h-full overflow-hidden bg-surface">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          {/* Twin avatar: mint circle with sparkle icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CFFFDC] text-[#2E6F40] shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-heading leading-none">Shadow-Twin</h2>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {isStreaming ? 'Thinking...' : isApiHealthy ? 'Ready' : 'Offline Mode'}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">Course AI co-pilot • {courseId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Persona dropdown */}
          <select
            aria-label="Learner persona"
            value={persona}
            onChange={(e) => handlePersonaChange(/** @type {any} */ (e.target.value))}
            className="rounded-xl border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text outline-none focus:border-primary"
          >
            <option value="Beginner">Beginner</option>
            <option value="Average">Average</option>
            <option value="Careful">Careful</option>
          </select>

          {/* New chat button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-bg px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-primary hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New chat</span>
          </button>

          {/* Context Drawer Toggle for < 1100px */}
          {onToggleContextDrawer && (
            <button
              type="button"
              onClick={onToggleContextDrawer}
              className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 lg:hidden"
            >
              Twin Context
            </button>
          )}
        </div>
      </header>

      {/* Offline Banner */}
      {offlineError && (
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 dark:bg-amber-950/50 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{offlineError}</span>
          </div>
          <button
            type="button"
            onClick={async () => {
              await refreshApiHealth()
              if (lastFailedMessageRef.current) handleSendMessage(lastFailedMessageRef.current, true)
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-200 dark:bg-amber-800 px-2.5 py-1 font-semibold text-amber-900 dark:text-amber-100 hover:bg-amber-300 transition"
          >
            <RefreshCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Message Thread */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 && !isStreaming ? (
          /* Empty State */
          <div className="flex h-full flex-col items-center justify-center py-8 text-center max-w-lg mx-auto">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#CFFFDC] text-[#2E6F40] shadow-md">
              <Sparkles className="h-8 w-8" />
            </div>

            <h3 className="text-2xl font-bold text-heading">What should we look into today?</h3>
            <p className="mt-2 text-sm text-muted">
              Ask the Twin about your course materials, evaluate ambiguous slides, check stack frames, or request study plans.
            </p>

            {/* 4 Suggested Prompt Chips */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="rounded-2xl border border-primary/20 bg-[#CFFFDC]/40 dark:bg-primary/10 p-3 text-left text-xs font-semibold text-[#2E6F40] dark:text-primary transition-all duration-200 hover:bg-[#CFFFDC] dark:hover:bg-primary/20 hover:shadow-sm hover:-translate-y-0.5"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="text-center text-[11px] font-bold uppercase tracking-wider text-muted/70 my-2">
              Today
            </div>

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined}
                onFeedback={handleFeedback}
                onRetryOffline={() => handleSendMessage()}
                onNavigate={onNavigate}
              />
            ))}

            {/* Streamed Token-by-token message bubble while streaming */}
            {isStreaming && (
              <div className="flex items-start gap-3 my-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CFFFDC] text-[#2E6F40] shadow-xs">
                  <Sparkles className="h-4 w-4 animate-spin" />
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-tl-xs border border-[#E3EEE6] dark:border-border bg-white dark:bg-surface px-4 py-3.5 shadow-xs">
                  <div className="mb-1 text-xs font-bold text-heading">Shadow-Twin</div>

                  {streamingContent ? (
                    <MessageBubble
                      message={{
                        id: 'streaming_active',
                        role: 'assistant',
                        content: streamingContent,
                      }}
                      onNavigate={onNavigate}
                    />
                  ) : (
                    /* 3 Pulsing typing indicator dots */
                    <div className="flex items-center gap-1.5 py-2">
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview Bar */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-border bg-bg px-4 py-2">
          {attachments.map((att, idx) => (
            <span key={idx} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1 text-xs font-medium text-text">
              <Paperclip className="h-3.5 w-3.5 text-primary" />
              {att.name}
              <button
                type="button"
                onClick={() => handleRemoveAttachment(idx)}
                className="rounded p-0.5 hover:bg-black/10 text-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Composer */}
      <footer className="border-t border-border bg-surface p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSendMessage()
          }}
          className="flex flex-col gap-2"
        >
          <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-bg p-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-[#68BA7F]/20">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileAttach}
              accept=".pdf,.txt,.doc,.docx"
              multiple
              className="hidden"
            />

            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl p-2.5 text-muted hover:bg-surface hover:text-primary transition"
              title="Attach PDF or TXT course file"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            {/* Auto-growing Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask the Twin about your course material..."
              className="flex-1 max-h-36 min-h-[38px] resize-none border-0 bg-transparent py-2 px-1 text-sm text-text placeholder:text-muted outline-none"
            />

            {/* Send or Stop button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopStreaming}
                className="rounded-xl bg-danger p-2.5 text-white transition hover:bg-danger/90"
                title="Stop response"
              >
                <Square className="h-4 w-4 fill-white" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-xl bg-primary p-2.5 text-primary-fg transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between px-2 text-[11px] text-muted">
            <span>Press Enter to send, Shift+Enter for new line</span>
            <span>{input.length} / 2000</span>
          </div>
        </form>
      </footer>
    </div>
  )
}
