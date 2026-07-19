import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { theme } from '../../styles/theme'
import { usePatient } from '../../contexts/PatientContext'
import type { ReactNode } from 'react'

// ── Icons (inline SVG) ─────────────────────────────────────────────────────────
const Ic = {
  Grid:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  Users:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  User:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Calendar:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Activity:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Flask:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6M9 3v7L4 20h16L15 10V3"/></svg>,
  Pill:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5l10-10a4.95 4.95 0 10-7-7l-10 10a4.95 4.95 0 107 7z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>,
  Image:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  Alert:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Brain:      () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96-.46 2.5 2.5 0 01-1.07-4.79A3 3 0 014.11 10a3 3 0 011.76-3.88A2.5 2.5 0 019.5 2z"/><path d="M14.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 004.96-.46 2.5 2.5 0 001.07-4.79A3 3 0 0019.89 10a3 3 0 00-1.76-3.88A2.5 2.5 0 0014.5 2z"/></svg>,
  Cpu:        () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  Sliders:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>,
  Book:       () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  BarChart:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
  FileText:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  Settings:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Clipboard:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  Chevron:    ({ open }: { open: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface SubItemDef {
  to:       string
  labelKey: string
  dot?:     string
}

interface NavItemDef {
  to:       string
  labelKey: string
  Icon:     () => ReactNode
  end?:     boolean
  badge?:   string
  subItems?: SubItemDef[]
}

interface NavGroupDef {
  labelKey: string
  items:    NavItemDef[]
}

// ── Navigation tree ────────────────────────────────────────────────────────────
const NAV_GROUPS: NavGroupDef[] = [
  {
    labelKey: 'nav.overview',
    items: [
      { to: '/', labelKey: 'nav.dashboard', Icon: Ic.Grid, end: true },
    ],
  },
  {
    labelKey: 'nav.patients',
    items: [
      {
        to: '/patients', labelKey: 'nav.patientRegistry', Icon: Ic.Users,
        subItems: [
          { to: '/patients',              labelKey: 'patients.filterAll'      },
          { to: '/patients?tab=wlt',      labelKey: 'patients.filterWlt',      dot: '#059669' },
          { to: '/patients?tab=slt',      labelKey: 'patients.filterSlt',      dot: '#1565C0' },
          { to: '/patients?tab=high',     labelKey: 'patients.filterHigh',     dot: '#E65100' },
          { to: '/patients?tab=critical', labelKey: 'common.critical',         dot: '#B71C1C' },
        ],
      },
      { to: '/appointments', labelKey: 'nav.appointments', Icon: Ic.Calendar },
      { to: '/alerts',       labelKey: 'nav.alerts',       Icon: Ic.Alert    },
    ],
  },
  {
    labelKey: 'nav.aiResearch',
    items: [
      { to: '/risk',     labelKey: 'nav.riskPrediction', Icon: Ic.Brain },
      { to: '/research', labelKey: 'nav.research',       Icon: Ic.Book  },
    ],
  },
  {
    labelKey: 'nav.hospital',
    items: [
      { to: '/analytics', labelKey: 'nav.hospitalAnalytics', Icon: Ic.BarChart  },
      { to: '/reports',   labelKey: 'nav.reports',           Icon: Ic.FileText  },
    ],
  },
  {
    labelKey: 'nav.admin',
    items: [
      { to: '/settings', labelKey: 'nav.settings',  Icon: Ic.Settings  },
      { to: '/audit',    labelKey: 'nav.auditLogs', Icon: Ic.Clipboard },
    ],
  },
]

// ── Sub-item link ──────────────────────────────────────────────────────────────
function SubItem({ to, labelKey, dot }: SubItemDef) {
  const { t }    = useTranslation()
  const location = useLocation()
  const [path, qs] = to.split('?')
  const expectedTab = qs ? new URLSearchParams(qs).get('tab') : null
  const currentTab  = new URLSearchParams(location.search).get('tab')
  const isActive = location.pathname === path &&
    (expectedTab ? currentTab === expectedTab : currentTab == null || currentTab === 'all')

  return (
    <NavLink
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px 5px 34px',
        borderRadius: theme.r.sm, marginBottom: 1,
        fontSize: 12.5, fontWeight: isActive ? 600 : 400,
        color: isActive ? (dot ?? theme.color.primary) : theme.color.text2,
        background: isActive ? (dot ? `${dot}14` : theme.color.primaryBg) : 'transparent',
        transition: 'all .12s', textDecoration: 'none',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: isActive ? (dot ?? theme.color.primary) : theme.color.border,
        transition: 'background .15s',
      }} />
      {t(labelKey)}
    </NavLink>
  )
}

// ── Nav item (with optional sub-menu) ─────────────────────────────────────────
function NavItem({ to, labelKey, Icon, end, badge, subItems }: NavItemDef) {
  const { t }    = useTranslation()
  const location = useLocation()

  const onPatientsRoute = location.pathname.startsWith(to) && to !== '/'
  const [open, setOpen]  = useState(onPatientsRoute)

  // Auto-open when navigating to the parent route
  useEffect(() => {
    if (onPatientsRoute) setOpen(true)
  }, [location.pathname])

  if (!subItems) {
    return (
      <NavLink to={to} end={end}
        style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '7px 10px', borderRadius: theme.r.sm, marginBottom: 1,
          fontSize: 13, fontWeight: isActive ? 600 : 400,
          color: isActive ? theme.color.primary : theme.color.text2,
          background: isActive ? theme.color.primaryBg : 'transparent',
          transition: 'all .12s', textDecoration: 'none',
        })}
      >
        {({ isActive }) => (
          <>
            <span style={{ opacity: isActive ? 1 : 0.6, display: 'flex', flexShrink: 0 }}><Icon /></span>
            <span style={{ flex: 1 }}>{t(labelKey)}</span>
            {badge && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: theme.r.xl,
                background: theme.color.danger, color: '#fff', flexShrink: 0,
              }}>{badge}</span>
            )}
          </>
        )}
      </NavLink>
    )
  }

  // Parent item with sub-menu
  const parentActive = onPatientsRoute
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9, width: '100%',
          padding: '7px 10px', borderRadius: theme.r.sm, marginBottom: 1,
          fontSize: 13, fontWeight: parentActive ? 600 : 400,
          color: parentActive ? theme.color.primary : theme.color.text2,
          background: parentActive ? theme.color.primaryBg : 'transparent',
          border: 'none', cursor: 'pointer', transition: 'all .12s',
        }}
      >
        <span style={{ opacity: parentActive ? 1 : 0.6, display: 'flex', flexShrink: 0 }}><Icon /></span>
        <span style={{ flex: 1, textAlign: 'left' }}>{t(labelKey)}</span>
        <Ic.Chevron open={open} />
      </button>

      {open && (
        <div style={{
          marginBottom: 4, overflow: 'hidden',
          borderLeft: `2px solid ${theme.color.border}`,
          marginLeft: 18,
        }}>
          {subItems.map(sub => (
            <SubItem key={sub.to} {...sub} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
interface SidebarProps { collapsed?: boolean }

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const { selected } = usePatient()
  const { t } = useTranslation()

  return (
    <aside style={{
      width: collapsed ? 0 : 'var(--sidebar-w, 220px)', minHeight: '100vh',
      background: theme.color.surface,
      borderRight: collapsed ? 'none' : `1px solid ${theme.color.border}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      boxShadow: collapsed ? 'none' : theme.shadow.sm,
      overflow: 'hidden',
      transition: 'width .18s ease, border-color .18s ease',
    }}>
      <div style={{
        width: 'var(--sidebar-w, 220px)', display: 'flex', flexDirection: 'column',
        flex: 1, minHeight: '100vh', overflowY: 'auto',
      }}>
      {/* Brand */}
      <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${theme.color.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: theme.r.md, flexShrink: 0,
            background: `linear-gradient(135deg, ${theme.color.primary}, ${theme.color.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C8 2 5 5.5 5 9c0 5 7 13 7 13s7-8 7-13c0-3.5-3-7-7-7z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: theme.color.text, lineHeight: 1.2 }}>
              {t('sidebar.brand')}
            </div>
            <div style={{ fontSize: 10, color: theme.color.muted, marginTop: 1 }}>
              {t('sidebar.brandSub')}
            </div>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '10px 8px' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.labelKey} style={{ marginBottom: 6 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: theme.color.muted,
              letterSpacing: '0.07em', textTransform: 'uppercase',
              padding: '10px 10px 5px',
            }}>
              {t(group.labelKey)}
            </div>
            {group.items.map(item => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Active patient chip */}
      <div style={{
        margin: '0 10px 12px', padding: '11px 13px',
        background: theme.color.bg, borderRadius: theme.r.md,
        border: `1px solid ${theme.color.border}`, flexShrink: 0,
      }}>
        {selected ? (
          <>
            <div style={{ fontSize: 10, color: theme.color.muted, marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('common.activePatient')}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: theme.color.text2, marginTop: 2 }}>
              {selected.patient_id}
              {selected.age ? ` · ${selected.age}y` : ''}
            </div>
            {selected.child_pugh_category && (
              <div style={{
                marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '2px 8px', borderRadius: theme.r.xl, fontSize: 10, fontWeight: 700,
                background: selected.child_pugh_category === 'A' ? '#E8F5E9'
                  : selected.child_pugh_category === 'B' ? '#FFF3E0' : '#FFEBEE',
                color: selected.child_pugh_category === 'A' ? '#2E7D32'
                  : selected.child_pugh_category === 'B' ? '#E65100' : '#C62828',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                Child-Pugh {selected.child_pugh_category}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 10, color: theme.color.muted, marginBottom: 4, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {t('common.noPatientSelected')}
            </div>
            <div style={{ fontSize: 12, color: theme.color.text2 }}>
              {t('common.selectPatient')}
            </div>
          </>
        )}
      </div>
      </div>
    </aside>
  )
}
