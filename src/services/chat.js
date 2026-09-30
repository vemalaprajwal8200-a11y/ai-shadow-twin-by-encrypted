import { API_BASE_URL } from './api'
import { getSupabaseClient, isSupabaseConfigured } from '../api/supabase'

const CHATS_STORAGE_KEY = 'ai_shadow_twin_chats'
const ACTIVE_CHAT_KEY = 'ai_shadow_twin_active_chat'

export function getStoredChats() {
  try {
    const value = JSON.parse(localStorage.getItem(CHATS_STORAGE_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function saveStoredChats(chats) {
  try {
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats))
  } catch (error) {
    console.error('Failed to cache chat sessions:', error)
  }
}

export function getActiveChatId() {
  try {
    return localStorage.getItem(ACTIVE_CHAT_KEY)
  } catch {
    return null
  }
}

export function setActiveChatId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_CHAT_KEY, id)
    else localStorage.removeItem(ACTIVE_CHAT_KEY)
  } catch (error) {
    console.error('Failed to cache active chat:', error)
  }
}

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16)
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16)
  })
}

export function createNewChatSession({ courseId = '', unitId = 'all', persona = 'Beginner', title = 'New Conversation' } = {}) {
  const sessionId = newId()
  const chat = {
    id: sessionId,
    sessionId,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courseId,
    unitId: String(unitId),
    persona,
    messages: [],
  }
  const chats = getStoredChats()
  chats.unshift(chat)
  saveStoredChats(chats)
  setActiveChatId(chat.id)
  return chat
}

export async function loadRemoteChatSessions(courseId) {
  if (!isSupabaseConfigured()) return []
  const client = getSupabaseClient()
  const { data: authData, error: authError } = await client.auth.getUser()
  if (authError) throw authError
  if (!authData.user) return []

  let query = client.from('chat_sessions').select('*').eq('user_id', authData.user.id)
  if (courseId) query = query.eq('course_id', courseId)
  const { data: sessions, error } = await query.order('updated_at', { ascending: false })
  if (error) throw error

  const chats = await Promise.all((sessions || []).map(async (session) => {
    const { data: messages, error: messageError } = await client.from('chat_messages')
      .select('*').eq('session_id', session.session_id).order('created_at', { ascending: true })
    if (messageError) throw messageError
    return {
      id: session.session_id,
      sessionId: session.session_id,
      title: session.title || 'New Conversation',
      createdAt: session.created_at,
      updatedAt: session.updated_at || session.created_at,
      courseId: session.course_id,
      unitId: 'all',
      persona: 'Beginner',
      messages: (messages || []).map((message) => ({
        id: message.message_id,
        role: message.role,
        content: message.content,
        timestamp: message.created_at,
      })),
    }
  }))
  saveStoredChats(chats)
  return chats
}

export function updateChatSession(chatId, updater) {
  const chats = getStoredChats()
  const index = chats.findIndex((chat) => chat.id === chatId)
  if (index < 0) return null
  const updated = typeof updater === 'function' ? updater(chats[index]) : { ...chats[index], ...updater }
  updated.updatedAt = new Date().toISOString()
  chats[index] = updated
  saveStoredChats(chats)
  return updated
}

export function deleteChatSession(chatId) {
  const current = getStoredChats()
  const removed = current.find((chat) => chat.id === chatId)
  if (removed?.sessionId && isSupabaseConfigured()) {
    void getSupabaseClient().from('chat_sessions').delete().eq('session_id', removed.sessionId)
      .then(({ error }) => { if (error) console.error('Failed to delete chat session:', error.message) })
  }
  const remaining = current.filter((chat) => chat.id !== chatId)
  saveStoredChats(remaining)
  if (getActiveChatId() === chatId) setActiveChatId(remaining[0]?.id || null)
  return remaining
}

export function renameChatSession(chatId, newTitle) {
  const updated = updateChatSession(chatId, (chat) => ({ ...chat, title: newTitle.trim() || chat.title }))
  if (updated?.sessionId && isSupabaseConfigured()) {
    void getSupabaseClient().from('chat_sessions').update({ title: updated.title })
      .eq('session_id', updated.sessionId)
      .then(({ error }) => { if (error) console.error('Failed to rename chat session:', error.message) })
  }
  return updated
}

function historyFromMessages(messages) {
  const turns = Array.isArray(messages) ? messages : []
  const last = turns[turns.length - 1]
  return {
    message: last?.content || '',
    history: turns.slice(0, -1)
      .filter((turn) => turn?.role === 'user' || turn?.role === 'assistant')
      .map((turn) => ({ role: turn.role, content: turn.content || '' }))
      .slice(-20),
  }
}

export async function sendChatMessage({ message, history = [], sessionId, courseId, signal } = {}) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured for chat.')
  if (!sessionId || !courseId) throw new Error('Select a course and start a chat session first.')
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const { data, error } = await getSupabaseClient().auth.getSession()
  if (error) throw error
  if (!data.session?.access_token) throw new Error('Sign in to continue.')
  headers.Authorization = `Bearer ${data.session.access_token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message, session_id: sessionId, course_id: courseId, history }),
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    const networkError = new Error('Could not reach the chat service. Check that the API is running.')
    networkError.code = 'NETWORK_ERROR'
    throw networkError
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || payload.detail || 'The assistant is temporarily unavailable.')
    error.status = response.status
    error.code = response.status === 401 ? 'NOT_AUTHENTICATED' : response.status === 503 ? 'NOT_CONFIGURED' : response.status === 502 ? 'PROVIDER_UNAVAILABLE' : 'API_ERROR'
    throw error
  }
  return {
    reply: payload.reply || '',
    provider: payload.provider || null,
    model: payload.model || null,
    latencyMs: payload.latencyMs ?? null,
    sessionId: payload.session_id || sessionId || null,
    sources: payload.sources || [],
  }
}

export async function sendChatMessageStream({ messages, courseId, sessionId, signal, onToken, onComplete, onError }) {
  try {
    const { message, history } = historyFromMessages(messages)
    if (!courseId) throw new Error('Create or select a course before chatting with course materials.')
    const result = await sendChatMessage({ message, history, sessionId, courseId, signal })
    if (result.reply) onToken(result.reply)
    onComplete({ text: result.reply, itemCards: [], sources: result.sources, sessionId: result.sessionId })
  } catch (error) {
    if (error?.name !== 'AbortError') onError?.(error)
  }
}
