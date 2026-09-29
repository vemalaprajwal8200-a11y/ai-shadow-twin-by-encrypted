import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient, isSupabaseConfigured } from '../api/supabase'

const AuthContext = createContext(null)
const EMAIL_CONFIRMATION_URL = 'https://ai-shadow-twin-by-encrypted.vercel.app/login'
const PASSWORD_RECOVERY_URL = 'https://ai-shadow-twin-by-encrypted.vercel.app/login?recovery=complete'

/**
 * Returns the canonical dashboard path for a given role.
 * @param {'student' | 'faculty' | string | undefined} role
 * @returns {string}
 */
export function getDashboardPath(role) {
  return role === 'faculty' ? '/faculty/dashboard' : '/student/dashboard'
}

/**
 * Resolves user profile from Supabase profiles table (single source of truth).
 * Handles compatibility with tables having user_id, id, or both.
 */
async function getProfileUser(client, authUser) {
  let profileData = null

  // 1. Try querying by user_id
  try {
    const { data, error } = await client
      .from('profiles')
      .select('display_name, role, student_id, course_id, semester, section')
      .eq('user_id', authUser.id)
      .maybeSingle()
    if (!error && data) {
      profileData = data
    }
  } catch {
    // If user_id column is not present, fall through to id
  }

  // 2. Fallback querying by id if user_id was not matched
  if (!profileData) {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('display_name, role, student_id, course_id, semester, section')
        .eq('id', authUser.id)
        .maybeSingle()
      if (!error && data) {
        profileData = data
      }
    } catch {
      // profiles table might be inaccessible
    }
  }

  const metadata = authUser.user_metadata || {}

  // Keep the profile row authoritative for role and basic identity, but do not keep stale values
  // when the auth user metadata was updated more recently by the client.
  const normalizedDisplayName = profileData?.display_name?.trim() || metadata.display_name?.trim() || authUser.email?.split('@')[0] || 'User'
  const normalizedStudentId = (metadata.student_id ?? profileData?.student_id ?? '').toString().trim() || undefined

  let verifiedRole = 'student'
  if (profileData?.role === 'faculty') {
    verifiedRole = 'faculty'
  } else if (profileData?.role === 'student') {
    verifiedRole = 'student'
  } else if (metadata.role === 'faculty' || metadata.requested_role === 'faculty') {
    verifiedRole = 'faculty'
  }

  return {
    id: authUser.id,
    name: normalizedDisplayName,
    email: authUser.email || '',
    role: verifiedRole,
    requestedRole: metadata.role || metadata.requested_role || verifiedRole,
    studentId: normalizedStudentId,
    semester: (metadata.semester ?? profileData?.semester ?? '').toString().trim(),
    section: (metadata.section ?? profileData?.section ?? '').toString().trim(),
    courseId: profileData?.course_id || undefined,
  }
}

/** @param {{ children: import('react').ReactNode }} props */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return undefined
    }

    let active = true
    let requestId = 0
    const client = getSupabaseClient()

    const syncUser = async (authUser) => {
      const currentRequest = ++requestId
      if (!authUser) {
        if (active) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      setLoading(true)
      try {
        const profileUser = await getProfileUser(client, authUser)
        if (active && currentRequest === requestId) {
          setUser(profileUser)
        }
      } catch {
        if (active && currentRequest === requestId) {
          setUser(null)
        }
      } finally {
        if (active && currentRequest === requestId) {
          setLoading(false)
        }
      }
    }

    // Listen for auth events (sign in, sign out, token refresh)
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user || null)
    })

    // Initial session lookup
    client.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error
        return syncUser(data.session?.user || null)
      })
      .catch(() => {
        if (active) {
          setUser(null)
          setLoading(false)
        }
      })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    configured: isSupabaseConfigured(),
    async registerWithEmail(email, password, { displayName = '', studentId = '', role = 'student', requestedRole = '', inviteCode = '' } = {}) {
      const client = getSupabaseClient()
      const targetRole = (role === 'faculty' || requestedRole === 'faculty') ? 'faculty' : 'student'

      // Pass role directly in options.data.role so it survives the email confirmation round-trip
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: EMAIL_CONFIRMATION_URL,
          data: {
            display_name: displayName.trim(),
            student_id: studentId.trim(),
            role: targetRole,
            requested_role: targetRole, // backward-compatibility with existing schema triggers
            invite_code: inviteCode.trim(),
          },
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('Account registration did not return a user.')
      if (data.user.identities?.length === 0) {
        throw new Error('An account with this email may already exist. Try signing in instead.')
      }
      if (!data.session) return { requiresEmailConfirmation: true }

      // Session exists (auto-confirm enabled): fetch profile before returning
      const profileUser = await getProfileUser(client, data.user)
      setUser(profileUser)
      return { user: profileUser }
    },
    async loginWithEmail(email, password) {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      if (!data.user) throw new Error('Sign-in did not return an account.')

      // Wait for session and profile fetch before finishing login
      const profileUser = await getProfileUser(client, data.user)
      setUser(profileUser)
      return profileUser
    },
    async sendPasswordReset(email) {
      const client = getSupabaseClient()
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: PASSWORD_RECOVERY_URL,
      })
      if (error) throw error
    },
    async updatePassword(password) {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.updateUser({ password })
      if (error) throw error
      if (!data.user) throw new Error('Could not update your password.')

      const profileUser = await getProfileUser(client, data.user)
      setUser(profileUser)
      return profileUser
    },
    async updateStudentDetails({ name, studentId, semester, section }) {
      const client = getSupabaseClient()
      const cleanedName = name.trim()
      const cleanedStudentId = studentId.trim()
      const cleanedSemester = semester.trim()
      const cleanedSection = section.trim()

      const { data, error } = await client.auth.updateUser({
        data: {
          display_name: cleanedName,
          student_id: cleanedStudentId,
          semester: cleanedSemester,
          section: cleanedSection,
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('Could not update your student details.')

      try {
        const profileRow = {
          user_id: data.user.id,
          id: data.user.id,
          display_name: cleanedName,
          student_id: cleanedStudentId,
          course_id: user?.courseId || null,
          role: user?.role || 'student',
          semester: cleanedSemester,
          section: cleanedSection,
        }

        const { error: profileError } = await client
          .from('profiles')
          .upsert(profileRow, { onConflict: 'user_id' })

        if (profileError) {
          console.warn('Profile sync warning:', profileError.message)
        }
      } catch (profileSyncError) {
        console.warn('Profile sync warning:', profileSyncError)
      }

      const profileUser = await getProfileUser(client, data.user)
      setUser(profileUser)
      return profileUser
    },
    async logout() {
      const client = getSupabaseClient()
      // Clear cached role immediately to prevent any stale role state
      setUser(null)
      const { error } = await client.auth.signOut()
      if (error) throw error
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}