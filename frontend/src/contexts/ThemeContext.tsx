import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Mode = 'light' | 'dark'

interface ThemeCtx {
  mode:   Mode
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({ mode: 'light', toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    return (localStorage.getItem('dtl_theme') as Mode) ?? 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    localStorage.setItem('dtl_theme', mode)
  }, [mode])

  const toggle = () => setMode(m => (m === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
