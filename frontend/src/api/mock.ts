import type {
  Patient, LabResult, RiskScore, Intervention, OutcomePoint,
  ClinicalEvent, Medication, DashboardSummary,
} from '../types'

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

// ─── Static mock data ──────────────────────────────────────────────────────────

const PATIENT: Patient = {
  id:              'P-2025-0147',
  name:            'Michael Thompson',
  age:             54,
  gender:          'M',
  transplant_date: '2025-10-20',
  blood_type:      'A+',
  donor_type:      'Deceased',
  physician:       'Dr. Sarah Chen, MD',
  diagnosis:       'End-stage liver disease — NASH cirrhosis (Child-Pugh C)',
  mrn:             'MRN-87423',
  weight_kg:       82,
  height_cm:       178,
}

const LABS: LabResult[] = [
  { date: '2025-10-21', alt: 420, ast: 380, bilirubin: 4.2, creatinine: 1.8, ggt: 180, inr: 1.6, albumin: 2.8, wbc: 12.4 },
  { date: '2025-10-28', alt: 310, ast: 285, bilirubin: 3.6, creatinine: 1.7, ggt: 145, inr: 1.5, albumin: 2.9, wbc: 11.2 },
  { date: '2025-11-04', alt: 240, ast: 210, bilirubin: 3.1, creatinine: 1.6, ggt: 120, inr: 1.4, albumin: 3.0, wbc: 10.1 },
  { date: '2025-11-18', alt: 185, ast: 162, bilirubin: 2.5, creatinine: 1.5, ggt: 98,  inr: 1.3, albumin: 3.1, wbc:  9.4 },
  { date: '2025-12-02', alt: 148, ast: 128, bilirubin: 2.0, creatinine: 1.5, ggt: 82,  inr: 1.3, albumin: 3.2, wbc:  8.8 },
  { date: '2025-12-16', alt: 112, ast:  95, bilirubin: 1.6, creatinine: 1.4, ggt: 68,  inr: 1.2, albumin: 3.4, wbc:  8.2 },
  { date: '2025-12-30', alt:  88, ast:  74, bilirubin: 1.3, creatinine: 1.4, ggt: 58,  inr: 1.2, albumin: 3.5, wbc:  7.8 },
  { date: '2026-01-13', alt:  72, ast:  61, bilirubin: 1.1, creatinine: 1.3, ggt: 52,  inr: 1.1, albumin: 3.6, wbc:  7.4 },
  { date: '2026-01-27', alt:  65, ast:  56, bilirubin: 1.0, creatinine: 1.3, ggt: 48,  inr: 1.1, albumin: 3.7, wbc:  7.2 },
  { date: '2026-02-10', alt:  61, ast:  52, bilirubin: 0.9, creatinine: 1.3, ggt: 45,  inr: 1.1, albumin: 3.8, wbc:  7.0 },
  { date: '2026-02-24', alt:  58, ast:  48, bilirubin: 0.9, creatinine: 1.2, ggt: 42,  inr: 1.1, albumin: 3.9, wbc:  6.8 },
  { date: '2026-03-10', alt:  62, ast:  54, bilirubin: 1.0, creatinine: 1.3, ggt: 44,  inr: 1.1, albumin: 3.8, wbc:  7.1 },
  { date: '2026-03-24', alt:  55, ast:  46, bilirubin: 0.9, creatinine: 1.3, ggt: 41,  inr: 1.1, albumin: 3.9, wbc:  6.9 },
  { date: '2026-04-07', alt:  52, ast:  43, bilirubin: 0.8, creatinine: 1.2, ggt: 39,  inr: 1.0, albumin: 4.0, wbc:  6.6 },
  { date: '2026-04-21', alt:  50, ast:  41, bilirubin: 0.8, creatinine: 1.2, ggt: 38,  inr: 1.0, albumin: 4.0, wbc:  6.5 },
  { date: '2026-05-05', alt:  95, ast:  82, bilirubin: 1.5, creatinine: 1.4, ggt: 68,  inr: 1.2, albumin: 3.7, wbc:  8.4 },
  { date: '2026-05-19', alt: 118, ast: 102, bilirubin: 1.8, creatinine: 1.5, ggt: 75,  inr: 1.2, albumin: 3.6, wbc:  8.9 },
  { date: '2026-06-02', alt:  82, ast:  70, bilirubin: 1.3, creatinine: 1.4, ggt: 58,  inr: 1.1, albumin: 3.8, wbc:  7.8 },
  { date: '2026-06-16', alt:  68, ast:  57, bilirubin: 1.1, creatinine: 1.4, ggt: 51,  inr: 1.1, albumin: 3.9, wbc:  7.5 },
  { date: '2026-06-24', alt:  62, ast:  52, bilirubin: 1.0, creatinine: 1.3, ggt: 47,  inr: 1.1, albumin: 3.9, wbc:  7.2 },
]

