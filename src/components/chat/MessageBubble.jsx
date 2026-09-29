import { useState } from 'react'
import { Check, Copy, FileText, RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

/**
 * @param {{
 *   message: {
 *     id: string,
 *     role: 'user' | 'assistant',
 *     content: string,
 *     timestamp?: string,
 *     itemCards?: Array<any>,
 *     attachments?: Array<{ name: string, type: string }>,
 *     feedback?: 'up' | 'down' | null,
 *     isOffline?: boolean,
 *     error?: string
 *   },
 *   onRegenerate?: () => void,
 *   onFeedback?: (msgId: string, rating: 'up' | 'down') => void,
 *   onRetryOffline?: () => void,
 *   onNavigate?: () => void
 * }} props
 */
export default function MessageBubble({ message, onRegenerate, onFeedback, onRetryOffline, onNavigate }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    if (!message.content) return
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <div className="flex flex-col items-end my-3 group">
        <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl rounded-tr-xs bg-primary px-4 py-3 text-sm text-primary-fg shadow-sm">
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {message.attachments.map((att, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs text-white">
                  <FileText className="h-3.5 w-3.5" />
                  {att.name}
                </span>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        <span className="mt-1 px-1 text-[11px] text-muted opacity-0 transition group-hover:opacity-100">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 my-4 group">
      {/* Twin Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#CFFFDC] text-[#2E6F40] shadow-xs">
        <Sparkles className="h-4 w-4" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start">
        {/* White bubble with 1px border (#E3EEE6) */}
        <div className="w-full max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-tl-xs border border-[#E3EEE6] dark:border-border bg-white dark:bg-surface px-4 py-3.5 shadow-xs">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-heading">Shadow-Twin</span>
            <span className="text-[11px] text-muted opacity-0 transition group-hover:opacity-100">
              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>

          <MarkdownRenderer content={message.content} itemCards={message.itemCards} onNavigate={onNavigate} />

          {/* Offline indicator banner inside message if applicable */}
          {message.isOffline && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2.5 text-xs text-amber-800 dark:text-amber-200">
              <span>Twin is currently using offline course material context.</span>
              {onRetryOffline && (
                <button
                  type="button"
                  onClick={onRetryOffline}
                  className="rounded-lg bg-amber-200 dark:bg-amber-800 px-2.5 py-1 text-xs font-semibold hover:bg-amber-300 transition"
                >
                  Retry API
                </button>
              )}
            </div>
          )}
        </div>

        {/* Message Action buttons */}
        <div className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-muted">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy response"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-surface hover:text-text"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              title="Regenerate response"
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-surface hover:text-text"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="text-[11px]">Regenerate</span>
            </button>
          )}

          <div className="mx-1 h-3 w-px bg-border" />

          <button
            type="button"
            onClick={() => onFeedback && onFeedback(message.id, 'up')}
            title="Helpful"
            className={`rounded-lg p-1 transition hover:bg-surface hover:text-text ${message.feedback === 'up' ? 'text-primary font-bold' : ''}`}
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onFeedback && onFeedback(message.id, 'down')}
            title="Not helpful"
            className={`rounded-lg p-1 transition hover:bg-surface hover:text-text ${message.feedback === 'down' ? 'text-danger font-bold' : ''}`}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
