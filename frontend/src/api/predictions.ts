import { apiFetch } from './client'
import type { MortalityRiskResponse, RiskUnavailableResponse } from '../types'

export function getMortalityRisk(patientId: number | string): Promise<MortalityRiskResponse | RiskUnavailableResponse> {
  return apiFetch(`/predictions/patient/${patientId}/mortality-risk/`)
}

export function getRejectionRisk(patientId: number | string): Promise<RiskUnavailableResponse> {
  return apiFetch(`/predictions/patient/${patientId}/rejection-risk/`)
}

export function getInfectionRisk(patientId: number | string): Promise<RiskUnavailableResponse> {
  return apiFetch(`/predictions/patient/${patientId}/infection-risk/`)
}
