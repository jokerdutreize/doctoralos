export const theme = {
  color: {
    // Semantic — adapt to dark/light via CSS custom properties
    bg:           'var(--c-bg)',
    surface:      'var(--c-surface)',
    border:       'var(--c-border)',
    text:         'var(--c-text)',
    text2:        'var(--c-text-2)',
    muted:        'var(--c-text-muted)',
    chartGrid:    'var(--c-chart-grid)',
    primaryBg:    'var(--c-primary-bg)',
    accentBg:     'var(--c-accent-bg)',
    successBg:    'var(--c-success-bg)',
    warningBg:    'var(--c-warning-bg)',
    dangerBg:     'var(--c-danger-bg)',

    // Fixed brand / status colours (used in SVG/Recharts — must be hex)
    primary:      '#1565C0',
    primaryLight: '#1976D2',
    accent:       '#00695C',
    success:      '#2E7D32',
    warning:      '#E65100',
    danger:       '#B71C1C',

    // Chart series colours
    alt:          '#1565C0',
    ast:          '#00695C',
    bilirubin:    '#E65100',
    creatinine:   '#7B1FA2',
    rejection:    '#C62828',
    infection:    '#EF6C00',
    survival:     '#2E7D32',
    baseline:     '#90A4AE',
  },
  shadow: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
  },
  r: { sm: '6px', md: '10px', lg: '14px', xl: '20px' },
} as const
