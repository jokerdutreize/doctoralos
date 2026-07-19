import { Component, type ReactNode, type ErrorInfo } from 'react'
import { theme } from '../../styles/theme'

interface Props  { children: ReactNode }
interface State  { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '48px 32px', textAlign: 'center',
          background: theme.color.surface,
          border: `1px solid ${theme.color.border}`,
          borderRadius: theme.r.lg,
          margin: '24px 28px',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: theme.color.dangerBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={theme.color.danger} strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.color.text, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{ fontSize: 13, color: theme.color.text2, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 20px', borderRadius: theme.r.md,
              background: theme.color.primary, color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
