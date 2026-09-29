import { createContext, useContext, useMemo, useState } from 'react'

/** @typedef {{ id: string, name: string, email: string, role: 'student' | 'faculty', studentId?: string, courseId?: string }} AuthUser */

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem('shadow-twin-user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      if (user?.email && (user.role === 'student' || user.role === 'faculty')) return user
      if (user?.email) return { ...user, id: 'faculty-legacy', name: 'Faculty', role: 'faculty' }
    }
    if (localStorage.getItem('shadow-twin-token')) return { id: 'faculty-legacy', name: 'Faculty', email: 'faculty@campus.edu', role: 'faculty' }
  } catch {
    return null
  }
  return null
}

/** @param {{ children: import('react').ReactNode }} props */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    async login(email, password, role = 'student') {
      const normalizedEmail = email.trim()
      if (!normalizedEmail || password.length < 4) {
        throw new Error('Enter an email and a password with at least 4 characters.')
      }
      if (role !== 'student' && role !== 'faculty') throw new Error('Choose a valid account role.')

      // TODO: Replace this mock check with the real API or Cognito sign-in call.
      // TODO: Read the role and studentId from the verified token claims instead of the login form.
      const isDemoStudent = normalizedEmail.toLowerCase() === 'student.demo@campus.edu'
      const nextUser = role === 'student'
        ? {
          id: 'student-001',
          name: isDemoStudent ? 'Avery Example' : normalizedEmail.split('@')[0],
          email: normalizedEmail,
          role,
          studentId: 'student-001',
          courseId: 'intro-data-structures',
        }
        : {
          id: `faculty-${normalizedEmail.toLowerCase()}`,
          name: normalizedEmail.toLowerCase() === 'faculty@campus.edu' ? 'Dr. Priya Nair' : normalizedEmail.split('@')[0],
          email: normalizedEmail,
          role,
        }
      setUser(nextUser)
      try {
        localStorage.setItem('shadow-twin-user', JSON.stringify(nextUser))
        localStorage.setItem('shadow-twin-token', 'mock-faculty-token')
      } catch {
        // Keep the session active for this tab when browser storage is unavailable.
      }
      return nextUser
    },
    logout() {
      setUser(null)
      try {
        localStorage.removeItem('shadow-twin-user')
        localStorage.removeItem('shadow-twin-token')
      } catch {
        // The in-memory session is still cleared.
      }
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}