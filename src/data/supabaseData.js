import { getSupabaseClient } from '../api/supabase'
import { API_BASE_URL } from '../services/api'

const VIEW_NAMES = {
  twinStatus: 'v_twin_status',
  courses: 'v_course_overview',
  flaggedPerUnit: 'v_flagged_per_unit',
  verdictSplit: 'v_verdict_split',
  needsAttention: 'v_needs_attention',
  personaPerformance: 'v_persona_performance',
  analysisProgress: 'v_analysis_progress',
  contentItems: 'v_content_items',
  accuracyMetrics: 'v_accuracy_metrics',
  defectRate: 'v_defect_rate_per_unit',
  flagReview: 'v_flag_review',
}

function throwIfError(error) {
  if (error) throw new Error(error.message || 'Supabase request failed.')
}

export async function getCurrentSupabaseUser() {
  const { data, error } = await getSupabaseClient().auth.getUser()
  throwIfError(error)
  if (!data.user) throw new Error('Sign in to continue.')
  return data.user
}

export async function readView(viewName, { courseId, orderBy } = {}) {
  let query = getSupabaseClient().from(viewName).select('*')
  if (courseId) query = query.eq('course_id', courseId)
  if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
  const { data, error } = await query
  throwIfError(error)
  return data || []
}

export async function getTwinStatus() {
  return readView(VIEW_NAMES.twinStatus)
}

export async function getCourseOverview() {
  const user = await getCurrentSupabaseUser()
  const { data, error } = await getSupabaseClient().from('courses')
    .select('*')
    .eq('faculty_id', user.id)
    .order('created_at', { ascending: false })
  throwIfError(error)
  return data || []
}

export async function getFlaggedPerUnit(courseId) {
  return readView(VIEW_NAMES.flaggedPerUnit, { courseId })
}

export async function getVerdictSplit(courseId) {
  return readView(VIEW_NAMES.verdictSplit, { courseId })
}

export async function getNeedsAttention(courseId) {
  return readView(VIEW_NAMES.needsAttention, { courseId })
}

export async function getPersonaPerformance(courseId) {
  return readView(VIEW_NAMES.personaPerformance, { courseId })
}

export async function getAnalysisProgress(courseId) {
  return readView(VIEW_NAMES.analysisProgress, { courseId, orderBy: { column: 'created_at', ascending: false } })
}

export async function getContentItems(courseId, { itemType, flaggedOnly = false } = {}) {
  let query = getSupabaseClient().from(VIEW_NAMES.contentItems).select('*')
  if (courseId) query = query.eq('course_id', courseId)
  if (itemType) query = query.eq('item_type', itemType)
  if (flaggedOnly) query = query.eq('is_flagged', true)
  const { data, error } = await query.order('created_at', { ascending: false })
  throwIfError(error)
  return data || []
}

export async function getContentItem(itemId) {
  const { data, error } = await getSupabaseClient().from(VIEW_NAMES.contentItems)
    .select('*').eq('content_item_id', itemId).maybeSingle()
  throwIfError(error)
  return data
}

export async function getItemResults(itemId) {
  const { data, error } = await getSupabaseClient().from('item_results')
    .select('*, personas(name)').eq('content_item_id', itemId).order('created_at', { ascending: true })
  throwIfError(error)
  return data || []
}

export async function getAccuracyMetrics(courseId) {
  return readView(VIEW_NAMES.accuracyMetrics, { courseId })
}

export async function getDefectRatePerUnit(courseId) {
  return readView(VIEW_NAMES.defectRate, { courseId })
}

export async function getFlagReview(courseId) {
  return readView(VIEW_NAMES.flagReview, { courseId, orderBy: { column: 'created_at', ascending: false } })
}

export async function createCourse({ courseName, courseCode = '', description = '' }) {
  const user = await getCurrentSupabaseUser()
  const row = {
    course_id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    faculty_id: user.id,
    course_name: courseName.trim(),
    course_code: courseCode.trim() || null,
    description: description.trim() || null,
  }
  const { data, error } = await getSupabaseClient().from('courses').insert(row).select('*').single()
  throwIfError(error)
  return data
}

export async function createUnit({ courseId, unitName, unitOrder }) {
  const row = { course_id: courseId, unit_name: unitName.trim(), unit_order: Number(unitOrder) }
  const { data, error } = await getSupabaseClient().from('units').insert(row).select('*').single()
  throwIfError(error)
  return data
}

export async function getUnits(courseId) {
  const { data, error } = await getSupabaseClient().from('units')
    .select('*').eq('course_id', courseId).order('unit_order', { ascending: true })
  throwIfError(error)
  return data || []
}

