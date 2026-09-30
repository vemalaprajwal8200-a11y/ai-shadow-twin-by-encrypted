import { lazy, Suspense, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Toast } from './ui/Primitives'

const FacultyDashboard = lazy(() => import('../pages/faculty/ConnectedFacultyDashboard'))
const MyDetails = lazy(() => import('../pages/student/MyDetails'))

/** @param {{ courseId: string }} props */
export default function DashboardHome({ courseId }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (location.state?.facultyAccessPending) {
      setNotice('Faculty access is pending administrator approval. Your account has student access for now.')
    } else if (location.state?.accessDenied) {
      const targetRole = location.state.intendedRole || 'faculty'
      setNotice(`That area is for ${targetRole === 'faculty' ? 'faculty' : 'students'}.`)
    } else {
      return undefined
    }
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.hash, location.state, navigate])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  return (
    <>
      <Suspense fallback={<div className="grid min-h-[40vh] place-items-center text-muted">Loading...</div>}>
        {user?.role === 'faculty' ? <FacultyDashboard courseId={courseId} /> : <MyDetails />}
      </Suspense>
      <Toast message={notice} onClose={() => setNotice('')} />
    </>
  )
}