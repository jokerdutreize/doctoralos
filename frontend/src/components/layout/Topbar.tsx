import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { theme } from '../../styles/theme'
import { patientsApi } from '../../api/patients'
import { notificationsApi } from '../../api/notifications'
import { useAuth } from '../../contexts/AuthContext'
import { usePatient } from '../../contexts/PatientContext'
import { useTheme } from '../../contexts/ThemeContext'
import type { WLTPatient, AppNotification, NotificationList } from '../../types'

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#B71C1C',
  high:     '#E65100',
  medium:   '#1565C0',
  low:      '#546E7A',
}

const TYPE_ICON: Record<string, string> = {
  critical_patient: '🔴',
  lab_alert:        '🧪',
  medication_alert: '💊',
  system:           '⚙️',
  info:             'ℹ️',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Search icon ────────────────────────────────────────────────────────────────
function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

// ── Sidebar toggle ─────────────────────────────────────────────────────────────
function SidebarToggle({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      title={collapsed ? t('topbar.showSidebar', { defaultValue: 'Show sidebar' }) : t('topbar.hideSidebar', { defaultValue: 'Hide sidebar' })}
      style={{
        width: 36, height: 36, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: theme.r.md,
        background: 'transparent',
        border: `1px solid transparent`,
        color: theme.color.muted,
        cursor: 'pointer', transition: 'all .15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = theme.color.bg
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = theme.color.border
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2"/>
        <line x1="10" y1="4" x2="10" y2="20"/>
        {collapsed && <path d="M13 9l3 3-3 3"/>}
      </svg>
    </button>
  )
}

// ── Filter types ───────────────────────────────────────────────────────────────
type FilterStatus = 'all' | 'alive' | 'deceased'
type FilterCP     = 'all' | 'A' | 'B' | 'C'
type FilterSex    = 'all' | 'M' | 'F'

// ── Filter chip ────────────────────────────────────────────────────────────────
function FilterChip({ active, onClick, children, accent }: {
  active: boolean; onClick: () => void; children: React.ReactNode; accent?: string
}) {
  const c = accent ?? theme.color.primary
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{
        padding: '2px 8px', borderRadius: theme.r.xl, cursor: 'pointer',
        fontSize: 10.5, fontWeight: active ? 700 : 500,
        border: `1px solid ${active ? c : theme.color.border}`,
        background: active ? c + '18' : 'transparent',
        color: active ? c : theme.color.muted,
        transition: 'all .1s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ── Patient result row ─────────────────────────────────────────────────────────
function PatientResultRow({ p, active, onClick }: {
  p: WLTPatient; active: boolean; onClick: () => void
}) {
  const isAlive   = p.status === 'Alive'
  const txYear    = p.operation_date ? new Date(p.operation_date).getFullYear() : null
  const cpColor   = p.child_pugh_category === 'C' ? '#C62828'
                  : p.child_pugh_category === 'B' ? '#E65100' : '#2E7D32'
  const cpBg      = p.child_pugh_category === 'C' ? '#FFEBEE'
                  : p.child_pugh_category === 'B' ? '#FFF3E0' : '#E8F5E9'
  const meldVal   = p.meld_score != null ? Math.round(p.meld_score) : null
  const meldColor = meldVal != null && meldVal >= 25 ? '#B71C1C'
                  : meldVal != null && meldVal >= 15 ? '#E65100' : '#2E7D32'
  const meldBg    = meldVal != null && meldVal >= 25 ? '#FFEBEE'
                  : meldVal != null && meldVal >= 15 ? '#FFF3E0' : '#E8F5E9'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px',
        borderTop: `1px solid ${theme.color.border}`,
        cursor: 'pointer',
        background: active ? theme.color.bg : 'transparent',
        transition: 'background .1s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = theme.color.bg)}
      onMouseLeave={e => (e.currentTarget.style.background = active ? theme.color.bg : 'transparent')}
    >
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: isAlive ? '#2E7D32' : '#B71C1C',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.name}
        </div>
        <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 2 }}>
          {[p.patient_id, p.age ? `${p.age}y` : null, p.sex_display || null, txYear ? `Tx ${txYear}` : null].filter(Boolean).join(' · ')}
        </div>
      </div>
      {meldVal != null && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: theme.r.xl, flexShrink: 0, background: meldBg, color: meldColor }}>
          MELD {meldVal}
        </span>
      )}
      {p.child_pugh_category && (
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: theme.r.xl, flexShrink: 0, background: cpBg, color: cpColor }}>
          CP-{p.child_pugh_category}
        </span>
      )}
    </div>
  )
}

