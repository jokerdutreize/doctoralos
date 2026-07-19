import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { theme } from '../styles/theme'
import { patientsApi } from '../api/patients'
import { usePatient } from '../contexts/PatientContext'
import { useAsync } from '../hooks/useAsync'
import Badge from '../components/ui/Badge'
import TransplantBadge from '../components/ui/TransplantBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { TRANSPLANT_PROGRAMS, GRAFT_LABELS, DONOR_LABELS } from '../config/transplantPrograms'
import type { WLTPatient } from '../types'

// ── Filter definition ─────────────────────────────────────────────────────────
interface FilterTab {
  id:      string
  label:   string
  program?: string
  donor?:  string
  risk?:   string
  color:   string
  bg:      string
}

function makeFilterTabs(t: (key: string) => string): FilterTab[] {
  return [
    { id: 'all',      label: t('patients.filterAll'),      color: theme.color.text2, bg: 'transparent' },
    { id: 'wlt',      label: t('patients.filterWlt'),      program: 'WHOLE_LIVER',   color: '#059669', bg: '#ECFDF5' },
    { id: 'slt',      label: t('patients.filterSlt'),      program: 'SPLIT_LIVER',   color: '#1565C0', bg: '#EFF6FF' },
    { id: 'living',   label: t('patients.filterLiving'),   donor: 'LIVING',          color: '#7C3AED', bg: '#F5F3FF' },
    { id: 'deceased', label: t('patients.filterDeceased'), donor: 'DECEASED',        color: '#0891B2', bg: '#ECFEFF' },
    { id: 'high',     label: t('patients.filterHigh'),     risk: 'high',             color: '#E65100', bg: '#FFF3E0' },
    { id: 'critical', label: t('common.critical'),         risk: 'critical',         color: '#B71C1C', bg: '#FFEBEE' },
  ]
}

// ── CP badge ──────────────────────────────────────────────────────────────────
function cpBadge(cat: string): 'low' | 'moderate' | 'high' | 'primary' {
  return cat === 'A' ? 'low' : cat === 'B' ? 'moderate' : cat === 'C' ? 'high' : 'primary'
}

