import type { ReactNode } from 'react'
import { theme } from '../../styles/theme'

interface Props {
  title:       string
  description?: string
  action?:     ReactNode
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56,
        borderRadius: '50%',
        background: theme.color.bg,
        border: `2px dashed ${theme.color.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        color: theme.color.muted,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: theme.color.text, marginBottom: 6 }}>{title}</div>
      {description && (
        <div style={{ fontSize: 13, color: theme.color.muted, maxWidth: 320 }}>{description}</div>
      )}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}
