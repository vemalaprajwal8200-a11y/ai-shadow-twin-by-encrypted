import { courseItems, reportRows } from './mockData'
import { dashboardMockItems } from './dashboardMockData'
import { getStudentRecordById, getStudentRecordsByCourseId } from './students'

const decisionsKey = 'shadow-twin-review-decisions'

function readReviewDecisions() {
  try {
    return JSON.parse(localStorage.getItem(decisionsKey) || '{}')
  } catch {
    return {}
  }
}

function getDecision(itemId) {
  const decisions = readReviewDecisions()
  if (decisions[itemId]) return decisions[itemId]
  const reportDecision = reportRows.find((item) => item.id === itemId)?.status
  if (reportDecision === 'Confirmed' || reportDecision === 'Dismissed') return reportDecision
  return dashboardMockItems.find((item) => item.id === itemId)?.reviewStatus
    || 'Open'
}

function getStudentAdjustedFields(student) {
  const confirmedDefects = dashboardMockItems.filter((item) => (
    item.verdict === 'Content defect' && getDecision(item.id) === 'Confirmed'
  ))
  const confirmedDefectIds = new Set(confirmedDefects.map((item) => item.id))
  const itemCount = 20
  const itemsAnsweredCorrectly = Math.round((student.overallScore / 100) * itemCount)
  const confirmedDefectMisses = student.missedItems.filter((item) => confirmedDefectIds.has(item.itemId)).length
  const validItemCount = Math.max(1, itemCount - confirmedDefects.length)
  const adjustedCorrect = Math.min(validItemCount, itemsAnsweredCorrectly + confirmedDefectMisses)

  return {
    itemsAnsweredCorrectly,
    totalItems: itemCount,
    adjustedScore: Math.round((adjustedCorrect / validItemCount) * 100),
    missedItems: student.missedItems.map((item) => {
      const decision = getDecision(item.itemId)
      let studentOutcome = 'genuine_miss'
      // AI verdicts are only shown after faculty confirmation.
      if (item.verdict === 'content_defect' && decision === 'Confirmed') studentOutcome = 'content_defect_confirmed'
      else if (item.verdict === 'ability_gap' && decision === 'Confirmed') studentOutcome = 'ability_gap_confirmed'

      return {
        itemId: item.itemId,
        title: item.title,
        unit: item.unit,
        type: item.type,
        studentOutcome,
        questionText: item.questionText,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation,
      }
    }),
  }
}

function withStudentSafeFields(student) {
  return { ...student, ...getStudentAdjustedFields(student) }
}

/** @param {string} id */
export async function getStudentById(id) {
  const student = await getStudentRecordById(id)
  return student ? withStudentSafeFields(student) : undefined
}

/** @param {{ role: string, studentId?: string, courseId?: string }} user */
export async function getMyStudent(user) {
  if (user?.role !== 'student' || !user.studentId) {
    const error = new Error('A student session is required.')
    error.status = 403
    throw error
  }

  const student = await getStudentById(user.studentId)
  if (!student || (user.courseId && student.courseId !== user.courseId)) {
    const error = new Error('Your account is active, but this student ID is not linked to an academic record.')
    error.status = 404
    throw error
  }
  return student
}

/** @param {string} courseId @param {{ role: string }} user */
export async function getStudents(courseId, user) {
  // In production this check is enforced by the backend (Cognito claims + authorization in Lambda), the frontend guard is only for UX.
  if (user?.role !== 'faculty') {
    const error = new Error('Faculty access is required to view the student roster.')
    error.status = 403
    throw error
  }
  return getStudentRecordsByCourseId(courseId)
}

/** @param {string} itemId */
export function getItemById(itemId) {
  return courseItems.find((item) => item.id === itemId)
}