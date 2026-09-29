import { BASE_SYSTEM_PROMPT } from './base.js'
import { PERSONA_PROMPTS } from './personas.js'
import { FEW_SHOT_EXAMPLES } from './examples.js'

/**
 * Builds the complete system prompt for the Twin co-pilot.
 * Combines base system instructions, selected persona, few-shot examples,
 * target role instructions (student vs faculty), and retrieved course chunks.
 * 
 * @param {{
 *   persona?: 'Beginner' | 'Average' | 'Careful',
 *   role?: 'student' | 'faculty',
 *   courseId?: string,
 *   unitId?: string | number,
 *   retrievedChunks?: Array<{ id: string, title: string, type: string, unit: number, content: string, verdict: string, reasons: string[], context?: string, suggestedRewrite?: string }>
 * }} options
 */
export function buildTwinSystemPrompt({
  persona = 'Beginner',
  role = 'student',
  courseId = 'intro-data-structures',
  unitId = 'all',
  retrievedChunks = []
}) {
  const selectedPersonaPrompt = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.Beginner

  const roleInstruction = role === 'student'
    ? `ROLE CONTEXT: STUDENT AUDIENCE
Focus on providing study assistance, explaining concepts simply, helping with missed items, and building a structured study plan. Phrase any confusion as "the course material is unclear here" or "the text uses unintroduced terms", NEVER blaming the student.`
    : `ROLE CONTEXT: FACULTY AUDIENCE
Focus on course content quality audit. Detail flagged items, explain exactly why they were flagged by learner personas, evaluate severity, and suggest clearer rewrites for slides and assessment questions.`

  const formattedExamples = FEW_SHOT_EXAMPLES.map((ex, idx) => `
Example ${idx + 1}:
Item: "${ex.itemText}"
Twin Reasoning: "${ex.twinReasoning}"
Verdict: ${ex.verdict}
Reason: ${ex.reason}
`).join('\n')

  const formattedCourseMaterial = retrievedChunks.length > 0
    ? retrievedChunks.map((item) => `
[Item ID: ${item.id}] (${item.type === 'slide' ? 'Slide' : 'Question'}, Unit ${item.unit})
Title: ${item.title}
Content: ${item.content}
Known Verdict: ${item.verdict}
Flagged Reasons: ${(item.reasons || []).join('; ') || 'None'}
Context Taught So Far: ${item.context || 'Standard course progression.'}
${item.suggestedRewrite ? `Suggested Rewrite: ${item.suggestedRewrite}` : ''}
`).join('\n---\n')
    : 'No matching course materials retrieved.'

  return `${BASE_SYSTEM_PROMPT}

${selectedPersonaPrompt}

${roleInstruction}

FEW-SHOT EVALUATION EXAMPLES:
${formattedExamples}

SELECTED COURSE SCOPE: Course "${courseId}", Unit Scope: "${unitId === 'all' ? 'Units 1-3' : 'Unit 1 up to Unit ' + unitId}".

RETRIEVED COURSE MATERIAL (TOP 5 CHUNKS FOR CURRENT SCOPE):
${formattedCourseMaterial}`
}