// ── Global search ──────────────────────────────────────────────────────────────
function GlobalSearch() {
  const [open,         setOpen]         = useState(false)
  const [query,        setQuery]        = useState('')
  const [results,      setResults]      = useState<WLTPatient[]>([])
  const [allPatients,  setAllPatients]  = useState<WLTPatient[] | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterCP,     setFilterCP]     = useState<FilterCP>('all')
  const [filterSex,    setFilterSex]    = useState<FilterSex>('all')
  const [recent,       setRecent]       = useState<WLTPatient[]>([])
  const [activeIdx,    setActiveIdx]    = useState(-1)

  const { setSelected } = usePatient()
  const navigate    = useNavigate()
  const wrapRef     = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounce    = useRef<ReturnType<typeof setTimeout>>()
  const fetchedAll  = useRef(false)
  const { t }       = useTranslation()

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dtl_recent')
      if (raw) setRecent(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => { setActiveIdx(-1) }, [filterStatus, filterCP, filterSex])

  const hasActiveFilters = filterStatus !== 'all' || filterCP !== 'all' || filterSex !== 'all'

  // Fetch all patients the first time a filter is activated without a query
  useEffect(() => {
    if (!query.trim() && hasActiveFilters && !fetchedAll.current) {
      fetchedAll.current = true
      setLoading(true)
      patientsApi.listAll()
        .then(data => setAllPatients(data.results))
        .catch(() => setAllPatients([]))
        .finally(() => setLoading(false))
    }
  }, [query, hasActiveFilters])

  // When there IS a query, search results are the pool; without a query, use allPatients
  const pool = query.trim() ? results : (allPatients ?? [])

  const filteredPool = pool.filter(p => {
    if (filterStatus === 'alive'    && p.status !== 'Alive') return false
    if (filterStatus === 'deceased' && p.status !== 'Dead')  return false
    if (filterCP !== 'all' && p.child_pugh_category !== filterCP) return false
    if (filterSex === 'M' && p.sex !== 1) return false
    if (filterSex === 'F' && p.sex !== 2) return false
    return true
  })

  const isSearching = !!(query.trim() || hasActiveFilters)
  const navItems    = isSearching ? filteredPool : recent

  function handleChange(val: string) {
    setQuery(val)
    setActiveIdx(-1)
    clearTimeout(debounce.current)
    if (!val.trim()) { setResults([]); return }
    setLoading(true)
    debounce.current = setTimeout(async () => {
      try {
        const data = await patientsApi.search(val)
        setResults(data.results)
      } catch { setResults([]) }
      finally  { setLoading(false) }
    }, 280)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || navItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, navItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      choose(navItems[activeIdx])
    }
  }

  function saveRecent(p: WLTPatient) {
    try {
      const prev: WLTPatient[] = JSON.parse(localStorage.getItem('dtl_recent') ?? '[]')
      const next = [p, ...prev.filter(x => x.id !== p.id)].slice(0, 5)
      localStorage.setItem('dtl_recent', JSON.stringify(next))
      setRecent(next)
    } catch {}
  }

  function choose(p: WLTPatient) {
    saveRecent(p)
    setSelected(p)
    setOpen(false)
    setQuery('')
    setResults([])
    setActiveIdx(-1)
    navigate('/')
  }

  function clearFilters() {
    setFilterStatus('all')
    setFilterCP('all')
    setFilterSex('all')
  }

  const activeFilterCount = [filterStatus !== 'all', filterCP !== 'all', filterSex !== 'all'].filter(Boolean).length

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, maxWidth: 540 }}>
      {/* Input bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 14px',
        background: theme.color.bg,
        border: `1px solid ${open ? theme.color.primary + '70' : hasActiveFilters ? theme.color.primary + '50' : theme.color.border}`,
        borderRadius: theme.r.md,
        cursor: 'text',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: open ? `0 0 0 3px ${theme.color.primary}15` : 'none',
      }} onClick={() => { setOpen(true); inputRef.current?.focus() }}>
        <span style={{ color: hasActiveFilters ? theme.color.primary : theme.color.muted, display: 'flex', flexShrink: 0 }}>
          <IconSearch />
        </span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t('topbar.searchPlaceholder')}
          style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: theme.color.text }}
        />
        {/* Active filter badge */}
        {hasActiveFilters && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px',
            borderRadius: theme.r.xl, flexShrink: 0,
            background: theme.color.primary + '18',
            color: theme.color.primary,
            border: `1px solid ${theme.color.primary}30`,
          }}>
            {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
          </span>
        )}
        <kbd style={{
          fontSize: 10, padding: '2px 6px', borderRadius: 4,
          background: theme.color.surface, border: `1px solid ${theme.color.border}`,
          color: theme.color.muted, fontFamily: 'inherit', flexShrink: 0,
          display: (loading || hasActiveFilters) ? 'none' : 'inline',
        }}>
          ⌘K
        </kbd>
        {loading && (
          <span style={{
            width: 12, height: 12, flexShrink: 0,
            border: `2px solid ${theme.color.border}`,
            borderTopColor: theme.color.primary,
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
            display: 'inline-block',
          }} />
        )}
      </div>

      {/* Dropdown — always shown when open */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 500,
          background: theme.color.surface,
          border: `1px solid ${theme.color.border}`,
          borderRadius: theme.r.md,
          boxShadow: theme.shadow.lg,
          maxHeight: 480, overflowY: 'auto',
          animation: 'fadeSlideDown .15s ease',
        }}>

          {/* Filter bar — always visible */}
          <div style={{
            padding: '8px 12px',
            borderBottom: `1px solid ${theme.color.border}`,
            background: theme.color.bg,
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                {t('topbar.filterStatus')}
              </span>
              {(['all', 'alive', 'deceased'] as FilterStatus[]).map(v => (
                <FilterChip key={v} active={filterStatus === v} onClick={() => setFilterStatus(v)}>
                  {v === 'all' ? t('common.all') : v === 'alive' ? t('common.alive') : t('common.deceased')}
                </FilterChip>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('topbar.filterCP')}
              </span>
              {(['all', 'A', 'B', 'C'] as FilterCP[]).map(v => (
                <FilterChip
                  key={v} active={filterCP === v} onClick={() => setFilterCP(v)}
                  accent={v === 'A' ? '#2E7D32' : v === 'B' ? '#E65100' : v === 'C' ? '#B71C1C' : undefined}
                >
                  {v === 'all' ? t('common.all') : v}
                </FilterChip>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('topbar.filterSex')}
              </span>
              {(['all', 'M', 'F'] as FilterSex[]).map(v => (
                <FilterChip key={v} active={filterSex === v} onClick={() => setFilterSex(v)}>
                  {v === 'all' ? t('common.all') : v === 'M' ? t('topbar.filterMale') : t('topbar.filterFemale')}
                </FilterChip>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                  color: theme.color.danger, background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 6px',
                }}
              >
                {t('topbar.clearFilters')} ×
              </button>
            )}
          </div>

          {/* Results area */}
          {isSearching ? (
            loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: theme.color.muted, fontSize: 12 }}>
                {t('common.loading')}
              </div>
            ) : filteredPool.length > 0 ? (
              <>
                <div style={{ padding: '7px 14px 5px', fontSize: 11, fontWeight: 600, color: theme.color.muted, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {t('topbar.patientsFound', { count: filteredPool.length })}
                  {hasActiveFilters && pool.length > filteredPool.length && (
                    <span style={{ fontWeight: 400, fontSize: 10 }}>
                      · {t('topbar.filteredFrom', { total: pool.length })}
                    </span>
                  )}
                </div>
                {filteredPool.map((p, i) => (
                  <PatientResultRow key={p.id} p={p} active={activeIdx === i} onClick={() => choose(p)} />
                ))}
              </>
            ) : hasActiveFilters && pool.length > 0 ? (
              <div style={{ padding: '18px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: theme.color.muted, marginBottom: 10 }}>
                  {t('topbar.noResultsFiltered')}
                </div>
                <button
                  onClick={clearFilters}
                  style={{
                    fontSize: 12, fontWeight: 600, color: theme.color.primary,
                    background: theme.color.primaryBg, border: `1px solid ${theme.color.primary}30`,
                    borderRadius: theme.r.sm, padding: '5px 14px', cursor: 'pointer',
                  }}
                >
                  {t('topbar.clearFilters')}
                </button>
              </div>
            ) : query.trim() ? (
              <div style={{ padding: '18px', textAlign: 'center', fontSize: 13, color: theme.color.muted }}>
                {t('topbar.noResults', { query })}
              </div>
            ) : null
          ) : recent.length > 0 ? (
            <>
              <div style={{ padding: '7px 14px 5px', fontSize: 11, fontWeight: 600, color: theme.color.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {t('topbar.recentPatients')}
              </div>
              {recent.map((p, i) => (
                <PatientResultRow key={p.id} p={p} active={activeIdx === i} onClick={() => choose(p)} />
              ))}
            </>
          ) : (
            <div style={{ padding: '16px 14px', fontSize: 12, color: theme.color.muted, textAlign: 'center' }}>
              {t('topbar.searchHint')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Notification Bell ──────────────────────────────────────────────────────────
function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationList | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const reload = useCallback(async () => {
    try {
      const d = await notificationsApi.list()
      setData(d)
    } catch { /* backend offline — silent */ }
  }, [])

  useEffect(() => {
    reload()
    const id = setInterval(reload, 60_000)
    return () => clearInterval(id)
  }, [reload])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  async function handleMarkAll() {
    await notificationsApi.markAllRead().catch(() => {})
    reload()
  }

  async function handleMarkOne(id: number) {
    await notificationsApi.markRead(id).catch(() => {})
    setData(d => d ? {
      ...d,
      unread_count: Math.max(0, d.unread_count - 1),
      results: d.results.map(n => n.id === id ? { ...n, is_read: true } : n),
    } : d)
  }

  function handleClick(n: AppNotification) {
    if (!n.is_read) handleMarkOne(n.id)
    if (n.patient_db_id) {
      setOpen(false)
      navigate('/alerts')
    }
  }

  const unread = data?.unread_count ?? 0

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative',
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: theme.r.md,
          background: open ? theme.color.primaryBg : 'transparent',
          border: `1px solid ${open ? theme.color.primary + '40' : 'transparent'}`,
          color: open ? theme.color.primary : theme.color.muted,
          cursor: 'pointer', transition: 'all .15s',
        }}
        title={t('topbar.notifications')}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 3, right: 3,
            minWidth: 15, height: 15,
            background: theme.color.danger,
            color: '#fff',
            borderRadius: 999,
            fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            border: `2px solid ${theme.color.surface}`,
          }}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 600,
          width: 380, maxHeight: 520,
          background: theme.color.surface,
          border: `1px solid ${theme.color.border}`,
          borderRadius: theme.r.lg,
          boxShadow: theme.shadow.lg,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeSlideDown .15s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: `1px solid ${theme.color.border}`,
            flexShrink: 0,
          }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>{t('topbar.notifications')}</span>
              {unread > 0 && (
                <span style={{
                  marginLeft: 8, fontSize: 11, fontWeight: 700,
                  padding: '1px 7px', borderRadius: 999,
                  background: theme.color.dangerBg, color: theme.color.danger,
                }}>
                  {t('topbar.unread', { count: unread })}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={handleMarkAll} style={{
                fontSize: 11, color: theme.color.primary,
                fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
              }}>
                {t('topbar.markAllRead')}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {!data || data.results.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: theme.color.muted, fontSize: 13 }}>
                {t('topbar.noNotifications')}
              </div>
            ) : data.results.map((n, i) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '12px 16px',
                  borderBottom: i < data.results.length - 1 ? `1px solid ${theme.color.border}` : 'none',
                  background: n.is_read ? 'transparent' : theme.color.primaryBg,
                  cursor: 'pointer', transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = theme.color.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? 'transparent' : theme.color.primaryBg)}
              >
                {/* Priority dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  marginTop: 5,
                  background: PRIORITY_COLOR[n.priority] ?? theme.color.muted,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: n.is_read ? 500 : 700,
                    color: theme.color.text,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>{TYPE_ICON[n.type] ?? '📋'}</span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.title}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11.5, color: theme.color.text2, marginTop: 3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 10, color: theme.color.muted, marginTop: 4 }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {!n.is_read && (
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: theme.color.primary, flexShrink: 0, marginTop: 6,
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: `1px solid ${theme.color.border}`,
            flexShrink: 0,
          }}>
            <button onClick={() => { setOpen(false); navigate('/alerts') }} style={{
              width: '100%', padding: '7px', borderRadius: theme.r.sm,
              background: theme.color.bg, border: `1px solid ${theme.color.border}`,
              fontSize: 12, fontWeight: 600, color: theme.color.text2,
              cursor: 'pointer', transition: 'background .1s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.color.primaryBg)}
              onMouseLeave={e => (e.currentTarget.style.background = theme.color.bg)}
            >
              {t('topbar.viewAlerts')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dark mode toggle ───────────────────────────────────────────────────────────
function ThemeToggle() {
  const { mode, toggle } = useTheme()
  const isDark = mode === 'dark'
  const { t } = useTranslation()

  return (
    <button
      onClick={toggle}
      title={isDark ? t('topbar.switchToLight') : t('topbar.switchToDark')}
      style={{
        width: 36, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: theme.r.md,
        background: 'transparent',
        border: `1px solid transparent`,
        color: theme.color.muted,
        cursor: 'pointer', transition: 'all .15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = theme.color.bg
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = theme.color.border
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
      }}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

// ── Language toggle ────────────────────────────────────────────────────────────
function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const isZh = i18n.language === 'zh'

  return (
    <button
      onClick={() => i18n.changeLanguage(isZh ? 'en' : 'zh')}
      title={isZh ? t('topbar.switchToEnglish') : t('topbar.switchToChinese')}
      style={{
        height: 36, padding: '0 11px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: theme.r.md,
        background: 'transparent',
        border: `1px solid ${theme.color.border}`,
        color: theme.color.text2,
        cursor: 'pointer', transition: 'all .15s',
        fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = theme.color.bg
        ;(e.currentTarget as HTMLButtonElement).style.color = theme.color.text
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLButtonElement).style.color = theme.color.text2
      }}
    >
      {isZh ? 'EN' : '中'}
    </button>
  )
}

// ── User Menu ──────────────────────────────────────────────────────────────────
function UserMenu() {
  const { doctor, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  if (!doctor) {
    return (
      <button onClick={() => navigate('/login')} style={{
        padding: '7px 16px', borderRadius: theme.r.sm,
        background: theme.color.primary, color: '#fff',
        border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      }}>
        {t('topbar.signIn')}
      </button>
    )
  }

  const initials = `${doctor.first_name[0] ?? ''}${doctor.last_name[0] ?? ''}`.toUpperCase()

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 10px 6px 6px',
        background: open ? theme.color.bg : 'transparent',
        border: `1px solid ${open ? theme.color.border : 'transparent'}`,
        borderRadius: theme.r.md, cursor: 'pointer', transition: 'all .15s',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${theme.color.primary}, ${theme.color.accent})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
        }}>
          {initials}
        </div>
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text, whiteSpace: 'nowrap' }}>
            Dr. {doctor.last_name}
          </div>
          <div style={{ fontSize: 11, color: theme.color.muted, whiteSpace: 'nowrap' }}>
            {t(`roles.${doctor.role}`, { defaultValue: doctor.role })}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.color.muted}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 500,
          background: theme.color.surface, border: `1px solid ${theme.color.border}`,
          borderRadius: theme.r.lg, boxShadow: theme.shadow.lg, minWidth: 240,
          overflow: 'hidden',
          animation: 'fadeSlideDown .15s ease',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${theme.color.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>{doctor.full_name}</div>
            <div style={{ fontSize: 12, color: theme.color.muted, marginTop: 2 }}>{doctor.email}</div>
            <div style={{ fontSize: 11, color: theme.color.text2, marginTop: 4 }}>
              {doctor.department} · {doctor.hospital}
            </div>
          </div>

          {[
            { label: t('topbar.myProfile'),       action: () => { setOpen(false); navigate('/settings') } },
            { label: t('topbar.accountSettings'), action: () => { setOpen(false); navigate('/settings') } },
          ].map(item => (
            <button key={item.label} onClick={item.action} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 16px', background: 'none', border: 'none',
              fontSize: 13, color: theme.color.text, cursor: 'pointer',
              borderBottom: `1px solid ${theme.color.border}`,
              transition: 'background .1s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.color.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.label}
            </button>
          ))}

          <button onClick={() => { setOpen(false); logout() }} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '10px 16px', background: 'none', border: 'none',
            fontSize: 13, color: theme.color.danger, cursor: 'pointer',
            fontWeight: 600, transition: 'background .1s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = theme.color.dangerBg)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {t('topbar.signOut')}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Topbar ─────────────────────────────────────────────────────────────────────
interface TopbarProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export default function Topbar({ sidebarCollapsed, onToggleSidebar }: TopbarProps) {
  return (
    <header style={{
      height: 56, minWidth: 0,
      background: theme.color.surface,
      borderBottom: `1px solid ${theme.color.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      gap: 10,
      flexShrink: 0,
      boxShadow: '0 1px 0 rgba(21,101,192,0.06)',
    }}>
      <SidebarToggle collapsed={sidebarCollapsed} onClick={onToggleSidebar} />
      <GlobalSearch />
      <LanguageToggle />
      <ThemeToggle />
      <NotificationBell />
      <UserMenu />
    </header>
  )
}
