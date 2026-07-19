import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api/mock'
import { fmt } from '../utils/format'
import { usePatient } from '../contexts/PatientContext'
import { wltToPatient, generateMedications, PHASE_META } from '../utils/wltAdapters'
import { theme } from '../styles/theme'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import type { MedCategory, WLTPatient } from '../types'

const PAGE  = { padding: '24px 28px' }
const LABEL = { fontSize: 11, fontWeight: 600 as const, color: theme.color.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 3 }
const VALUE = { fontSize: 14, color: theme.color.text, fontWeight: 500 as const }

const MED_COLORS: Record<MedCategory, { color: string; bg: string }> = {
  immunosuppressant: { color: '#1565C0', bg: '#E3F2FD' },
  antiviral:         { color: '#00695C', bg: '#E0F2F1' },
  antibiotic:        { color: '#6A1B9A', bg: '#F3E5F5' },
  supportive:        { color: '#37474F', bg: '#ECEFF1' },
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={LABEL}>{label}</div>
      <div style={VALUE}>{value}</div>
    </div>
  )
}

function SectionHeader({ phase }: { phase: keyof typeof PHASE_META }) {
  const m = PHASE_META[phase]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 0', marginBottom: 12,
      borderBottom: `2px solid ${m.color}30`,
    }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.color }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</span>
    </div>
  )
}

function WLTPhaseProfile({ wlt, txDate }: { wlt: WLTPatient; txDate: string }) {
  const { t } = useTranslation()
  const etiologyMap: Record<number, string> = {
    1:'Alcoholic cirrhosis',2:'NASH',3:'HCV cirrhosis',4:'HCC',
    5:'PBC',6:'PSC',7:'Autoimmune hepatitis',8:'Acute liver failure',9:'Cryptogenic cirrhosis',
  }
  const pathologicalMap: Record<number, string> = { 1: 'Cirrhosis' }
  const etiology = wlt.diagnosis_etiological != null
    ? (etiologyMap[wlt.diagnosis_etiological] ?? `Code ${wlt.diagnosis_etiological}`)
    : 'Unknown'
  const pathDx = wlt.diagnosis_pathological != null
    ? (pathologicalMap[wlt.diagnosis_pathological] ?? t('profile.pathCode', { code: wlt.diagnosis_pathological }))
    : '—'
  const coexisting = wlt.diagnosis_coexisting != null
    ? (wlt.diagnosis_coexisting === 0
        ? t('profile.tumorNone')
        : t('profile.tumorPresent', { code: wlt.diagnosis_coexisting }))
    : '—'

  return (
    <>
      {/* Pre-operative */}
      <Card style={{ marginBottom: 18 }}>
        <SectionHeader phase="preop" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <InfoRow label={t('profile.meldScore')}            value={wlt.meld_score != null ? wlt.meld_score.toFixed(1) : '—'} />
          <InfoRow label={t('profile.childPughScore')}       value={wlt.child_pugh_score ?? '—'} />
          <InfoRow label={t('profile.childPughClass')}       value={wlt.child_pugh_category || '—'} />
          <InfoRow label={t('profile.bmi')}                  value={wlt.bmi != null ? `${wlt.bmi.toFixed(1)} kg/m²` : '—'} />
          <InfoRow label={t('profile.primaryEtiology')}      value={etiology} />
          <InfoRow label={t('profile.status')}               value={wlt.status || '—'} />
          <InfoRow label={t('profile.pathologicalDx')}       value={pathDx} />
          <InfoRow label={t('profile.coexistingTumors')}     value={coexisting} />
          {wlt.hospitalization_number && (
            <InfoRow label={t('profile.hospitalizationNumber')} value={wlt.hospitalization_number} />
          )}
        </div>
      </Card>

      {/* Intraoperative */}
      <Card style={{ marginBottom: 18 }}>
        <SectionHeader phase="surgery" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <InfoRow label={t('profile.surgeryDate')}     value={fmt.date(txDate)} />
          <InfoRow label={t('profile.operativeTime')}   value={wlt.operative_time != null ? `${wlt.operative_time} min` : '—'} />
          <InfoRow label={t('profile.anhepaticPhase')}  value={wlt.anhepatic_phase_time != null ? `${wlt.anhepatic_phase_time} min` : '—'} />
          <InfoRow label={t('profile.coldIschemia')}    value={wlt.cold_ischemia_time != null ? `${wlt.cold_ischemia_time} min` : '—'} />
          <InfoRow label={t('profile.warmIschemia')}    value={wlt.warm_ischemia_time != null ? `${wlt.warm_ischemia_time} min` : '—'} />
          <InfoRow label={t('profile.intraopBleeding')} value={wlt.intraoperative_bleeding != null ? `${wlt.intraoperative_bleeding} mL` : '—'} />
        </div>
      </Card>

      {/* Post-operative recovery */}
      <Card style={{ marginBottom: 18 }}>
        <SectionHeader phase="week1" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <InfoRow label={t('profile.intubationTime')} value={wlt.intubation_time != null ? `${wlt.intubation_time.toFixed(0)} h` : '—'} />
          <InfoRow label={t('profile.icuDays')}        value={wlt.icu_days != null ? `${wlt.icu_days.toFixed(0)} days` : '—'} />
          <InfoRow label={t('profile.hospitalStay')}   value={wlt.postop_hospital_days != null ? `${wlt.postop_hospital_days.toFixed(0)} days` : '—'} />
        </div>
      </Card>
    </>
  )
}

