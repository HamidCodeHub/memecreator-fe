// Light or dark. Starts from the device's setting; once the person picks one it is remembered (localStorage
// "theme") and also used by the legal pages. index.html applies it before the page paints, so nothing flashes.
import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function savedTheme(): Theme | null {
  try {
    const t = localStorage.getItem('theme')
    return t === 'light' || t === 'dark' ? t : null
  } catch {
    return null
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => savedTheme() ?? systemTheme())

  // Follow the device's setting until the person picks one
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = () => {
      if (!savedTheme()) setTheme(systemTheme())
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* private mode: still switches for this visit */
    }
    setTheme(next)
  }
  return [theme, toggle]
}
