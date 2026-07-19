export type RiskLevel    = 'low' | 'moderate' | 'high';
export type Gender       = 'M' | 'F';
export type DonorType    = 'Deceased' | 'Living';
export type EventType    = 'labs' | 'biopsy' | 'medication_change' | 'episode' | 'visit';
export type MedCategory  = 'immunosuppressant' | 'antiviral' | 'antibiotic' | 'supportive';
export type EventSeverity = RiskLevel | 'info';

export interface Patient {
  id:               string;
  name:             string;
  age:              number;
  gender:           Gender;
  transplant_date:  string;
  blood_type:       string;
  donor_type:       DonorType;
  physician:        string;
  diagnosis:        string;
  mrn:              string;
  weight_kg:        number;
  height_cm:        number;
}

// ── WLT database patient (matches the Django Patient model) ───────────────────
export interface WLTPatient {
  id:                      number;
  patient_id:              string;
  name:                    string;
  sex:                     1 | 2 | null;
  sex_display:             string;
  age:                     number | null;
  status:                  'Alive' | 'Dead' | '';
  operation_date:          string | null;   // ISO date
  hospitalization_number:  string;
  diagnosis_pathological:  number | null;
  diagnosis_etiological:   number | null;
  diagnosis_coexisting:    number | null;
  bmi:                     number | null;
  meld_score:              number | null;
  child_pugh_score:        number | null;
  child_pugh_category:     'A' | 'B' | 'C' | '';
  cold_ischemia_time:      number | null;
  warm_ischemia_time:      number | null;
  operative_time:          number | null;
  anhepatic_phase_time:    number | null;
  intraoperative_bleeding: number | null;
  intubation_time:         number | null;
  icu_days:                number | null;
  postop_hospital_days:    number | null;
  // ── Transplant Program (new architecture) ────────────────────────────────
  transplant_program:      string;  // WHOLE_LIVER | SPLIT_LIVER | LDLT | …
  graft_type:              string;  // WHOLE | LEFT_LOBE | RIGHT_LOBE | …
  donor_type:              string;  // LIVING | DECEASED | UNKNOWN
  grwr:                    number | null;
  estimated_regeneration:  number | null;
  // ── Graft metrics ─────────────────────────────────────────────────────────
  graft_weight:            number | null;
  recipient_weight:        number | null;
  graft_volume:            number | null;
  surgeon:                 string;
  surgical_team:           string;
  transplant_center:       string;
  // ── Legacy + SLT-specific ─────────────────────────────────────────────────
  transplant_type:         'WLT' | 'SLT';
  rolf_days:               number | null;
  split_composition:       string;
  split_etiology:          string;
  preop_complications:     string;
  // ── Serializer extras ─────────────────────────────────────────────────────
  mrn:                     string;
  is_critical:             boolean;
}

export type WLTTimepoint = 'preop' | 'surgery' | 'week1' | 'month1' | 'year1'

export const TIMEPOINT_ORDER: WLTTimepoint[] = ['preop', 'surgery', 'week1', 'month1', 'year1']

export const TIMEPOINT_LABELS: Record<WLTTimepoint, string> = {
  preop:   'Pre-operative',
  surgery: 'Intraoperative',
  week1:   'Week 1 Post-op',
  month1:  'Month 1 Post-op',
  year1:   'Year 1 Post-op',
}

export interface PatientTimepoint {
  id:                  number;
  timepoint:           WLTTimepoint;
  timepoint_label:     string;
  date:                string | null;
  // Liver
  alt:                 number | null;
  ast:                 number | null;
  bilirubin:           number | null;
  ggt:                 number | null;
  alp:                 number | null;
  // Renal
  creatinine:          number | null;
  urea:                number | null;
  // Synthesis
  inr:                 number | null;
  albumin:             number | null;
  // Haematology
  wbc:                 number | null;
  hemoglobin:          number | null;
  platelets:           number | null;
  // Scores
  meld_score:          number | null;
  child_pugh_score:    number | null;
  child_pugh_category: string;
  // Post-op
  tacrolimus_level:    number | null;
  rejection_episode:   boolean | null;
  rejection_grade:     string;
  notes:               string;
}

export interface WLTPatientList {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  WLTPatient[];
}

export interface LabResult {
  date:        string;
  alt:         number;
  ast:         number;
  bilirubin:   number;
  creatinine:  number;
  ggt:         number;
  inr:         number;
  albumin:     number;
  wbc:         number;
}

export interface RiskScore {
  date:                         string;
  rejection_risk:               number;
  infection_risk:               number;
  graft_survival_probability:   number;
  overall_risk:                 RiskLevel;
}

export interface MortalityRiskContribution {
  label:              string;
  contribution_pct:   number;
  direction:           'increases_risk' | 'decreases_risk';
}

export interface MortalityRiskModelInfo {
  features:     string[];
  n_events:     number;
  n_total:      number;
  cv_auc:       number;
  trained_at:   string;
  caveat:       string;
}

export interface MortalityRiskResponse {
  available:      true;
  probability:    number;
  risk_band:      'low' | 'moderate' | 'high';
  contributions:  MortalityRiskContribution[];
  model_info:     MortalityRiskModelInfo;
}

export interface RiskUnavailableResponse {
  available: false;
  reason:    string;
}

export type PredictionResponse<T extends { available: true }> = T | RiskUnavailableResponse;

export interface Intervention {
  immunosuppression_level:   number;
  antiviral_flag:            boolean;
  lifestyle_score:           number;
  antibiotic_flag:           boolean;
  supportive_therapy_level:  number;
}

