import { apiFetch } from './client'
import type { WLTPatient, WLTPatientList, PatientTimepoint, ClinicalSummary } from '../types'

export interface PatientListParams {
  page?:    number
  search?:  string
  program?: string   // WHOLE_LIVER | SPLIT_LIVER | LDLT | …
  donor?:   string   // LIVING | DECEASED
  graft?:   string   // LEFT_LOBE | RIGHT_LOBE | …
  risk?:    string   // high | critical
}

export const patientsApi = {
  list(pageOrParams: number | PatientListParams = 1, search = ''): Promise<WLTPatientList> {
    let params: PatientListParams
    if (typeof pageOrParams === 'number') {
      params = { page: pageOrParams, search: search || undefined }
    } else {
      params = pageOrParams
    }
    const p = new URLSearchParams({ page: String(params.page ?? 1) })
    if (params.search)  p.set('search',  params.search)
    if (params.program) p.set('program', params.program)
    if (params.donor)   p.set('donor',   params.donor)
    if (params.graft)   p.set('graft',   params.graft)
    if (params.risk)    p.set('risk',    params.risk)
    return apiFetch(`/patients/?${p}`)
  },

  search(q: string): Promise<{ results: WLTPatient[]; count: number }> {
    return apiFetch(`/patients/search/?q=${encodeURIComponent(q)}`)
  },

  listAll(): Promise<WLTPatientList> {
    return apiFetch('/patients/?page=1&page_size=500')
  },

  get(id: number | string): Promise<WLTPatient> {
    return apiFetch(`/patients/${id}/`)
  },

  critical(limit = 15): Promise<{ results: WLTPatient[]; count: number }> {
    return apiFetch(`/patients/critical/?limit=${limit}`)
  },

  getTimepoints(id: number | string): Promise<PatientTimepoint[]> {
    return apiFetch(`/patients/${id}/timepoints/`)
  },

  clinicalSummary(id: number | string): Promise<ClinicalSummary> {
    return apiFetch(`/patients/${id}/clinical-summary/`)
  },
}
