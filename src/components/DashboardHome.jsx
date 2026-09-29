import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import FacultyRoster from '../pages/dashboard/StudentDetails'
import MyDetails from '../pages/student/MyDetails'

/** @param {{ courseId: string }} props */
export default function DashboardHome({ courseId }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!location.state?.accessDenied) return undefined
    const targetRole = location.state.intendedRole || 'faculty'
    setNotice(`That area is for ${targetRole === 'faculty' ? 'faculty' : 'students'}.`)
    navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.hash, location.state, navigate])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 4000)
    return () => window.clearTimeout(timeout)
  }, [notice])

  return (
    <>
      {user?.role === 'student' ? <MyDetails /> : <FacultyRoster courseId={courseId} />}
      {notice && <div role="status" className="fixed right-4 top-20 z-50 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text shadow-soft">{notice}</div>}
    </>
  )
}