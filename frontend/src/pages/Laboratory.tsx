import { useState, useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { theme } from '../styles/theme'
import Card from '../components/ui/Card'
import { usePatient } from '../contexts/PatientContext'
import { generatePhaseSnapshots, generateLabTrendData } from '../utils/wltAdapters'

const LAB_RANGES: Record<string, { lo: number; hi: number; unit: string }> = {
  alt:        { lo: 7,   hi: 56,  unit: 'U/L'    },
  ast:        { lo: 10,  hi: 40,  unit: 'U/L'    },
  bilirubin:  { lo: 0.2, hi: 1.2, unit: 'mg/dL'  },
  creatinine: { lo: 0.6, hi: 1.2, unit: 'mg/dL'  },
  ggt:        { lo: 9,   hi: 48,  unit: 'U/L'    },
  inr:        { lo: 0.9, hi: 1.1, unit: ''        },
  albumin:    { lo: 3.4, hi: 5.4, unit: 'g/dL'   },
  wbc:        { lo: 4.5, hi: 11,  unit: '×10³/µL' },
}

const LAB_LABELS: Record<string, string> = {
  alt: 'ALT', ast: 'AST', bilirubin: 'Bilirubin', creatinine: 'Creatinine',
  ggt: 'GGT', inr: 'INR', albumin: 'Albumin', wbc: 'WBC',
}

const CHART_SERIES = [
  { key: 'alt',        color: theme.color.alt,        label: 'ALT' },
  { key: 'ast',        color: theme.color.ast,        label: 'AST' },
  { key: 'bilirubin',  color: theme.color.bilirubin,  label: 'Bilirubin' },
  { key: 'creatinine', color: theme.color.creatinine, label: 'Creatinine' },
]

type ChartMode = 'all' | 'liver' | 'renal' | 'coag'
const CHART_MODES: { id: ChartMode; labelKey: string; keys: string[] }[] = [
  { id: 'all',   labelKey: 'laboratory.filterAll',   keys: ['alt', 'ast', 'bilirubin', 'creatinine'] },
  { id: 'liver', labelKey: 'laboratory.filterLiver', keys: ['alt', 'ast', 'ggt', 'bilirubin'] },
  { id: 'renal', labelKey: 'laboratory.filterRenal', keys: ['creatinine'] },
  { id: 'coag',  labelKey: 'laboratory.filterCoag',  keys: ['inr', 'albumin'] },
]

function LabStatusChip({ status, color }: { status: string; color: string }) {
  const { t } = useTranslation()
  const label = status === 'normal' ? t('common.normal') : status === 'high' ? t('common.high') : t('common.low')
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: theme.r.xl,
      textAlign: 'center', textTransform: 'uppercase',
      color: status === 'normal' ? theme.color.success : color,
      background: status === 'normal' ? theme.color.successBg : status === 'high' ? theme.color.dangerBg : theme.color.warningBg,
    }}>
      {label}
    </span>
  )
}

function LabRow({ name, value }: { name: string; value: number }) {
  const range = LAB_RANGES[name]
  if (!range) return null
  const status = value < range.lo ? 'low' : value > range.hi ? 'high' : 'normal'
  const color  = status === 'normal' ? theme.color.success : status === 'high' ? theme.color.danger : theme.color.warning

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '120px 1fr 90px 90px 70px',
      alignItems: 'center', gap: 12, padding: '9px 0',
      borderBottom: `1px solid ${theme.color.border}`,
    }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: theme.color.text }}>{LAB_LABELS[name] ?? name}</span>
      <div style={{ height: 6, borderRadius: 3, background: theme.color.border, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 3,
          width: `${Math.min(100, Math.max(0, (value / (range.hi * 1.5)) * 100))}%`,
          background: color, transition: 'width .4s',
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, textAlign: 'right' }}>
        {value.toFixed(1)} {range.unit}
      </span>
      <span style={{ fontSize: 11, color: theme.color.muted, textAlign: 'right' }}>
        {range.lo}–{range.hi} {range.unit}
      </span>
      <LabStatusChip status={status} color={color} />
    </div>
  )
}

export default function Laboratory() {
  const { selected } = usePatient()
  const [chartMode, setChartMode] = useState<ChartMode>('all')
  const { t } = useTranslation()

  const snapshots  = useMemo(() => selected ? generatePhaseSnapshots(selected) : [],   [selected])
  const trendData  = useMemo(() => selected ? generateLabTrendData(selected) : [],      [selected])

  const activeMode = CHART_MODES.find(m => m.id === chartMode)!
  const activeSeries = CHART_SERIES.filter(s => activeMode.keys.includes(s.key))

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>{t('laboratory.title')}</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          {selected ? `${selected.name} · ${t('laboratory.subtitle')}` : t('common.selectPatient')}
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
          {/* Trend Chart */}
          <div style={{
            background: theme.color.surface,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.r.lg,
            padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>{t('laboratory.labTrendsTitle')}</div>
                <div style={{ fontSize: 12, color: theme.color.muted, marginTop: 2 }}>{t('laboratory.labTrendsSubtitle')}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {CHART_MODES.map(m => (
                  <button key={m.id} onClick={() => setChartMode(m.id)} style={{
                    padding: '4px 12px', borderRadius: theme.r.sm,
                    background: chartMode === m.id ? theme.color.primary : theme.color.bg,
                    color: chartMode === m.id ? '#fff' : theme.color.text2,
                    border: `1px solid ${chartMode === m.id ? theme.color.primary : theme.color.border}`,
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {t(m.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.color.chartGrid} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.color.muted as string }} />
                <YAxis tick={{ fontSize: 11, fill: theme.color.muted as string }} />
                <Tooltip
                  contentStyle={{
                    background: theme.color.surface as string,
                    border: `1px solid ${theme.color.border}`,
                    borderRadius: 8, fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeSeries.map(s => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 4, fill: s.color }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Per-timepoint cards */}
          {snapshots.map(snap => (
            <Card key={snap.timepoint} title={snap.label} subtitle={snap.date}>
              <div style={{ marginBottom: 6, display: 'flex', gap: 8, fontSize: 11, color: theme.color.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ width: 120 }}>{t('laboratory.test')}</span>
                <span style={{ flex: 1, paddingLeft: 4 }}>{t('laboratory.level')}</span>
                <span style={{ width: 90, textAlign: 'right' }}>{t('laboratory.value')}</span>
                <span style={{ width: 90, textAlign: 'right' }}>{t('laboratory.reference')}</span>
                <span style={{ width: 70, textAlign: 'center' }}>{t('laboratory.status')}</span>
              </div>
              {Object.entries(snap.labs)
                .filter(([k]) => k !== 'date')
                .map(([k, v]) => (
                  <LabRow key={k} name={k} value={v as number} />
                ))}
              {snap.hasRejection && (
                <div style={{
                  marginTop: 12, padding: '8px 12px',
                  background: theme.color.dangerBg, borderRadius: theme.r.sm,
                  border: `1px solid ${theme.color.danger}30`,
                  fontSize: 12, color: theme.color.danger, fontWeight: 600,
                }}>
                  ⚠ {t('laboratory.rejectionEpisode')}
                </div>
              )}
              {snap.notes.map((n, i) => (
                <div key={i} style={{ fontSize: 11.5, color: theme.color.text2, marginTop: i === 0 ? 10 : 3 }}>
                  • {n}
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
