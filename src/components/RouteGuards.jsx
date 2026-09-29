import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getDashboardPath, useAuth } from '../auth/AuthContext'
import Login from '../pages/Login'

/** @param {{ children: import('react').ReactNode }} props */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-sm text-muted" role="status">
        Checking your session...
      </div>
    )
  }

  return isAuthenticated
    ? children
    : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function LoginRoute() {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-sm text-muted" role="status">
        Checking your session...
      </div>
    )
  }

  if (location.search.includes('recovery=')) return <Login />
  if (!isAuthenticated) return <Login />

  // Redirect to role-specific dashboard: faculty -> /faculty/dashboard, student -> /student/dashboard
  const target = getDashboardPath(user?.role)
  return <Navigate to={target} replace />
}

/** @param {{ allowedRoles: Array<'student' | 'faculty'>, children?: import('react').ReactNode }} props */
export function RoleRoute({ allowedRoles, children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-sm text-muted" role="status">
        Checking permissions...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  // Faculty-only route rejects students -> redirect to student dashboard
  // Student-only route rejects faculty -> redirect to faculty dashboard
  if (!allowedRoles.includes(user.role)) {
    const userDashboard = getDashboardPath(user.role)
    return (
      <Navigate
        to={userDashboard}
        replace
        state={{ accessDenied: true, intendedRole: allowedRoles[0], from: location.pathname }}
      />
    )
  }

  return children || <Outlet />
}