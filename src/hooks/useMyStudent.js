import { useCallback, useEffect, useState } from 'react'
import { getMyStudent } from '../data/api'

/** @param {import('../auth/AuthContext').AuthUser} user */
export function useMyStudent(user) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getMyStudent(user)
      .then((result) => { if (active) setStudent(result) })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load your student details.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user, retryKey])

  const retry = useCallback(() => setRetryKey((value) => value + 1), [])
  return { student, loading, error, retry }
}