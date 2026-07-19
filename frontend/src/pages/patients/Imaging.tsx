import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatient } from '../../contexts/PatientContext'
import { generateImagingData, type ImagingRecord, type ImagingModality, type ImagingStatus } from '../../utils/wltAdapters'
import { theme } from '../../styles/theme'
import Card from '../../components/ui/Card'

const MODALITY_META: Record<ImagingModality, { short: string; color: string; bg: string }> = {
  Ultrasound: { short: 'US',   color: '#1565C0', bg: '#E3F2FD' },
  CT:         { short: 'CT',   color: '#6A1B9A', bg: '#F3E5F5' },
  MRI:        { short: 'MR',   color: '#00695C', bg: '#E0F2F1' },
  Biopsy:     { short: 'BX',   color: '#E65100', bg: '#FFF3E0' },
  ERCP:       { short: 'ERCP', color: '#37474F', bg: '#ECEFF1' },
}

const STATUS_COLORS: Record<ImagingStatus, { color: string; bg: string }> = {
  normal:          { color: theme.color.success, bg: theme.color.successBg as string },
  mildly_abnormal: { color: theme.color.warning, bg: theme.color.warningBg as string },
  abnormal:        { color: theme.color.danger,  bg: theme.color.dangerBg  as string },
}

function StudyCard({ rec }: { rec: ImagingRecord }) {
  const { t }    = useTranslation()
  const [open, setOpen] = useState(false)
  const mod    = MODALITY_META[rec.modality]
  const statusColors = STATUS_COLORS[rec.status]
  const statusLabels: Record<ImagingStatus, string> = {
    normal:          t('imaging.statusNormal'),
    mildly_abnormal: t('imaging.statusMild'),
    abnormal:        t('imaging.statusAbnormal'),
  }
  const status = { ...statusColors, label: statusLabels[rec.status] }

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        border: `1px solid ${open ? theme.color.primary + '40' : theme.color.border}`,
        borderRadius: theme.r.md, overflow: 'hidden', cursor: 'pointer',
        background: theme.color.surface,
        transition: 'border-color .12s',
      }}
    >
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: theme.r.sm, flexShrink: 0,
          background: mod.bg, color: mod.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.03em',
        }}>
          {mod.short}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>{rec.type}</div>
          <div style={{ fontSize: 11, color: theme.color.text2, marginTop: 1 }}>{rec.date} · {rec.modality}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: status.bg, color: status.color,
          }}>
            {status.label}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={theme.color.muted as string} strokeWidth="2"
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {open && (
        <div style={{
          padding: '0 16px 14px', borderTop: `1px solid ${theme.color.border}`,
          marginTop: 0,
        }}>
          <div style={{ paddingTop: 12, fontSize: 12.5, color: theme.color.text2, lineHeight: 1.6 }}>
            {rec.findings}
          </div>
          {rec.recommendation && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: theme.r.sm,
              background: theme.color.primaryBg, fontSize: 12,
              color: theme.color.primary, fontWeight: 500,
            }}>
              {rec.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type FilterMode = 'all' | ImagingModality

export default function Imaging() {
  const { selected }        = usePatient()
  const { t }               = useTranslation()
  const [filter, setFilter] = useState<FilterMode>('all')

  if (!selected) return null

  const studies = generateImagingData(selected)
  const filtered = filter === 'all' ? studies : studies.filter(s => s.modality === filter)

  const counts = studies.reduce<Partial<Record<ImagingModality, number>>>((acc, s) => {
    acc[s.modality] = (acc[s.modality] ?? 0) + 1
    return acc
  }, {})

  const abnormal = studies.filter(s => s.status !== 'normal').length

  return (
    <div style={{ padding: '20px 28px', display: 'grid', gap: 16 }}>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: t('imaging.totalStudies'), value: studies.length,              color: theme.color.primary  },
          { label: t('imaging.abnormal'),     value: abnormal,                    color: theme.color.danger   },
          { label: t('imaging.normal'),       value: studies.length - abnormal,   color: theme.color.success  },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, padding: '14px 18px',
            background: theme.color.surface, border: `1px solid ${theme.color.border}`,
            borderRadius: theme.r.md, borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: theme.color.text }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['all', ...Object.keys(MODALITY_META)] as FilterMode[]).map(f => {
          const active = filter === f
          const count = f === 'all' ? studies.length : (counts[f as ImagingModality] ?? 0)
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: active ? 600 : 400,
                border: `1px solid ${active ? theme.color.primary : theme.color.border}`,
                background: active ? theme.color.primaryBg : theme.color.surface,
                color: active ? theme.color.primary : theme.color.text2,
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? t('common.all') : f} {count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* Studies */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: theme.color.muted, fontSize: 13 }}>
            {t('imaging.noStudies')}
          </div>
        ) : (
          filtered.map((rec, i) => <StudyCard key={i} rec={rec} />)
        )}
      </div>
    </div>
  )
}
