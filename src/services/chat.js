import { courseItems } from '../data/mockData'
import { API_BASE_URL } from './api'

const CHATS_STORAGE_KEY = 'ai_shadow_twin_chats'
const ACTIVE_CHAT_KEY = 'ai_shadow_twin_active_chat'

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   createdAt: string,
 *   updatedAt: string,
 *   courseId: string,
 *   unitId: string,
 *   persona: 'Beginner' | 'Average' | 'Careful',
 *   messages: Array<{
 *     id: string,
 *     role: 'user' | 'assistant',
 *     content: string,
 *     timestamp: string,
 *     sources?: Array<{ id: string, title: string, type: string }>,
 *     itemCards?: Array<{ id: string, title: string, verdict: string, reason: string }>,
 *     attachments?: Array<{ name: string, type: string, size?: number }>,
 *     feedback?: 'up' | 'down' | null,
 *     isOffline?: boolean,
 *     error?: string
 *   }>
 * }} ChatSession
 */

export function getStoredChats() {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveStoredChats(chats) {
  try {
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats))
  } catch (err) {
    console.error('Failed to save chats to localStorage:', err)
  }
}

export function getActiveChatId() {
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY) || null
  } catch {
    return null
  }
}

export function setActiveChatId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_CHAT_KEY, id)
    } else {
      localStorage.removeItem(ACTIVE_CHAT_KEY)
    }
  } catch (err) {
    console.error('Failed to set active chat id:', err)
  }
}

export function createNewChatSession({ courseId = 'intro-data-structures', unitId = 'all', persona = 'Beginner', title = 'New Conversation' } = {}) {
  const newChat = {
    id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courseId,
    unitId: String(unitId),
    persona,
    messages: [],
  }

  const chats = getStoredChats()
  chats.unshift(newChat)
  saveStoredChats(chats)
  setActiveChatId(newChat.id)
  return newChat
}

export function updateChatSession(chatId, updater) {
  const chats = getStoredChats()
  const index = chats.findIndex((c) => c.id === chatId)
  if (index === -1) return null

  const updated = typeof updater === 'function' ? updater(chats[index]) : { ...chats[index], ...updater }
  updated.updatedAt = new Date().toISOString()
  chats[index] = updated
  saveStoredChats(chats)
  return updated
}

export function deleteChatSession(chatId) {
  const chats = getStoredChats().filter((c) => c.id !== chatId)
  saveStoredChats(chats)
  const activeId = getActiveChatId()
  if (activeId === chatId) {
    setActiveChatId(chats[0]?.id || null)
  }
  return chats
}

export function renameChatSession(chatId, newTitle) {
  return updateChatSession(chatId, (chat) => ({
    ...chat,
    title: newTitle.trim() || chat.title,
  }))
}

/**
 * Smart offline fallback response generator grounded in courseItems
 */
