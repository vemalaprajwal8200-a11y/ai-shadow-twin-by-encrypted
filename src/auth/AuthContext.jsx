import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient, isSupabaseConfigured } from '../api/supabase'

const AuthContext = createContext(null)
const EMAIL_CONFIRMATION_URL = 'https://ai-shadow-twin-by-encrypted.vercel.app/login'
const PASSWORD_RECOVERY_URL = 'https://ai-shadow-twin-by-encrypted.vercel.app/login?recovery=complete'

async function getProfileUser(client, authUser) {
  const { data, error } = await client
    .from('profiles')
    .select('display_name, role, student_id, course_id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (error && error.code !== 'PGRST205') {
    throw new Error('Account profile unavailable. Run the Supabase auth setup SQL and try again.')
  }

  const metadata = authUser.user_metadata || {}
  return {
    id: authUser.id,
    name: metadata.display_name || data?.display_name || authUser.email?.split('@')[0] || 'User',
    email: authUser.email || '',
    role: data?.role === 'faculty' ? 'faculty' : 'student',
    requestedRole: data?.role === 'faculty'
      ? 'faculty'
      : metadata.requested_role === 'faculty' ? 'faculty' : 'student',
    studentId: metadata.student_id || data?.student_id || undefined,
    semester: metadata.semester || '',
    section: metadata.section || '',
    courseId: data?.course_id || undefined,
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
        if (active && currentRequest === requestId) setUser(profileUser)
      } catch {
        if (active && currentRequest === requestId) setUser(null)
      } finally {
        if (active && currentRequest === requestId) setLoading(false)
      }
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      void syncUser(session?.user || null)
    })

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
    async registerWithEmail(email, password, { displayName = '', studentId = '', requestedRole = 'student' } = {}) {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: EMAIL_CONFIRMATION_URL,
          data: {
            display_name: displayName.trim(),
            student_id: studentId.trim(),
            requested_role: requestedRole === 'faculty' ? 'faculty' : 'student',
          },
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('Account registration did not return a user.')
      if (data.user.identities?.length === 0) {
        throw new Error('An account with this email may already exist. Try signing in instead.')
      }
      if (!data.session) return { requiresEmailConfirmation: true }

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
      const { data, error } = await client.auth.updateUser({
        data: {
          display_name: name.trim(),
          student_id: studentId.trim(),
          semester: semester.trim(),
          section: section.trim(),
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('Could not update your student details.')

      const profileUser = await getProfileUser(client, data.user)
      setUser(profileUser)
      return profileUser
    },
    async logout() {
      const client = getSupabaseClient()
      const { error } = await client.auth.signOut()
      if (error) throw error
      setUser(null)
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}