// ── Table row ─────────────────────────────────────────────────────────────────
function Row({ p, onSelect }: { p: WLTPatient; onSelect: (p: WLTPatient) => void }) {
  const isAlive = p.status === 'Alive'
  return (
    <tr
      onClick={() => onSelect(p)}
      style={{ cursor: 'pointer', borderBottom: `1px solid ${theme.color.border}`, transition: 'background .1s' }}
      onMouseEnter={e => (e.currentTarget.style.background = theme.color.surface)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Patient ID + transplant badge */}
      <td style={TD}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: theme.color.muted }}>{p.patient_id}</span>
          <TransplantBadge program={p.transplant_program} size="xs" />
        </div>
      </td>

      {/* Name */}
      <td style={{ ...TD, fontWeight: 600, color: theme.color.text }}>{p.name}</td>

      {/* Sex */}
      <td style={TD}>{p.sex_display || '—'}</td>

      {/* Age */}
      <td style={TD}>{p.age != null ? `${p.age}y` : '—'}</td>

      {/* Status */}
      <td style={TD}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
          color: isAlive ? '#065F46' : theme.color.danger,
          background: isAlive ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${isAlive ? '#6EE7B7' : '#FCA5A5'}`,
        }}>
          {isAlive ? 'Alive' : p.status || '—'}
        </span>
      </td>

      {/* Operation date */}
      <td style={TD}>{p.operation_date ?? '—'}</td>

      {/* MELD */}
      <td style={TD}>
        {p.meld_score != null
          ? <span style={{ fontWeight: p.meld_score >= 25 ? 700 : 400, color: p.meld_score >= 25 ? '#B71C1C' : theme.color.text2 }}>
              {p.meld_score.toFixed(1)}
            </span>
          : '—'}
      </td>

      {/* Child-Pugh */}
      <td style={TD}>
        {p.child_pugh_category
          ? <Badge label={`CP-${p.child_pugh_category}`} variant={cpBadge(p.child_pugh_category)} size="sm" />
          : '—'}
      </td>

      {/* Graft type */}
      <td style={TD}>
        <span style={{ fontSize: 11, color: theme.color.muted }}>
          {GRAFT_LABELS[p.graft_type] ?? p.graft_type ?? '—'}
        </span>
      </td>

      {/* Donor */}
      <td style={TD}>
        <span style={{ fontSize: 11, color: theme.color.muted }}>
          {DONOR_LABELS[p.donor_type] ?? p.donor_type ?? '—'}
        </span>
      </td>

      {/* ICU */}
      <td style={TD}>{p.icu_days != null ? `${p.icu_days.toFixed(0)} d` : '—'}</td>
    </tr>
  )
}

const TD: React.CSSProperties = {
  padding: '9px 12px', fontSize: 12.5, color: theme.color.text2, whiteSpace: 'nowrap',
}
const TH: React.CSSProperties = {
  padding: '10px 12px', fontSize: 10, fontWeight: 700,
  color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.05em',
  background: theme.color.surface, whiteSpace: 'nowrap',
  position: 'sticky', top: 0, borderBottom: `1px solid ${theme.color.border}`,
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PatientList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query,        setQuery]        = useState('')
  const [page,         setPage]         = useState(1)
  const [activeTab,    setActiveTab]    = useState(() => searchParams.get('tab') ?? 'all')
  const { setSelected } = usePatient()
  const navigate        = useNavigate()
  const debounceRef     = useRef<ReturnType<typeof setTimeout>>()
  const { t } = useTranslation()

  const FILTER_TABS = makeFilterTabs(t)

  // Sync tab from URL when navigating via sidebar sub-items
  useEffect(() => {
    const tab = searchParams.get('tab') ?? 'all'
    setActiveTab(tab)
    setPage(1)
  }, [searchParams.get('tab')])

  const activeFilter = FILTER_TABS.find(f => f.id === activeTab) ?? FILTER_TABS[0]

  const fetcher = useCallback(
    () => patientsApi.list({
      page,
      search:  query || undefined,
      program: activeFilter.program,
      donor:   activeFilter.donor,
      risk:    activeFilter.risk,
    }),
    [page, query, activeFilter.id]
  )
  const { state, execute } = useAsync(fetcher)

  useEffect(() => { execute() }, [page, query, activeTab])

  function handleSearch(val: string) {
    setQuery(val); setPage(1)
    clearTimeout(debounceRef.current)
  }

  function handleTab(id: string) {
    setActiveTab(id); setPage(1); setQuery('')
    setSearchParams(id === 'all' ? {} : { tab: id })
  }

  function handleSelect(p: WLTPatient) {
    setSelected(p); navigate(`/patients/${p.id}`)
  }

  const data = state.status === 'success' ? state.data : null

  const COLUMNS = [
    t('patients.colId'), t('patients.colName'), t('patients.colSex'), t('patients.colAge'),
    t('patients.colStatus'), t('patients.colOpDate'), t('patients.colMeld'),
    t('patients.colChildPugh'), t('patients.colGraft'), t('patients.colDonor'), t('patients.colIcuDays'),
  ]

  return (
    <div style={{ padding: '24px 28px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>
            {t('patients.title')}
          </h1>
          <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
            {t('patients.cohortLabel')}
            {data ? ` · ${data.count} ${t('patients.records')}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.values(TRANSPLANT_PROGRAMS)
            .filter(p => ['WHOLE_LIVER', 'SPLIT_LIVER'].includes(p.key))
            .map(p => (
              <TransplantBadge key={p.key} program={p.key} size="sm" dot />
            ))}
        </div>
      </div>

      {/* ── Filter tabs ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16,
        padding: '4px', background: theme.color.surface,
        border: `1px solid ${theme.color.border}`,
        borderRadius: theme.r.md,
      }}>
        {FILTER_TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab.id)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all .15s',
                background: active ? tab.bg : 'transparent',
                color: active ? tab.color : theme.color.muted,
                outline: active ? `2px solid ${tab.color}30` : 'none',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: theme.color.muted, pointerEvents: 'none' }}
             width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder={t('patients.searchPlaceholder')}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '8px 12px 8px 32px',
            background: theme.color.surface, border: `1px solid ${theme.color.border}`,
            borderRadius: theme.r.md, fontSize: 13, color: theme.color.text, outline: 'none',
          }}
        />
        {query && (
          <button onClick={() => { setQuery(''); setPage(1) }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                     background: 'none', border: 'none', cursor: 'pointer',
                     color: theme.color.muted, fontSize: 16, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: theme.color.bg, border: `1px solid ${theme.color.border}`,
        borderRadius: theme.r.lg, overflow: 'hidden', boxShadow: theme.shadow.sm,
      }}>
        {state.status === 'loading' ? (
          <LoadingSpinner size={36} label={t('patients.loadingPatients')} fullPage />
        ) : state.status === 'error' ? (
          <div style={{ padding: '40px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.color.danger, marginBottom: 10 }}>
              {t('patients.cannotConnect')}
            </div>
            <code style={{ display: 'inline-block', padding: '8px 16px', background: theme.color.surface, border: `1px solid ${theme.color.border}`, borderRadius: theme.r.sm, fontSize: 12, fontFamily: 'monospace' }}>
              cd core &amp;&amp; python manage.py runserver
            </code>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{COLUMNS.map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data?.results?.map(p => (
                  <Row key={p.id} p={p} onSelect={handleSelect} />
                ))}
                {data?.results?.length === 0 && (
                  <tr><td colSpan={11} style={{ padding: 32, textAlign: 'center', color: theme.color.muted }}>
                    {t('patients.noMatchFilter')}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {data && (data.next || data.previous) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 18 }}>
          <button disabled={!data.previous} onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '6px 16px', borderRadius: theme.r.sm, border: `1px solid ${theme.color.border}`, background: data.previous ? theme.color.surface : theme.color.bg, color: data.previous ? theme.color.text : theme.color.muted, cursor: data.previous ? 'pointer' : 'default', fontSize: 13 }}>
            {t('common.previous')}
          </button>
          <span style={{ fontSize: 12, color: theme.color.muted }}>{t('patients.page', { n: page })}</span>
          <button disabled={!data.next} onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 16px', borderRadius: theme.r.sm, border: `1px solid ${theme.color.border}`, background: data.next ? theme.color.surface : theme.color.bg, color: data.next ? theme.color.text : theme.color.muted, cursor: data.next ? 'pointer' : 'default', fontSize: 13 }}>
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  )
}
