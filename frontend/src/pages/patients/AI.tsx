import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePatient } from '../../contexts/PatientContext'
import { patientsApi } from '../../api/patients'
import { generateClinicalSummary } from '../../utils/wltAdapters'
import { theme } from '../../styles/theme'
import Card from '../../components/ui/Card'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import type { ClinicalSummary, FindingStatus, SummaryStatus } from '../../types'

const STATUS_COLORS: Record<SummaryStatus, { color: string; bg: string }> = {
  stable:     { color: theme.color.success, bg: '#E8F5E9' },
  monitoring: { color: '#1565C0',            bg: '#E3F2FD' },
  concern:    { color: theme.color.warning,  bg: '#FFF3E0' },
  critical:   { color: theme.color.danger,   bg: '#FFEBEE' },
}

const FINDING_META: Record<FindingStatus, { color: string; dot: string }> = {
  normal:   { color: theme.color.text2, dot: theme.color.success },
  mild:     { color: '#E65100',          dot: '#E65100'           },
  moderate: { color: '#E65100',          dot: '#E65100'           },
  severe:   { color: theme.color.danger, dot: theme.color.danger  },
}

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  routine: { color: '#1565C0', bg: '#E3F2FD' },
  monitor: { color: '#E65100', bg: '#FFF3E0' },
  urgent:  { color: '#C62828', bg: '#FFEBEE' },
}

