import { mockCourses, courseItems, dashboardMetrics, reportRows, settingsConfig } from '../data/mockData'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockApi = {
  async loginFaculty({ email, password }) {
    await sleep(700)
    if (!email || !password) {
      throw new Error('Please enter your email and password.')
    }
    return {
      user: {
        id: 'faculty-01',
        name: 'Dr. Priya Nair',
        role: 'Faculty',
        email,
      },
      token: 'mock-faculty-token',
    }
  },

  async getCourses() {
    await sleep(450)
    return mockCourses
  },

  async getDashboardData(courseId = 'intro-data-structures') {
    await sleep(550)
    return {
      courseId,
      summary: dashboardMetrics,
      flaggedByUnit: [
        { name: 'Unit 1', flagged: 4 },
        { name: 'Unit 2', flagged: 3 },
        { name: 'Unit 3', flagged: 2 },
      ],
      verdictBreakdown: [
        { name: 'Content defect', value: 6, color: '#ef4444' },
        { name: 'Ability gap', value: 3, color: '#3b82f6' },
        { name: 'Clean', value: 21, color: '#10b981' },
      ],
      needsAttention: courseItems
        .filter((item) => item.verdict !== 'Clean')
        .sort((a, b) => (b.severityWeight || 0) - (a.severityWeight || 0))
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          item: item.title,
          verdict: item.verdict,
          severity: item.severity,
          unit: `Unit ${item.unit}`,
        })),
    }
  },

  async getCourseItems(courseId = 'intro-data-structures') {
    await sleep(600)
    return courseItems.filter((item) => item.courseId === courseId)
  },

  async getItemById(itemId) {
    await sleep(400)
    return courseItems.find((item) => item.id === itemId)
  },

  async runShadowTwin(courseId, uploadedFiles = []) {
    await sleep(900)
    return {
      status: 'Ready',
      courseId,
      uploadedFiles: uploadedFiles.length,
      progress: [
        { step: 'Uploaded', done: true },
        { step: 'Text extracted', done: true },
        { step: 'Twin attempts running', done: true },
        { step: 'Classifying', done: true },
        { step: 'Ready', done: true },
      ],
    }
  },

  async getReportData() {
    await sleep(600)
    return reportRows
  },

  async getSettings() {
    await sleep(300)
    return settingsConfig
  },

  async updateFacultyDecision(itemId, payload) {
    await sleep(500)
    const item = courseItems.find((entry) => entry.id === itemId)
    if (!item) return { ok: true }

    item.facultyFeedback = {
      status: payload.status,
      confirmed: payload.status === 'Confirmed',
      comment: payload.comment || '',
    }

    return { ok: true, item }
  },
}

export default mockApi
