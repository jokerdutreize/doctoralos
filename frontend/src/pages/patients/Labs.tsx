import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { usePatient } from '../../contexts/PatientContext'
import { patientsApi } from '../../api/patients'
import { generatePhaseSnapshots } from '../../utils/wltAdapters'
import { theme } from '../../styles/theme'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import type { PatientTimepoint } from '../../types'

const LAB_RANGES: Record<string, { lo: number; hi: number; unit: string }> = {
  alt:        { lo: 7,   hi: 56,  unit: 'U/L'     },
  ast:        { lo: 10,  hi: 40,  unit: 'U/L'     },
  bilirubin:  { lo: 0.2, hi: 1.2, unit: 'mg/dL'   },
  creatinine: { lo: 0.6, hi: 1.2, unit: 'mg/dL'   },
  ggt:        { lo: 9,   hi: 48,  unit: 'U/L'     },
  inr:        { lo: 0.9, hi: 1.1, unit: ''         },
  albumin:    { lo: 3.4, hi: 5.4, unit: 'g/dL'    },
  platelets:  { lo: 150, hi: 400, unit: '×10³/µL' },
}

const CHART_SERIES_KEYS = [
  { key: 'alt',       color: theme.color.alt,        tKey: 'laboratory.altName'       },
  { key: 'ast',       color: theme.color.ast,        tKey: 'laboratory.astName'       },
  { key: 'bilirubin', color: theme.color.bilirubin,  tKey: 'laboratory.bilirubinName' },
  { key: 'creatinine',color: theme.color.creatinine, tKey: 'laboratory.creatinineName'},
]

function statusOf(val: number | null, key: string): 'normal' | 'high' | 'low' {
  if (val == null) return 'normal'
  const r = LAB_RANGES[key]
  if (!r) return 'normal'
  if (val > r.hi) return 'high'
  if (val < r.lo) return 'low'
  return 'normal'
}

const TH: React.CSSProperties = {
  padding: '8px 12px', textAlign: 'right', fontSize: 10, fontWeight: 700,
  color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.04em',
  borderBottom: `1px solid ${theme.color.border}`, whiteSpace: 'nowrap',
  background: theme.color.bg,
}

const TIMEPOINT_ORDER = ['preop', 'surgery', 'week1', 'month1', 'year1']

