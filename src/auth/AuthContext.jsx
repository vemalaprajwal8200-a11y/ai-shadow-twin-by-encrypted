import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getSupabaseClient, isSupabaseConfigured } from '../api/supabase'

const AuthContext = createContext(null)

async function getProfileUser(client, authUser) {
  const { data, error } = await client
    .from('profiles')
    .select('display_name, role, student_id, course_id')
    .eq('id', authUser.id)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Account profile unavailable. Run the Supabase auth setup SQL and try again.')
  }

  return {
    id: authUser.id,
    name: data.display_name || authUser.email?.split('@')[0] || 'User',
    email: authUser.email || '',
    role: data.role === 'faculty' ? 'faculty' : 'student',
    requestedRole: data.role === 'faculty'
      ? 'faculty'
      : authUser.user_metadata?.requested_role === 'faculty' ? 'faculty' : 'student',
    studentId: data.student_id || undefined,
    courseId: data.course_id || undefined,
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
    async sendEmailCode(
      email,
      { shouldCreateUser = false, displayName = '', studentId = '', requestedRole = 'student' } = {},
    ) {
      const client = getSupabaseClient()
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser,
          ...(shouldCreateUser && {
            data: {
              display_name: displayName.trim(),
              student_id: studentId.trim(),
              requested_role: requestedRole === 'faculty' ? 'faculty' : 'student',
            },
          }),
        },
      })
      if (error) throw error
    },
    async verifyEmailCode(email, code) {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      })
      if (error) throw error
      if (!data.user) throw new Error('The email code did not return an account.')

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