import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    let saved = null
    try {
      saved = localStorage.getItem('shadow-twin-theme')
    } catch {
      saved = null
    }
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches || false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    try {
      localStorage.setItem('shadow-twin-theme', darkMode ? 'dark' : 'light')
    } catch {
      // Theme still applies to the current session without persistent storage.
    }
  }, [darkMode])

  return [darkMode, setDarkMode]
}
