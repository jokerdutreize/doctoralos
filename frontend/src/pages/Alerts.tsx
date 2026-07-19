import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAsync } from '../hooks/useAsync'
import { patientsApi } from '../api/patients'
import { theme } from '../styles/theme'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { usePatient } from '../contexts/PatientContext'
import { useNavigate } from 'react-router-dom'

export default function Alerts() {
  const { state } = useAsync(useCallback(() => patientsApi.critical(20), []))
  const { setSelected } = usePatient()
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>{t('alerts.title')}</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          {t('alerts.subtitle')}
        </div>
      </div>

      <Card title={t('alerts.criticalPatients')} subtitle={t('alerts.criticalSubtitle')}>
        {state.status === 'loading' && <LoadingSpinner size={28} label={t('common.loading')} />}
        {state.status === 'error' && (
          <div style={{ fontSize: 13, color: theme.color.muted, padding: '16px 0', textAlign: 'center' }}>
            {t('alerts.backendUnavailable')}
          </div>
        )}
        {state.status === 'success' && state.data.results.map((p, i) => {
          const isLast = i === state.data.results.length - 1
          const meld = p.meld_score ?? 0
          const severityColor = p.child_pugh_category === 'C' && meld >= 30
            ? theme.color.danger
            : p.child_pugh_category === 'C' || meld >= 28 ? '#E65100' : theme.color.warning

          return (
            <div key={p.id}
              onClick={() => { setSelected(p); navigate('/') }}
              style={{
                display: 'grid', gridTemplateColumns: '4px 1fr auto auto auto auto',
                alignItems: 'center', gap: 16, padding: '12px 10px',
                borderBottom: isLast ? 'none' : `1px solid ${theme.color.border}`,
                cursor: 'pointer', borderRadius: theme.r.sm, transition: 'background .12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = theme.color.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 4, height: 40, borderRadius: 2, background: severityColor }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>{p.name}</div>
                <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 1 }}>
                  {p.patient_id}{p.age ? ` · ${p.age}y` : ''}{p.sex_display ? ` · ${p.sex_display}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: theme.color.muted }}>MELD</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: meld >= 30 ? theme.color.danger : '#E65100' }}>
                  {meld > 0 ? meld.toFixed(0) : '—'}
                </div>
              </div>
              {p.child_pugh_category && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: theme.r.xl,
                  background: p.child_pugh_category === 'C' ? '#FFEBEE' : '#FFF3E0',
                  color: p.child_pugh_category === 'C' ? '#C62828' : '#E65100',
                }}>
                  CP-{p.child_pugh_category}
                </span>
              )}
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: theme.r.xl,
                color: p.status === 'Alive' ? theme.color.success : theme.color.danger,
                background: p.status === 'Alive' ? theme.color.successBg : theme.color.dangerBg,
              }}>
                {p.status === 'Alive' ? t('common.alive') : p.status === 'Deceased' ? t('common.deceased') : p.status || '—'}
              </span>
              <span style={{ fontSize: 12, color: theme.color.primary, fontWeight: 500 }}>
                View →
              </span>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
