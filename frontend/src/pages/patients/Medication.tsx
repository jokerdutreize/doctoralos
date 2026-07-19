import { usePatient } from '../../contexts/PatientContext'
import { generateMedications, generateTacrolimusData } from '../../utils/wltAdapters'
import { fmt } from '../../utils/format'
import { theme } from '../../styles/theme'
import { useTranslation } from 'react-i18next'
import Card from '../../components/ui/Card'
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts'
import type { MedCategory } from '../../types'

const CAT_COLORS: Record<MedCategory, { color: string; bg: string }> = {
  immunosuppressant: { color: '#1565C0', bg: '#E3F2FD' },
  antiviral:         { color: '#00695C', bg: '#E0F2F1' },
  antibiotic:        { color: '#6A1B9A', bg: '#F3E5F5' },
  supportive:        { color: '#37474F', bg: '#ECEFF1' },
}

export default function Medication() {
  const { selected } = usePatient()
  const { t } = useTranslation()
  if (!selected) return null

  const CAT_META: Record<MedCategory, { label: string; color: string; bg: string }> = {
    immunosuppressant: { label: t('medication.catImmunosuppressant'), ...CAT_COLORS.immunosuppressant },
    antiviral:         { label: t('medication.catAntiviral'),         ...CAT_COLORS.antiviral         },
    antibiotic:        { label: t('medication.catAntibiotic'),        ...CAT_COLORS.antibiotic        },
    supportive:        { label: t('medication.catSupportive'),        ...CAT_COLORS.supportive        },
  }

  const meds    = generateMedications(selected)
  const tacrData = generateTacrolimusData(selected)

  const byCategory = meds.reduce<Record<MedCategory, typeof meds>>((acc, m) => {
    ;(acc[m.category] = acc[m.category] ?? []).push(m)
    return acc
  }, {} as Record<MedCategory, typeof meds>)

  return (
    <div style={{ padding: '20px 28px', display: 'grid', gap: 16 }}>

      {/* Tacrolimus trough chart */}
      {tacrData.length > 0 && (
        <Card title={t('medication.tacroTitle')} subtitle={t('medication.tacroRange')}>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={tacrData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.color.chartGrid} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.color.muted as string }} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11, fill: theme.color.muted as string }} width={35} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={8}  stroke={theme.color.success}  strokeDasharray="4 2" label={{ value: t('medication.targetLo'), fontSize: 10, fill: theme.color.success }} />
                <ReferenceLine y={12} stroke={theme.color.warning}  strokeDasharray="4 2" label={{ value: t('medication.targetHi'), fontSize: 10, fill: theme.color.warning }} />
                <Bar  dataKey="targetLo" name={t('medication.targetLo')} fill={theme.color.success + '20'} stackId="range" />
                <Line dataKey="trough"   name={t('medication.trough')}   stroke={theme.color.primary}  strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Medication cards grouped by category */}
      {(Object.keys(CAT_META) as MedCategory[]).map(cat => {
        const catMeds = byCategory[cat]
        if (!catMeds?.length) return null
        const meta = CAT_META[cat]
        return (
          <div key={cat}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: meta.color,
              textTransform: 'uppercase', letterSpacing: '0.07em',
              marginBottom: 10, padding: '0 2px',
            }}>
              {meta.label} — {catMeds.length} medication{catMeds.length > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {catMeds.map(med => (
                <div key={med.name} style={{
                  padding: '14px 16px', borderRadius: theme.r.md,
                  border: `1px solid ${theme.color.border}`,
                  background: theme.color.surface,
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: theme.r.sm, flexShrink: 0,
                    background: meta.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: meta.color,
                  }}>
                    ⬡
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>{med.name}</div>
                    <div style={{ fontSize: 12, color: theme.color.text2, marginTop: 2 }}>
                      {med.dose} · {med.frequency}
                    </div>
                    <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 4 }}>
                      {t('medication.since')} {fmt.dateShort(med.start_date)}
                    </div>
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      fontSize: 10, fontWeight: 600, padding: '1px 7px',
                      borderRadius: 999, color: meta.color, background: meta.bg,
                    }}>
                      {t('medication.active')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
