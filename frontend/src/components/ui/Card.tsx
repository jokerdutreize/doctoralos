import type { ReactNode, CSSProperties } from 'react'
import { theme } from '../../styles/theme'

interface Props {
  title?:    string
  subtitle?: string
  action?:   ReactNode
  children:  ReactNode
  style?:    CSSProperties
  bodyStyle?: CSSProperties
  noPad?:    boolean
}

export default function Card({ title, subtitle, action, children, style, bodyStyle, noPad }: Props) {
  return (
    <div style={{
      background: theme.color.surface,
      border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.lg,
      boxShadow: theme.shadow.sm,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || action) && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '16px 20px 0',
        }}>
          <div>
            {title && (
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.color.text }}>{title}</div>
            )}
            {subtitle && (
              <div style={{ fontSize: 12, color: theme.color.muted, marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          {action && <div style={{ flexShrink: 0, marginLeft: 12 }}>{action}</div>}
        </div>
      )}
      <div style={{ padding: noPad ? 0 : '16px 20px', flex: 1, ...bodyStyle }}>
        {children}
      </div>
    </div>
  )
}
