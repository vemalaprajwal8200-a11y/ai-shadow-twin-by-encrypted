export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export async function checkApiHealth() {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal })
    return response.ok
  } catch (error) {
    if (import.meta.env.DEV) console.error('Chat health check failed:', error)
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}