export interface OutcomePoint {
  day:                          number;
  graft_survival:               number;
  rejection_risk:               number;
  infection_risk:               number;
  graft_survival_baseline:      number;
  rejection_risk_baseline:      number;
  infection_risk_baseline:      number;
}

export interface ClinicalEvent {
  date:         string;
  type:         EventType;
  title:        string;
  description:  string;
  severity:     EventSeverity;
}

export interface Medication {
  name:        string;
  dose:        string;
  frequency:   string;
  category:    MedCategory;
  start_date:  string;
}

export interface DashboardSummary {
  patient:               Patient;
  latest_labs:           LabResult;
  current_risk:          RiskScore;
  current_medications:   Medication[];
  days_post_transplant:  number;
}

// ── Doctor / Auth ─────────────────────────────────────────────────────────────
export type DoctorRole = 'doctor' | 'nurse' | 'admin' | 'researcher'

export interface DoctorProfile {
  id:         number;
  email:      string;
  first_name: string;
  last_name:  string;
  full_name:  string;
  hospital:   string;
  department: string;
  specialty:  string;
  role:       DoctorRole;
  is_active:  boolean;
  last_login: string | null;
  created_at: string;
}

export interface AuthTokens {
  access:  string;
  refresh: string;
}

// ── Doctor Dashboard ─────────────────────────────────────────────────────────
export interface DoctorStats {
  assigned_patients:    number
  alive_patients:       number
  critical_patients:    number
  today_appointments:   number
  pending_reviews:      number
  avg_meld:             number
  avg_age:              number
  total_cohort:         number
  // Transplant program breakdown
  whole_liver_count:    number
  split_liver_count:    number
  living_donor_count:   number
  deceased_donor_count: number
  avg_grwr:             number
  avg_regeneration:     number
}

export interface CriticalPatientSummary {
  id:         number
  patient_id: string
  name:       string
  age:        number | null
  meld_score: number | null
  child_pugh: string
  status:     string
}

export interface TodayAppointment {
  id:         number
  patient:    string
  patient_id: string
  type:       string
  time:       string
  status:     string
}

export interface DoctorAlert {
  id:       number
  title:    string
  message:  string
  priority: string
  patient:  string
  time:     string
}

export interface DoctorDashboardData {
  doctor: {
    name:       string
    role:       string
    email:      string
    specialty:  string
    department: string
    hospital:   string
  }
  stats:              DoctorStats
  critical_patients:  CriticalPatientSummary[]
  today_appointments: TodayAppointment[]
  recent_alerts:      DoctorAlert[]
}

// ── Hospital Analytics ────────────────────────────────────────────────────────
export interface HospitalKPIs {
  total_patients:       number;
  alive_patients:       number;
  deceased_patients:    number;
  high_risk:            number;
  critical:             number;
  survival_rate:        number;
  avg_meld:             number;
  avg_age:              number;
  whole_liver_count:    number;
  split_liver_count:    number;
  living_donor_count:   number;
  deceased_donor_count: number;
}

export interface DistributionItem {
  label: string;
  value: number;
  fill?: string;
}

export interface AgeGroupItem {
  label: string;
  count: number;
}

export interface OpsYearItem {
  year:  number;
  count: number;
}

export interface SurvivalYearItem {
  year:  number;
  rate:  number;
  total: number;
  alive: number;
}

export interface ActivityItem {
  type:      string;
  title:     string;
  subtitle:  string;
  timestamp: string;
  icon:      string;
}

export interface HospitalStats {
  kpis: HospitalKPIs;
  distributions: {
    sex:        DistributionItem[];
    child_pugh: DistributionItem[];
    outcome:    DistributionItem[];
    age_groups: AgeGroupItem[];
    meld_groups: AgeGroupItem[];
  };
  temporal: {
    ops_by_year:      OpsYearItem[];
    survival_by_year: SurvivalYearItem[];
  };
  recent_activity: ActivityItem[];
}

// ── Notifications ─────────────────────────────────────────────────────────────
export type NotificationType     = 'critical_patient' | 'lab_alert' | 'medication_alert' | 'system' | 'info'
export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low'

export interface AppNotification {
  id:             number;
  type:           NotificationType;
  priority:       NotificationPriority;
  title:          string;
  message:        string;
  patient_db_id:  number | null;
  patient_name:   string;
  is_read:        boolean;
  created_at:     string;
}

export interface NotificationList {
  count:        number;
  unread_count: number;
  results:      AppNotification[];
}

export type SummaryStatus  = 'stable' | 'monitoring' | 'concern' | 'critical'
export type FindingStatus  = 'normal' | 'mild' | 'moderate' | 'severe'
export type RecommPriority = 'routine' | 'monitor' | 'urgent'

export interface ClinicalFinding {
  category: string;
  status:   FindingStatus;
  text:     string;
  detail:   string;
}

export interface ClinicalRecommendation {
  priority: RecommPriority;
  text:     string;
}

export interface RiskFlag {
  flag:     string;
  severity: string;
  text:     string;
}

export interface ClinicalSummary {
  overall_status:    SummaryStatus;
  assessment:        string;
  findings:          ClinicalFinding[];
  recommendations:   ClinicalRecommendation[];
  risk_flags:        RiskFlag[];
  data_completeness: {
    pre_operative:  boolean;
    intraoperative: boolean;
    post_operative: boolean;
    laboratory:     boolean;
  };
}