function generateOfflineMockResponse(query, courseId, unitId, persona) {
  const lower = query.toLowerCase()
  let filtered = courseItems.filter((item) => !courseId || item.courseId === courseId)
  if (unitId && unitId !== 'all') {
    filtered = filtered.filter((item) => String(item.unit) === String(unitId))
  }

  const flagged = filtered.filter((item) => item.verdict !== 'Clean')
  const clean = filtered.filter((item) => item.verdict === 'Clean')

  let replyText = ''
  const itemCards = []
  const sources = []

  if (lower.includes('ambiguous') || lower.includes('flagged') || lower.includes('defect') || lower.includes('unit 2')) {
    const targetItems = flagged.length > 0 ? flagged.slice(0, 2) : courseItems.slice(0, 2)
    replyText = `Based on the course material for **${courseId || 'CS101'}** (Unit ${unitId === 'all' ? 'All' : unitId}), here are the key items identified with potential ambiguities or defects:\n\n`

    targetItems.forEach((item) => {
      sources.push({ id: item.id, title: item.title, type: item.type })
      const reason = item.reasons[0] || 'Content requires faculty review due to potential learner confusion.'
      itemCards.push({
        id: item.id,
        title: item.title,
        verdict: item.verdict,
        reason,
      })
      replyText += `* **[${item.type === 'slide' ? 'Slide' : 'Question'}] ${item.title}**: ${reason}\n`
    })

    if (persona === 'Beginner') {
      replyText += `\n*Beginner Note:* For novices, terms like "${targetItems[0]?.title || 'these concepts'}" should be introduced step-by-step before using advanced pointer or search terminology.`
    } else if (persona === 'Careful') {
      replyText += `\n*Careful Persona Analysis:* The edge cases and formal definitions in these slides conflict with standard textbook invariants.`
    }
  } else if (lower.includes('recursion') || lower.includes('stack')) {
    const stackItem = courseItems.find((i) => i.id === 'slide-5') || courseItems[0]
    sources.push({ id: stackItem.id, title: stackItem.title, type: stackItem.type })
    itemCards.push({
      id: stackItem.id,
      title: stackItem.title,
      verdict: stackItem.verdict,
      reason: stackItem.reasons[0] || 'Scope and stack frame lifespan need clearer distinction.',
    })
    replyText = `When studying **${stackItem.title}**, remember that every recursive call allocates a distinct activation record (stack frame) in memory.\n\nKey takeaways:\n1. Each frame stores local variables and the return address.\n2. In execution, frames are pushed onto the call stack until the base case is met.\n3. The stack unwinds as each call returns.\n\nWe flagged this item because saying "the state is preserved in a stack frame invisible to the programmer" can cause confusion for students tracing recursion.`
  } else if (lower.includes('rewrite') || lower.includes('suggest')) {
    const defectItem = flagged[0] || courseItems[0]
    sources.push({ id: defectItem.id, title: defectItem.title, type: defectItem.type })
    itemCards.push({
      id: defectItem.id,
      title: defectItem.title,
      verdict: defectItem.verdict,
      reason: defectItem.reasons[0],
    })
    replyText = `Here is a clearer rewrite suggestion for **${defectItem.title}**:\n\n> **Suggested Version:** "${defectItem.suggestedRewrite}"\n\n**Why this helps:** It removes ambiguous phrasing and ensures students understand the concept without introducing unintroduced concepts.`
  } else if (lower.includes('plan') || lower.includes('study')) {
    replyText = `Here is a recommended **3-Step Study Plan** based on taught materials:\n\n1. **Review Unit 1 Foundations**: Re-visit array memory indexing vs. pointers.\n2. **Practice Stack & Queue Operations**: Verify LIFO vs. FIFO semantics.\n3. **Analyze BST Search Traversal**: Focus on worst-case complexity assumptions ($O(\\log n)$ vs $O(n)$).\n\nWould you like me to quiz you on any of these topics?`
  } else {
    const item = filtered[0] || courseItems[0]
    sources.push({ id: item.id, title: item.title, type: item.type })
    if (item.verdict !== 'Clean') {
      itemCards.push({
        id: item.id,
        title: item.title,
        verdict: item.verdict,
        reason: item.reasons[0] || 'Needs review',
      })
    }
    replyText = `I analyzed your request against **${item.title}** (${item.section || 'Unit ' + item.unit}).\n\n* **Content:** ${item.content}\n* **Context taught so far:** ${item.context}\n\nFeel free to ask for specific rewrites, flagged item breakdowns, or beginner explanations!`
  }

  return { replyText, itemCards, sources }
}

function userMessageForChatStatus(status, fallback) {
  if (status === 422) return fallback || 'That message could not be sent. Please check it and try again.'
  if (status === 503) return fallback || 'Chat is not configured on the server.'
  if (status === 502) return fallback || 'The assistant is temporarily unavailable. Please try again.'
  return fallback || 'API endpoint unavailable.'
}

/**
 * POST /chat on the FastAPI backend. Keys never leave the server.
 */
