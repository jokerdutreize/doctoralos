import type {
  Patient, LabResult, RiskScore, Medication, ClinicalEvent,
  DashboardSummary, RiskLevel, OutcomePoint, Intervention,
  WLTTimepoint, ClinicalSummary, ClinicalFinding, ClinicalRecommendation, RiskFlag,
  FindingStatus, SummaryStatus,
} from '../types'
import type { WLTPatient } from '../types'

// ── Phase helpers ──────────────────────────────────────────────────────────────

export function getPatientPhase(wlt: WLTPatient): WLTTimepoint {
  if (!wlt.operation_date) return 'preop'
  const dpt = daysSince(wlt.operation_date)
  if (dpt === 0) return 'surgery'
  if (dpt <= 10) return 'week1'
  if (dpt <= 45) return 'month1'
  return 'year1'
}

export const PHASE_META: Record<WLTTimepoint, { label: string; short: string; color: string; bg: string }> = {
  preop:   { label: 'Pre-operative',     short: 'Pre-op',   color: '#1565C0', bg: '#E3F2FD' },
  surgery: { label: 'Intraoperative',    short: 'Surgery',  color: '#6A1B9A', bg: '#F3E5F5' },
  week1:   { label: 'Week 1 Post-op',    short: 'Week 1',   color: '#E65100', bg: '#FFF3E0' },
  month1:  { label: 'Month 1 Post-op',   short: 'Month 1',  color: '#2E7D32', bg: '#E8F5E9' },
  year1:   { label: 'Year 1 Post-op',    short: 'Year 1',   color: '#00695C', bg: '#E0F2F1' },
}

export interface PhaseLabSnapshot {
  timepoint:    WLTTimepoint
  label:        string
  date:         string
  labs:         LabResult
  notes:        string[]
  hasRejection: boolean
}

export function generatePhaseSnapshots(wlt: WLTPatient): PhaseLabSnapshot[] {
  const txDate = wlt.operation_date ?? '2024-01-01'
  const rng    = mkRng(wlt.patient_id + 'phases')
  const meld   = wlt.meld_score  ?? 15
  const citH   = (wlt.cold_ischemia_time ?? 360) / 60
  const icuD   = wlt.icu_days ?? 5
  const dead   = wlt.status === 'Dead'

  const meldF = 1 + Math.max(0, (meld - 15) / 22)
  const citF  = citH > 10 ? 1.35 : citH > 7 ? 1.15 : 0.90

  // Peak ALT at week 1 (right after surgery)
  const peakAlt  = Math.round((200 + rng() * 130) * meldF * citF)
  const peakAst  = Math.round(peakAlt * (0.82 + rng() * 0.16))
  const peakBili = parseFloat(((1.8 + rng() * 2.8) * meldF).toFixed(1))
  const peakCr   = parseFloat((1.1 + rng() * 0.9).toFixed(1))

  function makeRow(decay: number, n: number): LabResult {
    const alt  = Math.max(18, Math.round(peakAlt  * decay * n))
    const ast  = Math.max(15, Math.round(peakAst  * decay * n * (0.88 + rng() * 0.12)))
    const bili = Math.max(0.3, parseFloat((peakBili * decay * n * 0.9).toFixed(1)))
    const cr   = parseFloat(Math.max(0.7, peakCr - decay * 0.4 + (rng() - 0.5) * 0.15).toFixed(1))
    const ggt  = Math.max(18, Math.round(alt * (0.55 + rng() * 0.25)))
    const inr  = parseFloat(Math.max(0.9, 1.7 - (1 - decay) * 0.6 + (rng() - 0.5) * 0.12).toFixed(1))
    const alb  = parseFloat(Math.min(4.6, 2.6 + (1 - decay) * 1.8 + (rng() - 0.5) * 0.2).toFixed(1))
    const wbc  = parseFloat(Math.max(3.2, 11.5 - (1 - decay) * 4.5 + (rng() - 0.5) * 1.2).toFixed(1))
    return { date: '', alt, ast, bilirubin: bili, creatinine: cr, ggt, inr, albumin: alb, wbc }
  }

  const hasRejW1  = meld > 28 && rng() > 0.7
  const hasRejM1  = meld > 22 && rng() > 0.6
  const hasRejY1  = dead ? true : meld > 25 && rng() > 0.65

  const n = 0.92 + rng() * 0.16

  const snapshots: PhaseLabSnapshot[] = [
    {
      timepoint: 'week1',
      label:     'Week 1 Post-op',
      date:      addDays(txDate, 7),
      labs:      { ...makeRow(1.0, n), date: addDays(txDate, 7) },
      notes: [
        `Intubation: ${wlt.intubation_time != null ? wlt.intubation_time.toFixed(0) + ' h' : 'N/A'}`,
        `ICU admission: ${icuD > 0 ? 'Yes' : 'No'}`,
        hasRejW1 ? 'Early dysfunction — elevated enzymes' : 'Initial graft function acceptable',
      ],
      hasRejection: hasRejW1,
    },
    {
      timepoint: 'month1',
      label:     'Month 1 Post-op',
      date:      addDays(txDate, 30),
      labs:      { ...makeRow(0.42, n), date: addDays(txDate, 30) },
      notes: [
        `ICU discharge: day ${Math.round(icuD)}`,
        hasRejM1 ? 'Rejection episode suspected — biopsy performed' : 'No rejection detected',
        `Tacrolimus trough: ${(8 + rng() * 6).toFixed(1)} ng/mL`,
      ],
      hasRejection: hasRejM1,
    },
    {
      timepoint: 'year1',
      label:     'Year 1 Post-op',
      date:      addDays(txDate, 365),
      labs:      { ...makeRow(dead ? 0.75 : 0.12, n), date: addDays(txDate, 365) },
      notes: [
        `Outcome at 1 year: ${dead ? 'Deceased' : 'Alive'}`,
        hasRejY1 ? 'Chronic rejection / graft dysfunction' : 'Stable long-term graft function',
        dead ? 'Intensive management initiated' : 'Immunosuppression maintained',
      ],
      hasRejection: hasRejY1,
    },
  ]

  return snapshots
}

