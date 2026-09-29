import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('shadow-twin-theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('shadow-twin-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  return [darkMode, setDarkMode]
}
