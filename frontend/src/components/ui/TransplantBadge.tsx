import { getProgram } from '../../config/transplantPrograms'

interface Props {
  program:   string | null | undefined
  size?:     'xs' | 'sm' | 'md' | 'lg'
  showFull?: boolean
  dot?:      boolean
}

const SIZE_STYLES = {
  xs: { fontSize: 9,  padding: '1px 5px',  gap: 3, borderRadius: 999 },
  sm: { fontSize: 11, padding: '2px 8px',  gap: 4, borderRadius: 999 },
  md: { fontSize: 12, padding: '4px 10px', gap: 5, borderRadius: 8   },
  lg: { fontSize: 13, padding: '5px 14px', gap: 6, borderRadius: 8   },
}

const DOT_SIZE = { xs: 4, sm: 6, md: 7, lg: 8 }

export default function TransplantBadge({
  program, size = 'sm', showFull = false, dot = true,
}: Props) {
  const cfg  = getProgram(program)
  const sz   = SIZE_STYLES[size]
  const dSz  = DOT_SIZE[size]

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: sz.gap,
      fontWeight: 700,
      letterSpacing: '0.03em',
      color:      cfg.text,
      background: cfg.light,
      border:     `1px solid ${cfg.border}`,
      fontSize:   sz.fontSize,
      padding:    sz.padding,
      borderRadius: sz.borderRadius,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {dot && (
        <span style={{
          width: dSz, height: dSz, borderRadius: '50%',
          background: cfg.color, flexShrink: 0,
        }} />
      )}
      {showFull ? cfg.label : cfg.shortLabel}
    </span>
  )
}
