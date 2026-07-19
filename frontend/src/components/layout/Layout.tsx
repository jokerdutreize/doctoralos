import type { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface Props { children: ReactNode }

export default function Layout({ children }: Props) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--c-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