export default function AI() {
  const { id }       = useParams<{ id: string }>()
  const { selected } = usePatient()
  const { t }        = useTranslation()
  const [summary, setSummary]   = useState<ClinicalSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [isFallback, setFallback] = useState(false)

  const STATUS_META: Record<SummaryStatus, { label: string; color: string; bg: string }> = {
    stable:     { label: t('clinicalSummary.statusStable'),     ...STATUS_COLORS.stable     },
    monitoring: { label: t('clinicalSummary.statusMonitoring'), ...STATUS_COLORS.monitoring },
    concern:    { label: t('clinicalSummary.statusConcern'),    ...STATUS_COLORS.concern    },
    critical:   { label: t('clinicalSummary.statusCritical'),   ...STATUS_COLORS.critical   },
  }
  const PRIORITY_META: Record<string, { color: string; bg: string; label: string }> = {
    routine: { label: t('clinicalSummary.prioRoutine'), ...PRIORITY_COLORS.routine },
    monitor: { label: t('clinicalSummary.prioMonitor'), ...PRIORITY_COLORS.monitor },
    urgent:  { label: t('clinicalSummary.prioUrgent'),  ...PRIORITY_COLORS.urgent  },
  }
  const DATA_COMPLETENESS_LABELS: Record<string, string> = {
    pre_op: t('clinicalSummary.dataPreOp'), intraop: t('clinicalSummary.dataIntraOp'),
    post_op: t('clinicalSummary.dataPostOp'), lab: t('clinicalSummary.dataLab'),
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    patientsApi.clinicalSummary(id)
      .then(data => { setSummary(data); setFallback(false) })
      .catch(() => {
        // Fall back to locally generated summary from WLT data
        if (selected) {
          setSummary(generateClinicalSummary(selected, t))
          setFallback(true)
        }
      })
      .finally(() => setLoading(false))
  }, [id, selected])

  if (loading) {
    return (
      <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner label={t('clinicalSummary.analyzing')} />
      </div>
    )
  }

  if (!summary) {
    return (
      <div style={{ padding: '40px 28px', textAlign: 'center', color: theme.color.muted }}>
        {t('clinicalSummary.noAnalysis')}
      </div>
    )
  }

  const statusMeta = STATUS_META[summary.overall_status]

  const CATEGORY_LABEL: Record<string, string> = {
    hepatic_preop:   t('clinicalSummary.catPreopHepatic'),
    child_pugh:      t('clinicalSummary.catChildPugh'),
    intraoperative:  t('clinicalSummary.catIntraoperative'),
    recovery:        t('clinicalSummary.catRecovery'),
    hepatic_current: t('clinicalSummary.catCurrentLabs'),
    renal:           t('clinicalSummary.catRenal'),
    rejection:       t('clinicalSummary.catRejection'),
    outcome:         t('clinicalSummary.catOutcome'),
  }
  const FINDING_STATUS_LABEL: Record<string, string> = {
    normal:   t('clinicalSummary.findingNormal'),
    mild:     t('clinicalSummary.findingMild'),
    moderate: t('clinicalSummary.findingModerate'),
    severe:   t('clinicalSummary.findingSevere'),
  }
  const FLAG_LABEL: Record<string, string> = {
    high_meld:     t('clinicalSummary.flagHighMeld'),
    child_pugh_c:  t('clinicalSummary.flagCpC'),
    prolonged_cit: t('clinicalSummary.flagProlongedCit'),
    high_bleeding: t('clinicalSummary.flagHighBleeding'),
    prolonged_icu: t('clinicalSummary.flagProlongedIcu'),
    obesity:       t('clinicalSummary.flagObesity'),
    underweight:   t('clinicalSummary.flagUnderweight'),
  }

  return (
    <div style={{ padding: '20px 28px', display: 'grid', gap: 16 }}>

      {isFallback && (
        <div style={{
          padding: '10px 16px', borderRadius: theme.r.md, fontSize: 12,
          background: '#FFF8E1', color: '#E65100', border: '1px solid #FFE082',
        }}>
          {t('clinicalSummary.disclaimer')}
        </div>
      )}

      {/* Overall status */}
      <div style={{
        padding: '20px 24px', borderRadius: theme.r.lg,
        background: statusMeta.bg, border: `1px solid ${statusMeta.color}30`,
        display: 'flex', alignItems: 'flex-start', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: statusMeta.color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {summary.overall_status === 'stable' ? '✓'
         : summary.overall_status === 'critical' ? '!' : '~'}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: statusMeta.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            {t('clinicalSummary.overallStatus')} — {statusMeta.label}
          </div>
          <div style={{ fontSize: 14, color: theme.color.text, lineHeight: 1.6 }}>
            {summary.assessment}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Clinical findings */}
        <Card title={t('clinicalSummary.findings')}>
          {summary.findings.map((f, i) => {
            const meta = FINDING_META[f.status]
            return (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '10px 0',
                borderBottom: i < summary.findings.length - 1 ? `1px solid ${theme.color.border}` : 'none',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: meta.dot,
                  marginTop: 6, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.color.text }}>{CATEGORY_LABEL[f.category] ?? f.category}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, textTransform: 'capitalize',
                      color: meta.color, background: f.status === 'normal' ? theme.color.bg : 'transparent',
                      border: `1px solid ${meta.dot}40`,
                    }}>
                      {FINDING_STATUS_LABEL[f.status] ?? f.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: theme.color.text2 }}>{f.text}</div>
                  {f.detail && <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 2 }}>{f.detail}</div>}
                </div>
              </div>
            )
          })}
        </Card>

        {/* Recommendations */}
        <Card title={t('clinicalSummary.recommendations')}>
          {summary.recommendations.map((r, i) => {
            const pm = PRIORITY_META[r.priority] ?? PRIORITY_META.routine
            return (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '10px 0',
                borderBottom: i < summary.recommendations.length - 1 ? `1px solid ${theme.color.border}` : 'none',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
                  background: pm.bg, color: pm.color, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2,
                }}>
                  {pm.label}
                </span>
                <div style={{ fontSize: 12.5, color: theme.color.text, lineHeight: 1.5 }}>{r.text}</div>
              </div>
            )
          })}
        </Card>
      </div>

      {/* Risk flags */}
      {summary.risk_flags.length > 0 && (
        <Card title={t('clinicalSummary.riskFlags')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {summary.risk_flags.map((f, i) => (
              <div key={i} style={{
                padding: '12px 14px', borderRadius: theme.r.md,
                border: `1px solid ${theme.color.border}`,
                background: f.severity === 'high' || f.severity === 'critical'
                  ? '#FFEBEE30' : f.severity === 'moderate' ? '#FFF3E030' : 'transparent',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: f.severity === 'high' || f.severity === 'critical'
                      ? theme.color.danger : f.severity === 'moderate' ? theme.color.warning : theme.color.success,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: theme.color.text }}>{FLAG_LABEL[f.flag] ?? f.flag}</span>
                </div>
                <div style={{ fontSize: 11.5, color: theme.color.text2 }}>{f.text}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Data completeness */}
      <Card title={t('clinicalSummary.dataCompleteness')}>
        <div style={{ display: 'flex', gap: 16 }}>
          {Object.entries(summary.data_completeness).map(([key, complete]) => (
            <div key={key} style={{
              flex: 1, padding: '12px 14px', borderRadius: theme.r.md,
              border: `1px solid ${complete ? theme.color.success + '40' : theme.color.border}`,
              background: complete ? '#E8F5E920' : theme.color.bg,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{complete ? '✓' : '○'}</div>
              <div style={{
                fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
                color: complete ? theme.color.success : theme.color.muted,
              }}>
                {DATA_COMPLETENESS_LABELS[key] ?? key.replace(/_/g, ' ')}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
