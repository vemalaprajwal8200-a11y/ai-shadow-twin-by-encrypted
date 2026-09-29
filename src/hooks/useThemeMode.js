import { useEffect, useState } from 'react'

export function useThemeMode() {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return darkMode
}