export async function uploadCourseMaterial({ courseId, unitId = null, file }) {
  const client = getSupabaseClient()
  const user = await getCurrentSupabaseUser()
  const safeName = file.name.replace(/[\\/]+/g, '_')
  const storagePath = `${user.id}/${courseId}/${safeName}`

  try {
    const { error: storageError } = await client.storage
      .from('course-uploads')
      .upload(storagePath, file, { upsert: true, contentType: file.type || 'application/octet-stream' })
    if (storageError) {
      console.error('Storage upload failed:', storageError)
      throw new Error(storageError.message || 'Storage upload failed.')
    }

    const { data, error } = await client.from('uploads').insert({
      course_id: courseId,
      unit_id: unitId,
      file_name: file.name,
      file_type: file.type || file.name.split('.').pop() || 'unknown',
      file_size_bytes: file.size,
      storage_path: storagePath,
      uploaded_by: user.id,
    }).select('*').single()
    if (error) {
      console.error('Upload metadata insert failed:', error)
      await client.storage.from('course-uploads').remove([storagePath])
      throw new Error(error.message || 'The upload metadata could not be saved.')
    }

    const { data: sessionData } = await client.auth.getSession()
    const response = await fetch(`${API_BASE_URL}/api/analyze/${encodeURIComponent(courseId)}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(sessionData.session?.access_token ? { Authorization: `Bearer ${sessionData.session.access_token}` } : {}),
      },
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      const apiMessage = payload.detail || payload.error || 'The analysis could not be started.'
      console.error('Analysis API rejected upload:', apiMessage)
      throw new Error(apiMessage)
    }
    return { upload: data, analysis: payload }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The upload could not be completed.'
    console.error('Upload flow failed:', message)
    throw error
  }
}

export async function updateFlagReview(flagId, status, reviewNote = '') {
  const user = await getCurrentSupabaseUser()
  const { data, error } = await getSupabaseClient().from('flags').update({
    status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    review_note: reviewNote.trim() || null,
  }).eq('flag_id', flagId).select('*').single()
  throwIfError(error)
  return data
}

export async function getUserSettings() {
  const user = await getCurrentSupabaseUser()
  const client = getSupabaseClient()
  const { data, error } = await client.from('user_settings').select('*').eq('user_id', user.id).maybeSingle()
  throwIfError(error)
  if (data) return data
  const { data: created, error: createError } = await client.from('user_settings').upsert({
    user_id: user.id,
    runs_per_item: 3,
    confidence_threshold: 0.65,
    theme: 'light',
  }).select('*').single()
  throwIfError(createError)
  return created
}

export async function getMyProfile() {
  const user = await getCurrentSupabaseUser()
  const client = getSupabaseClient()
  let { data, error } = await client.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (error?.code === '42703' || error?.code === 'PGRST204') {
    const fallback = await client.from('profiles').select('*').eq('id', user.id).maybeSingle()
    data = fallback.data
    error = fallback.error
  }
  throwIfError(error)
  return data || { full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '' }
}

export async function saveUserSettings(values) {
  const user = await getCurrentSupabaseUser()
  const { data, error } = await getSupabaseClient().from('user_settings')
    .upsert({ user_id: user.id, ...values }).select('*').single()
  throwIfError(error)
  return data
}

export async function getPersonas() {
  const { data, error } = await getSupabaseClient().from('personas')
    .select('*').order('name', { ascending: true })
  throwIfError(error)
  return data || []
}

export async function savePersona(persona) {
  const client = getSupabaseClient()
  const user = await getCurrentSupabaseUser()
  const row = { ...persona, faculty_id: user.id }
  const query = persona.persona_id
    ? client.from('personas').update(row).eq('persona_id', persona.persona_id)
    : client.from('personas').insert(row)
  const { data, error } = await query.select('*').single()
  throwIfError(error)
  return data
}

export async function updateProfile(fields) {
  const client = getSupabaseClient()
  const user = await getCurrentSupabaseUser()
  const { error: authError } = await client.auth.updateUser({ data: fields })
  throwIfError(authError)
  let { data, error } = await client.from('profiles').update(fields)
    .eq('user_id', user.id).select('*').maybeSingle()
  if (error?.code === '42703' || error?.code === 'PGRST204') {
    const fallback = await client.from('profiles').update(fields).eq('id', user.id).select('*').maybeSingle()
    data = fallback.data
    error = fallback.error
  }
  throwIfError(error)
  return data
}

export async function recordReportExport({ courseId, fileName, rowCount }) {
  const user = await getCurrentSupabaseUser()
  const { error } = await getSupabaseClient().from('report_exports').insert({
    user_id: user.id,
    course_id: courseId || null,
    file_name: fileName,
    row_count: rowCount,
  })
  throwIfError(error)
}

export { VIEW_NAMES }
