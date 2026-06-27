import { useEffect } from 'react'
import { useUIStore } from '@/store/uiStore'

export function useTheme() {
  const { theme, setTheme } = useUIStore()

  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (t: 'dark' | 'light') => {
      root.classList.toggle('dark', t === 'dark')
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mq.matches ? 'dark' : 'light')
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      applyTheme(theme)
    }
  }, [theme])

  return { theme, setTheme }
}
