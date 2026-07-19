import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { theme } from '../styles/theme'
import Card from '../components/ui/Card'
import { usePatient } from '../contexts/PatientContext'
import { generateImagingData, type ImagingRecord, type ImagingModality, type ImagingStatus } from '../utils/wltAdapters'

const MODALITY_META: Record<ImagingModality, { short: string; color: string; bg: string }> = {
  Ultrasound: { short: 'US',   color: '#1565C0', bg: '#E3F2FD' },
  CT:         { short: 'CT',   color: '#6A1B9A', bg: '#F3E5F5' },
  MRI:        { short: 'MR',   color: '#00695C', bg: '#E0F2F1' },
  Biopsy:     { short: 'BX',   color: '#E65100', bg: '#FFF3E0' },
  ERCP:       { short: 'ERCP', color: '#37474F', bg: '#ECEFF1' },
}

const STATUS_COLOR: Record<ImagingStatus, { color: string; bg: string; labelKey: string }> = {
  normal:          { color: theme.color.success,  bg: theme.color.successBg as string, labelKey: 'imaging.statusNormal'   },
  mildly_abnormal: { color: theme.color.warning,  bg: theme.color.warningBg as string, labelKey: 'imaging.statusMild'     },
  abnormal:        { color: theme.color.danger,   bg: theme.color.dangerBg  as string, labelKey: 'imaging.statusAbnormal' },
}

type FilterMode = 'all' | ImagingModality

function StudyCard({ rec }: { rec: ImagingRecord }) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const mod    = MODALITY_META[rec.modality]
  const status = STATUS_COLOR[rec.status]

  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.r.md,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = theme.shadow.md as string)}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px',
        background: open ? theme.color.bg : theme.color.surface,
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: theme.r.sm, flexShrink: 0,
          background: mod.bg, color: mod.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, letterSpacing: '0.03em',
        }}>
          {mod.short}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.color.text }}>{rec.modality}</span>
            <span style={{ fontSize: 11, color: theme.color.muted }}>·</span>
            <span style={{ fontSize: 12, color: theme.color.text2 }}>{rec.phase}</span>
          </div>
          <div style={{
            fontSize: 11.5, color: theme.color.muted,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {rec.indication}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: theme.color.text2 }}>{rec.date}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: theme.r.xl,
            color: status.color, background: status.bg,
          }}>
            {t(status.labelKey)}
          </span>
        </div>

        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={theme.color.muted as string} strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded details */}
      {open && (
        <div style={{
          borderTop: `1px solid ${theme.color.border}`,
          padding: '16px 18px',
          background: theme.color.surface,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: theme.color.muted,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5,
            }}>
              {t('imaging.findings')}
            </div>
            <div style={{ fontSize: 12.5, color: theme.color.text, lineHeight: 1.65 }}>
              {rec.findings}
            </div>
          </div>

          <div style={{
            padding: '12px 14px',
            background: status.bg,
            borderRadius: theme.r.sm,
            border: `1px solid ${status.color}33`,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: theme.color.muted,
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
            }}>
              {t('imaging.impression')}
            </div>
            <div style={{ fontSize: 13, color: status.color, lineHeight: 1.55, fontWeight: 500 }}>
              {rec.impression}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryBadge({ label, count, color }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 16px', borderRadius: theme.r.md,
      border: `1px solid ${theme.color.border}`,
      background: theme.color.surface, minWidth: 72,
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{count}</div>
      <div style={{
        fontSize: 10, fontWeight: 600, color: theme.color.muted,
        textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  )
}

export default function Imaging() {
  const { selected } = usePatient()
  const [filter, setFilter] = useState<FilterMode>('all')
  const { t } = useTranslation()

  const records = useMemo(() => selected ? generateImagingData(selected) : [], [selected])

  const filtered = useMemo(() =>
    filter === 'all' ? records : records.filter(r => r.modality === filter),
    [records, filter],
  )

  const normalCount   = records.filter(r => r.status === 'normal').length
  const abnormalCount = records.filter(r => r.status !== 'normal').length
  const biopsyCount   = records.filter(r => r.modality === 'Biopsy').length
  const imagingCount  = records.filter(r => r.modality !== 'Biopsy').length

  const filterLabels: Record<FilterMode, string> = {
    all:        t('imaging.allStudies'),
    Ultrasound: 'Ultrasound',
    Biopsy:     t('imaging.biopsy'),
    CT:         'CT',
    MRI:        'MRI',
  }

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>{t('imaging.title')}</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          {selected
            ? `${selected.name} · ${t('imaging.subtitle')}`
            : t('common.selectPatient')}
        </div>
      </div>

      {!selected ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0', color: theme.color.muted, fontSize: 14 }}>
            {t('common.selectPatient')}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Summary counts */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <SummaryBadge label={t('imaging.totalStudies')} count={records.length} color={theme.color.primary} bg={theme.color.primaryBg as string} />
            <SummaryBadge label={t('imaging.normal')}       count={normalCount}    color={theme.color.success} bg={theme.color.successBg as string} />
            <SummaryBadge label={t('imaging.abnormal')}     count={abnormalCount}  color={theme.color.warning} bg={theme.color.warningBg as string} />
            <SummaryBadge label={t('imaging.biopsy')}       count={biopsyCount}    color='#E65100'             bg='#FFF3E0' />
            <SummaryBadge label={t('imaging.imaging')}      count={imagingCount}   color='#6A1B9A'             bg='#F3E5F5' />
          </div>

          {/* Filter tabs + study list */}
          <div style={{
            background: theme.color.surface,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.r.lg,
            overflow: 'hidden',
          }}>
            {/* Filter bar */}
            <div style={{
              display: 'flex', gap: 4, padding: '12px 16px',
              borderBottom: `1px solid ${theme.color.border}`,
              background: theme.color.bg,
            }}>
              {(Object.keys(filterLabels) as FilterMode[]).map(id => {
                const count = id === 'all'
                  ? records.length
                  : records.filter(r => r.modality === id).length
                if (id !== 'all' && count === 0) return null
                return (
                  <button
                    key={id}
                    onClick={e => { e.stopPropagation(); setFilter(id) }}
                    style={{
                      padding: '5px 12px', borderRadius: theme.r.sm, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600,
                      background: filter === id ? theme.color.primary : 'transparent',
                      color: filter === id ? '#fff' : theme.color.text2,
                      border: filter === id ? 'none' : `1px solid ${theme.color.border}`,
                      transition: 'all .12s',
                    }}
                  >
                    {filterLabels[id]}{id !== 'all' ? ` (${count})` : ''}
                  </button>
                )
              })}
            </div>

            {/* Study cards */}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: theme.color.muted, fontSize: 13 }}>
                  {t('imaging.noStudies')}
                </div>
              ) : (
                filtered.map(rec => <StudyCard key={rec.id} rec={rec} />)
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            fontSize: 11, color: theme.color.muted, textAlign: 'center',
            padding: '8px 0',
          }}>
            {t('imaging.disclaimer')}
          </div>
        </div>
      )}
    </div>
  )
}