const RISK_SCORES: RiskScore[] = [
  { date: '2025-10-20', rejection_risk: 0.72, infection_risk: 0.65, graft_survival_probability: 0.84, overall_risk: 'high' },
  { date: '2025-11-20', rejection_risk: 0.55, infection_risk: 0.48, graft_survival_probability: 0.87, overall_risk: 'moderate' },
  { date: '2025-12-20', rejection_risk: 0.42, infection_risk: 0.38, graft_survival_probability: 0.90, overall_risk: 'moderate' },
  { date: '2026-01-20', rejection_risk: 0.32, infection_risk: 0.29, graft_survival_probability: 0.92, overall_risk: 'low' },
  { date: '2026-02-20', rejection_risk: 0.26, infection_risk: 0.24, graft_survival_probability: 0.93, overall_risk: 'low' },
  { date: '2026-03-20', rejection_risk: 0.28, infection_risk: 0.22, graft_survival_probability: 0.93, overall_risk: 'low' },
  { date: '2026-04-20', rejection_risk: 0.24, infection_risk: 0.20, graft_survival_probability: 0.94, overall_risk: 'low' },
  { date: '2026-05-20', rejection_risk: 0.48, infection_risk: 0.35, graft_survival_probability: 0.91, overall_risk: 'moderate' },
  { date: '2026-06-20', rejection_risk: 0.38, infection_risk: 0.28, graft_survival_probability: 0.92, overall_risk: 'moderate' },
]

const MEDICATIONS: Medication[] = [
  { name: 'Tacrolimus (Prograf)',      dose: '3 mg',       frequency: 'twice daily',          category: 'immunosuppressant', start_date: '2025-10-20' },
  { name: 'Mycophenolate Mofetil',     dose: '1000 mg',    frequency: 'twice daily',          category: 'immunosuppressant', start_date: '2025-10-20' },
  { name: 'Prednisone',                dose: '5 mg',       frequency: 'once daily',           category: 'immunosuppressant', start_date: '2025-10-20' },
  { name: 'Valganciclovir',            dose: '900 mg',     frequency: 'once daily',           category: 'antiviral',         start_date: '2025-10-20' },
  { name: 'Trimethoprim-Sulfa',        dose: '80/400 mg',  frequency: 'Mon / Wed / Fri',      category: 'antibiotic',        start_date: '2025-10-20' },
  { name: 'Omeprazole',                dose: '20 mg',      frequency: 'once daily',           category: 'supportive',        start_date: '2025-10-20' },
  { name: 'Aspirin',                   dose: '81 mg',      frequency: 'once daily',           category: 'supportive',        start_date: '2025-10-20' },
]

