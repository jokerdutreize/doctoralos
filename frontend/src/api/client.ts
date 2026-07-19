/**
 * Centralized API client.
 * All requests automatically include the Bearer token when one is set.
 * On 401 the token is cleared and a custom DOM event fires so AuthContext
 * can log the user out without the API module depending on React.
 */

// VITE_API_BASE_URL takes precedence if set explicitly. Otherwise VITE_API_HOST
// (just the bare hostname, e.g. from Render's inter-service `fromService: host`)
// is used to build the full URL — avoids hardcoding a guessed service hostname
// that may get auto-suffixed at deploy time.
export const BASE = import.meta.env.VITE_API_BASE_URL
  ?? (import.meta.env.VITE_API_HOST ? `https://${import.meta.env.VITE_API_HOST}/api` : 'http://localhost:8000/api')

let _token: string | null = null

export const tokenStore = {
  set(t: string | null) { _token = t },
  get(): string | null   { return _token },
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  if (_token) h['Authorization'] = `Bearer ${_token}`
  return h
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = authHeaders(options.headers as Record<string, string> ?? {})
  const r = await fetch(`${BASE}${path}`, { ...options, headers })

  if (r.status === 401) {
    _token = null
    window.dispatchEvent(new Event('dtl:unauthorized'))
    throw new Error('Session expired. Please log in again.')
  }

  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    const msg  = (body as Record<string, string>).detail ?? `API error ${r.status}`
    throw new Error(msg)
  }

  if (r.status === 204) return undefined as T
  return r.json() as Promise<T>
}
