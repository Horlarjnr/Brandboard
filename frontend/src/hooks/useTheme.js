import { useCallback, useEffect, useState } from 'react'

const KEY = 'brandboard.theme'

function initialTheme() {
  // index.html already set data-theme before first paint; read it back.
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

// Light/dark theme. Only an explicit toggle is saved, so until the user
// chooses, the app keeps following the device setting.
export default function useTheme() {
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* storage unavailable: the choice lasts for this session only */
    }
  }, [theme])

  return { theme, toggle }
}
