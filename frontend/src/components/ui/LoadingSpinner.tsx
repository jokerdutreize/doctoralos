import { theme } from '../../styles/theme'

interface Props {
  size?:    number
  label?:   string
  fullPage?: boolean
}

export default function LoadingSpinner({ size = 36, label = 'Loading…', fullPage }: Props) {
  const wrap: React.CSSProperties = fullPage
    ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 300 }
    : { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }

  return (
    <div style={wrap}>
      <svg
        width={size} height={size}
        viewBox="0 0 38 38"
        style={{ animation: 'spin 0.9s linear infinite' }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <circle
          cx="19" cy="19" r="16"
          fill="none"
          stroke={theme.color.border}
          strokeWidth="3"
        />
        <circle
          cx="19" cy="19" r="16"
          fill="none"
          stroke={theme.color.primary}
          strokeWidth="3"
          strokeDasharray="62 40"
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span style={{ marginTop: 12, fontSize: 13, color: theme.color.muted }}>
          {label}
        </span>
      )}
    </div>
  )
}
