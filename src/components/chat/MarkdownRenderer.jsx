import ItemCard from './ItemCard'

/**
 * Renders Markdown-like text safely with formatted lists, bold text, code blocks,
 * blockquotes, and inline item card components.
 * 
 * @param {{ content: string, itemCards?: Array<any>, onNavigate?: () => void }} props
 */
export default function MarkdownRenderer({ content, itemCards = [], onNavigate }) {
  if (!content) return null

  // Extract any [[ITEM_CARD: {...}]] patterns embedded in the text
  const itemCardRegex = /\[\[ITEM_CARD:\s*({[\s\S]*?})\]\]/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = itemCardRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.substring(lastIndex, match.index) })
    }
    try {
      const cardData = JSON.parse(match[1])
      parts.push({ type: 'card', data: cardData })
    } catch {
      parts.push({ type: 'text', text: match[0] })
    }
    lastIndex = itemCardRegex.lastIndex
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.substring(lastIndex) })
  }

  // Helper to format inline markdown text (bold, code, quotes, lists)
  const formatTextSnippet = (rawText, keyPrefix = 'txt') => {
    // Remove [[SOURCE: ...]] tags from visible text
    const cleanText = rawText.replace(/\[\[SOURCE:\s*[\w-]+\s*\]\]/g, '').trim()

    const lines = cleanText.split('\n')
    return lines.map((line, lIdx) => {
      const trimmed = line.trim()
      if (!trimmed) return <div key={`${keyPrefix}-empty-${lIdx}`} className="h-2" />

      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h4 key={`${keyPrefix}-h3-${lIdx}`} className="mt-2 mb-1 font-bold text-base text-heading">
            {renderInlineFormatting(line.slice(4))}
          </h4>
        )
      }
      // Heading 2
      if (line.startsWith('## ')) {
        return (
          <h3 key={`${keyPrefix}-h2-${lIdx}`} className="mt-3 mb-1 font-extrabold text-lg text-heading">
            {renderInlineFormatting(line.slice(3))}
          </h3>
        )
      }

      // Blockquote
      if (line.startsWith('> ')) {
        return (
          <blockquote
            key={`${keyPrefix}-bq-${lIdx}`}
            className="my-2 border-l-4 border-primary/60 bg-primary/5 px-3 py-2 text-sm italic rounded-r-lg text-text"
          >
            {renderInlineFormatting(line.slice(2))}
          </blockquote>
        )
      }

      // Unordered list item
      if (/^[\*\-]\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^[\*\-]\s+/, '')
        return (
          <li key={`${keyPrefix}-li-${lIdx}`} className="ml-4 list-disc text-sm my-0.5 text-text">
            {renderInlineFormatting(itemText)}
          </li>
        )
      }

      // Ordered list item
      if (/^\d+\.\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s+/, '')
        return (
          <li key={`${keyPrefix}-oli-${lIdx}`} className="ml-4 list-decimal text-sm my-0.5 text-text">
            {renderInlineFormatting(itemText)}
          </li>
        )
      }

      return (
        <p key={`${keyPrefix}-p-${lIdx}`} className="my-1.5 text-sm leading-relaxed text-text">
          {renderInlineFormatting(line)}
        </p>
      )
    })
  }

  // Inline formatting helper for **bold**, `code`, etc.
  const renderInlineFormatting = (text) => {
    // Split by code blocks or bold syntax
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)

    return tokens.map((token, idx) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-heading">{token.slice(2, -2)}</strong>
      }
      if (token.startsWith('`') && token.endsWith('`')) {
        return (
          <code key={idx} className="rounded bg-text/5 dark:bg-card/10 px-1.5 py-0.5 font-mono text-xs text-primary">
            {token.slice(1, -1)}
          </code>
        )
      }
      return token
    })
  }

  return (
    <div className="space-y-1">
      {parts.map((part, index) => {
        if (part.type === 'card') {
          return (
            <ItemCard
              key={`card-${index}`}
              id={part.data.id}
              title={part.data.title}
              verdict={part.data.verdict}
              reason={part.data.reason}
              onNavigate={onNavigate}
            />
          )
        }
        return formatTextSnippet(part.text, `part-${index}`)
      })}

      {/* Render explicit itemCards array if passed separately */}
      {itemCards && itemCards.length > 0 && (
        <div className="mt-3 space-y-2">
          {itemCards.map((card, idx) => (
            <ItemCard
              key={`arr-card-${card.id || idx}`}
              id={card.id}
              title={card.title}
              verdict={card.verdict}
              reason={card.reason}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
