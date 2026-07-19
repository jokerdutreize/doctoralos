import { useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface Props { children: ReactNode }

const STORAGE_KEY = 'dtl_sidebar_collapsed'

export default function Layout({ children }: Props) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')

  function toggleSidebar() {
    setCollapsed(c => {
      const next = !c
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar collapsed={collapsed} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar sidebarCollapsed={collapsed} onToggleSidebar={toggleSidebar} />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'auto', background: 'var(--c-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
