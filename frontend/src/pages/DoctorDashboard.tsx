import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDoctorDashboard } from '../api/analytics'
import { theme } from '../styles/theme'
import TransplantBadge from '../components/ui/TransplantBadge'
import { TRANSPLANT_PROGRAMS } from '../config/transplantPrograms'
import type { DoctorDashboardData, CriticalPatientSummary } from '../types'

// ── Palette helpers ────────────────────────────────────────────────────────────
function cpColor(cat: string) {
  return cat === 'A' ? { bg: '#ECFDF5', color: '#065F46' }
       : cat === 'B' ? { bg: '#FFF3E0', color: '#92400E' }
       :               { bg: '#FEF2F2', color: '#7F1D1D' }
}
function priorityColor(p: string) {
  return p === 'critical' ? { bg: '#FEF2F2', color: '#B71C1C', dot: '#DC2626' }
       : p === 'high'     ? { bg: '#FFF3E0', color: '#92400E', dot: '#F97316' }
       :                    { bg: '#EFF6FF', color: '#1E3A8A', dot: '#3B82F6' }
}
function roleLabel(role: string, t: (k: string) => string) {
  const map: Record<string, string> = {
    doctor: t('roles.surgeon'), nurse: t('roles.resident'),
    admin: t('roles.administrator'), researcher: t('roles.researcher'),
  }
  return map[role] ?? role
}