// ── Seeded PRNG (FNV-1a-ish) — deterministic per patient ──────────────────────
function mkRng(seed: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return ((h >>> 0) + 0.5) / 0x100000001
  }
}

// ── Date helpers ───────────────────────────────────────────────────────────────
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function daysSince(dateStr: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000))
}

// ── Patient ────────────────────────────────────────────────────────────────────
export function wltToPatient(wlt: WLTPatient): Patient {
  const rng = mkRng(wlt.patient_id + 'demo')
  const isFemale = wlt.sex === 2
  const heightCm = isFemale ? 160 + Math.round(rng() * 12) : 170 + Math.round(rng() * 14)
  const bmi = wlt.bmi ?? 23 + rng() * 5
  const weightKg = Math.round(bmi * (heightCm / 100) ** 2)

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] as const
  const blood = bloodTypes[Math.floor(rng() * bloodTypes.length)]

  const etiologyMap: Record<number, string> = {
    1: 'Alcoholic cirrhosis',
    2: 'NASH / non-alcoholic steatohepatitis',
    3: 'HCV-related cirrhosis',
    4: 'Hepatocellular carcinoma (HCC)',
    5: 'Primary biliary cholangitis (PBC)',
    6: 'Primary sclerosing cholangitis (PSC)',
    7: 'Autoimmune hepatitis',
    8: 'Acute liver failure',
    9: 'Cryptogenic cirrhosis',
  }
  const etiology = wlt.diagnosis_etiological != null
    ? (etiologyMap[wlt.diagnosis_etiological] ?? `Hepatic disease (code ${wlt.diagnosis_etiological})`)
    : 'End-stage liver disease'
  const cpSuffix = wlt.child_pugh_category ? ` — Child-Pugh ${wlt.child_pugh_category}` : ''

  return {
    id:              wlt.patient_id,
    name:            wlt.name,
    age:             wlt.age ?? 50,
    gender:          isFemale ? 'F' : 'M',
    transplant_date: wlt.operation_date ?? '2024-01-01',
    blood_type:      blood,
    donor_type:      'Deceased',
    physician:       'Transplant Hepatology Team',
    diagnosis:       etiology + cpSuffix,
    mrn:             wlt.hospitalization_number || wlt.patient_id,
    weight_kg:       weightKg,
    height_cm:       heightCm,
  }
}

// ── Lab generation ─────────────────────────────────────────────────────────────
export function generateLabs(wlt: WLTPatient): LabResult[] {
  const txDate = wlt.operation_date ?? '2024-01-01'
  const rng    = mkRng(wlt.patient_id + 'labs')
  const meld   = wlt.meld_score ?? 15
  const citH   = (wlt.cold_ischemia_time ?? 360) / 60          // minutes → hours
  const icuD   = wlt.icu_days ?? 5
  const dead   = wlt.status === 'Dead'

  // Peak ALT driven by MELD severity and cold ischemia
  const meldF  = 1 + Math.max(0, (meld - 15) / 22)            // 1.0 @ MELD 15, ~2.0 @ MELD 37
  const citF   = citH > 10 ? 1.35 : citH > 7 ? 1.15 : 0.90
  const peakAlt  = Math.round((200 + rng() * 130) * meldF * citF)
  const peakAst  = Math.round(peakAlt * (0.82 + rng() * 0.16))
  const peakBili = parseFloat(((1.8 + rng() * 2.8) * meldF).toFixed(1))
  const peakCr   = parseFloat((1.1 + rng() * 0.9).toFixed(1))

  // Recovery speed: faster when ICU was short
  const recoveryK = 0.75 + icuD * 0.05                         // higher = slower

  const dayOffsets = [0, 7, 14, 21, 30, 60, 90, 120, 150, 180, 210, 240]
  const dpt = daysSince(txDate)
  const results: LabResult[] = []

  for (const d of dayOffsets) {
    if (d > dpt + 14) break
    const date = addDays(txDate, d)
    const t    = d / 200                                         // normalised 0→1 over ~7 months
    const decay = Math.exp(-recoveryK * t * 3.2)
    const n     = 0.88 + rng() * 0.24

    let altM = decay * n
    let bilM = decay * n * 0.88

    // Late rejection spike for high-risk patients (alive)
    if (!dead && meld > 22 && d >= 90 && d <= 150 && rng() > 0.65) {
      altM *= 1.7 + rng() * 0.6
      bilM *= 1.5
    }
    // Terminal deterioration for deceased patients
    if (dead && d >= 150) {
      const det = 1 + (d - 150) / 50
      altM *= det; bilM *= det
    }

    const alt  = Math.max(18, Math.round(peakAlt  * altM))
    const ast  = Math.max(15, Math.round(peakAst  * altM * (0.88 + rng() * 0.12)))
    const bili = Math.max(0.3, parseFloat((peakBili * bilM).toFixed(1)))
    const cr   = parseFloat(Math.max(0.7, peakCr - t * 0.35 + (rng() - 0.5) * 0.2).toFixed(1))
    const ggt  = Math.max(18, Math.round(alt * (0.55 + rng() * 0.25)))
    const inr  = parseFloat(Math.max(0.9, 1.7 - t * 0.6 + (rng() - 0.5) * 0.12).toFixed(1))
    const alb  = parseFloat(Math.min(4.6, 2.6 + t * 1.8 + (rng() - 0.5) * 0.25).toFixed(1))
    const wbc  = parseFloat(Math.max(3.2, 11.5 - t * 4.5 + (rng() - 0.5) * 1.2).toFixed(1))

    results.push({ date, alt, ast, bilirubin: bili, creatinine: cr, ggt, inr, albumin: alb, wbc })
  }

  return results
}

