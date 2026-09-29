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
    async registerWithEmail(email, password, displayName = '', studentId = '') {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            student_id: studentId.trim(),
          },
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('Account registration did not return a user.')
    },
    async verifySignupOtp(email, token) {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: 'signup',
      })
      if (error) throw error
      if (!data.user) throw new Error('Email verification did not return an account.')

      const { error: signOutError } = await client.auth.signOut({ scope: 'local' })
      if (signOutError) throw signOutError
      setUser(null)
    },
    async resendSignupOtp(email) {
      const client = getSupabaseClient()
      const { error } = await client.auth.resend({ type: 'signup', email: email.trim() })
      if (error) throw error
    },
    async loginWithEmail(email, password) {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      if (!data.user) throw new Error('Sign in did not return an account.')

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