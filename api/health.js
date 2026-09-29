/**
 * GET /api/health
 * Lightweight liveness + key-presence check.
 * NEVER returns the real key value.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed. Use GET.' }))
    return
  }

  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY)
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY)
  const hasLegacyKey = Boolean(process.env.LLM_API_KEY)
  const hasKey = hasGeminiKey || hasOpenAiKey || hasLegacyKey

  let model = process.env.MODEL || process.env.GEMINI_MODEL || null
  if (!model) {
    if (hasGeminiKey || (hasLegacyKey && (process.env.LLM_API_KEY || '').startsWith('AIza'))) {
      model = 'gemini-2.0-flash'
    } else if (hasOpenAiKey) {
      model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    } else {
      model = 'not-configured'
    }
  }

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(
    JSON.stringify({
      ok: true,
      hasKey,
      model,
      provider: hasGeminiKey ? 'gemini' : hasOpenAiKey ? 'openai' : hasLegacyKey ? 'legacy' : 'none',
      timestamp: new Date().toISOString(),
    })
  )
}