export default function Labs() {
  const { id }           = useParams<{ id: string }>()
  const { selected }     = usePatient()
  const { t }            = useTranslation()
  const [timepoints, setTimepoints] = useState<PatientTimepoint[] | null>(null)
  const [loading, setLoading]       = useState(true)

  const TIMEPOINT_LABELS: Record<string, string> = {
    preop: t('laboratory.tpPreop'), surgery: t('laboratory.tpSurgery'),
    week1: t('laboratory.tpWeek1'), month1: t('laboratory.tpMonth1'), year1: t('laboratory.tpYear1'),
  }
  const LAB_LABELS: Record<string, string> = {
    alt: t('laboratory.altName'), ast: t('laboratory.astName'),
    bilirubin: t('laboratory.bilirubinName'), ggt: t('laboratory.ggtName'),
    creatinine: t('laboratory.creatinineName'), inr: t('laboratory.inrName'),
    albumin: t('laboratory.albuminName'), platelets: t('laboratory.plateletsName'),
  }
  const CHART_SERIES = CHART_SERIES_KEYS.map(s => ({ ...s, label: t(s.tKey) }))

  useEffect(() => {
    if (!id) return
    setLoading(true)
    patientsApi.getTimepoints(id)
      .then(setTimepoints)
      .catch(() => setTimepoints(null))
      .finally(() => setLoading(false))
  }, [id])

  // Generate fallback from WLT data if API timepoints are empty
  const snapshots = selected ? generatePhaseSnapshots(selected) : []

  // Use real timepoints if available, otherwise fall back to generated
  const rows = timepoints && timepoints.length > 0
    ? timepoints
    : null

  // Chart data — from real timepoints or generated snapshots
  const chartData = rows
    ? rows.map(tp => ({
        name:       tp.timepoint_label || TIMEPOINT_LABELS[tp.timepoint] || tp.timepoint,
        alt:        tp.alt,
        ast:        tp.ast,
        bilirubin:  tp.bilirubin,
        creatinine: tp.creatinine,
      }))
    : snapshots.map(s => ({
        name:       s.label,
        alt:        s.labs.alt,
        ast:        s.labs.ast,
        bilirubin:  s.labs.bilirubin,
        creatinine: s.labs.creatinine,
      }))

  // Summary row — latest values
  const latest = rows
    ? (rows.length > 0 ? rows[rows.length - 1] : null)
    : (snapshots.length > 0 ? snapshots[snapshots.length - 1]?.labs : null)

  if (loading) {
    return (
      <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner label={t('common.loading')} />
      </div>
    )
  }

  const isFallback = !rows

  return (
    <div style={{ padding: '20px 28px', display: 'grid', gap: 16 }}>

      {isFallback && (
        <div style={{
          padding: '10px 16px', borderRadius: theme.r.md, fontSize: 12,
          background: '#FFF8E1', color: '#E65100',
          border: '1px solid #FFE082',
        }}>
          {t('laboratory.generatedDisclaimer')}
        </div>
      )}

      {/* Latest values summary */}
      {latest && (
        <Card title={t('laboratory.latestValues')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { key: 'alt',       val: (latest as Record<string, number | null>).alt       },
              { key: 'ast',       val: (latest as Record<string, number | null>).ast       },
              { key: 'bilirubin', val: (latest as Record<string, number | null>).bilirubin },
              { key: 'ggt',       val: (latest as Record<string, number | null>).ggt       },
              { key: 'creatinine',val: (latest as Record<string, number | null>).creatinine},
              { key: 'inr',       val: (latest as Record<string, number | null>).inr       },
              { key: 'albumin',   val: (latest as Record<string, number | null>).albumin   },
              { key: 'platelets', val: (latest as Record<string, number | null>).platelets },
            ].map(({ key, val }) => {
              const label = LAB_LABELS[key] ?? key.toUpperCase()
              const status = statusOf(val as number | null, key)
              const r = LAB_RANGES[key]
              return (
                <div key={key} style={{
                  padding: '12px 14px', borderRadius: theme.r.md,
                  border: `1px solid ${theme.color.border}`,
                  background: status === 'high' ? '#FFEBEE30'
                            : status === 'low'  ? '#FFF3E030' : 'transparent',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                    {label}
                  </div>
                  <div style={{
                    fontSize: 20, fontWeight: 700,
                    color: status === 'high' ? theme.color.danger
                         : status === 'low'  ? theme.color.warning : theme.color.text,
                  }}>
                    {val != null ? val : '—'}
                  </div>
                  {r && (
                    <div style={{ fontSize: 10, color: theme.color.muted, marginTop: 2 }}>
                      {r.unit}  ·  {r.lo}–{r.hi}
                    </div>
                  )}
                  {status !== 'normal' && (
                    <div style={{
                      fontSize: 10, fontWeight: 700, marginTop: 4,
                      color: status === 'high' ? theme.color.danger : theme.color.warning,
                    }}>
                      {status === 'high' ? `▲ ${t('common.high').toUpperCase()}` : `▼ ${t('common.low').toUpperCase()}`}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Trend chart */}
      {chartData.length > 0 && (
        <Card title={t('laboratory.labTrendsTitle')}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.color.chartGrid} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.color.muted as string }} />
                <YAxis tick={{ fontSize: 11, fill: theme.color.muted as string }} width={40} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {CHART_SERIES.map(s => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Timepoints table */}
      {(rows || snapshots.length > 0) && (
        <Card title={t('laboratory.timepointData')}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, textAlign: 'left' }}>{t('laboratory.test')}</th>
                  {(rows ? rows : snapshots).map((tp, i) => (
                    <th key={i} style={TH}>
                      {rows
                        ? (TIMEPOINT_LABELS[(tp as PatientTimepoint).timepoint] ?? (tp as PatientTimepoint).timepoint)
                        : TIMEPOINT_ORDER[i] ? TIMEPOINT_LABELS[TIMEPOINT_ORDER[i]] : `T${i}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['alt', 'ast', 'bilirubin', 'ggt', 'alp', 'creatinine', 'urea', 'inr', 'albumin', 'wbc', 'hemoglobin', 'platelets'].map(key => (
                  <tr key={key} style={{ borderBottom: `1px solid ${theme.color.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = theme.color.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: theme.color.text, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {key.toUpperCase()}
                    </td>
                    {(rows ? rows : snapshots).map((tp, i) => {
                      const val = rows
                        ? ((tp as PatientTimepoint)[key as keyof PatientTimepoint] as number | null)
                        : ((tp as { labs: Record<string, number | null> }).labs[key] ?? null)
                      return <LabCell key={i} val={val} keyName={key} />
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

// LabCell needs keyName prop (renamed from key to avoid React key conflict)
function LabCell({ val, keyName }: { val: number | null; keyName: string }) {
  const status = statusOf(val, keyName)
  const r = LAB_RANGES[keyName]
  return (
    <td style={{
      padding: '8px 12px', textAlign: 'right', fontSize: 12.5, whiteSpace: 'nowrap',
      color: status === 'high' ? theme.color.danger : status === 'low' ? theme.color.warning : theme.color.text2,
      fontWeight: status !== 'normal' ? 600 : 400,
    }}>
      {val != null ? `${val}${r?.unit ? ' ' + r.unit : ''}` : '—'}
    </td>
  )
}
