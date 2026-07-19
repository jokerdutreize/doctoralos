import { useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api/mock'
import { patientsApi } from '../api/patients'
import { fmt, riskColor, riskBg, labStatus, LAB_RANGES } from '../utils/format'
import { theme } from '../styles/theme'
import Card from '../components/ui/Card'
import MetricCard from '../components/ui/MetricCard'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import LabTrendChart from '../components/charts/LabTrendChart'
import { usePatient } from '../contexts/PatientContext'
import { generateDashboardSummary, generateLabs, getPatientPhase, PHASE_META } from '../utils/wltAdapters'
import ClinicalSummaryPanel from '../components/ClinicalSummaryPanel'
import HospitalDashboard from '../components/hospital/HospitalDashboard'
import type { WLTPatient } from '../types'

const PAGE = { padding: '24px 28px' }

export default function Dashboard() {
  const { selected } = usePatient()

  // No patient selected → hospital command center
  if (!selected) return <HospitalDashboard />

  return <PatientDashboard />
}

function PatientDashboard() {
  const { selected, setSelected } = usePatient()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const wltSummary = useMemo(() => selected ? generateDashboardSummary(selected) : null, [selected])
  const wltLabs    = useMemo(() => selected ? generateLabs(selected)             : null, [selected])

  const { state: sumState }      = useAsync(useCallback(() => api.getDashboardSummary(), []))
  const { state: labState }      = useAsync(useCallback(() => api.getLabs(), []))
  const { state: criticalState } = useAsync(useCallback(() => patientsApi.critical(), []))

  function selectCriticalPatient(p: WLTPatient) {
    setSelected(p)
    navigate('/')
  }

  const summaryData = wltSummary ?? (sumState.status === 'success' ? sumState.data : null)
  const labsData    = wltLabs    ?? (labState.status  === 'success' ? labState.data  : null)

  if (!summaryData && sumState.status === 'loading') return <LoadingSpinner fullPage label="Loading dashboard…" />
  if (!summaryData && sumState.status === 'error')   return <div style={{ padding: 28, color: theme.color.danger }}>Error: {sumState.error}</div>
  if (!summaryData) return null

  const { patient, latest_labs: labs, current_risk: risk, days_post_transplant: dpt } = summaryData

  return (
    <div style={PAGE}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>{t('dashboard.title')}</h1>
          <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
            {patient.name} · {patient.id} · Transplanted {fmt.date(patient.transplant_date)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selected && (() => {
            const phase = getPatientPhase(selected)
            const m = PHASE_META[phase]
            return (
              <span style={{
                fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: theme.r.xl,
                background: m.bg, color: m.color,
                border: `1px solid ${m.color}30`,
              }}>
                {m.label}
              </span>
            )
          })()}
          <Badge
            label={`${risk.overall_risk.toUpperCase()} RISK`}
            variant={risk.overall_risk}
            dot
          />
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <MetricCard
          label={t('dashboard.daysPostTransplant')}
          value={dpt}
          sub={fmt.days(dpt)}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <MetricCard
          label={t('dashboard.graftSurvival')}
          value={fmt.pct(risk.graft_survival_probability)}
          sub={t('dashboard.currentProbability')}
          trend="up"
          trendGood={true}
          accent={theme.color.success}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
        <MetricCard
          label={t('dashboard.rejectionRisk')}
          value={fmt.pct(risk.rejection_risk)}
          sub="Grade 1 ACR — resolving"
          trend="down"
          trendGood={false}
          accent={riskColor(risk.rejection_risk)}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
        <MetricCard
          label={t('dashboard.infectionRisk')}
          value={fmt.pct(risk.infection_risk)}
          sub="Prophylaxis active"
          trend="down"
          trendGood={false}
          accent={riskColor(risk.infection_risk)}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>}
        />
      </div>

      {/* Clinical summary — only when a WLT patient is selected */}
      {selected && <ClinicalSummaryPanel patient={selected} />}

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        {/* Lab trend */}
        <Card
          title={t('dashboard.recentLabTrends')}
          subtitle={t('dashboard.labTrendSubtitle')}
          action={
            <Link to="/timeline" style={{ fontSize: 12, color: theme.color.primary, fontWeight: 500 }}>
              {t('dashboard.viewFullTimeline')}
            </Link>
          }
          noPad
          bodyStyle={{ padding: '14px 20px 18px' }}
        >
          {!labsData && labState.status === 'loading' ? (
            <LoadingSpinner size={28} label="Loading labs…" />
          ) : labsData ? (
            <LabTrendChart data={labsData} height={260} />
          ) : null}
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 3D liver */}
          <Card
            title={t('dashboard.liverDigitalTwin')}
            subtitle={t('dashboard.liverSubtitle')}
          >
            <div style={{
              height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.color.muted, fontSize: 13, fontWeight: 600,
            }}>
              Coming in the next update
            </div>
          </Card>

          {/* Latest lab snapshot */}
          <Card title={t('dashboard.latestLabs')} subtitle={fmt.date(labs.date)}>
            {(
              [
                ['alt', labs.alt], ['ast', labs.ast],
                ['bilirubin', labs.bilirubin], ['creatinine', labs.creatinine],
              ] as [keyof typeof LAB_RANGES, number][]
            ).map(([key, val]) => {
              const { lo, hi, unit, label } = LAB_RANGES[key]
              const st = labStatus(val, lo, hi)
              const color = st === 'normal' ? theme.color.success : st === 'elevated' ? theme.color.warning : theme.color.danger
              return (
                <div key={key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 0',
                  borderBottom: `1px solid ${theme.color.border}`,
                }}>
                  <span style={{ fontSize: 13, color: theme.color.text2 }}>{label}</span>
                  <span style={{
                    fontSize: 13, fontWeight: 600, color,
                    background: riskBg(st === 'normal' ? 0 : st === 'elevated' ? 0.4 : 0.8),
                    padding: '2px 8px', borderRadius: theme.r.xl,
                  }}>
                    {val} {unit}
                  </span>
                </div>
              )
            })}
          </Card>
        </div>
      </div>

      {/* Critical patients */}
      <Card
        title={t('dashboard.criticalPatients')}
        subtitle={t('dashboard.criticalSubtitle')}
        style={{ marginTop: 18 }}
        action={
          <Link to="/patients" style={{ fontSize: 12, color: theme.color.primary, fontWeight: 500 }}>
            {t('common.viewAll')} →
          </Link>
        }
      >
        {criticalState.status === 'loading' ? (
          <LoadingSpinner size={28} label={t('common.loading')} />
        ) : criticalState.status === 'error' ? (
          <div style={{ fontSize: 12, color: theme.color.muted, padding: '8px 0', textAlign: 'center' }}>
            {t('dashboard.backendUnavailable')}
          </div>
        ) : !criticalState.data?.results.length ? (
          <div style={{ fontSize: 12, color: theme.color.muted, padding: '8px 0', textAlign: 'center' }}>
            {t('dashboard.noCriticalPatients')}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {criticalState.data.results.map((p, i) => {
              const isLast = i === criticalState.data!.results.length - 1
              const isC    = p.child_pugh_category === 'C'
              const meld   = p.meld_score ?? 0
              const severityColor = isC && meld >= 30
                ? theme.color.danger
                : isC || meld >= 28 ? '#E65100' : theme.color.warning
              const isActive = selected?.patient_id === p.patient_id

              return (
                <div
                  key={p.id}
                  onClick={() => selectCriticalPatient(p)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '4px 1fr auto auto auto',
                    alignItems: 'center',
                    gap: 14,
                    padding: '10px 12px',
                    borderBottom: isLast ? 'none' : `1px solid ${theme.color.border}`,
                    cursor: 'pointer',
                    borderRadius: isActive ? theme.r.sm : undefined,
                    background: isActive ? theme.color.primaryBg : 'transparent',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = theme.color.bg }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Severity stripe */}
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: severityColor, flexShrink: 0 }} />

                  {/* Name + ID */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text, lineHeight: 1.3 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 1 }}>
                      {p.patient_id}{p.age ? ` · ${p.age}y` : ''}{p.sex_display ? ` · ${p.sex_display}` : ''}
                    </div>
                  </div>

                  {/* MELD */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: theme.color.muted, marginBottom: 2 }}>MELD</div>
                    <div style={{
                      fontSize: 14, fontWeight: 700,
                      color: meld >= 30 ? theme.color.danger : meld >= 25 ? '#E65100' : theme.color.text,
                    }}>
                      {meld > 0 ? meld.toFixed(0) : '—'}
                    </div>
                  </div>

                  {/* Child-Pugh badge */}
                  <div style={{ flexShrink: 0 }}>
                    {p.child_pugh_category ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        padding: '3px 8px', borderRadius: theme.r.xl,
                        background: p.child_pugh_category === 'C' ? '#FFEBEE' : p.child_pugh_category === 'B' ? '#FFF3E0' : '#E8F5E9',
                        color: p.child_pugh_category === 'C' ? '#C62828' : p.child_pugh_category === 'B' ? '#E65100' : '#2E7D32',
                      }}>
                        CP-{p.child_pugh_category}
                      </span>
                    ) : <span style={{ fontSize: 11, color: theme.color.muted }}>—</span>}
                  </div>

                  {/* Status */}
                  <div style={{ flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '3px 8px', borderRadius: theme.r.xl,
                      color: p.status === 'Alive' ? theme.color.success : theme.color.danger,
                      background: p.status === 'Alive' ? '#E8F5E920' : '#FF000012',
                      border: `1px solid ${p.status === 'Alive' ? theme.color.success + '40' : theme.color.danger + '40'}`,
                    }}>
                      {p.status || '—'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Quick links row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 18 }}>
        {[
          { to: '/patient',      label: 'Patient Profile',   desc: 'Demographics, medications, physician info' },
          { to: '/risk',         label: 'Risk Prediction',   desc: 'Detailed rejection & infection analysis' },
          { to: '/intervention', label: 'Intervention Sim',  desc: 'Model treatment outcome projections' },
        ].map(({ to, label, desc }) => (
          <Link key={to} to={to} style={{ textDecoration: 'none' }}>
            <div style={{
              background: theme.color.surface,
              border: `1px solid ${theme.color.border}`,
              borderRadius: theme.r.lg,
              padding: '14px 18px',
              boxShadow: theme.shadow.sm,
              cursor: 'pointer',
              transition: 'box-shadow .15s',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.primary }}>{label} →</div>
              <div style={{ fontSize: 12, color: theme.color.muted, marginTop: 3 }}>{desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
