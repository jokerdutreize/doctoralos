import { useMemo } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import { theme } from '../styles/theme'
import Card from '../components/ui/Card'
import { usePatient } from '../contexts/PatientContext'
import { generateMedications, generateTacrolimusData } from '../utils/wltAdapters'
import type { MedCategory } from '../types'

const CAT_META: Record<MedCategory, { labelKey: string; color: string; bg: string }> = {
  immunosuppressant: { labelKey: 'medication.catImmunosuppressant', color: '#1565C0', bg: '#E3F2FD' },
  antiviral:         { labelKey: 'medication.catAntiviral',         color: '#00695C', bg: '#E0F2F1' },
  antibiotic:        { labelKey: 'medication.catAntibiotic',        color: '#6A1B9A', bg: '#F3E5F5' },
  supportive:        { labelKey: 'medication.catSupportive',        color: '#37474F', bg: '#ECEFF1' },
}

const STATUS_COLOR: Record<string, string> = {
  subtherapeutic:    theme.color.warning,
  therapeutic:       theme.color.success,
  supratherapeutic:  theme.color.danger,
}

const STATUS_BG: Record<string, string> = {
  subtherapeutic:    theme.color.warningBg,
  therapeutic:       theme.color.successBg,
  supratherapeutic:  theme.color.dangerBg,
}

function TacrolimusTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string
}) {
  if (!active || !payload?.length) return null
  const trough = payload.find(p => p.name === 'trough')
  const status = trough ? (
    trough.value < (payload[0]?.value ?? 0) ? 'subtherapeutic' :
    'therapeutic'
  ) : 'therapeutic'
  void status
  return (
    <div style={{
      background: theme.color.surface as string,
      border: `1px solid ${theme.color.border}`,
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: theme.color.text, marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginTop: 2 }}>
          {p.name === 'trough' ? 'Trough Level' : p.name}: <strong>{p.value?.toFixed ? p.value.toFixed(1) : p.value} ng/mL</strong>
        </div>
      ))}
    </div>
  )
}

export default function Medication() {
  const { selected } = usePatient()
  const { t } = useTranslation()
  const meds   = useMemo(() => selected ? generateMedications(selected) : [],         [selected])
  const tacData = useMemo(() => selected ? generateTacrolimusData(selected) : [],     [selected])

  const grouped = useMemo(() => {
    const g: Partial<Record<MedCategory, typeof meds>> = {}
    for (const m of meds) {
      if (!g[m.category]) g[m.category] = []
      g[m.category]!.push(m)
    }
    return g
  }, [meds])

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>{t('medication.title')}</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          {selected ? `${selected.name} · ${t('medication.subtitle')}` : t('common.selectPatient')}
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
          {/* Tacrolimus trough monitoring chart */}
          <div style={{
            background: theme.color.surface,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.r.lg,
            padding: '20px',
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>{t('medication.tacroTitle')}</div>
              <div style={{ fontSize: 12, color: theme.color.muted, marginTop: 2 }}>
                {t('medication.tacroSubtitle')}
              </div>
            </div>

            {/* Status summary chips */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {tacData.map(pt => (
                <div key={pt.label} style={{
                  padding: '4px 12px', borderRadius: theme.r.xl, fontSize: 11, fontWeight: 600,
                  color: STATUS_COLOR[pt.status],
                  background: STATUS_BG[pt.status],
                  border: `1px solid ${STATUS_COLOR[pt.status]}30`,
                }}>
                  {pt.label}: {pt.trough} ng/mL
                  {pt.status !== 'therapeutic' ? ` ⚠ ${pt.status}` : ' ✓'}
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={tacData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.color.chartGrid} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.color.muted as string }} />
                <YAxis
                  tick={{ fontSize: 11, fill: theme.color.muted as string }}
                  label={{ value: 'ng/mL', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: theme.color.muted as string } }}
                />
                <Tooltip content={<TacrolimusTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />

                {/* Target range reference lines */}
                <ReferenceLine y={4}  stroke={theme.color.success} strokeDasharray="4 4" strokeWidth={1} />
                <ReferenceLine y={15} stroke={theme.color.danger}  strokeDasharray="4 4" strokeWidth={1} />

                {/* Target band as bars (low/high) */}
                <Bar dataKey="targetLow"  name="Target Low"  fill={theme.color.success} opacity={0.12} legendType="none" />
                <Bar dataKey="targetHigh" name="Target High" fill={theme.color.success} opacity={0.06} legendType="none" />

                {/* Trough level line */}
                <Line
                  type="monotone"
                  dataKey="trough"
                  name="trough"
                  stroke={theme.color.primary}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: theme.color.primary }}
                  activeDot={{ r: 7 }}
                />
              </ComposedChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 10, fontSize: 11, color: theme.color.muted, lineHeight: 1.6 }}>
              Target ranges: Week 1–2: 10–15 ng/mL · Month 1: 8–12 · Month 3–6: 6–10 · Year 1+: 4–7 ng/mL
            </div>
          </div>

          {/* Medication cards by category */}
          {(Object.entries(grouped) as [MedCategory, typeof meds][]).map(([cat, items]) => {
            const meta = CAT_META[cat]
            return (
              <Card key={cat} title={t(meta.labelKey)} subtitle={`${items.length} medication${items.length > 1 ? 's' : ''}`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {items.map(med => (
                    <div key={med.name} style={{
                      border: `1px solid ${theme.color.border}`,
                      borderRadius: theme.r.md, padding: '14px 16px',
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                    }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: theme.r.sm, flexShrink: 0,
                        background: meta.bg, color: meta.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.5 20.5l10-10a4.95 4.95 0 10-7-7l-10 10a4.95 4.95 0 107 7z"/>
                          <line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>{med.name}</div>
                        <div style={{ fontSize: 12, color: theme.color.text2, marginTop: 2 }}>
                          {med.dose} · {med.frequency}
                        </div>
                        <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 4 }}>
                          {t('medication.since')} {med.start_date}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
