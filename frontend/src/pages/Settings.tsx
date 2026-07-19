import { useState, type FormEvent } from 'react'
import { theme } from '../styles/theme'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { authApi } from '../api/auth'

// ── Section card ───────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: theme.color.surface,
      border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.lg,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${theme.color.border}`,
        background: theme.color.bg,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: theme.color.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

// ── Form field ─────────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', disabled = false, placeholder = '',
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; disabled?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '8px 12px',
          background: disabled ? theme.color.bg : theme.color.surface,
          border: `1px solid ${theme.color.border}`,
          borderRadius: theme.r.sm,
          fontSize: 13, color: disabled ? theme.color.muted : theme.color.text,
          outline: 'none',
        }}
        onFocus={e => !disabled && (e.target.style.borderColor = theme.color.primary)}
        onBlur={e => (e.target.style.borderColor = theme.color.border)}
      />
    </div>
  )
}

// ── Profile edit section ───────────────────────────────────────────────────────
function ProfileSection() {
  const { doctor, access, refreshToken } = useAuth()
  const [form, setForm] = useState({
    first_name:  doctor?.first_name ?? '',
    last_name:   doctor?.last_name ?? '',
    hospital:    doctor?.hospital ?? '',
    department:  doctor?.department ?? '',
    specialty:   doctor?.specialty ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [msg,    setMsg]      = useState<{ ok: boolean; text: string } | null>(null)

  if (!doctor) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      let token = access
      if (!token) token = await refreshToken()
      if (!token) throw new Error('Not authenticated')
      await authApi.updateMe(form, token)
      setMsg({ ok: true, text: 'Profile updated successfully.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Profile" subtitle="Update your personal and institutional information">
      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="First Name" value={form.first_name} onChange={v => setForm(f => ({ ...f, first_name: v }))} />
        <Field label="Last Name"  value={form.last_name}  onChange={v => setForm(f => ({ ...f, last_name: v }))} />
        <Field label="Email" value={doctor.email} disabled />
        <Field label="Role" value={doctor.role.charAt(0).toUpperCase() + doctor.role.slice(1)} disabled />
        <Field label="Hospital"   value={form.hospital}   onChange={v => setForm(f => ({ ...f, hospital: v }))} />
        <Field label="Department" value={form.department} onChange={v => setForm(f => ({ ...f, department: v }))} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Specialty" value={form.specialty} onChange={v => setForm(f => ({ ...f, specialty: v }))} />
        </div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '8px 20px', borderRadius: theme.r.sm,
              background: theme.color.primary, color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {msg && (
            <span style={{ fontSize: 12, fontWeight: 600, color: msg.ok ? theme.color.success : theme.color.danger }}>
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </Section>
  )
}

// ── Change password section ────────────────────────────────────────────────────
function PasswordSection() {
  const { access, refreshToken } = useAuth()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [show, setShow] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (form.next !== form.confirm) {
      setMsg({ ok: false, text: 'New passwords do not match.' })
      return
    }
    if (form.next.length < 8) {
      setMsg({ ok: false, text: 'Password must be at least 8 characters.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      let token = access
      if (!token) token = await refreshToken()
      if (!token) throw new Error('Not authenticated')
      await authApi.changePassword(form.current, form.next, form.confirm, token)
      setMsg({ ok: true, text: 'Password changed successfully.' })
      setForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to change password.' })
    } finally {
      setSaving(false)
    }
  }

  const inputType = show ? 'text' : 'password'

  return (
    <Section title="Security" subtitle="Change your account password">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>
        <Field label="Current Password" value={form.current} onChange={v => setForm(f => ({ ...f, current: v }))} type={inputType} />
        <Field label="New Password"     value={form.next}    onChange={v => setForm(f => ({ ...f, next: v }))}    type={inputType} placeholder="Minimum 8 characters" />
        <Field label="Confirm Password" value={form.confirm} onChange={v => setForm(f => ({ ...f, confirm: v }))} type={inputType} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -4 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: theme.color.text2 }}>
            <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)}
              style={{ width: 14, height: 14, cursor: 'pointer' }} />
            Show passwords
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="submit"
            disabled={saving || !form.current || !form.next || !form.confirm}
            style={{
              padding: '8px 20px', borderRadius: theme.r.sm,
              background: theme.color.primary, color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 600,
              cursor: saving || !form.current || !form.next || !form.confirm ? 'default' : 'pointer',
              opacity: saving || !form.current || !form.next || !form.confirm ? 0.6 : 1,
            }}
          >
            {saving ? 'Updating…' : 'Change Password'}
          </button>
          {msg && (
            <span style={{ fontSize: 12, fontWeight: 600, color: msg.ok ? theme.color.success : theme.color.danger }}>
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </Section>
  )
}

// ── Appearance section ─────────────────────────────────────────────────────────
function AppearanceSection() {
  const { mode, toggle } = useTheme()
  const isDark = mode === 'dark'

  return (
    <Section title="Appearance" subtitle="Customize the interface theme">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>Dark Mode</div>
            <div style={{ fontSize: 12, color: theme.color.muted, marginTop: 2 }}>Switch between light and dark interface</div>
          </div>
          <button
            onClick={toggle}
            style={{
              width: 52, height: 28, borderRadius: 14,
              background: isDark ? theme.color.primary : theme.color.border,
              border: 'none', cursor: 'pointer', position: 'relative',
              transition: 'background .2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3,
              left: isDark ? 27 : 3,
              transition: 'left .2s',
              boxShadow: '0 1px 4px rgba(0,0,0,.2)',
            }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {(['light', 'dark'] as const).map(m => (
            <button
              key={m}
              onClick={() => { if (mode !== m) toggle() }}
              style={{
                flex: 1, padding: '12px', borderRadius: theme.r.md,
                border: `2px solid ${mode === m ? theme.color.primary : theme.color.border}`,
                background: m === 'light' ? '#F0F4F8' : '#0F1520',
                cursor: 'pointer', transition: 'border-color .15s',
              }}
            >
              <div style={{
                height: 6, background: m === 'light' ? '#FFFFFF' : '#1A2538',
                borderRadius: 3, marginBottom: 5,
                border: `1px solid ${m === 'light' ? '#E3E8EF' : '#263247'}`,
              }} />
              <div style={{
                height: 4, background: m === 'light' ? '#E3E8EF' : '#263247',
                borderRadius: 2, width: '70%',
              }} />
              <div style={{
                marginTop: 8, fontSize: 11, fontWeight: 600,
                color: mode === m ? theme.color.primary : theme.color.muted,
                textTransform: 'capitalize',
              }}>
                {m === mode ? `${m} (active)` : m}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ── Account info section ───────────────────────────────────────────────────────
function AccountInfoSection() {
  const { doctor } = useAuth()
  if (!doctor) return null

  return (
    <Section title="Account Info" subtitle="Read-only account details">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          ['Account ID', String(doctor.id)],
          ['Role',       doctor.role.charAt(0).toUpperCase() + doctor.role.slice(1)],
          ['Status',     doctor.is_active ? 'Active' : 'Inactive'],
          ['Last Login', doctor.last_login ? new Date(doctor.last_login).toLocaleString() : '—'],
          ['Member Since', new Date(doctor.created_at).toLocaleDateString()],
          ['Email', doctor.email],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 11, fontWeight: 600, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, color: theme.color.text }}>{value}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function Settings() {
  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>Settings</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          Account, security, and application preferences
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <ProfileSection />
        <PasswordSection />
        <AppearanceSection />
        <AccountInfoSection />
      </div>
    </div>
  )
}
