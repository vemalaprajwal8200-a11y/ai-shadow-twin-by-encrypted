export type StudentStatus = 'On track' | 'Needs support' | 'At risk'
export type StudentMissedVerdict = 'content_defect' | 'ability_gap' | 'ok'
export type StudentOutcome = 'content_defect_confirmed' | 'ability_gap_confirmed' | 'genuine_miss'

export interface StudentMissedItem {
  itemId: string
  title: string
  unit: number
  type: 'slide' | 'question'
  verdict: StudentMissedVerdict
  studentOutcome?: StudentOutcome
  questionText?: string
  correctAnswer?: string
  explanation?: string
}

export interface StudentRecord {
  id: string
  courseId: string
  name: string
  rollNo: string
  email: string
  section: string
  unitScores: [number, number, number]
  overallScore: number
  weakestTopic: string
  status: StudentStatus
  classPositionBand: string
  itemsAnsweredCorrectly?: number
  totalItems?: number
  adjustedScore?: number
  missedItems: StudentMissedItem[]
}

export function getStudents(courseId: string): Promise<StudentRecord[]>