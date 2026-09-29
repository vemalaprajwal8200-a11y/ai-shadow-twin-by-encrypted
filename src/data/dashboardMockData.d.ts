export type DashboardVerdict = 'Content defect' | 'Ability gap' | 'Clean'
export type DashboardSeverity = 'High' | 'Medium' | 'Low'
export type DashboardReviewStatus = 'Open' | 'Confirmed' | 'Dismissed'

export interface DashboardMockItem {
  id: string
  title: string
  unit: number
  verdict: DashboardVerdict
  severity: DashboardSeverity
  severityWeight: number
  twinAgreement: number
  reason: string
  reviewStatus: DashboardReviewStatus
}

export const dashboardMockItems: DashboardMockItem[]

export function getDashboardMockData(courseId: string): Promise<{
  lastAnalysis: string
  items: DashboardMockItem[]
}>