// ── Risk scores ────────────────────────────────────────────────────────────────
export function generateRiskScores(wlt: WLTPatient): RiskScore[] {
  const txDate = wlt.operation_date ?? '2024-01-01'
  const rng  = mkRng(wlt.patient_id + 'risk')
  const meld = wlt.meld_score ?? 15
  const cp   = wlt.child_pugh_category
  const dead = wlt.status === 'Dead'

  const initRej  = Math.min(0.88, 0.30 + meld / 95 + (cp === 'C' ? 0.16 : cp === 'B' ? 0.08 : 0))
  const initInf  = Math.min(0.82, 0.26 + meld / 115 + (cp === 'C' ? 0.12 : cp === 'B' ? 0.05 : 0))
  const initSurv = Math.max(0.68, 0.93 - meld / 200 - (dead ? 0.08 : 0))

  const monthOffsets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const dpt = daysSince(txDate)
  const results: RiskScore[] = []

  for (const mo of monthOffsets) {
    const d = mo * 30
    if (d > dpt + 20) break
    const date = addDays(txDate, d)
    const t    = Math.min(1, d / 270)
    const n    = 0.93 + rng() * 0.14

    let rej  = Math.max(0.05, initRej  - t * 0.48) * n
    let inf  = Math.max(0.04, initInf  - t * 0.38) * n
    let surv = Math.min(0.97, initSurv + t * 0.07) * n

    if (dead && d >= 150) {
      const s = (d - 150) / 90
      rej  = Math.min(0.90, rej  + s * 0.35)
      inf  = Math.min(0.85, inf  + s * 0.28)
      surv = Math.max(0.35, surv - s * 0.38)
    }

    rej  = parseFloat(Math.min(0.99, Math.max(0.01, rej)).toFixed(2))
    inf  = parseFloat(Math.min(0.99, Math.max(0.01, inf)).toFixed(2))
    surv = parseFloat(Math.min(0.99, Math.max(0.20, surv)).toFixed(2))

    const overall: RiskLevel = rej > 0.55 || inf > 0.55 ? 'high'
      : rej > 0.30 || inf > 0.30 ? 'moderate' : 'low'

    results.push({ date, rejection_risk: rej, infection_risk: inf, graft_survival_probability: surv, overall_risk: overall })
  }

  if (results.length === 0) {
    results.push({
      date: txDate,
      rejection_risk:             parseFloat(Math.min(0.99, Math.max(0.01, initRej)).toFixed(2)),
      infection_risk:             parseFloat(Math.min(0.99, Math.max(0.01, initInf)).toFixed(2)),
      graft_survival_probability: parseFloat(Math.min(0.99, Math.max(0.20, initSurv)).toFixed(2)),
      overall_risk: initRej > 0.55 ? 'high' : initRej > 0.30 ? 'moderate' : 'low',
    })
  }

  return results
}

export function generateCurrentRisk(wlt: WLTPatient): RiskScore {
  const scores = generateRiskScores(wlt)
  return scores[scores.length - 1]
}

// ── Risk factor contributions (for RiskPrediction breakdown) ──────────────────
export function generateRejectionFactors(wlt: WLTPatient) {
  const meld   = wlt.meld_score ?? 15
  const citH   = (wlt.cold_ischemia_time ?? 360) / 60
  const age    = wlt.age ?? 50
  const dpt    = daysSince(wlt.operation_date ?? '2024-01-01')

  const hla    = Math.round(22 + (citH > 10 ? 14 : citH > 7 ? 8 : 3))
  const tacro  = Math.round(20 + (meld > 25 ? 14 : meld > 18 ? 8 : 3))
  const time   = Math.round(22 + (dpt < 90 ? 10 : dpt < 180 ? 5 : 0))
  const donor  = Math.round(16 + (age > 60 ? 10 : age > 50 ? 5 : 0))
  const total  = hla + tacro + time + donor

  return [
    { label: 'HLA mismatch',             contribution: Math.round(hla  / total * 100) },
    { label: 'Tacrolimus adequacy',       contribution: Math.round(tacro / total * 100) },
    { label: 'Time post-transplant',      contribution: Math.round(time  / total * 100) },
    { label: 'Donor-recipient profile',   contribution: Math.round(donor / total * 100) },
  ]
}

export function generateInfectionFactors(wlt: WLTPatient) {
  const meld    = wlt.meld_score ?? 15
  const icuD    = wlt.icu_days ?? 5
  const bmi     = wlt.bmi ?? 24
  const bleed   = wlt.intraoperative_bleeding ?? 500

  const immuno  = Math.round(28 + (meld > 25 ? 12 : meld > 18 ? 6 : 0))
  const icu     = Math.round(22 + (icuD > 10 ? 14 : icuD > 5 ? 7 : 0))
  const obesity = Math.round(18 + (bmi > 30 ? 12 : bmi > 27 ? 5 : 0))
  const blood   = Math.round(14 + (bleed > 1000 ? 12 : bleed > 500 ? 5 : 0))
  const total   = immuno + icu + obesity + blood

  return [
    { label: 'Immunosuppression level',   contribution: Math.round(immuno  / total * 100) },
    { label: 'ICU / nosocomial exposure', contribution: Math.round(icu     / total * 100) },
    { label: 'Metabolic risk (BMI/DM)',   contribution: Math.round(obesity / total * 100) },
    { label: 'Intraop blood products',    contribution: Math.round(blood   / total * 100) },
  ]
}

