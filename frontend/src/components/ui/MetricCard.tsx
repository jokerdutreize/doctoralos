import { theme } from '../../styles/theme'

interface Props {
  label:      string
  value:      string | number
  sub?:       string
  trend?:     'up' | 'down' | 'stable'
  trendGood?: boolean   // which direction is clinically good
  accent?:    string    // override accent color
  icon?:      React.ReactNode
}

function TrendArrow({ dir, good }: { dir: 'up' | 'down' | 'stable'; good: boolean }) {
  const up = dir === 'up'
  const neutral = dir === 'stable'
  const positive = neutral ? true : (up === good)
  const color = neutral ? theme.color.muted : positive ? theme.color.success : theme.color.danger
  if (neutral) return <span style={{ color, fontSize: 13 }}>→</span>
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {up
        ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
        : <><line x1="12" y1="5"  x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>}
    </svg>
  )
}

export default function MetricCard({ label, value, sub, trend, trendGood = true, accent, icon }: Props) {
  return (
    <div style={{
      background: theme.color.surface,
      border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.lg,
      boxShadow: theme.shadow.sm,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: theme.color.text2, letterSpacing: '0.02em' }}>{label}</span>
        {icon && <span style={{ color: accent ?? theme.color.primary, display: 'flex' }}>{icon}</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <span style={{
          fontSize: 28,
          fontWeight: 700,
          color: accent ?? theme.color.text,
          lineHeight: 1,
          letterSpacing: '-0.5px',
        }}>
          {value}
        </span>
        {trend && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
            <TrendArrow dir={trend} good={trendGood} />
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12, color: theme.color.muted }}>{sub}</div>}
    </div>
  )
}
