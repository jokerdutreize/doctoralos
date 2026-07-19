import { useEffect } from 'react'
import { useParams, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePatient } from '../../contexts/PatientContext'
import { patientsApi } from '../../api/patients'
import { theme } from '../../styles/theme'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

import Overview    from './Overview'
import Labs        from './Labs'
import Medication  from './Medication'
import Imaging     from './Imaging'
import AI          from './AI'

function cpColors(cat: string) {
  return cat === 'A' ? { bg: '#E8F5E9', color: '#2E7D32' }
       : cat === 'B' ? { bg: '#FFF3E0', color: '#E65100' }
       :               { bg: '#FFEBEE', color: '#C62828' }
}

export default function PatientProfileLayout() {
  const { id }              = useParams<{ id: string }>()
  const { selected, setSelected } = usePatient()
  const { t } = useTranslation()

  const TABS = [
    { path: 'overview',   label: t('profile.tabOverview')   },
    { path: 'labs',       label: t('profile.tabLabs')       },
    { path: 'medication', label: t('profile.tabMedication') },
    { path: 'imaging',    label: t('profile.tabImaging')    },
    { path: 'ai',         label: t('profile.tabAi')         },
  ]

  useEffect(() => {
    if (!id) return
    // Only fetch if we don't already have this patient loaded
    if (selected && String(selected.id) === id) return
    patientsApi.get(id).then(setSelected).catch(() => {})
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!selected || String(selected.id) !== id) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <LoadingSpinner label={t('profile.loadingPatient')} />
      </div>
    )
  }

  const p        = selected
  const cp       = cpColors(p.child_pugh_category)
  const initials = p.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── Patient header ─────────────────────────────────────────────────── */}
      <div style={{
        background: theme.color.surface,
        borderBottom: `1px solid ${theme.color.border}`,
        padding: '16px 28px 0',
        flexShrink: 0,
      }}>
        {/* Identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${theme.color.primary}, ${theme.color.accent})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff',
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: theme.color.text, lineHeight: 1.2 }}>
              {p.name}
            </div>
            <div style={{ fontSize: 12, color: theme.color.text2, marginTop: 3, display: 'flex', gap: 10 }}>
              <span>{p.patient_id}</span>
              {p.age != null && <><span style={{ color: theme.color.border }}>·</span><span>{p.age} y/o</span></>}
              {p.sex_display && <><span style={{ color: theme.color.border }}>·</span><span>{p.sex_display}</span></>}
              {p.operation_date && <><span style={{ color: theme.color.border }}>·</span><span>Tx {p.operation_date}</span></>}
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
            {p.meld_score != null && (
              <span style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: p.meld_score >= 25 ? '#FFEBEE' : p.meld_score >= 15 ? '#FFF3E0' : '#E8F5E9',
                color:      p.meld_score >= 25 ? '#C62828' : p.meld_score >= 15 ? '#E65100' : '#2E7D32',
              }}>
                MELD {p.meld_score.toFixed(0)}
              </span>
            )}
            {p.child_pugh_category && (
              <span style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: cp.bg, color: cp.color,
              }}>
                CP-{p.child_pugh_category}
              </span>
            )}
            <span style={{
              padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              background: p.status === 'Alive' ? '#E8F5E920' : '#FF000012',
              color:      p.status === 'Alive' ? theme.color.success : theme.color.danger,
              border:     `1px solid ${p.status === 'Alive' ? theme.color.success + '40' : theme.color.danger + '40'}`,
            }}>
              {p.status || 'Unknown'}
            </span>
          </div>
        </div>

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <nav style={{ display: 'flex', gap: 0 }}>
          {TABS.map(tab => (
            <NavLink
              key={tab.path}
              to={`/patients/${id}/${tab.path}`}
              end
              style={({ isActive }) => ({
                padding: '10px 18px',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? theme.color.primary : theme.color.text2,
                borderBottom: `2px solid ${isActive ? theme.color.primary : 'transparent'}`,
                textDecoration: 'none',
                transition: 'all .12s',
                whiteSpace: 'nowrap',
              })}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route index element={<Navigate to={`/patients/${id}/overview`} replace />} />
          <Route path="overview"   element={<Overview />} />
          <Route path="labs"       element={<Labs />} />
          <Route path="medication" element={<Medication />} />
          <Route path="imaging"    element={<Imaging />} />
          <Route path="ai"         element={<AI />} />
        </Routes>
      </div>
    </div>
  )
}