// ── Medications ────────────────────────────────────────────────────────────────
export function generateMedications(wlt: WLTPatient): Medication[] {
  const txDate = wlt.operation_date ?? '2024-01-01'
  const meld   = wlt.meld_score ?? 15
  const cp     = wlt.child_pugh_category

  return [
    { name: 'Tacrolimus (Prograf)',  dose: meld > 22 ? '4 mg' : '3 mg',  frequency: 'twice daily',  category: 'immunosuppressant', start_date: txDate },
    { name: 'Mycophenolate Mofetil', dose: '1000 mg',                     frequency: 'twice daily',  category: 'immunosuppressant', start_date: txDate },
    { name: 'Prednisone',            dose: cp === 'C' ? '10 mg' : '5 mg', frequency: 'once daily',   category: 'immunosuppressant', start_date: txDate },
    { name: 'Valganciclovir',        dose: '900 mg',                      frequency: 'once daily',   category: 'antiviral',         start_date: txDate },
    { name: 'Trimethoprim-Sulfa',    dose: '80/400 mg',                   frequency: 'Mon / Wed / Fri', category: 'antibiotic',     start_date: txDate },
    { name: 'Omeprazole',            dose: '20 mg',                       frequency: 'once daily',   category: 'supportive',        start_date: txDate },
    { name: 'Aspirin',               dose: '81 mg',                       frequency: 'once daily',   category: 'supportive',        start_date: txDate },
  ]
}

// ── Clinical events ────────────────────────────────────────────────────────────
export function generateEvents(wlt: WLTPatient): ClinicalEvent[] {
  const txDate = wlt.operation_date ?? '2024-01-01'
  const meld   = wlt.meld_score ?? 15
  const cit    = wlt.cold_ischemia_time
  const icuD   = wlt.icu_days
  const postD  = wlt.postop_hospital_days
  const opTime = wlt.operative_time
  const dpt    = daysSince(txDate)
  const dead   = wlt.status === 'Dead'
  const events: ClinicalEvent[] = []

  events.push({
    date: txDate, type: 'visit', title: 'Liver Transplantation',
    severity: 'info',
    description: [
      'Orthotopic liver transplantation performed.',
      cit    ? ` Cold ischemia: ${cit} min.` : '',
      opTime ? ` Operative time: ${opTime} min.` : '',
      icuD   ? ` ICU stay: ${icuD.toFixed(0)} days.` : '',
      postD  ? ` Total hospital stay: ${postD.toFixed(0)} days.` : '',
    ].join(''),
  })

  if (dpt >= 7) events.push({
    date: addDays(txDate, 7), type: 'labs', title: 'Post-op Labs — Week 1',
    severity: meld > 25 ? 'moderate' : 'info',
    description: `Initial post-operative labs. MELD at listing: ${meld}. Monitoring hepatic enzyme trajectory and graft function.`,
  })

  if (dpt >= 30) events.push({
    date: addDays(txDate, 30), type: 'visit', title: 'Month-1 Follow-up',
    severity: 'info',
    description: 'One-month assessment. Tacrolimus trough monitoring, immunosuppression optimisation, infection surveillance.',
  })

  if (dpt >= 90) events.push({
    date: addDays(txDate, 90), type: 'biopsy', title: 'Protocol Biopsy — 3 Months',
    severity: meld > 22 ? 'moderate' : 'info',
    description: meld > 22
      ? 'Mild reactive changes. Tacrolimus level adjustment indicated. No frank rejection.'
      : 'No histological rejection. Graft function within normal parameters.',
  })

  if (dpt >= 120 && meld > 23) events.push({
    date: addDays(txDate, 120), type: 'episode', title: 'Transaminase Elevation',
    severity: 'moderate',
    description: 'Elevation of ALT/AST above baseline. Rejection workup initiated; tacrolimus level rechecked.',
  })

  if (dpt >= 180) events.push({
    date: addDays(txDate, 180), type: 'visit', title: '6-Month Follow-up',
    severity: dead ? 'high' : 'info',
    description: dead
      ? 'Progressive deterioration of graft function. Intensified management and multidisciplinary review.'
      : 'Stable graft function at 6 months. Immunosuppression tapering discussed.',
  })

  if (dpt >= 365) events.push({
    date: addDays(txDate, 365), type: 'visit',
    title: dead ? 'Clinical Decline — 12 Months' : '12-Month Assessment',
    severity: dead ? 'high' : 'info',
    description: dead
      ? 'Continued deterioration. Palliative consultation initiated.'
      : 'Annual review. Satisfactory long-term graft function.',
  })

  return events.sort((a, b) => a.date.localeCompare(b.date))
}

// ── Dashboard summary ──────────────────────────────────────────────────────────
export function generateDashboardSummary(wlt: WLTPatient): DashboardSummary {
  const patient = wltToPatient(wlt)
  const labs    = generateLabs(wlt)
  const risk    = generateCurrentRisk(wlt)
  const meds    = generateMedications(wlt)
  const txDate  = wlt.operation_date ?? '2024-01-01'

  return {
    patient,
    latest_labs:          labs[labs.length - 1],
    current_risk:         risk,
    current_medications:  meds,
    days_post_transplant: daysSince(txDate),
  }
}

// ── Clinical summary ───────────────────────────────────────────────────────────
type TFn = (key: string, opts?: object) => string