const EVENTS: ClinicalEvent[] = [
  { date: '2025-10-20', type: 'visit',             title: 'Liver Transplantation',        description: 'Successful orthotopic liver transplantation. Cold ischemia time 7h 22min.', severity: 'info' },
  { date: '2025-10-28', type: 'labs',              title: 'Post-op Labs — Week 1',        description: 'ALT 310 / AST 285. Expected early graft dysfunction, trending down from peak.', severity: 'moderate' },
  { date: '2025-11-18', type: 'visit',             title: 'Month-1 Follow-up',            description: 'Stable hemodynamics. Tacrolimus trough 12.4 ng/mL. No signs of rejection.', severity: 'info' },
  { date: '2025-12-02', type: 'medication_change', title: 'Tacrolimus Adjustment',        description: 'Dose reduced 4 mg → 3.5 mg BID due to trough 16.2 ng/mL (slightly elevated).', severity: 'info' },
  { date: '2026-01-20', type: 'biopsy',            title: 'Protocol Biopsy — 3 Mo',       description: 'Minimal reactive changes. No rejection. Banff score 0.', severity: 'info' },
  { date: '2026-02-24', type: 'visit',             title: 'Routine Follow-up',            description: 'Improved energy and appetite. Labs approaching normal range.', severity: 'info' },
  { date: '2026-05-05', type: 'episode',           title: 'Elevated Liver Enzymes',       description: 'ALT 95, AST 82, Bilirubin 1.5. Suspected mild rejection. Tacrolimus increased.', severity: 'moderate' },
  { date: '2026-05-12', type: 'biopsy',            title: 'Biopsy — Rejection Workup',    description: 'Grade 1 acute cellular rejection (mild). Banff RAI 3. Pulse steroids initiated.', severity: 'high' },
  { date: '2026-05-19', type: 'medication_change', title: 'Pulse Steroid Therapy',        description: 'Methylprednisolone 500 mg IV × 3 days. Tacrolimus target raised to 12–15 ng/mL.', severity: 'moderate' },
  { date: '2026-06-02', type: 'visit',             title: 'Post-rejection Follow-up',     description: 'Lab values improving. Patient responding to treatment.', severity: 'info' },
  { date: '2026-06-16', type: 'labs',              title: 'Recent Labs',                  description: 'ALT 68, continuing downward trend. Tacrolimus trough 12.8 ng/mL.', severity: 'info' },
]

// ─── Simulation ────────────────────────────────────────────────────────────────

function simulateOutcomes(
  baseline: RiskScore,
  iv: Intervention,
  days = 90,
): OutcomePoint[] {
  const { rejection_risk, infection_risk, graft_survival_probability } = baseline
  const immunoNorm  = (iv.immunosuppression_level  - 50) / 100   // -0.5 to +0.5
  const lifeNorm    = (iv.lifestyle_score          - 50) / 100
  const supportNorm =  iv.supportive_therapy_level / 100

  return Array.from({ length: days + 1 }, (_, day) => {
    const t = day / days

    const baseRej  = Math.max(0.04, rejection_risk             - 0.0015 * day)
    const baseInf  = Math.max(0.04, infection_risk             - 0.0010 * day)
    const baseSurv = Math.min(0.99, graft_survival_probability + 0.0005 * day)

    const rejDelta = immunoNorm * 0.25 * t + lifeNorm * 0.06 * t + supportNorm * 0.03 * t
    const infDelta =
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
      graft_survival_baseline:    baseSurv,
      rejection_risk_baseline:    baseRej,
      infection_risk_baseline:    baseInf,
      graft_survival:             Math.min(0.99, baseSurv + survDelta),
      rejection_risk:             Math.max(0.02, baseRej  - rejDelta),
      infection_risk:             Math.max(0.02, baseInf  - infDelta),
    }
  })
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const api = {
  async getPatient(): Promise<Patient> {
    await delay(600); return { ...PATIENT }
  },
  async getLabs(): Promise<LabResult[]> {
    await delay(800); return [...LABS]
  },
  async getLatestLabs(): Promise<LabResult> {
    await delay(500); return { ...LABS[LABS.length - 1] }
  },
  async getRiskScores(): Promise<RiskScore[]> {
    await delay(700); return [...RISK_SCORES]
  },
  async getCurrentRisk(): Promise<RiskScore> {
    await delay(400); return { ...RISK_SCORES[RISK_SCORES.length - 1] }
  },
  async getMedications(): Promise<Medication[]> {
    await delay(600); return [...MEDICATIONS]
  },
  async getClinicalEvents(): Promise<ClinicalEvent[]> {
    await delay(700); return [...EVENTS]
  },
  async getDashboardSummary(): Promise<DashboardSummary> {
    await delay(900)
    const ms = Date.now() - new Date(PATIENT.transplant_date).getTime()
    return {
      patient:               { ...PATIENT },
      latest_labs:           { ...LABS[LABS.length - 1] },
      current_risk:          { ...RISK_SCORES[RISK_SCORES.length - 1] },
      current_medications:   [...MEDICATIONS],
      days_post_transplant:  Math.floor(ms / 86_400_000),
    }
  },
  async simulateIntervention(iv: Intervention): Promise<OutcomePoint[]> {
    await delay(900)
    return simulateOutcomes(RISK_SCORES[RISK_SCORES.length - 1], iv)
  },
}
