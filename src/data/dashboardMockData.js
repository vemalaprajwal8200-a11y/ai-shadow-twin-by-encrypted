/** @typedef {import('./dashboardMockData').DashboardMockItem} DashboardMockItem */

const flaggedItems = [
  {
    id: 'slide-1',
    title: 'Arrays and pointers',
    unit: 1,
    verdict: 'Content defect',
    severity: 'High',
    severityWeight: 90,
    twinAgreement: 58,
    reason: 'The slide introduces pointer arithmetic before defining pointers.',
    reviewStatus: 'Open',
  },
  {
    id: 'q-2',
    title: 'What is a stack?',
    unit: 1,
    verdict: 'Content defect',
    severity: 'High',
    severityWeight: 87,
    twinAgreement: 62,
    reason: 'The question describes queue behavior instead of the stack LIFO rule.',
    reviewStatus: 'Open',
  },
  {
    id: 'slide-3',
    title: 'Queue operation summary',
    unit: 1,
    verdict: 'Content defect',
    severity: 'Medium',
    severityWeight: 72,
    twinAgreement: 68,
    reason: 'The final comparison incorrectly describes a queue as a reversed stack.',
    reviewStatus: 'Open',
  },
  {
    id: 'slide-5',
    title: 'Recursive stack frames',
    unit: 1,
    verdict: 'Ability gap',
    severity: 'Medium',
    severityWeight: 64,
    twinAgreement: 89,
    reason: 'Learners need more support connecting recursive calls to stack frames.',
    reviewStatus: 'Open',
  },
  {
    id: 'q-8',
    title: 'Hash map collision handling',
    unit: 2,
    verdict: 'Content defect',
    severity: 'High',
    severityWeight: 88,
    twinAgreement: 64,
    reason: 'The question incorrectly says a key is stored in multiple buckets.',
    reviewStatus: 'Open',
  },
  {
    id: 'slide-7',
    title: 'Traversal comparison',
    unit: 2,
    verdict: 'Content defect',
    severity: 'Medium',
    severityWeight: 77,
    twinAgreement: 66,
    reason: 'An undefined reverse-traversal claim conflicts with the listed definitions.',
    reviewStatus: 'Open',
  },
  {
    id: 'q-6',
    title: 'What is the cost of searching in a BST?',
    unit: 2,
    verdict: 'Ability gap',
    severity: 'Medium',
    severityWeight: 58,
    twinAgreement: 87,
    reason: 'The balanced-tree assumption needs more teaching support.',
    reviewStatus: 'Open',
  },
  {
    id: 'slide-11',
    title: 'Graph terminology',
    unit: 3,
    verdict: 'Content defect',
    severity: 'High',
    severityWeight: 81,
    twinAgreement: 69,
    reason: 'The slide says directed edges can be traversed in both directions.',
    reviewStatus: 'Open',
  },
  {
    id: 'q-12',
    title: 'Adjacency list representation',
    unit: 3,
    verdict: 'Ability gap',
    severity: 'Medium',
    severityWeight: 63,
    twinAgreement: 91,
    reason: 'Learners need a clearer example of representing neighboring vertices.',
    reviewStatus: 'Open',
  },
]

const cleanItemsByUnit = [
  { unit: 1, count: 4 },
  { unit: 2, count: 4 },
  { unit: 3, count: 3 },
]

/** @returns {DashboardMockItem[]} */
function createCleanItems() {
  return cleanItemsByUnit.flatMap(({ unit, count }) => (
    Array.from({ length: count }, (_, index) => ({
      id: `clean-unit-${unit}-${index + 1}`,
      title: `Unit ${unit} clean item ${index + 1}`,
      unit,
      verdict: 'Clean',
      severity: 'Low',
      severityWeight: 0,
      twinAgreement: 92 + ((unit + index) % 7),
      reason: '',
      reviewStatus: 'Open',
    }))
  ))
}

/** @type {DashboardMockItem[]} */
export const dashboardMockItems = [...flaggedItems, ...createCleanItems()]

const dashboardMock = {
  lastAnalysis: '28 Sep 2026',
  items: dashboardMockItems,
}

/**
 * @param {string} courseId
 * @returns {Promise<{ lastAnalysis: string, items: DashboardMockItem[] } | { lastAnalysis: '', items: [] }>}
 */
export async function getDashboardMockData(courseId) {
  await new Promise((resolve) => window.setTimeout(resolve, 350))

  if (courseId === 'intro-data-structures') return dashboardMock
  if (courseId === 'digital-systems') return { lastAnalysis: '', items: [] }
  throw new Error('Dashboard data is unavailable for this course.')
}