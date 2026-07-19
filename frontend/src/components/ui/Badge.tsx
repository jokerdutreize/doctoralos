import type { RiskLevel } from '../../types'
import { levelColor, levelBg } from '../../utils/format'

type Variant = RiskLevel | 'info' | 'primary' | 'neutral'

interface Props {
  label:    string
  variant?: Variant
  dot?:     boolean
  size?:    'sm' | 'md'
}

const variantStyle = (v: Variant): { color: string; background: string } => {
  switch (v) {
    case 'low':      return { color: levelColor('low'),      background: levelBg('low') }
    case 'moderate': return { color: levelColor('moderate'), background: levelBg('moderate') }
    case 'high':     return { color: levelColor('high'),     background: levelBg('high') }
    case 'primary':  return { color: '#1565C0', background: '#E3F2FD' }
    case 'info':     return { color: '#00695C', background: '#E0F2F1' }
    default:         return { color: '#546E7A', background: '#ECEFF1' }
  }
}

export default function Badge({ label, variant = 'neutral', dot, size = 'md' }: Props) {
  const s = variantStyle(variant)
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: size === 'sm' ? '2px 7px' : '3px 10px',
      borderRadius: '9999px',
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600,
      letterSpacing: '0.02em',
      ...s,
    }}>
      {dot && (
        <span style={{
          width: 5, height: 5,
          borderRadius: '50%',
          background: s.color,
          display: 'inline-block',
        }} />
      )}
      {label}
    </span>
  )
}