export function generateClinicalSummary(wlt: WLTPatient, t: TFn): ClinicalSummary {
  const findings:       ClinicalFinding[]       = []
  const recommendations: ClinicalRecommendation[] = []
  const riskFlags:      RiskFlag[]              = []

  const meld   = wlt.meld_score ?? 0
  const cpCat  = wlt.child_pugh_category ?? ''
  const cpScr  = wlt.child_pugh_score ?? 0
  const bmi    = wlt.bmi ?? 0
  const cit    = wlt.cold_ischemia_time ?? 0
  const bleed  = wlt.intraoperative_bleeding ?? 0
  const icuD   = wlt.icu_days ?? 0
  const intubH = wlt.intubation_time ?? 0
  const dead   = wlt.status === 'Dead'

  const f = (category: string, status: FindingStatus, text: string): ClinicalFinding =>
    ({ category, status, text, detail: '' })

  // Pre-op severity
  if (meld >= 30) {
    findings.push(f('hepatic_preop', 'severe', t('clinicalSummary.findMeldSevere', { score: meld.toFixed(1) })))
    riskFlags.push({ flag: 'high_meld', severity: 'high', text: t('clinicalSummary.riskMeldText') })
  } else if (meld >= 20) {
    findings.push(f('hepatic_preop', 'moderate', t('clinicalSummary.findMeldModerate', { score: meld.toFixed(1) })))
  } else if (meld > 0) {
    findings.push(f('hepatic_preop', 'mild', t('clinicalSummary.findMeldMild', { score: meld.toFixed(1) })))
  }

  if (cpCat === 'C') {
    findings.push(f('child_pugh', 'severe', t('clinicalSummary.findCpSevere', { score: cpScr })))
    riskFlags.push({ flag: 'child_pugh_c', severity: 'high', text: t('clinicalSummary.riskCpCText') })
  } else if (cpCat === 'B') {
    findings.push(f('child_pugh', 'moderate', t('clinicalSummary.findCpModerate', { score: cpScr })))
  } else if (cpCat === 'A') {
    findings.push(f('child_pugh', 'normal', t('clinicalSummary.findCpNormal', { score: cpScr })))
  }

  // Operative
  if (cit > 600) {
    const h = Math.floor(cit / 60), m = Math.floor(cit % 60)
    findings.push(f('intraoperative', 'moderate', t('clinicalSummary.findCitProlonged', { min: cit, h, m })))
    riskFlags.push({ flag: 'prolonged_cit', severity: 'moderate', text: t('clinicalSummary.riskCitText', { min: cit }) })
  } else if (cit > 0) {
    const stat: FindingStatus = cit <= 480 ? 'normal' : 'mild'
    findings.push(f('intraoperative', stat, cit <= 480 ? t('clinicalSummary.findCitNormal', { min: cit }) : t('clinicalSummary.findCitMild', { min: cit })))
  }

  if (bleed > 5000) {
    findings.push(f('intraoperative', 'severe', t('clinicalSummary.findBleedSevere', { vol: bleed })))
    riskFlags.push({ flag: 'high_bleeding', severity: 'moderate', text: t('clinicalSummary.riskBleedText', { vol: bleed }) })
  } else if (bleed > 2000) {
    findings.push(f('intraoperative', 'moderate', t('clinicalSummary.findBleedModerate', { vol: bleed })))
  }

  // Recovery
  if (icuD > 30) {
    findings.push(f('recovery', 'severe', t('clinicalSummary.findIcuSevere', { days: icuD.toFixed(0) })))
    riskFlags.push({ flag: 'prolonged_icu', severity: 'high', text: t('clinicalSummary.riskIcuText', { days: icuD.toFixed(0) }) })
  } else if (icuD > 7) {
    findings.push(f('recovery', 'moderate', t('clinicalSummary.findIcuModerate', { days: icuD.toFixed(0) })))
  } else if (icuD > 0) {
    findings.push(f('recovery', 'normal', t('clinicalSummary.findIcuNormal', { days: icuD.toFixed(0) })))
  }

  if (intubH > 48) {
    findings.push(f('recovery', 'moderate', t('clinicalSummary.findVentProlonged', { h: intubH.toFixed(0) })))
  } else if (intubH > 0) {
    findings.push(f('recovery', intubH <= 24 ? 'normal' : 'mild', t('clinicalSummary.findVentNormal', { h: intubH.toFixed(0) })))
  }

  if (bmi > 35) riskFlags.push({ flag: 'obesity',     severity: 'moderate', text: t('clinicalSummary.riskObesityText',      { bmi: bmi.toFixed(1) }) })
  else if (bmi > 0 && bmi < 18.5) riskFlags.push({ flag: 'underweight', severity: 'moderate', text: t('clinicalSummary.riskUnderweightText', { bmi: bmi.toFixed(1) }) })

  if (dead) findings.push(f('outcome', 'severe', t('clinicalSummary.findDeceased')))

  // Overall status
  const allStatuses = findings.map(x => x.status)
  const allSeverities = riskFlags.map(x => x.severity)
  let overall: SummaryStatus
  if (dead) overall = 'critical'
  else if (allStatuses.includes('severe') || allSeverities.includes('high')) overall = 'concern'
  else if (allStatuses.includes('moderate') || allSeverities.includes('moderate')) overall = 'monitoring'
  else overall = 'stable'

  // Standard recommendations
  if (overall === 'stable') {
    recommendations.push(
      { priority: 'routine', text: t('clinicalSummary.recContinueImmunosup') },
      { priority: 'routine', text: t('clinicalSummary.recRoutineFollow') },
      { priority: 'routine', text: t('clinicalSummary.recRoutineReview') },
    )
  } else if (overall === 'monitoring') {
    recommendations.push(
      { priority: 'monitor', text: t('clinicalSummary.recIncreaseMonitoring') },
      { priority: 'routine', text: t('clinicalSummary.recContinueUnlessWorsen') },
      { priority: 'monitor', text: t('clinicalSummary.recLowThresholdBiopsy') },
    )
  } else if (overall === 'concern') {
    recommendations.unshift(
      { priority: 'urgent', text: t('clinicalSummary.recUrgentReview') },
      { priority: 'urgent', text: t('clinicalSummary.recRepeatPanel') },
      { priority: 'urgent', text: t('clinicalSummary.recOptimiseImmunosup') },
    )
  }

  // Narrative
  const first = wlt.name.split(' ')[0]
  let assessment: string
  if (dead) {
    assessment = t('clinicalSummary.assessDeceased', { first })
  } else {
    const openers: Record<string, string> = {
      stable:     t('clinicalSummary.assessStable',     { first }),
      monitoring: t('clinicalSummary.assessMonitoring', { first }),
      concern:    t('clinicalSummary.assessConcern',    { first }),
    }
    const riskParts: string[] = []
    if (meld >= 25) riskParts.push(t('clinicalSummary.assessRiskHighMeld', { score: meld.toFixed(1) }))
    if (cpCat === 'C') riskParts.push(t('clinicalSummary.assessRiskCpC'))
    if (icuD > 14) riskParts.push(t('clinicalSummary.assessRiskIcu', { days: icuD.toFixed(0) }))
    const middle = riskParts.length ? t('clinicalSummary.assessRiskMiddle', { risks: riskParts.join(', ') }) : ''
    const closers: Record<string, string> = {
      stable:     t('clinicalSummary.assessCloserStable'),
      monitoring: t('clinicalSummary.assessCloserMonitoring'),
      concern:    t('clinicalSummary.assessCloserConcern'),
    }
    assessment = (openers[overall] ?? '') + middle + (closers[overall] ?? '')
  }

  return {
    overall_status:   overall,
    assessment,
    findings,
    recommendations,
    risk_flags: riskFlags,
    data_completeness: {
      pre_operative:  !!(wlt.meld_score && wlt.child_pugh_category),
      intraoperative: !!(wlt.cold_ischemia_time && wlt.operative_time),
      post_operative: !!wlt.icu_days,
      laboratory:     false,
    },
  }
}

