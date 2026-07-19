/**
 * Central configuration for all transplant programs.
 * Adding a new program requires only a new entry in TRANSPLANT_PROGRAMS.
 * Everything else (badges, filters, dashboard, digital twin) derives from this.
 */

export type ProgramKey =
  | 'WHOLE_LIVER'
  | 'SPLIT_LIVER'
  | 'LDLT'
  | 'PEDIATRIC'
  | 'RETRANSPLANT'
  | 'AUXILIARY'
  | 'DOMINO'

export type GraftType =
  | 'WHOLE'
  | 'LEFT_LOBE'
  | 'RIGHT_LOBE'
  | 'LEFT_LATERAL'
  | 'EXTENDED_RIGHT'
  | 'UNKNOWN'

export type DonorType = 'LIVING' | 'DECEASED' | 'UNKNOWN'

export interface ProgramFeatures {
  regenerationTracking: boolean
  grwrMonitoring:       boolean
  splitGraftView:       boolean
  fullLiverView:        boolean
}

export interface ProgramConfig {
  key:         ProgramKey
  label:       string
  shortLabel:  string
  color:       string
  light:       string
  border:      string
  text:        string
  description: string
  aiFocus:     string[]
  features:    ProgramFeatures
}

export const TRANSPLANT_PROGRAMS: Record<ProgramKey, ProgramConfig> = {
  WHOLE_LIVER: {
    key:        'WHOLE_LIVER',
    label:      'Whole Liver Transplant',
    shortLabel: 'WLT',
    color:      '#059669',
    light:      '#ECFDF5',
    border:     '#6EE7B7',
    text:       '#065F46',
    description: 'Complete donor liver transplantation',
    aiFocus: [
      'Rejection monitoring',
      'Biliary complications',
      'Hepatic artery thrombosis',
      'Portal vein thrombosis',
      'Immunosuppression optimization',
      'Long-term graft survival',
    ],
    features: {
      regenerationTracking: false,
      grwrMonitoring:       false,
      splitGraftView:       false,
      fullLiverView:        true,
    },
  },

  SPLIT_LIVER: {
    key:        'SPLIT_LIVER',
    label:      'Split Liver Transplant',
    shortLabel: 'SLT',
    color:      '#1565C0',
    light:      '#EFF6FF',
    border:     '#93C5FD',
    text:       '#1E3A8A',
    description: 'Partial graft from split donor liver',
    aiFocus: [
      'Liver regeneration',
      'Small-for-size syndrome',
      'Volume prediction',
      'Portal hyperperfusion',
      'Functional recovery',
      'Future graft growth',
    ],
    features: {
      regenerationTracking: true,
      grwrMonitoring:       true,
      splitGraftView:       true,
      fullLiverView:        false,
    },
  },

  LDLT: {
    key:        'LDLT',
    label:      'Living Donor Liver Transplant',
    shortLabel: 'LDLT',
    color:      '#7C3AED',
    light:      '#F5F3FF',
    border:     '#C4B5FD',
    text:       '#4C1D95',
    description: 'Living donor partial liver transplantation',
    aiFocus: [
      'Donor safety monitoring',
      'Graft regeneration',
      'Portal flow optimization',
      'Immunosuppression',
    ],
    features: {
      regenerationTracking: true,
      grwrMonitoring:       true,
      splitGraftView:       true,
      fullLiverView:        false,
    },
  },

  PEDIATRIC: {
    key:        'PEDIATRIC',
    label:      'Pediatric Liver Transplant',
    shortLabel: 'PEDS',
    color:      '#0891B2',
    light:      '#ECFEFF',
    border:     '#A5F3FC',
    text:       '#164E63',
    description: 'Pediatric liver transplantation program',
    aiFocus: [
      'Growth monitoring',
      'Developmental outcomes',
      'Age-adjusted immunosuppression',
      'Rejection surveillance',
    ],
    features: {
      regenerationTracking: true,
      grwrMonitoring:       true,
      splitGraftView:       false,
      fullLiverView:        true,
    },
  },

  RETRANSPLANT: {
    key:        'RETRANSPLANT',
    label:      'Re-transplantation',
    shortLabel: 'Re-Tx',
    color:      '#DC2626',
    light:      '#FEF2F2',
    border:     '#FCA5A5',
    text:       '#7F1D1D',
    description: 'Second or subsequent liver transplantation',
    aiFocus: [
      'High rejection risk',
      'Sensitization management',
      'Survival prediction',
      'Immunosuppression escalation',
    ],
    features: {
      regenerationTracking: false,
      grwrMonitoring:       false,
      splitGraftView:       false,
      fullLiverView:        true,
    },
  },

  AUXILIARY: {
    key:        'AUXILIARY',
    label:      'Auxiliary Liver Transplant',
    shortLabel: 'AUX',
    color:      '#D97706',
    light:      '#FFFBEB',
    border:     '#FCD34D',
    text:       '#78350F',
    description: 'Auxiliary partial orthotopic liver transplantation',
    aiFocus: [
      'Native liver regeneration',
      'Immunosuppression withdrawal',
      'Auxiliary graft function',
    ],
    features: {
      regenerationTracking: true,
      grwrMonitoring:       true,
      splitGraftView:       true,
      fullLiverView:        false,
    },
  },

  DOMINO: {
    key:        'DOMINO',
    label:      'Domino Liver Transplant',
    shortLabel: 'DLT',
    color:      '#0D9488',
    light:      '#F0FDFA',
    border:     '#99F6E4',
    text:       '#134E4A',
    description: 'Domino liver transplantation procedure',
    aiFocus: [
      'Metabolic disease monitoring',
      'Graft function',
      'Long-term outcomes',
    ],
    features: {
      regenerationTracking: false,
      grwrMonitoring:       false,
      splitGraftView:       false,
      fullLiverView:        true,
    },
  },
}

export const GRAFT_LABELS: Record<string, string> = {
  WHOLE:          'Whole Liver',
  LEFT_LOBE:      'Left Lobe',
  RIGHT_LOBE:     'Right Lobe',
  LEFT_LATERAL:   'Left Lateral Segment',
  EXTENDED_RIGHT: 'Extended Right Lobe',
  UNKNOWN:        'Unspecified Graft',
}

export const DONOR_LABELS: Record<string, string> = {
  LIVING:   'Living Donor',
  DECEASED: 'Deceased Donor',
  UNKNOWN:  'Unknown',
}

export function getProgram(key: string | undefined | null): ProgramConfig {
  if (key && key in TRANSPLANT_PROGRAMS) {
    return TRANSPLANT_PROGRAMS[key as ProgramKey]
  }
  return TRANSPLANT_PROGRAMS.WHOLE_LIVER
}
