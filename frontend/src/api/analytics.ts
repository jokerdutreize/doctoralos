import { apiFetch } from './client'
import type { HospitalStats, DoctorDashboardData } from '../types'

export function getHospitalStats(): Promise<HospitalStats> {
  return apiFetch('/analytics/hospital/')
}

export function getDoctorDashboard(): Promise<DoctorDashboardData> {
  return apiFetch('/analytics/me/')
}