// ── Intervention simulation (same model as mock, seeded to patient baseline) ──
export function simulateFromWLT(wlt: WLTPatient, iv: Intervention): OutcomePoint[] {
  const base = generateCurrentRisk(wlt)
  const { rejection_risk, infection_risk, graft_survival_probability } = base

  const immunoNorm  = (iv.immunosuppression_level  - 50) / 100
  const lifeNorm    = (iv.lifestyle_score          - 50) / 100
  const supportNorm =  iv.supportive_therapy_level / 100

  return Array.from({ length: 91 }, (_, day) => {
    const t = day / 90

    const baseRej  = Math.max(0.04, rejection_risk             - 0.0014 * day)
    const baseInf  = Math.max(0.04, infection_risk             - 0.0009 * day)
    const baseSurv = Math.min(0.99, graft_survival_probability + 0.0004 * day)

    const rejDelta  = immunoNorm * 0.25 * t + lifeNorm * 0.06 * t + supportNorm * 0.03 * t
    const infDelta  =
      (iv.antiviral_flag  ? 0.12 : 0) * t +
      (iv.antibiotic_flag ? 0.08 * (1 - t * 0.7) : 0) +
      lifeNorm * 0.08 * t
    const survDelta =
      Math.max(0, rejDelta)  * 0.12 +
      Math.max(0, infDelta)  * 0.08 +
      lifeNorm    * 0.06 * t +
      supportNorm * 0.04 * t

    return {
      day,
      graft_survival_baseline:  baseSurv,
      rejection_risk_baseline:  baseRej,
      infection_risk_baseline:  baseInf,
      graft_survival:           Math.min(0.99, baseSurv + survDelta),
      rejection_risk:           Math.max(0.02, baseRej  - rejDelta),
      infection_risk:           Math.max(0.02, baseInf  - infDelta),
    }
  })
}

// ── Lab trend data (for trend charts) ─────────────────────────────────────────
export interface LabTrendPoint {
  label:      string
  timepoint:  string
  alt:        number
  ast:        number
  bilirubin:  number
  creatinine: number
  ggt:        number
  inr:        number
  albumin:    number
}

export function generateLabTrendData(wlt: WLTPatient): LabTrendPoint[] {
  const snaps = generatePhaseSnapshots(wlt)
  return snaps.map(s => ({
    label:      s.label.replace(' Post-op', ''),
    timepoint:  s.timepoint,
    alt:        s.labs.alt,
    ast:        s.labs.ast,
    bilirubin:  s.labs.bilirubin,
    creatinine: s.labs.creatinine,
    ggt:        s.labs.ggt,
    inr:        s.labs.inr,
    albumin:    s.labs.albumin,
  }))
}

// ── Tacrolimus monitoring data ─────────────────────────────────────────────────
export interface TacrolimusPoint {
  label:      string
  trough:     number
  targetLow:  number
  targetHigh: number
  status:     'subtherapeutic' | 'therapeutic' | 'supratherapeutic'
}

// ── Imaging records ────────────────────────────────────────────────────────────
export type ImagingModality = 'Ultrasound' | 'CT' | 'MRI' | 'Biopsy' | 'ERCP'
export type ImagingStatus   = 'normal' | 'mildly_abnormal' | 'abnormal'

export interface ImagingRecord {
  id:         string
  modality:   ImagingModality
  date:       string
  phase:      string
  indication: string
  findings:   string
  impression: string
  status:     ImagingStatus
}

