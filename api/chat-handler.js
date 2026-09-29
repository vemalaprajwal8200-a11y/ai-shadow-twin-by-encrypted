import { buildTwinSystemPrompt } from './_prompts/index.js'
import { retrieveTopChunks } from './_lib/retrieve.js'
import { courseItems } from '../src/data/mockData.js'

/**
 * Normalizes verdict strings from LLM output to allowed UI verdict strings
 */
function normalizeVerdict(verdict) {
  if (!verdict) return null
  const v = String(verdict).toLowerCase().trim()
  if (v === 'defect' || v.includes('content defect') || v.includes('defect')) return 'Content defect'
  if (v === 'ambiguous' || v.includes('ambig')) return 'Ambiguous'
  if (v === 'gap' || v.includes('ability gap') || v.includes('gap')) return 'Ability gap'
  if (v === 'clean' || v.includes('clean') || v.includes('no problem')) return 'Clean'
  return null
}

/**
 * Serverless / API route handler for /api/chat
 * Handles CORS, retrieval, prompt assembly, token streaming, and server-side tag parsing.
 */
export default async function chatHandler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }))
    return
  }

  // Parse body
  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  } else if (!body && req.on) {
    body = await new Promise((resolve) => {
      let data = ''
      req.on('data', (chunk) => { data += chunk })
      req.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          resolve({})
        }
      })
    })
  }

  const {
    messages = [],
    courseId = 'intro-data-structures',
    unitId = 'all',
    persona = 'Beginner',
    role = 'student'
  } = body || {}

  if (!Array.isArray(messages) || messages.length === 0) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Messages array is required.' }))
    return
  }

  const lastUserMessage = messages[messages.length - 1]?.content || ''

  // 1. Lightweight Retrieval: get top 5 chunks for selected unit and earlier units
  const { chunks: retrievedChunks, sources: defaultSources } = retrieveTopChunks({
    userQuery: lastUserMessage,
    courseId,
    unitId,
    topK: 5,
  })

  // 2. Build system prompt from base + persona + few-shot examples + role + retrieved chunks
  const systemPrompt = buildTwinSystemPrompt({
    persona,
    role,
    courseId,
    unitId,
    retrievedChunks,
  })

  const geminiApiKey = process.env.GEMINI_API_KEY
  const geminiBaseUrl = process.env.GEMINI_BASE_URL?.trim()
  const geminiModel = process.env.GEMINI_MODEL?.trim() || process.env.MODEL?.trim() || 'gemini-2.0-flash'
  const apiKey = geminiApiKey || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY

  if (!apiKey) {
    console.error('[chat] No API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in Vercel environment variables.')
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: 'API key not configured. Set GEMINI_API_KEY in Vercel → Settings → Environment Variables.',
      code: 'MISSING_API_KEY',
    }))
    return
  }

  const availableItemIds = new Set(courseItems.map((i) => i.id))

  // Helper to parse <items> and <sources> XML tags from full response text
  const extractAndValidateMetadata = (fullText) => {
    let parsedItems = []
    let parsedSources = [...defaultSources]

    // Parse <items>[...]</items>
    const itemsMatch = fullText.match(/<items>([\s\S]*?)<\/items>/i)
    if (itemsMatch) {
      try {
        const rawItems = JSON.parse(itemsMatch[1].trim())
        if (Array.isArray(rawItems)) {
          parsedItems = rawItems
            .map((item) => {
              const normVerdict = normalizeVerdict(item.verdict)
              const itemId = item.itemId || item.id
              if (!normVerdict || !availableItemIds.has(itemId)) return null
              const matchedCourseItem = courseItems.find((ci) => ci.id === itemId)
              return {
                id: itemId,
                title: matchedCourseItem?.title || item.title || 'Course Item',
                verdict: normVerdict,
                reason: item.reason || item.reasons?.[0] || 'Flagged for review.',
              }
            })
            .filter(Boolean)
        }
      } catch (e) {
        console.warn('Failed to parse <items> JSON block:', e.message)
      }
    }

    // Parse <sources>[...]</sources>
    const sourcesMatch = fullText.match(/<sources>([\s\S]*?)<\/sources>/i)
    if (sourcesMatch) {
      try {
        const rawSources = JSON.parse(sourcesMatch[1].trim())
        if (Array.isArray(rawSources)) {
          const validatedSources = rawSources
            .map((s) => {
              const srcId = s.id || s.itemId
              if (!availableItemIds.has(srcId)) return null
              const matchedCourseItem = courseItems.find((ci) => ci.id === srcId)
              return {
                id: srcId,
                title: matchedCourseItem?.title || s.title || 'Source Item',
                type: matchedCourseItem?.type || s.type || 'slide',
              }
            })
            .filter(Boolean)

          if (validatedSources.length > 0) {
            parsedSources = validatedSources
          }
        }
      } catch (e) {
        console.warn('Failed to parse <sources> JSON block:', e.message)
      }
    }

    // Clean visible text by stripping <items> and <sources> tags
    const cleanVisibleText = fullText
      .replace(/<items>[\s\S]*?<\/items>/gi, '')
      .replace(/<sources>[\s\S]*?<\/sources>/gi, '')
      .trim()

    return { visibleText: cleanVisibleText, itemCards: parsedItems, sources: parsedSources }
  }

  // Handle Gemini (non-streaming generateContent to avoid WSARECV/TCP-abort on Windows)
  if (!geminiBaseUrl && (geminiApiKey || (apiKey && apiKey.startsWith('AIza')))) {
    const key = geminiApiKey || apiKey
    // Use the non-streaming endpoint — one complete JSON response, no keep-alive stream.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`

    const promptText = `${systemPrompt}\n\nUser Message:\n${lastUserMessage}`

    try {
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text()
        console.error(`[chat] Gemini API error ${geminiRes.status}:`, errBody)
        const code =
          geminiRes.status === 401 || geminiRes.status === 403 ? 'INVALID_KEY'
          : geminiRes.status === 404 ? 'MODEL_NOT_FOUND'
          : geminiRes.status === 429 ? 'RATE_LIMIT'
          : 'PROVIDER_ERROR'
        res.statusCode = geminiRes.status >= 400 && geminiRes.status < 500 ? geminiRes.status : 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: `Gemini error (${geminiRes.status}). Check Vercel Logs for details.`, code }))
        return
      }

      const geminiJson = await geminiRes.json()
      const rawFullText =
        geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ||
        geminiJson?.candidates?.[0]?.output ||
        ''

      if (!rawFullText) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Gemini returned an empty response.' }))
        return
      }

      const { visibleText, itemCards, sources: parsedSources } = extractAndValidateMetadata(rawFullText)

      // Re-emit as SSE so the frontend typing animation still works.
      // Trickle the visible text in small word-boundary chunks.
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('X-Accel-Buffering', 'no') // disable Nginx/Vercel proxy buffering

      const CHUNK = 6 // characters per SSE write
      for (let i = 0; i < visibleText.length; i += CHUNK) {
        const slice = visibleText.slice(i, i + CHUNK)
        res.write(`data: ${JSON.stringify({ text: slice })}\n\n`)
      }

      // Final frame carries metadata
      res.write(`data: ${JSON.stringify({ text: '', itemCards, sources: parsedSources })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    } catch (err) {
      console.error('Gemini handler error:', err)
      // If headers not sent yet, reply with JSON error
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message || 'Gemini request failed.' }))
      } else {
        res.end()
      }
      return
    }
  }

  // Handle OpenAI (non-streaming to avoid TCP-abort on Windows)
  const useGeminiOpenAiEndpoint = Boolean(geminiBaseUrl && geminiApiKey)
  if (useGeminiOpenAiEndpoint || process.env.OPENAI_API_KEY || apiKey) {
    const key = useGeminiOpenAiEndpoint ? geminiApiKey : process.env.OPENAI_API_KEY || apiKey
    const endpoint = useGeminiOpenAiEndpoint
      ? `${geminiBaseUrl.replace(/\/+$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions'
    const model = useGeminiOpenAiEndpoint
      ? geminiModel
      : process.env.OPENAI_MODEL || process.env.MODEL || 'gpt-4o-mini'
    const providerName = useGeminiOpenAiEndpoint ? 'Gemini OpenAI-compatible' : 'OpenAI'
    try {
      const openAiRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: false, // single JSON response
          max_tokens: 1024,
          temperature: 0.4,
        }),
      })

      if (!openAiRes.ok) {
        const errBody = await openAiRes.text()
        console.error(`[chat] ${providerName} error ${openAiRes.status}:`, errBody)
        const code =
          openAiRes.status === 401 || openAiRes.status === 403 ? 'INVALID_KEY'
          : openAiRes.status === 404 ? 'MODEL_NOT_FOUND'
          : openAiRes.status === 429 ? 'RATE_LIMIT'
          : 'PROVIDER_ERROR'
        res.statusCode = openAiRes.status >= 400 && openAiRes.status < 500 ? openAiRes.status : 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: `${providerName} error (${openAiRes.status}). Check Vercel Logs for details.`, code }))
        return
      }

      const openAiJson = await openAiRes.json()
      const rawFullText = openAiJson?.choices?.[0]?.message?.content || ''

      if (!rawFullText) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: `${providerName} returned an empty response.` }))
        return
      }

      const { visibleText, itemCards, sources: parsedSources } = extractAndValidateMetadata(rawFullText)

      // Re-emit as SSE trickle so the frontend typing animation still works
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('X-Accel-Buffering', 'no')

      const CHUNK = 6
      for (let i = 0; i < visibleText.length; i += CHUNK) {
        const slice = visibleText.slice(i, i + CHUNK)
        res.write(`data: ${JSON.stringify({ text: slice })}\n\n`)
      }

      res.write(`data: ${JSON.stringify({ text: '', itemCards, sources: parsedSources })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    } catch (err) {
      console.error(`${providerName} handler error:`, err)
      if (!res.headersSent) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: err.message || `${providerName} request failed.` }))
      } else {
        res.end()
      }
      return
    }
  }
}
