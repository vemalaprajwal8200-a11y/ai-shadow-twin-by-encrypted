import { courseItems } from '../src/data/mockData.js'

/**
 * Serverless / API route handler for /api/chat
 * Can be run in Node.js serverless functions (Vercel) or Vite dev server middleware
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

  const { messages = [], courseId = 'intro-data-structures', unitId = 'all', persona = 'Beginner' } = body || {}

  if (!Array.isArray(messages) || messages.length === 0) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Messages array is required.' }))
    return
  }

  // Filter course material context for specified course and unit
  let contextItems = courseItems.filter((item) => !courseId || item.courseId === courseId)
  if (unitId && unitId !== 'all') {
    contextItems = contextItems.filter((item) => String(item.unit) === String(unitId))
  }

  const formattedMaterials = contextItems.map((item) => `
ID: ${item.id}
Type: ${item.type}
Unit: ${item.unit}
Title: ${item.title}
Section: ${item.section || ''}
Content: ${item.content}
Verdict: ${item.verdict}
Reasons: ${item.reasons.join('; ')}
Context Taught So Far: ${item.context || ''}
Suggested Rewrite: ${item.suggestedRewrite || ''}
`).join('\n---\n')

  const systemPrompt = `You are the "Shadow-Twin", an AI co-pilot and learning twin for the course "${courseId}".
Learner Persona: ${persona} (${persona === 'Beginner' ? 'Novice, plain language, needs step-by-step guidance' : persona === 'Average' ? 'Standard undergraduate level explanation' : 'Rigorous, detail-oriented, flags edge cases and precision'}).

YOUR ROLE AND CONSTRAINTS:
1. You answer ONLY using the course materials taught so far (provided below). Never invent external concepts not taught yet without pointing out they are beyond current scope.
2. If course material contains ambiguity, contradictions, or content defects, explicitly flag them.
3. NEVER blame the student for misunderstanding. If something is confusing, acknowledge the difficulty and clarify it constructively.
4. When referencing specific course items (slides or questions), include an inline item card tag on a new line using this format:
[[ITEM_CARD: {"id":"item-id","title":"Item Title","verdict":"Content defect|Ambiguous|Ability gap|Clean","reason":"One-line explanation"}]]
5. At the end of your response, list cited sources using [[SOURCE: item-id]].

COURSE MATERIALS TAUGHT SO FAR (Unit ${unitId}):
${formattedMaterials}`

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY

  if (!apiKey) {
    res.statusCode = 503
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      error: 'LLM API key not configured in environment variables (GEMINI_API_KEY or OPENAI_API_KEY). Twin is offline.',
      isOffline: true,
    }))
    return
  }

  // If Gemini API Key is available
  if (process.env.GEMINI_API_KEY || (apiKey && apiKey.startsWith('AIza'))) {
    const key = process.env.GEMINI_API_KEY || apiKey
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${key}`

    const lastUserMessage = messages[messages.length - 1]?.content || ''
    const promptText = `${systemPrompt}\n\nUser Question:\n${lastUserMessage}`

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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const raw = decoder.decode(value, { stream: true })
        // Parse Gemini JSON stream chunks
        try {
          // Gemini returns JSON array stream like [{ "candidates": [...] }]
          const jsonMatch = raw.match(/"text":\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)
          if (jsonMatch) {
            for (const match of jsonMatch) {
              const textVal = JSON.parse(`{${match}}`).text
              if (textVal) {
                res.write(`data: ${JSON.stringify({ text: textVal })}\n\n`)
              }
            }
          } else {
            res.write(`data: ${JSON.stringify({ text: raw })}\n\n`)
          }
        } catch {
          res.write(`data: ${JSON.stringify({ text: raw })}\n\n`)
        }
      }

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

  // If OpenAI API Key is available
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

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (dataStr === '[DONE]') {
              res.write('data: [DONE]\n\n')
              continue
            }
            try {
              const json = JSON.parse(dataStr)
              const content = json.choices?.[0]?.delta?.content
              if (content) {
                res.write(`data: ${JSON.stringify({ text: content })}\n\n`)
              }
            } catch {
              // ignore partial json
            }
          }
        }
      }

      res.end()
      return
    } catch (err) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: err.message || 'OpenAI stream processing failed.' }))
      return
    }
  }
}