export function generateImagingData(wlt: WLTPatient): ImagingRecord[] {
  const txDate = wlt.operation_date ?? '2024-01-01'
  const rng    = mkRng(wlt.patient_id + 'img')
  const meld   = wlt.meld_score ?? 15
  const dead   = wlt.status === 'Dead'
  const dpt    = daysSince(txDate)
  const records: ImagingRecord[] = []

  // Pre-operative CT
  records.push({
    id: 'img-preop-ct',
    modality: 'CT',
    date: addDays(txDate, -14),
    phase: 'Pre-operative',
    indication: 'Liver transplant workup — hepatic vascular and volumetric assessment',
    findings: `Liver with ${meld > 25 ? 'markedly' : 'moderately'} irregular surface consistent with cirrhosis. Portal vein patent${meld > 22 ? ', caliber enlarged at 14 mm' : ''}. ${meld > 22 ? 'Splenomegaly (17 cm). Moderate ascites.' : 'No ascites. Spleen mildly enlarged.'}`,
    impression: `Cirrhotic liver morphology with ${meld > 25 ? 'advanced' : 'moderate'} portal hypertension. No hepatic artery anomaly. ${meld > 28 ? 'High-risk anatomy — surgical team briefed.' : 'Suitable hepatic anatomy for transplantation.'}`,
    status: meld > 25 ? 'abnormal' : 'mildly_abnormal',
  })

  // Week 1 Doppler ultrasound
  if (dpt >= 3) {
    const dampened = rng() > 0.75
    records.push({
      id: 'img-w1-us',
      modality: 'Ultrasound',
      date: addDays(txDate, 5),
      phase: 'Week 1 Post-op',
      indication: 'Hepatic artery Doppler — early graft perfusion surveillance',
      findings: `Hepatic artery waveform ${dampened ? 'mildly dampened (RI 0.54, peak systolic velocity 42 cm/s)' : 'within normal range (RI 0.68, peak systolic 76 cm/s)'}. Bile duct caliber ≤3 mm. No perihepatic fluid collection.`,
      impression: dampened ? 'Borderline hepatic artery Doppler — repeat in 48 h. No thrombosis.' : 'Satisfactory post-transplant hepatic artery perfusion. No vascular complication.',
      status: dampened ? 'mildly_abnormal' : 'normal',
    })
  }

  // Month 3 protocol biopsy
  if (dpt >= 90) {
    const rejSign = meld > 22 && rng() > 0.5
    records.push({
      id: 'img-3m-biopsy',
      modality: 'Biopsy',
      date: addDays(txDate, 90),
      phase: 'Month 3 Protocol',
      indication: 'Protocol liver biopsy — cellular rejection surveillance',
      findings: rejSign
        ? 'Mild portal inflammation with endothelialitis. Eosinophilic infiltrates present in portal tracts. RAI score 3/9. No bile duct damage.'
        : 'Preserved hepatic architecture. Minimal portal inflammation (grade 1). No endothelialitis. No features of acute cellular rejection.',
      impression: rejSign
        ? 'Mild acute cellular rejection (Banff RAI 3). Low-grade — tacrolimus dose adjustment recommended. Repeat biopsy in 6 weeks if enzymes do not improve.'
        : 'No histological rejection. Normal hepatic parenchyma at 3 months.',
      status: rejSign ? 'mildly_abnormal' : 'normal',
    })
  }

  // Month 6 ultrasound
  if (dpt >= 180) {
    const biliary = dead && rng() > 0.45
    records.push({
      id: 'img-6m-us',
      modality: 'Ultrasound',
      date: addDays(txDate, 180),
      phase: 'Month 6 Follow-up',
      indication: 'Routine hepatic ultrasound — biliary and vascular surveillance',
      findings: biliary
        ? 'Mild intrahepatic ductal dilatation (4–5 mm). Heterogeneous hepatic echogenicity. Hepatic veins patent.'
        : 'Homogeneous hepatic parenchyma. Bile ducts normal caliber (≤3 mm). Hepatic artery and veins patent.',
      impression: biliary
        ? 'Mild biliary ectasia — consider MRCP to exclude anastomotic stricture.'
        : 'No biliary or vascular complication at 6 months. Satisfactory graft morphology.',
      status: biliary ? 'mildly_abnormal' : 'normal',
    })
  }

  // Year 1 MRI or CT
  if (dpt >= 330) {
    const modality: ImagingModality = rng() > 0.5 ? 'MRI' : 'CT'
    records.push({
      id: 'img-y1',
      modality,
      date: addDays(txDate, 360),
      phase: 'Year 1 Assessment',
      indication: `Annual post-transplant graft assessment — ${modality} with contrast`,
      findings: dead
        ? 'Graft with heterogeneous parenchymal signal. Areas of confluent fibrosis. Dilated intrahepatic ducts. Mild perihepatic fluid.'
        : `Well-established graft with homogeneous enhancement. ${rng() > 0.65 ? 'Mild parenchymal steatosis (CAP estimate 240 dB/m).' : 'No focal lesion.'} Hepatic vasculature intact. No biloma.`,
      impression: dead
        ? 'Chronic graft dysfunction / progressive fibrosis. Multidisciplinary review recommended.'
        : `Normal 1-year graft assessment. ${rng() > 0.65 ? 'Mild steatosis — dietary and metabolic review advised.' : 'No significant parenchymal pathology.'}`,
      status: dead ? 'abnormal' : rng() > 0.65 ? 'mildly_abnormal' : 'normal',
    })
  }

  return records.sort((a, b) => b.date.localeCompare(a.date))
}

// ── Appointments ───────────────────────────────────────────────────────────────
export type AppointmentType   = 'outpatient' | 'labs' | 'biopsy' | 'imaging' | 'multidisciplinary'
export type AppointmentStatus = 'completed' | 'scheduled' | 'cancelled'

export interface AppointmentRecord {
  id:         string
  date:       string
  time:       string
  type:       AppointmentType
  department: string
  provider:   string
  status:     AppointmentStatus
  notes:      string
}

