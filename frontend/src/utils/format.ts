import type { RiskLevel } from '../types'

export const fmt = {
  date(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  },
  dateShort(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  },
  pct(v: number, dec = 1): string {
    return `${(v * 100).toFixed(dec)}%`
  },
  num(v: number, dec = 1): string {
    return v.toFixed(dec)
  },
  days(n: number): string {
    if (n < 30)  return `${n} days`
    if (n < 365) return `${Math.floor(n / 30)} mo ${n % 30} d`
    return `${Math.floor(n / 365)} yr ${Math.floor((n % 365) / 30)} mo`
  },
}

export function riskColor(v: number): string {
  if (v < 0.30) return '#2E7D32'
  if (v < 0.55) return '#E65100'
  return '#B71C1C'
}

export function riskBg(v: number): string {
  if (v < 0.30) return '#E8F5E9'
  if (v < 0.55) return '#FFF3E0'
  return '#FFEBEE'
}

export function levelColor(level: RiskLevel): string {
  return level === 'low' ? '#2E7D32' : level === 'moderate' ? '#E65100' : '#B71C1C'
}

export function levelBg(level: RiskLevel): string {
  return level === 'low' ? '#E8F5E9' : level === 'moderate' ? '#FFF3E0' : '#FFEBEE'
}

export type LabStatus = 'normal' | 'elevated' | 'critical'

export function labStatus(v: number, lo: number, hi: number): LabStatus {
  if (v >= lo && v <= hi) return 'normal'
  if (v > hi * 3 || v < lo * 0.4) return 'critical'
  return 'elevated'
}

export const LAB_RANGES = {
  alt:        { lo: 7,   hi: 56,   unit: 'U/L',  label: 'ALT' },
  ast:        { lo: 10,  hi: 40,   unit: 'U/L',  label: 'AST' },
  bilirubin:  { lo: 0.2, hi: 1.2,  unit: 'mg/dL',label: 'Bilirubin' },
  creatinine: { lo: 0.7, hi: 1.3,  unit: 'mg/dL',label: 'Creatinine' },
  ggt:        { lo: 9,   hi: 48,   unit: 'U/L',  label: 'GGT' },
  inr:        { lo: 0.8, hi: 1.2,  unit: '',     label: 'INR' },
  albumin:    { lo: 3.5, hi: 5.0,  unit: 'g/dL', label: 'Albumin' },
  wbc:        { lo: 4.5, hi: 11.0, unit: 'K/μL', label: 'WBC' },
} as const
