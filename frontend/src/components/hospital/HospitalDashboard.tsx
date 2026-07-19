import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useAsync } from '../../hooks/useAsync'
import { getHospitalStats } from '../../api/analytics'
import { theme } from '../../styles/theme'
import Card from '../ui/Card'
import TransplantBadge from '../ui/TransplantBadge'
import type { HospitalStats, ActivityItem } from '../../types'

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPI({
  label, value, sub, color, bg, icon,
}: {
  label: string; value: string | number; sub?: string
  color: string; bg: string; icon: React.ReactNode
}) {
  return (
    <div style={{
      background: theme.color.surface,
      border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.lg,
      padding: '16px 18px',
      boxShadow: theme.shadow.sm,
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: theme.r.md, flexShrink: 0,
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: theme.color.text, lineHeight: 1 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: theme.color.text2, marginTop: 4 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Activity icon ──────────────────────────────────────────────────────────────
function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
    registration: {
      bg: '#E3F2FD', color: theme.color.primary,
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
    },
    lab: {
      bg: '#E0F2F1', color: theme.color.accent,
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M9 3v7L4 20h16L15 10V3"/></svg>,
    },
    risk: {
      bg: '#FFF3E0', color: theme.color.warning,
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    },
    critical: {
      bg: '#FFEBEE', color: theme.color.danger,
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>,
    },
    outcome: {
      bg: '#F3E5F5', color: '#7B1FA2',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    },
    follow_up: {
      bg: '#E8F5E9', color: theme.color.success,
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    },
  }
  const m = map[type] ?? map.lab
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
      background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: m.color,
    }}>
      {m.icon}
    </div>
  )
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor(diff / 60_000)
  if (h > 24) return `${Math.floor(h / 24)}d ago`
  if (h > 0)  return `${h}h ago`
  if (m > 0)  return `${m}m ago`
  return 'just now'
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, style = {} }: { w?: string | number; h?: number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'linear-gradient(90deg, #E3E8EF 25%, #EEF2F7 50%, #E3E8EF 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }} />
  )
}