export function generateAppointments(wlt: WLTPatient): AppointmentRecord[] {
  const txDate = wlt.operation_date ?? '2024-01-01'
  const rng    = mkRng(wlt.patient_id + 'appt')
  const today  = new Date().toISOString().split('T')[0]
  const times  = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00']
  const t      = () => times[Math.floor(rng() * times.length)]
  const done   = (d: string): AppointmentStatus => d < today ? 'completed' : 'scheduled'

  const schedule: Array<{
    daysOffset: number; type: AppointmentType; dept: string; provider: string; notes: string
  }> = [
    { daysOffset: 7,   type: 'labs',              dept: 'Clinical Laboratory',      provider: 'Lab Services',       notes: 'Week 1 LFTs, CBC, tacrolimus trough, creatinine' },
    { daysOffset: 14,  type: 'outpatient',         dept: 'Transplant Hepatology',    provider: 'Dr. Chen',           notes: 'Week 2 clinical review — wound check, labs interpretation' },
    { daysOffset: 30,  type: 'outpatient',         dept: 'Transplant Hepatology',    provider: 'Dr. Chen',           notes: 'Month 1 follow-up — immunosuppression dose adjustment' },
    { daysOffset: 45,  type: 'labs',              dept: 'Clinical Laboratory',      provider: 'Lab Services',       notes: 'LFTs, FK506 trough, renal function, CBC' },
    { daysOffset: 60,  type: 'imaging',           dept: 'Radiology',               provider: 'Dr. Martinez',       notes: 'Hepatic Doppler ultrasound — routine' },
    { daysOffset: 90,  type: 'biopsy',            dept: 'Interventional Radiology', provider: 'Dr. Patel',          notes: 'Protocol liver biopsy — 3-month rejection surveillance' },
    { daysOffset: 105, type: 'outpatient',         dept: 'Transplant Hepatology',    provider: 'Dr. Chen',           notes: 'Biopsy result review — immunosuppression plan update' },
    { daysOffset: 150, type: 'labs',              dept: 'Clinical Laboratory',      provider: 'Lab Services',       notes: 'Comprehensive metabolic panel + tacrolimus level' },
    { daysOffset: 180, type: 'multidisciplinary', dept: 'MDT Transplant Board',     provider: 'Transplant Team',    notes: '6-month MDT case review — all specialties present' },
    { daysOffset: 210, type: 'outpatient',         dept: 'Transplant Hepatology',    provider: 'Dr. Chen',           notes: '7-month review — long-term immunosuppression strategy' },
    { daysOffset: 240, type: 'labs',              dept: 'Clinical Laboratory',      provider: 'Lab Services',       notes: '8-month surveillance labs' },
    { daysOffset: 270, type: 'imaging',           dept: 'Radiology',               provider: 'Dr. Martinez',       notes: 'Follow-up hepatic ultrasound — biliary and vascular check' },
    { daysOffset: 300, type: 'outpatient',         dept: 'Transplant Hepatology',    provider: 'Dr. Chen',           notes: '10-month review — annual assessment preparation' },
    { daysOffset: 330, type: 'imaging',           dept: 'Radiology',               provider: 'Dr. Martinez',       notes: 'Annual MRI/CT liver graft assessment with contrast' },
    { daysOffset: 365, type: 'multidisciplinary', dept: 'MDT Transplant Board',     provider: 'Transplant Team',    notes: 'Annual transplant review — 1-year milestone, survival assessment' },
  ]

  const appointments: AppointmentRecord[] = schedule.map(s => ({
    id:         `appt-${s.daysOffset}`,
    date:       addDays(txDate, s.daysOffset),
    time:       t(),
    type:       s.type,
    department: s.dept,
    provider:   s.provider,
    status:     done(addDays(txDate, s.daysOffset)),
    notes:      s.notes,
  }))

  // One more upcoming appointment past year 1 (for alive patients)
  if (wlt.status !== 'Dead') {
    const next = addDays(today, 14 + Math.floor(rng() * 28))
    if (next > addDays(txDate, 365)) {
      appointments.push({
        id: 'appt-next',
        date: next, time: t(),
        type: 'outpatient',
        department: 'Transplant Hepatology',
        provider: 'Dr. Chen',
        status: 'scheduled',
        notes: 'Routine follow-up — labs review and long-term clinical assessment',
      })
    }
  }

  return appointments.sort((a, b) => a.date.localeCompare(b.date))
}

export function generateTacrolimusData(wlt: WLTPatient): TacrolimusPoint[] {
  const rng     = mkRng(wlt.patient_id + 'tac')
  const meld    = wlt.meld_score ?? 15
  const highRisk = meld > 25 || wlt.child_pugh_category === 'C'

  // Early post-op: high targets (10-15); later: lower targets (5-10)
  const points: Array<{ label: string; targetLow: number; targetHigh: number; baseTrough: number }> = [
    { label: 'Week 1',    targetLow: 10, targetHigh: 15, baseTrough: 12 + rng() * 4 - 2 },
    { label: 'Month 1',   targetLow: 8,  targetHigh: 12, baseTrough: 9  + rng() * 4 - 1 },
    { label: 'Month 3',   targetLow: 6,  targetHigh: 10, baseTrough: 7  + rng() * 4 - 1 },
    { label: 'Month 6',   targetLow: 5,  targetHigh: 8,  baseTrough: 6  + rng() * 3 - 0.5 },
    { label: 'Year 1',    targetLow: 4,  targetHigh: 7,  baseTrough: 5  + rng() * 3 - 0.5 },
  ]

  return points.map(p => {
    const noise  = (rng() - 0.5) * (highRisk ? 5 : 3)
    const trough = parseFloat(Math.max(1, p.baseTrough + noise).toFixed(1))
    const status: TacrolimusPoint['status'] =
      trough < p.targetLow  ? 'subtherapeutic' :
      trough > p.targetHigh ? 'supratherapeutic' :
      'therapeutic'
    return { label: p.label, trough, targetLow: p.targetLow, targetHigh: p.targetHigh, status }
  })
}