export default function PatientProfile() {
  const { t } = useTranslation()
  const { selected } = usePatient()

  const wltPatient = useMemo(() => selected ? wltToPatient(selected)       : null, [selected])
  const wltMeds    = useMemo(() => selected ? generateMedications(selected) : null, [selected])

  const { state: patState } = useAsync(useCallback(() => api.getPatient(),      []))
  const { state: medState } = useAsync(useCallback(() => api.getMedications(),  []))

  const patientData = wltPatient ?? (patState.status === 'success' ? patState.data : null)
  const medsData    = wltMeds    ?? (medState.status === 'success' ? medState.data : null)

  if (!patientData && patState.status === 'loading') return <LoadingSpinner fullPage label="Loading patient profile…" />
  if (!patientData) return null
  const p = patientData

  const bmi = (p.weight_kg / (p.height_cm / 100) ** 2).toFixed(1)
  const daysPostTx = Math.floor((Date.now() - new Date(p.transplant_date).getTime()) / 86_400_000)

  return (
    <div style={PAGE}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>{t('profile.title')}</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          {t('profile.subtitle')}
        </div>
      </div>

      {/* Patient header card */}
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${theme.color.primary}, ${theme.color.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff',
          }}>
            {p.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: theme.color.text }}>{p.name}</div>
            <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 2 }}>
              {p.mrn} · {p.age} y/o {p.gender === 'M' ? t('profile.male') : t('profile.female')} · Blood type {p.blood_type}
            </div>
            <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 1 }}>
              {p.diagnosis}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 13, color: theme.color.text2, marginBottom: 4 }}>{t('profile.managingPhysician')}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.color.text }}>{p.physician}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Badge label={`${p.donor_type} ${t('profile.donor')}`} variant="info" size="sm" />
              <Badge label={`${daysPostTx}d ${t('profile.postTx')}`} variant="primary" size="sm" />
            </div>
          </div>
        </div>
      </Card>

      {/* Demographics row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card title={t('profile.demographics')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            <InfoRow label={t('profile.dateOfBirth')} value={`~${new Date().getFullYear() - p.age}`} />
            <InfoRow label={t('profile.gender')}      value={p.gender === 'M' ? t('profile.male') : t('profile.female')} />
            <InfoRow label={t('profile.height')}      value={`${p.height_cm} cm`} />
            <InfoRow label={t('profile.weight')}      value={`${p.weight_kg} kg`} />
            <InfoRow label={t('profile.bmi')}         value={`${bmi} kg/m²`} />
            <InfoRow label={t('profile.bloodType')}   value={p.blood_type} />
          </div>
        </Card>
        <Card title={t('profile.transplant')}>
          <InfoRow label={t('profile.transplantDate')}      value={fmt.date(p.transplant_date)} />
          <InfoRow label={t('profile.daysPostTransplant')}  value={`${daysPostTx} days (${fmt.days(daysPostTx)})`} />
          <InfoRow label={t('profile.donorType')}           value={p.donor_type} />
          <InfoRow label={t('profile.managingCenter')}      value="University Transplant Center" />
        </Card>
      </div>

      {/* Phase sections — only for WLT patients */}
      {selected && <WLTPhaseProfile wlt={selected} txDate={p.transplant_date} />}

      {/* Medications */}
      <Card title={t('profile.currentMeds')} subtitle={`${medsData?.length ?? '…'} active prescriptions`}>
        {!medsData && medState.status === 'loading' ? (
          <LoadingSpinner size={28} label="Loading medications…" />
        ) : medsData ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 4 }}>
            {medsData.map(med => {
              const c = MED_COLORS[med.category]
              return (
                <div key={med.name} style={{
                  border: `1px solid ${theme.color.border}`,
                  borderRadius: theme.r.md,
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: theme.r.sm, flexShrink: 0,
                    background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>{med.name}</div>
                    <div style={{ fontSize: 12, color: theme.color.text2, marginTop: 2 }}>
                      {med.dose} · {med.frequency}
                    </div>
                    <div style={{ marginTop: 5, display: 'flex', gap: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '2px 7px',
                        borderRadius: '9999px', color: c.color, background: c.bg,
                        textTransform: 'capitalize',
                      }}>
                        {med.category}
                      </span>
                      <span style={{ fontSize: 10, color: theme.color.muted }}>
                        Since {fmt.dateShort(med.start_date)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </Card>
    </div>
  )
}