export async function sendChatMessage({ message, history = [], provider, signal } = {}) {
  const timeoutController = new AbortController()
  const timeout = window.setTimeout(() => timeoutController.abort(), 30000)
  const abortRequest = () => timeoutController.abort()
  signal?.addEventListener('abort', abortRequest, { once: true })
  let response
  try {
    response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        message,
        history,
        ...(provider ? { provider } : {}),
      }),
      signal: timeoutController.signal,
    })
  } catch (err) {
    if (timeoutController.signal.aborted && !signal?.aborted) {
      const error = new Error('The chat service timed out. Please try again.')
      error.code = 'TIMEOUT'
      if (import.meta.env.DEV) console.error('Chat request timed out:', err)
      throw error
    }
    if (err?.name === 'AbortError') throw err
    if (import.meta.env.DEV) console.error('Chat request failed:', err)
    const error = new Error('Could not reach the chat service. Check that the API is running.')
    error.code = 'NETWORK_ERROR'
    throw error
  } finally {
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', abortRequest)
  }

  const raw = await response.text()
  let parsed = {}
  try {
    parsed = raw ? JSON.parse(raw) : {}
  } catch {
    parsed = {}
  }

  if (!response.ok) {
    const err = new Error(userMessageForChatStatus(response.status, parsed.error))
    err.code =
      response.status === 422
        ? 'VALIDATION_ERROR'
        : response.status === 503
          ? 'NOT_CONFIGURED'
          : response.status === 502
            ? 'PROVIDER_UNAVAILABLE'
            : 'API_ERROR'
    err.status = response.status
    throw err
  }

  return {
    reply: parsed.reply || parsed.text || '',
    provider: parsed.provider || null,
    model: parsed.model || null,
    latencyMs: parsed.latencyMs ?? null,
  }
}

function historyFromMessages(messages) {
  const turns = Array.isArray(messages) ? messages : []
  const last = turns[turns.length - 1]
  const message = last?.content || ''
  const history = turns.slice(0, -1)
    .filter((turn) => turn?.role === 'user' || turn?.role === 'assistant')
    .map((turn) => ({ role: turn.role, content: turn.content || '' }))
    .slice(-20)
  return { message, history }
}

/**
 * Sends a message stream to /api/chat endpoint with fallback
 */
export async function sendChatMessageStream({
  messages,
  courseId,
  unitId,
  persona,
  role = 'student',
  signal,
  onToken,
  onComplete,
  onError,
}) {
  try {
    const { message, history } = historyFromMessages(messages)
    const data = await sendChatMessage({ message, history, signal })
    const text = data.reply || ''
    if (text) onToken(text)
    onComplete({ text, itemCards: [], sources: [] })
    return
  } catch (error) {
    if (error.name === 'AbortError') {
      return
    }
    if (
      error.code === 'NETWORK_ERROR'
      || error.code === 'TIMEOUT'
      || error.code === 'VALIDATION_ERROR'
      || error.code === 'NOT_CONFIGURED'
      || error.code === 'PROVIDER_UNAVAILABLE'
      || error.status === 422
      || error.status === 502
      || error.status === 503
    ) {
      onError?.(error)
      return
    }
    console.warn('Backend API failed, using offline fallback. Code:', error.code, '| Message:', error.message)

    // Simulate offline streaming fallback so app works end-to-end smoothly
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const { replyText, itemCards, sources } = generateOfflineMockResponse(lastUserMessage, courseId, unitId, persona)

    let currentPos = 0
    const chunkSize = 4

    // Human-readable hint based on the error code
    const codeHints = {
      MISSING_API_KEY: 'GEMINI_API_KEY is not set in Vercel → fix it to go live',
      INVALID_KEY: 'API key rejected (401/403) — check the key value in Vercel',
      RATE_LIMIT: 'Rate limit hit (429) — wait a moment, then retry',
      MODEL_NOT_FOUND: 'Model not found (404) — check GEMINI_MODEL env var',
      PROVIDER_ERROR: 'Provider returned a server error — see Vercel Logs',
      API_ERROR: 'API error — see Vercel Logs for details',
    }
    const hint = error.code && codeHints[error.code]
      ? `[${error.code}] ${codeHints[error.code]}`
      : error.message || 'Twin is offline'

    const interval = setInterval(() => {
      if (signal?.aborted) {
        clearInterval(interval)
        return
      }

      if (currentPos >= replyText.length) {
        clearInterval(interval)
        onComplete({
          text: replyText,
          itemCards,
          sources,
          isOffline: true,
          errorCode: error.code || 'API_ERROR',
          warning: hint,
        })
      } else {
        const nextChunk = replyText.slice(currentPos, currentPos + chunkSize)
        currentPos += chunkSize
        onToken(nextChunk)
      }
    }, 25)
  }
}
