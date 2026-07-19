import { usePatient } from '../../contexts/PatientContext'
import { fmt } from '../../utils/format'
import { PHASE_META } from '../../utils/wltAdapters'
import { theme } from '../../styles/theme'
import { useTranslation } from 'react-i18next'
import Card from '../../components/ui/Card'
import TransplantBadge from '../../components/ui/TransplantBadge'
import { getProgram, GRAFT_LABELS, DONOR_LABELS } from '../../config/transplantPrograms'
import type { WLTTimepoint } from '../../types'

const LABEL: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: theme.color.muted,
  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
}
const VALUE: React.CSSProperties = { fontSize: 14, color: theme.color.text, fontWeight: 500 }

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={LABEL}>{label}</div>
      <div style={VALUE}>{value}</div>
    </div>
  )
}

function SectionHeader({ phase }: { phase: WLTTimepoint }) {
  const { t } = useTranslation()
  const m = PHASE_META[phase]
  const phaseLabel: Record<string, string> = {
    preop: t('profile.preop'), surgery: t('profile.surgery'), week1: t('profile.postop'),
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', marginBottom: 14, borderBottom: `2px solid ${m.color}30` }}>
      <div style={{ width: 9, height: 9, borderRadius: '50%', background: m.color }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{phaseLabel[phase] ?? m.label}</span>
    </div>
  )
}

function ProgramSectionHeader({ program }: { program: string }) {
  const { t } = useTranslation()
  const cfg = getProgram(program)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', marginBottom: 14, borderBottom: `2px solid ${cfg.color}30` }}>
      <TransplantBadge program={program} size="sm" />
      <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {cfg.label} — {t('profile.clinicalDetails')}
      </span>
    </div>
  )
}

// ── Regeneration progress bar ──────────────────────────────────────────────────
function RegenBar({ pct, daysPostTx }: { pct: number | null; daysPostTx: number | null }) {
  const { t } = useTranslation()
  const displayPct = pct ?? (daysPostTx ? Math.min(98, Math.round(daysPostTx / 365 * 80)) : null)
  if (displayPct == null) return null
  const cfg = getProgram('SPLIT_LIVER')
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={LABEL}>{t('profile.estRegen')}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{displayPct}%</span>
      </div>
      <div style={{ height: 8, background: cfg.light, borderRadius: 999, overflow: 'hidden', border: `1px solid ${cfg.border}` }}>
        <div style={{ height: '100%', width: `${displayPct}%`, background: cfg.color, borderRadius: 999, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: 10, color: theme.color.muted, marginTop: 4 }}>
        {daysPostTx != null ? t('profile.dayPostTx', { n: daysPostTx }) : t('profile.regenEstimate')}
      </div>
    </div>
  )
}

