import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import About from '../pages/About'
import Login from '../pages/Login'

/** @param {{ children: import('react').ReactNode }} props */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  return isAuthenticated
    ? children
    : <Navigate to="/login" replace state={{ from: location.pathname }} />
}

export function LoginRoute() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <About /> : <Login />
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