// ── Tooltip styles ─────────────────────────────────────────────────────────────
const TOOLTIP_STYLE = {
  background: theme.color.surface,
  border: `1px solid ${theme.color.border}`,
  borderRadius: 8, fontSize: 12,
  boxShadow: theme.shadow.md,
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function HospitalDashboard() {
  const { t, i18n } = useTranslation()
  const { state } = useAsync<HospitalStats>(useCallback(() => getHospitalStats(), []))

  const isLoading = state.status === 'loading'
  const data = state.status === 'success' ? state.data : null

  const today = new Date().toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  if (state.status === 'error') {
    return (
      <div style={{ padding: '40px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: theme.color.muted, marginBottom: 8 }}>
          {t('hospitalDash.loadError')}
        </div>
        <div style={{ fontSize: 12, color: theme.color.danger }}>{state.error}</div>
      </div>
    )
  }

  const kpis = data?.kpis
  const dist = data?.distributions
  const temporal = data?.temporal

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>
          {t('hospitalDash.title')}
        </h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          {today} · {t('hospitalDash.subtitle')}
        </div>
      </div>

      {/* KPI row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 14 }}>
        <KPI
          label={t('hospitalDash.totalPatients')}
          value={isLoading ? '—' : (kpis?.total_patients ?? 0)}
          sub={t('hospitalDash.totalPatientsSub')}
          color={theme.color.primary} bg={theme.color.primaryBg}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
        />
        <KPI
          label={t('hospitalDash.alivePatients')}
          value={isLoading ? '—' : `${kpis?.survival_rate ?? 0}%`}
          sub={isLoading ? undefined : `${kpis?.alive_patients ?? 0} ${t('hospitalDash.aliveFollowup')}`}
          color={theme.color.success} bg={theme.color.successBg}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
        <KPI
          label={t('hospitalDash.highRisk')}
          value={isLoading ? '—' : (kpis?.high_risk ?? 0)}
          sub={t('hospitalDash.highRiskSub')}
          color={theme.color.warning} bg={theme.color.warningBg}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
        <KPI
          label={t('hospitalDash.critical')}
          value={isLoading ? '—' : (kpis?.critical ?? 0)}
          sub={t('hospitalDash.criticalSub')}
          color={theme.color.danger} bg={theme.color.dangerBg}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
      </div>

      {/* KPI row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KPI
          label={t('hospitalDash.avgMeld')}
          value={isLoading ? '—' : (kpis?.avg_meld ?? 0)}
          sub={t('hospitalDash.avgMeldSub')}
          color="#7B1FA2" bg="#F3E5F5"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>}
        />
        <KPI
          label={t('hospitalDash.avgAge')}
          value={isLoading ? '—' : `${kpis?.avg_age ?? 0}y`}
          sub={t('hospitalDash.avgAgeSub')}
          color="#37474F" bg="#ECEFF1"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
        />
        <KPI
          label={t('hospitalDash.deceased')}
          value={isLoading ? '—' : (kpis?.deceased_patients ?? 0)}
          sub={t('hospitalDash.deceasedSub')}
          color="#B71C1C" bg="#FFEBEE"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
        />
        <KPI
          label={t('hospitalDash.followupRate')}
          value={isLoading ? '—' : `${kpis ? Math.round((kpis.alive_patients / kpis.total_patients) * 100) : 0}%`}
          sub={t('hospitalDash.followupRateSub')}
          color={theme.color.accent} bg={theme.color.accentBg}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
      </div>

      {/* ── Transplant program KPIs ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          {t('hospitalDash.transplantPrograms')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { program: 'WHOLE_LIVER', count: kpis?.whole_liver_count ?? 0, sub: t('dashboard.wholeOrganRecipients'),  color: '#059669', light: '#ECFDF5', border: '#6EE7B7' },
            { program: 'SPLIT_LIVER', count: kpis?.split_liver_count ?? 0, sub: t('dashboard.partialGraftRecipients'), color: '#1565C0', light: '#EFF6FF', border: '#93C5FD' },
            { program: 'LIVING',      count: kpis?.living_donor_count ?? 0,   sub: t('hospitalDash.livingDonorProc'),  color: '#7C3AED', light: '#F5F3FF', border: '#C4B5FD', label: t('dashboard.livingDonor') },
            { program: 'DECEASED',    count: kpis?.deceased_donor_count ?? 0, sub: t('hospitalDash.deceasedDonorProc'), color: '#0891B2', light: '#ECFEFF', border: '#A5F3FC', label: t('dashboard.deceasedDonor') },
          ].map(({ program, count, sub, color, light, border, label }) => (
            <div key={program} style={{
              background: isLoading ? theme.color.surface : light,
              border: `1px solid ${isLoading ? theme.color.border : border}`,
              borderRadius: theme.r.lg, padding: '16px 18px',
              borderLeft: `4px solid ${color}`,
            }}>
              <div style={{ marginBottom: 6 }}>
                {['WHOLE_LIVER', 'SPLIT_LIVER'].includes(program)
                  ? <TransplantBadge program={program} size="xs" />
                  : <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999, color, background: light, border: `1px solid ${border}` }}>
                      {label}
                    </span>
                }
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1, marginBottom: 3 }}>
                {isLoading ? '—' : count}
              </div>
              <div style={{ fontSize: 11, color: theme.color.text2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts row + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: 18, marginBottom: 18 }}>

        {/* Operations by year — WLT vs SLT stacked */}
        <Card title={t('hospitalDash.transplantsByYear')} subtitle={t('hospitalDash.wltSltByYear')}>
          {isLoading ? <Skeleton h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={temporal?.ops_by_year ?? []} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.color.chartGrid} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.color.muted }} />
                <YAxis tick={{ fontSize: 11, fill: theme.color.muted }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="wlt" stackId="a" fill="#059669" name="WLT" radius={[0, 0, 0, 0]} />
                <Bar dataKey="slt" stackId="a" fill="#1565C0" name="SLT" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Survival rate by year */}
        <Card title={t('hospitalDash.survivalRate')} subtitle={t('hospitalDash.survivalRateSub')}>
          {isLoading ? <Skeleton h={200} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={temporal?.survival_by_year ?? []} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="survGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={theme.color.success} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={theme.color.success} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.color.chartGrid} vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: theme.color.muted }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: theme.color.muted }} unit="%" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, t('hospitalDash.survivalPct')]} />
                <Area type="monotone" dataKey="rate" stroke={theme.color.success} fill="url(#survGrad)" strokeWidth={2} dot={{ r: 4, fill: theme.color.success }} name={t('hospitalDash.survivalPct')} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Activity feed */}
        <Card title={t('hospitalDash.recentActivity')} subtitle={t('hospitalDash.recentActivitySub')}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3,4].map(i => <Skeleton key={i} h={44} />)}
            </div>
          ) : (data?.recent_activity ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: theme.color.muted, textAlign: 'center', padding: '20px 0' }}>
              {t('hospitalDash.noActivity')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(data?.recent_activity ?? []).slice(0, 8).map((item: ActivityItem, i: number) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '9px 0',
                  borderBottom: i < 7 ? `1px solid ${theme.color.border}` : 'none',
                }}>
                  <ActivityIcon type={item.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: theme.color.text, lineHeight: 1.4 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 2 }}>
                      {item.subtitle} · {timeAgo(item.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Second chart row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>

        {/* Age distribution */}
        <Card title={t('hospitalDash.ageDist')} subtitle={t('hospitalDash.ageDistSub')}>
          {isLoading ? <Skeleton h={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dist?.age_groups ?? []} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.color.chartGrid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: theme.color.muted }} />
                <YAxis tick={{ fontSize: 10, fill: theme.color.muted }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#7B1FA2" radius={[4, 4, 0, 0]} name={t('hospitalDash.patients')} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Child-Pugh distribution */}
        <Card title={t('hospitalDash.cpDist')} subtitle={t('hospitalDash.cpDistSub')}>
          {isLoading ? <Skeleton h={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={dist?.child_pugh ?? []}
                  dataKey="value"
                  nameKey="label"
                  cx="50%" cy="50%"
                  innerRadius={44} outerRadius={70}
                  paddingAngle={3}
                  label={({ label, value }) => `${label} (${value})`}
                  labelLine={false}
                >
                  {(dist?.child_pugh ?? []).map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Sex + Outcome pies */}
        <Card title={t('hospitalDash.cohortOverview')} subtitle={t('hospitalDash.cohortOverviewSub')}>
          {isLoading ? <Skeleton h={180} /> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                {/* Outer: outcome */}
                <Pie data={dist?.outcome ?? []} dataKey="value" nameKey="label"
                  cx="50%" cy="50%" outerRadius={70} innerRadius={52} paddingAngle={3}>
                  {(dist?.outcome ?? []).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                {/* Inner: sex */}
                <Pie data={dist?.sex ?? []} dataKey="value" nameKey="label"
                  cx="50%" cy="50%" outerRadius={44} innerRadius={26} paddingAngle={3}>
                  {(dist?.sex ?? []).map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* MELD distribution */}
      <Card title={t('hospitalDash.meldDistTitle')} subtitle={t('hospitalDash.meldDistSub')} style={{ marginBottom: 18 }}>
        {isLoading ? <Skeleton h={180} /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dist?.meld_groups ?? []} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.color.chartGrid} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.color.muted }} />
              <YAxis tick={{ fontSize: 11, fill: theme.color.muted }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name={t('hospitalDash.patients')} radius={[4, 4, 0, 0]}>
                {(dist?.meld_groups ?? []).map((_, i) => {
                  const colors = ['#2E7D32','#43A047','#E65100','#EF6C00','#B71C1C','#880E4F']
                  return <Cell key={i} fill={colors[i] ?? theme.color.primary} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Quick nav */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { to: '/patients',  label: t('hospitalDash.navPatients'),  desc: t('hospitalDash.navPatientsDesc'),  color: theme.color.primary },
          { to: '/alerts',    label: t('hospitalDash.navAlerts'),    desc: t('hospitalDash.navAlertsDesc'),    color: theme.color.danger  },
          { to: '/risk',      label: t('hospitalDash.navRisk'),      desc: t('hospitalDash.navRiskDesc'),      color: '#7B1FA2'           },
          { to: '/research',  label: t('hospitalDash.navResearch'),  desc: t('hospitalDash.navResearchDesc'),  color: theme.color.accent  },
        ].map(({ to, label, desc, color }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: theme.color.surface,
              border: `1px solid ${theme.color.border}`,
              borderLeft: `3px solid ${color}`,
              borderRadius: theme.r.lg,
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'box-shadow .15s',
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = theme.shadow.md)}
              onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.boxShadow = 'none')}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color }}>{label} →</div>
              <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 3 }}>{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
