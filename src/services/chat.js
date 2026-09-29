import { courseItems } from '../data/mockData'

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

/**
 * Sends a message stream to /api/chat endpoint with fallback
 */
export async function sendChatMessageStream({
  messages,
  courseId,
  unitId,
  persona,
  signal,
  onToken,
  onComplete,
  onError,
}) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, courseId, unitId, persona }),
      signal,
    })

    if (!response.ok) {
      const errText = await response.text()
      let parsedError = 'API endpoint unavailable.'
      try {
        const json = JSON.parse(errText)
        if (json.error) parsedError = json.error
      } catch {
        if (errText) parsedError = errText
      }
      throw new Error(parsedError)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream') || contentType.includes('text/plain') || response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let accumulatedItemCards = []
      let accumulatedSources = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        
        // Parse SSE format "data: {...}\n\n" or raw text stream
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (dataStr === '[DONE]') continue
            try {
              const parsed = JSON.parse(dataStr)
              if (parsed.text) {
                fullText += parsed.text
                onToken(parsed.text)
              }
              if (parsed.itemCards) accumulatedItemCards = parsed.itemCards
              if (parsed.sources) accumulatedSources = parsed.sources
            } catch {
              fullText += dataStr
              onToken(dataStr)
            }
          } else if (line.trim() && !line.startsWith(':')) {
            fullText += line
            onToken(line)
          }
        }
      }

      onComplete({ text: fullText, itemCards: accumulatedItemCards, sources: accumulatedSources })
      return
    }

    const data = await response.json()
    onComplete({ text: data.text || '', itemCards: data.itemCards || [], sources: data.sources || [] })
  } catch (error) {
    if (error.name === 'AbortError') {
      return
    }
    console.warn('Backend API stream failed, using offline fallback:', error.message)
    
    // Simulate offline streaming fallback so app works end-to-end smoothly
    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const { replyText, itemCards, sources } = generateOfflineMockResponse(lastUserMessage, courseId, unitId, persona)
    
    let currentPos = 0
    const chunkSize = 4
    let accumulatedText = ''

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
          isOffline: true, // indicates offline banner state if needed
          warning: 'Twin is offline (using local course material context)',
        })
      } else {
        const nextChunk = replyText.slice(currentPos, currentPos + chunkSize)
        currentPos += chunkSize
        accumulatedText += nextChunk
        onToken(nextChunk)
      }
    }, 25)
  }
}
