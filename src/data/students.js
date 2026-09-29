import { courseItems } from './mockData'
import { dashboardMockItems } from './dashboardMockData'

/** @typedef {import('./students').StudentRecord} StudentRecord */

const fictionalNames = [
  ['Avery', 'Example'], ['Morgan', 'Sample'], ['Riley', 'Placeholder'], ['Dana', 'Demo'],
  ['Ellis', 'Fiction'], ['Finley', 'Mock'], ['Harper', 'Example'], ['Jules', 'Sample'],
  ['Kai', 'Placeholder'], ['Lennox', 'Demo'], ['Micah', 'Fiction'], ['Noel', 'Mock'],
  ['Oakley', 'Example'], ['Parker', 'Sample'], ['Quinn', 'Placeholder'], ['Remy', 'Demo'],
  ['Sage', 'Fiction'], ['Tatum', 'Mock'], ['Val', 'Example'], ['Winter', 'Sample'],
  ['Yael', 'Placeholder'], ['Zion', 'Demo'], ['Arden', 'Fiction'], ['Briar', 'Mock'],
]

const dashboardFlaggedItems = dashboardMockItems
  .filter((item) => item.verdict !== 'Clean')
  .map((item) => {
    const sourceItem = courseItems.find((courseItem) => courseItem.id === item.id)
    return {
      itemId: item.id,
      title: item.title,
      unit: item.unit,
      type: sourceItem?.type || (item.id.startsWith('q-') ? 'question' : 'slide'),
      verdict: item.verdict === 'Content defect' ? 'content_defect' : 'ability_gap',
      questionText: sourceItem?.originalText || sourceItem?.content || item.reason,
      correctAnswer: sourceItem?.suggestedRewrite || 'Review the course notes for the key concept.',
      explanation: sourceItem?.reasons?.[0] || item.reason,
    }
  })

const cleanCourseItems = courseItems
  .filter((item) => item.courseId === 'intro-data-structures' && item.verdict === 'Clean')
  .map((item) => ({
    itemId: item.id,
    title: item.title,
    unit: item.unit,
    type: item.type,
    verdict: 'ok',
    questionText: item.originalText || item.content,
    correctAnswer: item.suggestedRewrite || 'The item matches the course material.',
    explanation: 'Compare your response with the material taught in this unit.',
  }))

const missedItemPool = [...dashboardFlaggedItems, ...cleanCourseItems]

/** @type {StudentRecord[]} */
const students = fictionalNames.map(([firstName, lastName], index) => {
  const rollNo = `CS101-${String(index + 1).padStart(3, '0')}`
  const unitScores = [
    54 + ((index * 7) % 44),
    50 + ((index * 11 + 4) % 47),
    52 + ((index * 13 + 5) % 45),
  ]
  const overallScore = Math.round(unitScores.reduce((total, score) => total + score, 0) / unitScores.length)
  const missedCount = 1 + (index % 5)
  const missedItems = Array.from({ length: missedCount }, (_, offset) => (
    missedItemPool[(index * 3 + offset * 7) % missedItemPool.length]
  ))
  const weakestTopic = missedItems.find((item) => item.unit === unitScores.indexOf(Math.min(...unitScores)) + 1)?.title
    || missedItems[0]?.title
    || 'Unit review'
  const status = overallScore < 60 || missedCount >= 5
    ? 'At risk'
    : overallScore < 76 || missedCount >= 3
      ? 'Needs support'
      : 'On track'

  return {
    id: `student-${String(index + 1).padStart(3, '0')}`,
    courseId: 'intro-data-structures',
    name: `${firstName} ${lastName}`,
    rollNo,
    email: `${rollNo.toLowerCase()}@example.invalid`,
    section: index % 2 === 0 ? 'A' : 'B',
    unitScores,
    overallScore,
    weakestTopic,
    status,
    missedItems,
  }
})

function copyStudent(student) {
  const rank = [...students].sort((first, second) => second.overallScore - first.overallScore)
    .findIndex((row) => row.id === student.id) + 1
  const band = Math.min(100, Math.max(10, Math.ceil((rank / students.length) * 10) * 10))
  return {
    ...student,
    classPositionBand: `Top ${band}%`,
    unitScores: [...student.unitScores],
    missedItems: student.missedItems.map((item) => ({ ...item })),
  }
}

/** @param {string} id @returns {Promise<StudentRecord | undefined>} */
export async function getStudentRecordById(id) {
  await new Promise((resolve) => window.setTimeout(resolve, 180))
  const student = students.find((record) => record.id === id)
  return student ? copyStudent(student) : undefined
}

/** @param {string} courseId @returns {Promise<StudentRecord[]>} */
export async function getStudentRecordsByCourseId(courseId) {
  await new Promise((resolve) => window.setTimeout(resolve, 180))
  if (courseId === 'digital-systems') return []
  if (courseId !== 'intro-data-structures') throw new Error('Student details are unavailable for this course.')
  return students.map(copyStudent)
}