// ── GRWR indicator ─────────────────────────────────────────────────────────────
function GRWRIndicator({ grwr }: { grwr: number | null }) {
  const { t } = useTranslation()
  if (grwr == null) return null
  const status  = grwr < 0.8 ? 'danger' : grwr < 1.0 ? 'warning' : 'safe'
  const colors  = { danger: '#B71C1C', warning: '#E65100', safe: '#065F46' }
  const bgs     = { danger: '#FEF2F2', warning: '#FFF3E0', safe: '#ECFDF5' }
  const labels  = { danger: t('profile.grwrDanger'), warning: t('profile.grwrWarning'), safe: t('profile.grwrSafe') }
  return (
    <div>
      <div style={LABEL}>{t('profile.grwr')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: colors[status] }}>{grwr.toFixed(2)}%</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: colors[status], background: bgs[status] }}>
          {labels[status]}
        </span>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Overview() {
  const { selected } = usePatient()
  const { t } = useTranslation()
  if (!selected) return null
  const wlt = selected

  const program    = wlt.transplant_program ?? 'WHOLE_LIVER'
  const programCfg = getProgram(program)
  const isSplit    = programCfg.features.splitGraftView
  const isWhole    = !isSplit

  const etiology   = wlt.diagnosis_etiological != null
    ? t(`profile.etiology${wlt.diagnosis_etiological}`) : null
  const pathDx     = wlt.diagnosis_pathological != null
    ? (wlt.diagnosis_pathological === 1 ? t('profile.cirrhosis') : t('profile.pathCode', { code: wlt.diagnosis_pathological })) : null
  const coexisting = wlt.diagnosis_coexisting != null
    ? (wlt.diagnosis_coexisting === 0 ? t('profile.tumorNone') : t('profile.tumorPresent', { code: wlt.diagnosis_coexisting })) : null

  const txDate     = wlt.operation_date
  const daysPostTx = txDate
    ? Math.max(0, Math.floor((Date.now() - new Date(txDate).getTime()) / 86_400_000))
    : null

  return (
    <div style={{ padding: '20px 28px', display: 'grid', gap: 16 }}>

      {/* ── Program identity banner ────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 18px', borderRadius: theme.r.lg,
        background: programCfg.light, border: `1px solid ${programCfg.border}`,
      }}>
        <TransplantBadge program={program} size="md" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: programCfg.text }}>{wlt.name}</div>
          <div style={{ fontSize: 12, color: theme.color.text2, marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {wlt.graft_type  && wlt.graft_type  !== 'UNKNOWN'  && <span>{t('profile.graftType')}: <strong>{GRAFT_LABELS[wlt.graft_type]  ?? wlt.graft_type}</strong></span>}
            {wlt.donor_type  && wlt.donor_type  !== 'UNKNOWN'  && <span>{t('profile.donor')}: <strong>{DONOR_LABELS[wlt.donor_type]  ?? wlt.donor_type}</strong></span>}
            {wlt.meld_score  != null && <span>MELD: <strong>{wlt.meld_score.toFixed(1)}</strong></span>}
            {wlt.child_pugh_category && <span>CP-{wlt.child_pugh_category}</span>}
            {daysPostTx != null && <span>{t('profile.dayPostTx', { n: daysPostTx })}</span>}
          </div>
        </div>
        {wlt.is_critical && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: '#7F1D1D', background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
            {t('common.critical').toUpperCase()}
          </span>
        )}
      </div>

      {/* ── Top grid: clinical cards left, 3D twin right ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Demographics */}
            <Card title={t('profile.demographics')}>
              <InfoRow label={t('profile.sex')} value={wlt.sex_display || (wlt.sex === 1 ? t('profile.male') : wlt.sex === 2 ? t('profile.female') : null)} />
              <InfoRow label={t('profile.age')} value={wlt.age != null ? `${wlt.age} years` : null} />
              <InfoRow label={t('profile.bmi')} value={wlt.bmi != null ? `${wlt.bmi.toFixed(1)} kg/m²` : null} />
            </Card>

            {/* Transplant summary */}
            <Card title={t('profile.transplant')}>
              <InfoRow label={t('profile.operationDate')}      value={txDate ? fmt.date(txDate) : null} />
              <InfoRow label={t('profile.daysPostTransplant')} value={daysPostTx != null ? `${daysPostTx} days` : null} />
              <InfoRow label={t('profile.graftType')}          value={(GRAFT_LABELS[wlt.graft_type] ?? wlt.graft_type) || null} />
              <InfoRow label={t('profile.donor')}              value={(DONOR_LABELS[wlt.donor_type] ?? wlt.donor_type) || null} />
              <InfoRow label={t('profile.hospitalizationNumber')} value={wlt.hospitalization_number || null} />
              <InfoRow label={t('profile.status')}             value={wlt.status || null} />
            </Card>
          </div>

          {/* Pre-operative */}
          <Card>
            <SectionHeader phase="preop" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              <InfoRow label={t('profile.meldScore')}       value={wlt.meld_score != null ? wlt.meld_score.toFixed(1) : null} />
              <InfoRow label={t('profile.childPughScore')}  value={wlt.child_pugh_score} />
              <InfoRow label={t('profile.childPughClass')}  value={wlt.child_pugh_category || null} />
              <InfoRow label={t('profile.primaryEtiology')} value={etiology} />
              <InfoRow label={t('profile.pathologicalDx')}  value={pathDx} />
              <InfoRow label={t('profile.coexistingTumors')} value={coexisting} />
            </div>
          </Card>
        </div>

        {/* 3D Digital Twin */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: programCfg.text, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
            {t('profile.digitalTwin')} — {programCfg.shortLabel}
          </div>
          <div style={{
            height: 330, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: theme.r.md, border: `1px solid ${theme.color.border}`,
            color: theme.color.muted, fontSize: 13, fontWeight: 600, textAlign: 'center', padding: '0 20px',
          }}>
            Coming in the next update
          </div>
        </div>
      </div>

      {/* ── Intraoperative ────────────────────────────────────────────────────── */}
      {txDate && (
        <Card>
          <SectionHeader phase="surgery" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <InfoRow label={t('profile.surgeryDate')}     value={fmt.date(txDate)} />
            <InfoRow label={t('profile.operativeTime')}   value={wlt.operative_time != null ? `${wlt.operative_time} min` : null} />
            <InfoRow label={t('profile.anhepaticPhase')}  value={wlt.anhepatic_phase_time != null ? `${wlt.anhepatic_phase_time} min` : null} />
            <InfoRow label={t('profile.coldIschemia')}    value={wlt.cold_ischemia_time != null ? `${wlt.cold_ischemia_time} min` : null} />
            <InfoRow label={t('profile.warmIschemia')}    value={wlt.warm_ischemia_time != null ? `${wlt.warm_ischemia_time} min` : null} />
            <InfoRow label={t('profile.intraopBleeding')} value={wlt.intraoperative_bleeding != null ? `${wlt.intraoperative_bleeding} mL` : null} />
          </div>
        </Card>
      )}

      {/* ── Post-operative ────────────────────────────────────────────────────── */}
      {(wlt.intubation_time != null || wlt.icu_days != null || wlt.postop_hospital_days != null) && (
        <Card>
          <SectionHeader phase="week1" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <InfoRow label={t('profile.intubationTime')} value={wlt.intubation_time != null ? `${Math.round(wlt.intubation_time)} h` : null} />
            <InfoRow label={t('profile.icuDays')}        value={wlt.icu_days != null ? `${Math.round(wlt.icu_days)} days` : null} />
            <InfoRow label={t('profile.hospitalStay')}   value={wlt.postop_hospital_days != null ? `${Math.round(wlt.postop_hospital_days)} days` : null} />
          </div>
        </Card>
      )}

      {/* ── Split Liver–specific section ──────────────────────────────────────── */}
      {isSplit && (
        <Card>
          <ProgramSectionHeader program={program} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>

            {/* Left: regeneration */}
            <div>
              <RegenBar pct={wlt.estimated_regeneration} daysPostTx={daysPostTx} />
              <div style={{ marginTop: 16 }}>
                <GRWRIndicator grwr={wlt.grwr} />
              </div>
              <div style={{ marginTop: 16 }}>
                <InfoRow label={t('profile.graftWeight')}     value={wlt.graft_weight != null ? `${wlt.graft_weight} g` : null} />
                <InfoRow label={t('profile.recipientWeight')} value={wlt.recipient_weight != null ? `${wlt.recipient_weight} kg` : null} />
                <InfoRow label={t('profile.graftVolume')}     value={wlt.graft_volume != null ? `${wlt.graft_volume} mL` : null} />
              </div>
            </div>

            {/* Right: SLT text fields */}
            <div>
              <InfoRow label={t('profile.rolf')}              value={wlt.rolf_days != null ? `${wlt.rolf_days} days` : null} />
              <InfoRow label={t('profile.cslt')}              value={wlt.split_composition || null} />
              <InfoRow label={t('profile.eslt')}              value={wlt.split_etiology || null} />
              <InfoRow label={t('profile.preopComplications')} value={wlt.preop_complications || null} />
            </div>
          </div>
        </Card>
      )}

      {/* ── Whole liver–specific graft metrics (if available) ─────────────────── */}
      {isWhole && (wlt.graft_weight != null || wlt.cold_ischemia_time != null || wlt.transplant_center) && (
        <Card>
          <ProgramSectionHeader program={program} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <InfoRow label={t('profile.graftWeight')}      value={wlt.graft_weight != null ? `${wlt.graft_weight} g` : null} />
            <InfoRow label={t('profile.recipientWeight')}  value={wlt.recipient_weight != null ? `${wlt.recipient_weight} kg` : null} />
            <InfoRow label={t('profile.donorType')}        value={(DONOR_LABELS[wlt.donor_type] ?? wlt.donor_type) || null} />
            <InfoRow label={t('profile.transplantCenter')} value={wlt.transplant_center || null} />
            <InfoRow label={t('profile.surgeon')}          value={wlt.surgeon || null} />
            <InfoRow label={t('profile.surgicalTeam')}     value={wlt.surgical_team || null} />
          </div>
        </Card>
      )}

    </div>
  )
}
