import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Login from '../pages/Login'

/** @param {{ children: import('react').ReactNode }} props */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="grid min-h-screen place-items-center bg-bg text-sm text-muted" role="status">Checking your session...</div>
  return isAuthenticated
    ? children
    : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function LoginRoute() {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="grid min-h-screen place-items-center bg-bg text-sm text-muted" role="status">Checking your session...</div>
  if (location.search.includes('recovery=')) return <Login />
  if (!isAuthenticated) return <Login />

  const facultyAccessPending = user?.requestedRole === 'faculty' && user.role !== 'faculty'
  return <Navigate to="/dashboard" replace state={{ facultyAccessPending }} />
}

/** @param {{ allowedRoles: Array<'student' | 'faculty'>, children?: import('react').ReactNode }} props */
export function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace state={{ accessDenied: true, intendedRole: allowedRoles[0], from: location.pathname }} />
  }
  return children || <Outlet />
}