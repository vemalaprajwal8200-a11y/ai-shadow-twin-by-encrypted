import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { PageHeader, SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'
import { getContentItem, getItemResults, updateFlagReview } from '../data/supabaseData'

export default function ItemDetailPage() {
  const { itemId } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [feedbackComment, setFeedbackComment] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    const fetchItem = async () => {
      setLoading(true)
      setError('')
      try {
        const [row, results] = await Promise.all([getContentItem(itemId), getItemResults(itemId)])
        const flags = Array.isArray(row?.flags) ? row.flags : []
        const result = row ? {
          ...row,
          id: row.content_item_id,
          title: row.title || row.item_title || 'Course item',
          verdict: row.verdict || 'clear',
          severity: flags[0]?.severity || 'low',
          confidence: row.confidence == null ? null : Math.round(Number(row.confidence) * (Number(row.confidence) <= 1 ? 100 : 1)),
          content: row.content_text || '',
          originalText: row.content_text || '',
          reasons: flags.map((flag) => flag.review_note || flag.severity).filter(Boolean).concat(row.reason ? [row.reason] : []),
          twinAttempts: results.map((entry) => ({
            persona: entry.personas?.name || 'Twin',
            answer: entry.answer,
            reasoning: entry.reasoning,
            confidence: Math.round(Number(entry.confidence || 0) * 100),
            agreement: 'Stored analysis result',
          })),
          context: 'Course context is supplied to the Twin from previously analyzed items.',
          suggestedRewrite: row.suggested_rewrite || 'No suggested rewrite is available for this item yet.',
          flags,
          facultyFeedback: { status: flags[0]?.status || 'open', comment: flags[0]?.review_note || '' },
        } : null
        if (active) {
          setItem(result)
          setFeedbackComment(result?.facultyFeedback?.comment || '')
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load this item.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchItem()
    return () => {
      active = false
    }
  }, [itemId])

  const handleDecision = async (status) => {
    if (!item?.flags?.[0]?.flag_id) {
      setError('This item has no flag to review.')
      return
    }
    setSaving(true)
    setError('')
    const nextStatus = status === 'Fixed' ? 'resolved' : status.toLowerCase()
    try {
      const updated = await updateFlagReview(item.flags[0].flag_id, nextStatus, feedbackComment)
      setItem((current) => ({
        ...current,
        flags: [{ ...current.flags[0], ...updated }],
        facultyFeedback: { status: nextStatus, comment: feedbackComment },
      }))
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not save the review.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-2xl bg-border/30" />
        <div className="h-80 rounded-2xl bg-border/30" />
      </div>
    )
  }

  if (error || !item) return <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger"><p>{error || 'Course item not found.'}</p></div>

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Item review" title={item.title} description="Review the source material, analysis, and faculty decision." actions={
        <div className="flex flex-wrap items-center gap-2">
          <VerdictChip verdict={item.verdict} />
          <SeverityChip severity={item.severity} />
        </div>
      } />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-heading">Original material</h3>
              <div className="text-sm text-muted">Confidence {item.confidence == null ? '—' : `${item.confidence}%`}</div>
            </div>
            <div className="rounded-2xl border border-border bg-bg p-4 text-text">
              {item.originalText || item.content}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold text-heading">Why it was flagged</h3>
            <ul className="space-y-3">
              {item.reasons.map((reason) => (
                <li key={reason} className="flex gap-3 rounded-2xl border border-border bg-bg p-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-warn" />
                  <span className="text-sm text-text">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold text-heading">Twin attempts</h3>
            <div className="space-y-3">
              {item.twinAttempts.map((attempt, index) => (
                <div key={`${attempt.persona}-${index}`} className="rounded-2xl border border-border">
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => ({ ...current, [index]: !current[index] }))}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <p className="font-semibold text-heading">{attempt.persona}</p>
                      <p className="text-sm text-muted">{attempt.answer}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">{attempt.confidence}%</span>
                      <ChevronDown className={`h-4 w-4 text-muted transition ${expanded[index] ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {expanded[index] && (
                    <div className="border-t border-border px-4 py-3">
                      <p className="mb-3 text-sm text-text">{attempt.reasoning}</p>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted">
                        <span>Agreement</span>
                        <span>{attempt.agreement}</span>
                      </div>
                      <div className="h-2 rounded-full bg-border/30">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${attempt.confidence}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold text-heading">Only material taught so far</h3>
            <div className="rounded-2xl border border-border bg-bg p-4 text-sm text-text">
              {item.context}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold text-heading">Suggested rewrite</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-bg p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-danger">Original</p>
                <p className="text-sm text-text">{item.originalText || item.content}</p>
              </div>
              <div className="rounded-2xl border border-primary bg-primary p-3 text-primary-fg">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-primary-fg/80">Suggested</p>
                <p className="text-sm text-primary-fg">{item.suggestedRewrite}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-surface-tint bg-surface-tint px-3 py-2 text-sm font-medium text-soft-text">
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button disabled={saving} onClick={() => handleDecision('Fixed')} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" /> Accept
              </button>
              <button disabled={saving} onClick={() => handleDecision('Dismissed')} className="inline-flex items-center gap-2 rounded-xl bg-surface-tint px-3 py-2 text-sm font-medium text-soft-text disabled:opacity-50">
                <XCircle className="h-4 w-4" /> Dismiss
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold text-heading">Faculty feedback</h3>
            <div className="flex gap-2">
              <button disabled={saving} onClick={() => handleDecision('Confirmed')} className="inline-flex items-center gap-2 rounded-xl bg-danger px-3 py-2 text-sm font-medium text-primary-fg disabled:opacity-50">
                <ShieldAlert className="h-4 w-4" /> Confirm defect
              </button>
              <button disabled={saving} onClick={() => handleDecision('Dismissed')} className="inline-flex items-center gap-2 rounded-xl border border-surface-tint bg-surface-tint px-3 py-2 text-sm font-medium text-soft-text disabled:opacity-50">
                <ShieldCheck className="h-4 w-4" /> Not a defect
              </button>
            </div>
            <textarea
              value={feedbackComment}
              onChange={(event) => setFeedbackComment(event.target.value)}
              placeholder="Optional comment for the course team"
              className="mt-4 min-h-24 w-full rounded-2xl border border-border bg-surface p-3 text-sm text-text outline-none placeholder:text-muted"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
