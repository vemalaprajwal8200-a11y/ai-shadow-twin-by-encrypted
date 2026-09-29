import { courseItems } from '../../src/data/mockData.js'

/**
 * Common stop words to exclude from keyword scoring
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'and', 'or', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'this', 'that', 'these', 'those', 'it', 'its', 'what', 'which',
  'how', 'why', 'who', 'where', 'when', 'can', 'could', 'should', 'would', 'do', 'does', 'did',
  'me', 'my', 'your', 'we', 'our', 'us', 'tell', 'show', 'explain', 'give', 'look', 'into'
])

/**
 * Tokenizes a string into a list of normalized lowercase word terms.
 * @param {string} text 
 * @returns {string[]}
 */
function tokenize(text) {
  if (!text) return []
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

/**
 * Scores an item chunk against the user query terms using weighted term frequency (TF-IDF overlap).
 * @param {{ title: string, section?: string, content: string, reasons?: string[], context?: string }} item 
 * @param {string[]} queryTokens 
 * @returns {number}
 */
function scoreChunk(item, queryTokens) {
  if (!queryTokens || queryTokens.length === 0) return 0

  const titleTokens = tokenize(item.title)
  const sectionTokens = tokenize(item.section || '')
  const contentTokens = tokenize(item.content)
  const reasonTokens = tokenize((item.reasons || []).join(' '))

  let score = 0
  for (const qToken of queryTokens) {
    // Title match carries highest weight (3x)
    if (titleTokens.includes(qToken)) score += 3
    // Section match carries 2x weight
    if (sectionTokens.includes(qToken)) score += 2
    // Content & Reason match carry 1x weight
    if (contentTokens.includes(qToken)) score += 1
    if (reasonTokens.includes(qToken)) score += 1.5
  }

  return score
}

/**
 * Lightweight retrieval layer:
 * Filters materials up to maxUnit, scores chunks against user query terms,
 * and returns top K chunks (default 5).
 * 
 * NOTE: This function can later be replaced with vector embeddings (Bedrock Titan, OpenAI)
 * without altering the rest of the application.
 * 
 * @param {{
 *   userQuery: string,
 *   courseId?: string,
 *   unitId?: string | number,
 *   topK?: number
 * }} options
 */
export function retrieveTopChunks({
  userQuery,
  courseId = 'intro-data-structures',
  unitId = 'all',
  topK = 5,
}) {
  const maxUnit = unitId === 'all' ? 99 : Number(unitId) || 99

  // Filter items strictly taught in current or EARLIER units only
  const availableItems = courseItems.filter((item) => {
    if (courseId && item.courseId !== courseId) return false
    return Number(item.unit) <= maxUnit
  })

  const queryTokens = tokenize(userQuery)

  // Score each item chunk
  const scoredItems = availableItems.map((item, originalIndex) => {
    const score = scoreChunk(item, queryTokens)
    return { item, score, originalIndex }
  })

  // Sort by score descending; fallback to original order if score is tied
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.originalIndex - b.originalIndex
  })

  // Pick top K chunks
  const topChunks = scoredItems.slice(0, topK).map((entry) => entry.item)

  const sources = topChunks.map((chunk) => ({
    id: chunk.id,
    title: chunk.title,
    type: chunk.type,
  }))

  return {
    chunks: topChunks,
    sources,
  }
}
