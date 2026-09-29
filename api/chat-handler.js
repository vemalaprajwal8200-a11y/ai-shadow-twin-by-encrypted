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

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY

  if (!apiKey) {
    res.statusCode = 530
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: 'LLM API key not configured in environment variables. Twin is offline.',
      isOffline: true,
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

  // Handle Gemini Streaming
  if (process.env.GEMINI_API_KEY || (apiKey && apiKey.startsWith('AIza'))) {
    const key = process.env.GEMINI_API_KEY || apiKey
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${key}`

    const promptText = `${systemPrompt}\n\nUser Message:\n${lastUserMessage}`

    try {
      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
        }),
      })

      if (!geminiRes.ok) {
        const errJson = await geminiRes.text()
        res.statusCode = geminiRes.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: `Gemini API error: ${errJson}` }))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = geminiRes.body.getReader()
      const decoder = new TextDecoder()
      let rawFullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        try {
          const jsonMatch = chunk.match(/"text":\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)
          if (jsonMatch) {
            for (const match of jsonMatch) {
              const textVal = JSON.parse(`{${match}}`).text
              if (textVal) {
                rawFullText += textVal
                // Stream text only if tags haven't started
                if (!rawFullText.includes('<items>') && !rawFullText.includes('<sources>')) {
                  res.write(`data: ${JSON.stringify({ text: textVal })}\n\n`)
                }
              }
            }
          }
        } catch {
          rawFullText += chunk
        }
      }

      // Process metadata tags & send final clean text and metadata
      const { visibleText, itemCards, sources: parsedSources } = extractAndValidateMetadata(rawFullText)
      
      // If visibleText has parts not streamed yet, send them
      res.write(`data: ${JSON.stringify({ text: '', itemCards, sources: parsedSources })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.message || 'Stream processing failed.' }))
      return
    }
  }

  // Handle OpenAI Streaming
  if (process.env.OPENAI_API_KEY || apiKey) {
    const key = process.env.OPENAI_API_KEY || apiKey
    try {
      const openAiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
      })

      if (!openAiRes.ok) {
        const errText = await openAiRes.text()
        res.statusCode = openAiRes.status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: `OpenAI API error: ${errText}` }))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      const reader = openAiRes.body.getReader()
      const decoder = new TextDecoder()
      let rawFullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (dataStr === '[DONE]') continue
            try {
              const json = JSON.parse(dataStr)
              const content = json.choices?.[0]?.delta?.content
              if (content) {
                rawFullText += content
                if (!rawFullText.includes('<items>') && !rawFullText.includes('<sources>')) {
                  res.write(`data: ${JSON.stringify({ text: content })}\n\n`)
                }
              }
            } catch {
              // ignore partial json
            }
          }
        }
      }

      const { itemCards, sources: parsedSources } = extractAndValidateMetadata(rawFullText)
      res.write(`data: ${JSON.stringify({ text: '', itemCards, sources: parsedSources })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.message || 'OpenAI stream failed.' }))
      return
    }
  }
}
