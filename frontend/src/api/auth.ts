import type { DoctorProfile, AuthTokens } from '../types'
import { BASE as API_BASE } from './client'

const BASE = `${API_BASE}/auth`

async function req<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const r = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    const msg = (body as Record<string, string>).detail ?? `HTTP ${r.status}`
    throw new Error(msg)
  }
  if (r.status === 204) return undefined as T
  return r.json() as Promise<T>
}

export const authApi = {
  login(email: string, password: string): Promise<AuthTokens & { doctor: DoctorProfile }> {
    return req('/login/', { method: 'POST', body: JSON.stringify({ email, password }) })
  },

  logout(refreshToken: string, accessToken: string): Promise<void> {
    return req('/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    }, accessToken)
  },

  refresh(refreshToken: string): Promise<{ access: string }> {
    return req('/refresh/', { method: 'POST', body: JSON.stringify({ refresh: refreshToken }) })
  },

  me(accessToken: string): Promise<DoctorProfile> {
    return req('/me/', {}, accessToken)
  },

  updateMe(data: Partial<DoctorProfile>, accessToken: string): Promise<DoctorProfile> {
    return req('/me/', { method: 'PUT', body: JSON.stringify(data) }, accessToken)
  },

  changePassword(
    current: string, next: string, confirm: string,
    accessToken: string,
  ): Promise<{ detail: string }> {
    return req('/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      }),
    }, accessToken)
  },
}
