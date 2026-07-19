import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'
import { authApi } from '../api/auth'
import { tokenStore } from '../api/client'
import type { DoctorProfile, AuthTokens } from '../types'

interface AuthState {
  doctor:    DoctorProfile | null
  access:    string | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string, remember: boolean): Promise<void>
  logout(): Promise<void>
  refreshToken(): Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'dtl_refresh'

function storeRefresh(token: string, persist: boolean) {
  const store = persist ? localStorage : sessionStorage
  store.setItem(STORAGE_KEY, token)
}

function loadRefresh(): string | null {
  return localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY)
}

function clearRefresh() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // isLoading only if there's a stored refresh token to restore
  const [state, setState] = useState<AuthState>({
    doctor: null, access: null, isLoading: !!loadRefresh(),
  })

  // Keep the API client's token in sync with React state
  useEffect(() => {
    tokenStore.set(state.access)
  }, [state.access])

  // Listen for 401 responses emitted by the API client
  useEffect(() => {
    const handler = () => {
      clearRefresh()
      setState({ doctor: null, access: null, isLoading: false })
    }
    window.addEventListener('dtl:unauthorized', handler)
    return () => window.removeEventListener('dtl:unauthorized', handler)
  }, [])

  // Restore session from stored refresh token on mount
  useEffect(() => {
    const refresh = loadRefresh()
    if (!refresh) return
    authApi.refresh(refresh)
      .then(({ access }) => authApi.me(access).then(doctor => ({ access, doctor })))
      .then(({ access, doctor }) => setState({ doctor, access, isLoading: false }))
      .catch(() => {
        clearRefresh()
        setState({ doctor: null, access: null, isLoading: false })
      })
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const { access, refresh, doctor } = await authApi.login(email, password)
    storeRefresh(refresh, remember)
    setState({ doctor, access, isLoading: false })
  }, [])

  const logout = useCallback(async () => {
    const { access } = state
    const refresh = loadRefresh()
    clearRefresh()
    setState({ doctor: null, access: null, isLoading: false })
    if (access && refresh) {
      authApi.logout(refresh, access).catch(() => {})
    }
  }, [state])

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const refresh = loadRefresh()
    if (!refresh) return null
    try {
      const { access } = await authApi.refresh(refresh)
      setState(s => ({ ...s, access }))
      return access
    } catch {
      clearRefresh()
      setState({ doctor: null, access: null, isLoading: false })
      return null
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
