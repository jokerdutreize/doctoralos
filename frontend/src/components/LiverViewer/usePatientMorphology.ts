/**
 * Maps raw patient clinical data to concrete morphology parameters
 * that drive 3D geometry, material, and overlay generation.
 *
 * Clinical basis:
 *   Cirrhosis  → right lobe atrophies, left lobe / caudate hypertrophy
 *   Steatosis  → overall hepatomegaly, yellow tint
 *   Child-Pugh → nodularity of surface (A=smooth, B=irregular, C=nodular)
 *   HCC        → focal tumor nodule
 *   Ischemia   → purple-red discolouration, emissive glow
 *   Deceased   → grey, semi-transparent
 */

import { useMemo } from 'react'

export interface LiverViewerParams {
  // Core clinical (required)
  meldScore:            number | null
  childPughCategory:    string         // 'A' | 'B' | 'C' | ''
  diagnosisEtiological: number | null  // 1=Alcohol 2=NASH 3=HCV 4=HCC 5=PBC 6=PSC 7=AIH
  diagnosisCoexisting:  number | null  // 4 = HCC
  status:               string         // 'Alive' | 'Dead'
  patientId:            string

  // Extended (optional, used when present)
  childPughScore?:    number | null
  fibrosisStage?:     number | null  // 0–4 METAVIR
  steatosisPercent?:  number | null  // 0–100
  bilirubinTotal?:    number | null
  albumin?:           number | null
  inr?:               number | null
  creatinine?:        number | null
  platelets?:         number | null
  transplantDays?:    number | null
}

export type DiseaseStage =
  | 'healthy'
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'critical'
  | 'deceased'

export interface MorphologyParams {
  // ── Stage metadata ─────────────────────────────────────────────────────────
  stage:           DiseaseStage
  patientId:       string

  // ── Lobe geometry ──────────────────────────────────────────────────────────
  rightLobeScale:  number   // 0.72–1.0 (cirrhosis → right lobe atrophies)
  leftLobeScale:   number   // 1.0–1.40 (cirrhosis → left lobe hypertrophies)
  volumeFactor:    number   // 0.85–1.40 (steatosis → hepatomegaly)

  // ── Surface properties ─────────────────────────────────────────────────────
  nodularity:      number   // 0.0–1.0 (cirrhosis nodularity)
  roughness:       number   // 0.42–0.92 (material PBR roughness)

  // ── Color ──────────────────────────────────────────────────────────────────
  baseColor:          string
  emissiveColor:      string
  emissiveIntensity:  number

  // ── Tints ──────────────────────────────────────────────────────────────────
  steatosisTint:   number   // 0–1 yellow fat infiltration
  ischemiaTint:    number   // 0–1 purple ischaemia

  // ── Features ───────────────────────────────────────────────────────────────
  tumorPresent:       boolean
  portalHypertension: boolean
  isTransplant:       boolean
  transplantDays:     number
}

// ── Main hook ─────────────────────────────────────────────────────────────────
export function usePatientMorphology(params: LiverViewerParams): MorphologyParams {
  return useMemo(() => compute(params), [
    params.meldScore,
    params.childPughCategory,
    params.diagnosisEtiological,
    params.diagnosisCoexisting,
    params.status,
    params.fibrosisStage,
    params.steatosisPercent,
    params.transplantDays,
    params.patientId,
  ])
}

function compute(p: LiverViewerParams): MorphologyParams {
  const meld     = p.meldScore ?? 10
  const cp       = p.childPughCategory ?? ''
  const isDead   = p.status === 'Dead'
  const etiology = p.diagnosisEtiological ?? 0
  const isNASH   = etiology === 2
  const isHCV    = etiology === 3
  const isAlcoh  = etiology === 1
  const hasHCC   = p.diagnosisCoexisting === 4

  // Derive fibrosis from Child-Pugh if not explicitly provided
  const fibrosis = p.fibrosisStage
    ?? (cp === 'C' ? 4 : cp === 'B' ? 3 : cp === 'A' ? 2 : 0)

  // Derive steatosis from etiology if not explicitly provided
  const steatosis = p.steatosisPercent
    ?? (isNASH ? 45 : isAlcoh ? 20 : 0)

  const isTx       = (p.transplantDays ?? 0) > 0
  const txDays     = p.transplantDays ?? 0

  // ── Stage ─────────────────────────────────────────────────────────────────
  let stage: DiseaseStage = 'healthy'
  if (isDead)                          stage = 'deceased'
  else if (cp === 'C' || meld >= 30)   stage = 'critical'
  else if (cp === 'B' || meld >= 20)   stage = 'severe'
  else if (meld >= 15)                 stage = 'moderate'
  else if (meld >= 10 || cp === 'A')   stage = 'mild'

  // ── Lobe geometry ─────────────────────────────────────────────────────────
  // Cirrhosis: right lobe atrophies (shrinks), left lobe hypertrophies
  // Caudate lobe also hypertrophies in CP-C but we model it via leftLobeScale
  const cirrT = cp === 'C' ? 1.0 : cp === 'B' ? 0.55 : cp === 'A' ? 0.15 : 0.0
  const rightLobeScale = isTx ? 1.0 : 1.0 - 0.24 * cirrT
  const leftLobeScale  = isTx ? 1.0 : 1.0 + 0.32 * cirrT

  // Steatosis / NASH: hepatomegaly (liver enlarges with fat deposition)
  const volumeFactor = isTx
    ? Math.min(1.0, 0.9 + txDays / 180)   // graft recovers to normal size over ~6 mo
    : 1.0 + (steatosis / 100) * 0.38

  // ── Surface ───────────────────────────────────────────────────────────────
  const nodularity = isTx
    ? 0.0
    : cp === 'C' ? 0.90 : cp === 'B' ? 0.44 : fibrosis >= 3 ? 0.20 : 0.03

  const roughness = 0.44 + nodularity * 0.46

  // ── Color ─────────────────────────────────────────────────────────────────
  let baseColor: string
  if (isDead)                          baseColor = '#3a3228'
  else if (isTx)                       baseColor = '#8e241c'    // healthy graft
  else if (stage === 'critical')       baseColor = '#581010'
  else if (stage === 'severe')         baseColor = '#6c1e0e'
  else if (stage === 'moderate')       baseColor = '#7a2812'
  else if (stage === 'mild')           baseColor = '#7e2c16'
  else                                 baseColor = '#8c2016'    // healthy liver

  let emissiveColor    = '#000000'
  let emissiveIntensity = 0
  if (stage === 'critical' && !isDead) {
    emissiveColor     = '#360606'
    emissiveIntensity = 0.10
  }

  // ── Tints ─────────────────────────────────────────────────────────────────
  const steatosisTint = Math.min(1, steatosis / 65)
  const ischemiaTint  = stage === 'critical' && !isDead ? 0.35 : 0

  return {
    stage,
    patientId:         p.patientId,
    rightLobeScale,
    leftLobeScale,
    volumeFactor,
    nodularity,
    roughness,
    baseColor,
    emissiveColor,
    emissiveIntensity,
    steatosisTint,
    ischemiaTint,
    tumorPresent:       hasHCC && !isDead,
    portalHypertension: cp === 'C' || meld >= 20,
    isTransplant:       isTx,
    transplantDays:     txDays,
  }
}
