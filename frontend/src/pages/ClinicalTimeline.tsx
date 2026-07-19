import { useMemo } from 'react'
import { theme } from '../styles/theme'
import { fmt, labStatus, LAB_RANGES } from '../utils/format'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { usePatient } from '../contexts/PatientContext'
import {
  wltToPatient, generatePhaseSnapshots, PHASE_META,
} from '../utils/wltAdapters'
import type { WLTPatient } from '../types'

// ── Metric chip ────────────────────────────────────────────────────────────────
function Metric({ label, value, unit = '', danger = false, warn = false }: {
  label: string; value: string | number | null; unit?: string; danger?: boolean; warn?: boolean
}) {
  const color = danger ? theme.color.danger : warn ? theme.color.warning : theme.color.text
  const bg    = danger ? '#FFEBEE' : warn ? '#FFF8E1' : theme.color.bg
  return (
    <div style={{ padding: '10px 14px', background: bg, borderRadius: theme.r.md, border: `1px solid ${theme.color.border}` }}>
      <div style={{ fontSize: 11, color: theme.color.muted, marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>
        {value != null ? `${value}${unit ? ' ' + unit : ''}` : '—'}
      </div>
    </div>
  )
}

// ── Lab row ────────────────────────────────────────────────────────────────────
function LabRow({ name, value, lo, hi, unit }: {
  name: string; value: number | null; lo: number; hi: number; unit: string
}) {
  if (value == null) return null
  const st    = labStatus(value, lo, hi)
  const color = st === 'normal' ? theme.color.success : st === 'elevated' ? theme.color.warning : theme.color.danger
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${theme.color.border}` }}>
      <span style={{ fontSize: 13, color: theme.color.text2 }}>{name}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color, background: color + '18', padding: '2px 8px', borderRadius: theme.r.xl }}>
        {value} {unit}
      </span>
    </div>
  )
}

// ── Phase section ──────────────────────────────────────────────────────────────
function PhaseHeader({ phase, date, active }: { phase: keyof typeof PHASE_META; date?: string; active?: boolean }) {
  const m = PHASE_META[phase]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', marginBottom: 14,
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        background: m.color, flexShrink: 0,
        boxShadow: active ? `0 0 0 3px ${m.color}30` : 'none',
      }} />
      <span style={{ fontSize: 15, fontWeight: 700, color: m.color }}>{m.label}</span>
      {date && <span style={{ fontSize: 12, color: theme.color.muted }}>{fmt.date(date)}</span>}
      {active && <Badge label="Current Phase" variant="primary" size="sm" />}
    </div>
  )
}

// ── Surgery metrics ────────────────────────────────────────────────────────────
function SurgerySection({ wlt, phase }: { wlt: WLTPatient; phase: 'surgery' }) {
  const m = PHASE_META[phase]
  return (
    <div style={{ borderLeft: `3px solid ${m.color}`, paddingLeft: 20, marginBottom: 28 }}>
      <PhaseHeader phase="surgery" date={wlt.operation_date ?? undefined} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <Metric label="Cold Ischemia Time"  value={wlt.cold_ischemia_time}       unit="min" warn={(wlt.cold_ischemia_time ?? 0) > 480} />
        <Metric label="Warm Ischemia Time"  value={wlt.warm_ischemia_time}       unit="min" />
        <Metric label="Operative Time"      value={wlt.operative_time}           unit="min" warn={(wlt.operative_time ?? 0) > 600} />
        <Metric label="Anhepatic Phase"     value={wlt.anhepatic_phase_time}     unit="min" />
        <Metric label="Intraop. Bleeding"   value={wlt.intraoperative_bleeding}  unit="mL"  warn={(wlt.intraoperative_bleeding ?? 0) > 2000} danger={(wlt.intraoperative_bleeding ?? 0) > 5000} />
        <Metric label="Donor"               value="Deceased" />
      </div>
    </div>
  )
}

// ── Pre-op section ─────────────────────────────────────────────────────────────
function PreopSection({ wlt, currentPhase }: { wlt: WLTPatient; currentPhase: string }) {
  const m = PHASE_META['preop']
  const etiologyMap: Record<number, string> = {
    1:'Alcoholic cirrhosis',2:'NASH',3:'HCV cirrhosis',4:'HCC',
    5:'PBC',6:'PSC',7:'Autoimmune hepatitis',8:'Acute liver failure',9:'Cryptogenic cirrhosis',
  }
  const etiology = wlt.diagnosis_etiological != null
    ? (etiologyMap[wlt.diagnosis_etiological] ?? `Code ${wlt.diagnosis_etiological}`)
    : '—'

  return (
    <div style={{ borderLeft: `3px solid ${m.color}`, paddingLeft: 20, marginBottom: 28 }}>
      <PhaseHeader phase="preop" date={wlt.operation_date ? fmt.date(wlt.operation_date) + ' (surgery date)' : undefined} active={currentPhase === 'preop'} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <Metric label="MELD Score"          value={wlt.meld_score}          warn={(wlt.meld_score ?? 0) >= 15} danger={(wlt.meld_score ?? 0) >= 25} />
        <Metric label="Child-Pugh Score"    value={wlt.child_pugh_score}   warn={wlt.child_pugh_category === 'B'} danger={wlt.child_pugh_category === 'C'} />
        <Metric label="Child-Pugh Class"    value={wlt.child_pugh_category || '—'} warn={wlt.child_pugh_category === 'B'} danger={wlt.child_pugh_category === 'C'} />
        <Metric label="BMI"                 value={wlt.bmi?.toFixed(1)}    unit="kg/m²" warn={(wlt.bmi ?? 0) > 30 || (wlt.bmi ?? 99) < 18.5} />
        <Metric label="Age at Transplant"   value={wlt.age}                unit="y" />
        <Metric label="Sex"                 value={wlt.sex_display || '—'} />
      </div>
      <div style={{ padding: '10px 14px', background: theme.color.bg, borderRadius: theme.r.md, border: `1px solid ${theme.color.border}`, fontSize: 13, color: theme.color.text2 }}>
        <span style={{ fontWeight: 600, color: theme.color.text }}>Primary diagnosis: </span>{etiology}
        {wlt.child_pugh_category ? ` — Child-Pugh class ${wlt.child_pugh_category}` : ''}
      </div>
    </div>
  )
}

// ── Post-op phase section (week1 / month1 / year1) ────────────────────────────
function PostopPhaseSection({ snapshot, currentPhase, wlt }: {
  snapshot: ReturnType<typeof generatePhaseSnapshots>[number];
  currentPhase: string;
  wlt: WLTPatient;
}) {
  const m = PHASE_META[snapshot.timepoint]
  const labs = snapshot.labs
  const dptLabel = snapshot.timepoint === 'week1' ? '~7 days post-op'
    : snapshot.timepoint === 'month1' ? '~30 days post-op' : '~1 year post-op'

  return (
    <div style={{ borderLeft: `3px solid ${m.color}`, paddingLeft: 20, marginBottom: 28 }}>
      <PhaseHeader phase={snapshot.timepoint} date={snapshot.date} active={currentPhase === snapshot.timepoint} />

      {/* Clinical notes */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: theme.color.muted, fontStyle: 'italic' }}>{dptLabel}</span>
        {snapshot.hasRejection && (
          <Badge label="Rejection Episode" variant="high" size="sm" />
        )}
        {snapshot.timepoint === 'week1' && wlt.intubation_time != null && (
          <span style={{ fontSize: 11, color: theme.color.text2 }}>Intubation: {wlt.intubation_time.toFixed(0)} h</span>
        )}
        {snapshot.timepoint === 'week1' && wlt.icu_days != null && (
          <span style={{ fontSize: 11, color: theme.color.text2 }}>ICU: {wlt.icu_days.toFixed(0)} days total</span>
        )}
        {snapshot.timepoint === 'month1' && wlt.postop_hospital_days != null && (
          <span style={{ fontSize: 11, color: theme.color.text2 }}>Hospital stay: {wlt.postop_hospital_days.toFixed(0)} days</span>
        )}
        {snapshot.timepoint === 'year1' && (
          <Badge
            label={wlt.status || '—'}
            variant={wlt.status === 'Alive' ? 'low' : 'high'}
            size="sm"
            dot
          />
        )}
      </div>

      {/* Lab grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <div style={{ paddingRight: 16 }}>
          <LabRow name="ALT"        value={labs.alt}        lo={LAB_RANGES.alt.lo}        hi={LAB_RANGES.alt.hi}        unit={LAB_RANGES.alt.unit} />
          <LabRow name="AST"        value={labs.ast}        lo={LAB_RANGES.ast.lo}        hi={LAB_RANGES.ast.hi}        unit={LAB_RANGES.ast.unit} />
          <LabRow name="Bilirubin"  value={labs.bilirubin}  lo={LAB_RANGES.bilirubin.lo}  hi={LAB_RANGES.bilirubin.hi}  unit={LAB_RANGES.bilirubin.unit} />
          <LabRow name="GGT"        value={labs.ggt}        lo={LAB_RANGES.ggt.lo}        hi={LAB_RANGES.ggt.hi}        unit={LAB_RANGES.ggt.unit} />
        </div>
        <div>
          <LabRow name="Creatinine" value={labs.creatinine} lo={LAB_RANGES.creatinine.lo} hi={LAB_RANGES.creatinine.hi} unit={LAB_RANGES.creatinine.unit} />
          <LabRow name="INR"        value={labs.inr}        lo={LAB_RANGES.inr.lo}        hi={LAB_RANGES.inr.hi}        unit={LAB_RANGES.inr.unit} />
          <LabRow name="Albumin"    value={labs.albumin}    lo={LAB_RANGES.albumin.lo}    hi={LAB_RANGES.albumin.hi}    unit={LAB_RANGES.albumin.unit} />
          <LabRow name="WBC"        value={labs.wbc}        lo={LAB_RANGES.wbc.lo}        hi={LAB_RANGES.wbc.hi}        unit={LAB_RANGES.wbc.unit} />
        </div>
      </div>

      {/* Notes */}
      {snapshot.notes.length > 0 && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: m.bg, borderRadius: theme.r.sm, border: `1px solid ${m.color}20` }}>
          {snapshot.notes.map((n, i) => (
            <div key={i} style={{ fontSize: 12, color: theme.color.text2, marginBottom: i < snapshot.notes.length - 1 ? 3 : 0 }}>
              <span style={{ color: m.color, marginRight: 6 }}>•</span>{n}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Mock fallback ──────────────────────────────────────────────────────────────
function MockTimeline() {
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>Clinical Timeline</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          Select a patient from the registry to view their clinical timeline.
        </div>
      </div>
      <div style={{
        padding: 40, background: theme.color.surface, borderRadius: theme.r.lg,
        border: `1px solid ${theme.color.border}`, textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.color.text, marginBottom: 6 }}>No patient selected</div>
        <div style={{ fontSize: 13, color: theme.color.muted }}>
          Use the search bar or Patient Registry to select a patient.
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ClinicalTimeline() {
  const { selected } = usePatient()

  const patient   = useMemo(() => selected ? wltToPatient(selected)          : null, [selected])
  const snapshots = useMemo(() => selected ? generatePhaseSnapshots(selected) : null, [selected])
  const phase     = useMemo(() => {
    if (!selected || !selected.operation_date) return 'preop'
    const dpt = Math.floor((Date.now() - new Date(selected.operation_date).getTime()) / 86_400_000)
    if (dpt <= 0)  return 'surgery'
    if (dpt <= 10) return 'week1'
    if (dpt <= 45) return 'month1'
    return 'year1'
  }, [selected])

  if (!selected || !patient || !snapshots) return <MockTimeline />

  const phaseLabels = ['preop', 'surgery', 'week1', 'month1', 'year1'] as const

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>Clinical Timeline</h1>
          <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
            {patient.name} · {patient.id} · Transplanted {fmt.date(patient.transplant_date)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: theme.color.muted }}>Current phase:</span>
          <span style={{
            fontSize: 12, fontWeight: 700,
            padding: '4px 10px', borderRadius: theme.r.xl,
            background: PHASE_META[phase as keyof typeof PHASE_META]?.bg,
            color: PHASE_META[phase as keyof typeof PHASE_META]?.color,
          }}>
            {PHASE_META[phase as keyof typeof PHASE_META]?.label}
          </span>
        </div>
      </div>

      {/* Phase stepper */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: theme.color.surface, border: `1px solid ${theme.color.border}`,
        borderRadius: theme.r.lg, padding: '12px 20px',
        marginBottom: 24, gap: 0, overflowX: 'auto',
      }}>
        {phaseLabels.map((p, i) => {
          const m = PHASE_META[p]
          const isActive = p === phase
          const isPast   = phaseLabels.indexOf(p) < phaseLabels.indexOf(phase as typeof phaseLabels[number])
          return (
            <div key={p} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '4px 12px',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isActive ? m.color : isPast ? m.color + '60' : theme.color.border,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: isActive || isPast ? '#fff' : theme.color.muted,
                  border: isActive ? `2px solid ${m.color}` : 'none',
                  boxShadow: isActive ? `0 0 0 3px ${m.color}25` : 'none',
                }}>
                  {i + 1}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: isActive ? 700 : 400,
                  color: isActive ? m.color : isPast ? theme.color.text2 : theme.color.muted,
                  whiteSpace: 'nowrap',
                }}>
                  {m.short}
                </span>
              </div>
              {i < phaseLabels.length - 1 && (
                <div style={{ width: 40, height: 2, background: isPast ? theme.color.primary + '40' : theme.color.border, flexShrink: 0 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Timeline sections */}
      <Card title="Patient Journey" subtitle="Data organized by clinical phase">
        <div style={{ paddingTop: 8 }}>

          {/* 1 — Pre-op */}
          <PreopSection wlt={selected} currentPhase={phase} />

          {/* 2 — Surgery */}
          <SurgerySection wlt={selected} phase="surgery" />

          {/* 3-5 — Post-op phases */}
          {snapshots.map(snap => (
            <PostopPhaseSection
              key={snap.timepoint}
              snapshot={snap}
              currentPhase={phase}
              wlt={selected}
            />
          ))}

        </div>
      </Card>
    </div>
  )
}