// ── Program KPI card ───────────────────────────────────────────────────────────
function ProgramCard({ program, count, sub }: { program: string; count: number; sub?: string }) {
  const cfg = TRANSPLANT_PROGRAMS[program as keyof typeof TRANSPLANT_PROGRAMS]
  if (!cfg) return null
  return (
    <div style={{
      background: cfg.light,
      border: `1px solid ${cfg.border}`,
      borderRadius: theme.r.lg,
      padding: '18px 20px',
      borderLeft: `4px solid ${cfg.color}`,
    }}>
      <div style={{ marginBottom: 8 }}>
        <TransplantBadge program={program} size="xs" />
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color: cfg.color, lineHeight: 1, marginBottom: 4 }}>
        {count}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: cfg.text }}>
        {cfg.label}
      </div>
      {sub && <div style={{ fontSize: 10, color: theme.color.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Generic stat card ─────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, accent, icon,
}: {
  label: string; value: string | number; sub?: string
  accent?: string; icon?: React.ReactNode
}) {
  return (
    <div style={{
      background: theme.color.surface,
      border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.lg,
      padding: '18px 20px',
      borderLeft: accent ? `4px solid ${accent}` : undefined,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      {icon && (
        <div style={{
          width: 38, height: 38, borderRadius: theme.r.md, flexShrink: 0,
          background: `${accent ?? theme.color.primary}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent ?? theme.color.primary,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: theme.color.text, lineHeight: 1 }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: theme.color.text2, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── Donor source bar ───────────────────────────────────────────────────────────
function DonorSplit({ living, deceased, total }: { living: number; deceased: number; total: number }) {
  const { t } = useTranslation()
  if (total === 0) return null
  const bars = [
    { label: t('dashboard.livingDonor'),   value: living,              pct: Math.round((living  / total) * 100), color: '#7C3AED' },
    { label: t('dashboard.deceasedDonor'), value: deceased,            pct: Math.round((deceased / total) * 100), color: '#0891B2' },
    { label: t('common.unknown'),          value: total - living - deceased, pct: 100 - Math.round((living + deceased) / total * 100), color: '#D1D5DB' },
  ].filter(b => b.value > 0)

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {t('dashboard.donorSource')}
      </div>
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 8, marginBottom: 12 }}>
        {bars.map(b => (
          <div key={b.label} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.label}: ${b.value}`} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {bars.map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: b.color }} />
            <span style={{ fontSize: 11, color: theme.color.text2 }}>
              {b.label} — <strong style={{ color: theme.color.text }}>{b.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Critical patient row ───────────────────────────────────────────────────────
function CriticalRow({ p, onClick }: { p: CriticalPatientSummary & { transplant_program?: string }; onClick: () => void }) {
  const cp = cpColor(p.child_pugh)
  return (
    <tr
      onClick={onClick}
      style={{ borderBottom: `1px solid ${theme.color.border}`, cursor: 'pointer' }}
      onMouseEnter={e => (e.currentTarget.style.background = theme.color.bg)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <td style={TD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, color: theme.color.text }}>{p.name}</span>
          {(p as any).transplant_program && (
            <TransplantBadge program={(p as any).transplant_program} size="xs" />
          )}
        </div>
      </td>
      <td style={TD}><span style={{ color: theme.color.muted, fontSize: 11, fontFamily: 'monospace' }}>{p.patient_id}</span></td>
      <td style={TD}>{p.age != null ? `${p.age}y` : '—'}</td>
      <td style={TD}>
        <span style={{ fontWeight: 700, color: '#B71C1C', fontSize: 14 }}>
          {p.meld_score != null ? p.meld_score.toFixed(0) : '—'}
        </span>
      </td>
      <td style={TD}>
        <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, ...cp }}>
          CP-{p.child_pugh || '?'}
        </span>
      </td>
      <td style={TD}>
        <span style={{
          padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600,
          color: p.status === 'Alive' ? '#065F46' : theme.color.danger,
          background: p.status === 'Alive' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${p.status === 'Alive' ? '#6EE7B7' : '#FCA5A5'}`,
        }}>
          {p.status || '—'}
        </span>
      </td>
    </tr>
  )
}

const TD: React.CSSProperties = { padding: '10px 12px', fontSize: 12.5, color: theme.color.text2 }

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoUsers    = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
const IcoAlert    = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
const IcoCalendar = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const IcoBar      = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>

// ── Main component ─────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const navigate              = useNavigate()
  const { t }                 = useTranslation()
  const [data, setData]       = useState<DoctorDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    getDoctorDashboard()
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', color: theme.color.muted, fontSize: 13 }}>{t('common.loading')}</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '40px 28px', color: theme.color.danger }}>
        <strong>{t('dashboard.unavailable')}</strong>
        {error && <div style={{ fontSize: 12, marginTop: 6, color: theme.color.muted }}>{error}</div>}
      </div>
    )
  }

  const { doctor, stats, critical_patients, today_appointments, recent_alerts } = data
  const critCols = [t('patients.colName'), t('patients.colId'), t('patients.colAge'), t('patients.colMeld'), t('patients.colChildPugh'), t('patients.colStatus')]

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, marginBottom: 4 }}>
            {t('dashboard.welcome', { name: doctor.name })}
          </div>
          <div style={{ fontSize: 13, color: theme.color.text2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{roleLabel(doctor.role, t)}</span>
            {doctor.specialty  && <><span style={{ color: theme.color.border }}>·</span><span>{doctor.specialty}</span></>}
            {doctor.department && <><span style={{ color: theme.color.border }}>·</span><span>{doctor.department}</span></>}
          </div>
        </div>
        <button
          onClick={() => navigate('/patients')}
          style={{ padding: '9px 20px', borderRadius: theme.r.md, fontSize: 13, fontWeight: 600, background: theme.color.primary, color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {t('dashboard.viewRegistry')}
        </button>
      </div>

      {/* ── Transplant Program KPIs ─────────────────────────────────────────── */}
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        {t('dashboard.transplantPrograms')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 22 }}>
        <ProgramCard program="WHOLE_LIVER" count={stats.whole_liver_count ?? 0} sub={t('dashboard.wholeOrganRecipients')} />
        <ProgramCard program="SPLIT_LIVER" count={stats.split_liver_count  ?? 0} sub={t('dashboard.partialGraftRecipients')} />
      </div>

      {/* ── Clinical KPIs ──────────────────────────────────────────────────── */}
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
        {t('dashboard.clinicalOverview')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <StatCard label={t('dashboard.assignedPatients')} value={stats.assigned_patients} sub={t('dashboard.aliveCount', { n: stats.alive_patients })} accent={theme.color.primary} icon={IcoUsers} />
        <StatCard label={t('dashboard.criticalPatients')} value={stats.critical_patients} sub={t('dashboard.meldCpThreshold')} accent="#DC2626" icon={IcoAlert} />
        <StatCard label={t('dashboard.todayFollowup')}    value={stats.today_appointments} sub={t('dashboard.scheduledAppointments')} accent="#7C3AED" icon={IcoCalendar} />
        <StatCard label={t('dashboard.avgMeld')}          value={stats.avg_meld}           sub={t('dashboard.avgAgeLabel', { n: stats.avg_age })} accent="#D97706" icon={IcoBar} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        <StatCard label={t('research.cohortSize')} value={stats.total_cohort}    sub={t('dashboard.totalPatients')} />
        <StatCard label={t('dashboard.pendingReviews')}  value={stats.pending_reviews} sub={t('dashboard.criticalAlive')} accent="#E65100" />
        <StatCard label={t('dashboard.avgGrwr')}         value={stats.avg_grwr > 0 ? `${stats.avg_grwr.toFixed(2)}%` : '—'} sub={t('dashboard.graftToRecipient')} />
        <StatCard label={t('dashboard.avgRegen')}        value={stats.avg_regeneration > 0 ? `${stats.avg_regeneration.toFixed(1)}%` : '—'} sub={t('dashboard.estimatedRegrowth')} />
      </div>

      {/* ── Two-column body ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(260px, 360px)', gap: 20, alignItems: 'start' }}>

        {/* Left — critical patients */}
        <div style={{ background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.r.lg, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${theme.color.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: theme.color.text }}>{t('dashboard.criticalPatients')}</div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#FEF2F2', color: '#B71C1C' }}>
              {t('dashboard.patientsCount', { n: critical_patients.length })}
            </span>
          </div>
          {critical_patients.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: theme.color.muted, fontSize: 13 }}>{t('dashboard.noCriticalPatients')}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme.color.bg, borderBottom: `1px solid ${theme.color.border}` }}>
                  {critCols.map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {critical_patients.map(p => (
                  <CriticalRow key={p.id} p={p as any} onClick={() => navigate(`/patients/${p.id}`)} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Donor source */}
          <div style={{ background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.r.lg, padding: '16px 18px' }}>
            <DonorSplit living={stats.living_donor_count ?? 0} deceased={stats.deceased_donor_count ?? 0} total={stats.assigned_patients} />
          </div>

          {/* Today's appointments */}
          <div style={{ background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.r.lg, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.color.border}`, fontWeight: 700, fontSize: 13, color: theme.color.text }}>{t('dashboard.todayAppointments')}</div>
            {today_appointments.length === 0 ? (
              <div style={{ padding: '20px 18px', color: theme.color.muted, fontSize: 12 }}>{t('dashboard.noAppointments')}</div>
            ) : (
              (today_appointments as any[]).map((a, i) => (
                <div key={i} onClick={() => navigate(`/patients/${a.patient_id}`)}
                  style={{ padding: '12px 18px', borderBottom: `1px solid ${theme.color.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = theme.color.bg)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>{a.patient}</div>
                    <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 2 }}>{a.type}</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.color.primary, background: theme.color.primaryBg, padding: '2px 8px', borderRadius: 6 }}>{a.time}</span>
                </div>
              ))
            )}
          </div>

          {/* Recent alerts */}
          <div style={{ background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.r.lg, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.color.border}`, fontWeight: 700, fontSize: 13, color: theme.color.text }}>{t('dashboard.recentAlerts')}</div>
            {recent_alerts.length === 0 ? (
              <div style={{ padding: '20px 18px', color: theme.color.muted, fontSize: 12 }}>{t('dashboard.noAlerts')}</div>
            ) : (
              (recent_alerts as any[]).map(a => {
                const pc = priorityColor(a.priority)
                return (
                  <div key={a.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${theme.color.border}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: pc.dot, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.color.text }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 1 }}>{a.patient}</div>
                      <div style={{ fontSize: 10, color: theme.color.muted, marginTop: 2 }}>{a.message}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: pc.bg, color: pc.color, flexShrink: 0, marginLeft: 'auto' }}>{a.priority}</span>
                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
