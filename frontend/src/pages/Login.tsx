import { useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { theme } from '../styles/theme'

export default function Login() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [showPwd,  setShowPwd]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      await login(email.trim().toLowerCase(), password, remember)
      navigate(from, { replace: true })
    } catch (err) {
      setError((err as Error).message ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0D1B2A 0%, #1A2B45 50%, #0D1B2A 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 14px',
            background: `linear-gradient(135deg, ${theme.color.primary}, ${theme.color.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(21,101,192,0.4)',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8 2 5 5.5 5 9c0 5 7 13 7 13s7-8 7-13c0-3.5-3-7-7-7z"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#F0F4F8' }}>
            Liver Digital Twin
          </div>
          <div style={{ fontSize: 13, color: '#90A4AE', marginTop: 4 }}>
            Clinical AI Platform · Secure Access
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          padding: '32px 28px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F0F4F8', margin: '0 0 6px' }}>
            Doctor Login
          </h2>
          <p style={{ fontSize: 13, color: '#90A4AE', margin: '0 0 24px' }}>
            Enter your credentials to access the clinical platform.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#B0BEC5', marginBottom: 7 }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                required
                autoComplete="email"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 14px',
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${error ? '#EF5350' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 8,
                  color: '#F0F4F8', fontSize: 14, outline: 'none',
                  transition: 'border-color .15s',
                }}
                onFocus={e => { e.target.style.borderColor = theme.color.primary + '80' }}
                onBlur={e => { e.target.style.borderColor = error ? '#EF5350' : 'rgba(255,255,255,0.12)' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 18, position: 'relative' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#B0BEC5', marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '11px 40px 11px 14px',
                    background: 'rgba(255,255,255,0.07)',
                    border: `1px solid ${error ? '#EF5350' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 8,
                    color: '#F0F4F8', fontSize: 14, outline: 'none',
                    transition: 'border-color .15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = theme.color.primary + '80' }}
                  onBlur={e => { e.target.style.borderColor = error ? '#EF5350' : 'rgba(255,255,255,0.12)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#90A4AE', padding: 0, display: 'flex',
                  }}
                >
                  {showPwd ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={{ accentColor: theme.color.primary, width: 14, height: 14, cursor: 'pointer' }}
              />
              <label htmlFor="remember" style={{ fontSize: 13, color: '#90A4AE', cursor: 'pointer', userSelect: 'none' }}>
                Remember me for 7 days
              </label>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: 'rgba(239,83,80,0.12)', border: '1px solid rgba(239,83,80,0.25)',
                fontSize: 13, color: '#EF9A9A',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                width: '100%', padding: '13px',
                background: loading || !email || !password
                  ? 'rgba(21,101,192,0.4)'
                  : `linear-gradient(135deg, ${theme.color.primary}, #1976D2)`,
                border: 'none', borderRadius: 8,
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
                transition: 'opacity .15s',
                letterSpacing: '0.03em',
              }}
            >
              {loading ? 'Authenticating…' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div style={{
          marginTop: 18, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#78909C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Demo Credentials
          </div>
          <div style={{ fontSize: 12, color: '#90A4AE' }}>
            admin@hospital.com &nbsp;·&nbsp; <span style={{ color: '#B0BEC5' }}>admin1234</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#546E7A' }}>
          Protected by hospital-grade security · All access is logged
        </div>
      </div>
    </div>
  )
}
