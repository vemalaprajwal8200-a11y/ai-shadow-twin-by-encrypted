import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Copy, MessageSquareText, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react'
import { useParams } from 'react-router-dom'
import mockApi from '../api/mock'

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
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Item review</p>
          <h2 className="mt-1 text-3xl font-bold dark:text-white">{item.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${item.verdict === 'Content defect' ? 'badge-defect' : item.verdict === 'Ability gap' ? 'badge-ability' : 'badge-clean'}`}>
            {item.verdict}
          </span>
          <span className={`badge ${item.severity === 'High' ? 'badge-high' : item.severity === 'Medium' ? 'badge-medium' : 'badge-low'}`}>
            {item.severity}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold dark:text-white">Original material</h3>
              <div className="text-sm text-slate-500 dark:text-slate-300">Confidence {item.confidence}%</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {item.originalText || item.content}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Why it was flagged</h3>
            <ul className="space-y-3">
              {item.reasons.map((reason) => (
                <li key={reason} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Twin attempts</h3>
            <div className="space-y-3">
              {item.twinAttempts.map((attempt, index) => (
                <div key={`${attempt.persona}-${index}`} className="rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setExpanded((current) => ({ ...current, [index]: !current[index] }))}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <p className="font-semibold dark:text-white">{attempt.persona}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-300">{attempt.answer}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-300">{attempt.confidence}%</span>
                      <ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded[index] ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {expanded[index] && (
                    <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                      <p className="mb-3 text-sm text-slate-700 dark:text-slate-200">{attempt.reasoning}</p>
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                        <span>Agreement</span>
                        <span>{attempt.agreement}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-green-500" style={{ width: `${attempt.confidence}%` }} />
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
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Only material taught so far</h3>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {item.context}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Suggested rewrite</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-red-600">Original</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{item.originalText || item.content}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <p className="mb-2 text-xs uppercase tracking-[0.18em] text-emerald-600">Suggested</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{item.suggestedRewrite}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-800">
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button onClick={() => handleDecision('Fixed')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white">
                <CheckCircle2 className="h-4 w-4" /> Accept
              </button>
              <button onClick={() => handleDecision('Dismissed')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-700">
                <XCircle className="h-4 w-4" /> Dismiss
              </button>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-lg font-semibold dark:text-white">Faculty feedback</h3>
            <div className="flex gap-2">
              <button onClick={() => handleDecision('Confirmed')} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white">
                <ShieldAlert className="h-4 w-4" /> Confirm defect
              </button>
              <button onClick={() => handleDecision('Dismissed')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium dark:border-slate-700 dark:bg-slate-800">
                <ShieldCheck className="h-4 w-4" /> Not a defect
              </button>
            </div>
            <textarea
              value={feedbackComment}
              onChange={(event) => setFeedbackComment(event.target.value)}
              placeholder="Optional comment for the course team"
              className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
