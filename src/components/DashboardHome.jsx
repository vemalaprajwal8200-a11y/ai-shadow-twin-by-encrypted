import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import FacultyRoster from '../pages/dashboard/StudentDetails'
import MyDetails from '../pages/student/MyDetails'
import { Toast } from './ui/Primitives'

/** @param {{ courseId: string }} props */
export default function DashboardHome({ courseId }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (location.state?.facultyAccessPending) {
      setNotice('Email verified. Faculty access is pending administrator approval; your account has student access for now.')
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
      {user?.role === 'student' ? <MyDetails /> : <FacultyRoster courseId={courseId} />}
      <Toast message={notice} onClose={() => setNotice('')} />
    </>
  )
}