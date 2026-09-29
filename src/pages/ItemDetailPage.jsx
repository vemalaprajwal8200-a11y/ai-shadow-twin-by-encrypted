import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, MessageSquareText, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import mockApi from '../api/mock'
import { PageHeader, SeverityChip, VerdictChip } from '../components/dashboard/DashboardPrimitives'

export default function ItemDetailPage() {
  const { itemId } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [feedbackComment, setFeedbackComment] = useState('')

  useEffect(() => {
    let active = true
    const fetchItem = async () => {
      setLoading(true)
      try {
        const result = await mockApi.getItemById(itemId)
        if (active) {
          setItem(result)
          setFeedbackComment(result?.facultyFeedback?.comment || '')
        }
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
    if (!item) return
    await mockApi.updateFacultyDecision(item.id, {
      status,
      comment: feedbackComment,
    })
    setItem((current) => ({
      ...current,
      facultyFeedback: { status, comment: feedbackComment, confirmed: status === 'Confirmed' },
    }))
  }

  if (loading || !item) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 rounded-2xl bg-border/30" />
        <div className="h-80 rounded-2xl bg-border/30" />
      </div>
    )
  }

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
              <div className="text-sm text-muted">Confidence {item.confidence}%</div>
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
              <button className="inline-flex items-center gap-2 rounded-xl border border-surface-tint bg-surface-tint px-3 py-2 text-sm font-medium text-primary">
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button onClick={() => handleDecision('Fixed')} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg">
                <CheckCircle2 className="h-4 w-4" /> Accept
              </button>
              <button onClick={() => handleDecision('Dismissed')} className="inline-flex items-center gap-2 rounded-xl bg-surface-tint px-3 py-2 text-sm font-medium text-primary">
                <XCircle className="h-4 w-4" /> Dismiss
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold text-heading">Faculty feedback</h3>
            <div className="flex gap-2">
              <button onClick={() => handleDecision('Confirmed')} className="inline-flex items-center gap-2 rounded-xl bg-danger px-3 py-2 text-sm font-medium text-primary-fg">
                <ShieldAlert className="h-4 w-4" /> Confirm defect
              </button>
              <button onClick={() => handleDecision('Dismissed')} className="inline-flex items-center gap-2 rounded-xl border border-surface-tint bg-surface-tint px-3 py-2 text-sm font-medium text-primary">
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
