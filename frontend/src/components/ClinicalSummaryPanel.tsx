import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { theme } from '../styles/theme'
import Card from './ui/Card'
import { generateClinicalSummary } from '../utils/wltAdapters'
import type { WLTPatient, ClinicalSummary, FindingStatus, SummaryStatus, RecommPriority } from '../types'

// ── Colour maps ────────────────────────────────────────────────────────────────
const STATUS_META: Record<SummaryStatus, { labelKey: string; color: string; bg: string; border: string }> = {
  stable:     { labelKey: 'clinicalSummary.statusStable',     color: '#2E7D32', bg: '#E8F5E9', border: '#A5D6A7' },
  monitoring: { labelKey: 'clinicalSummary.statusMonitoring', color: '#E65100', bg: '#FFF3E0', border: '#FFCC80' },
  concern:    { labelKey: 'clinicalSummary.statusConcern',    color: '#B71C1C', bg: '#FFEBEE', border: '#EF9A9A' },
  critical:   { labelKey: 'clinicalSummary.statusCritical',   color: '#880E4F', bg: '#FCE4EC', border: '#F48FB1' },
}

const FINDING_COLOR: Record<FindingStatus, string> = {
  normal:   '#2E7D32',
  mild:     '#F9A825',
  moderate: '#E65100',
  severe:   '#B71C1C',
}

const FINDING_BG: Record<FindingStatus, string> = {
  normal:   '#E8F5E9',
  mild:     '#FFFDE7',
  moderate: '#FFF3E0',
  severe:   '#FFEBEE',
}

const PRIO_META: Record<RecommPriority, { color: string; bg: string; labelKey: string }> = {
  routine: { color: '#1565C0', bg: '#E3F2FD', labelKey: 'clinicalSummary.prioRoutine' },
  monitor: { color: '#E65100', bg: '#FFF3E0', labelKey: 'clinicalSummary.prioMonitor' },
  urgent:  { color: '#B71C1C', bg: '#FFEBEE', labelKey: 'clinicalSummary.prioUrgent'  },
}

const CATEGORY_KEY: Record<string, string> = {
  hepatic_preop:    'clinicalSummary.catPreopHepatic',
  child_pugh:       'clinicalSummary.catChildPugh',
  intraoperative:   'clinicalSummary.catIntraoperative',
  recovery:         'clinicalSummary.catRecovery',
  hepatic_current:  'clinicalSummary.catCurrentLabs',
  renal:            'clinicalSummary.catRenal',
  rejection:        'clinicalSummary.catRejection',
  outcome:          'clinicalSummary.catOutcome',
}

const DATA_KEY: Record<string, string> = {
  pre_operative:  'clinicalSummary.dataPreOp',
  intraoperative: 'clinicalSummary.dataIntraOp',
  post_operative: 'clinicalSummary.dataPostOp',
  laboratory:     'clinicalSummary.dataLab',
}

// ── Finding status dot ─────────────────────────────────────────────────────────
function StatusDot({ status }: { status: FindingStatus }) {
  const icons: Record<FindingStatus, string> = {
    normal: '✓', mild: '~', moderate: '!', severe: '✕',
  }
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
      background: FINDING_BG[status],
      border: `1.5px solid ${FINDING_COLOR[status]}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: FINDING_COLOR[status],
    }}>
      {icons[status]}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  patient: WLTPatient
}

export default function ClinicalSummaryPanel({ patient }: Props) {
  const { t } = useTranslation()
  const summary: ClinicalSummary = useMemo(() => generateClinicalSummary(patient), [patient])
  const sm = STATUS_META[summary.overall_status]

  const priorityOrder: FindingStatus[] = ['severe', 'moderate', 'mild', 'normal']
  const sortedFindings = [...summary.findings].sort(
    (a, b) => priorityOrder.indexOf(a.status) - priorityOrder.indexOf(b.status)
  )

  return (
    <Card
      title={t('clinicalSummary.title')}
      subtitle={t('clinicalSummary.subtitle')}
      style={{ marginBottom: 18 }}
      action={
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '3px 10px', borderRadius: theme.r.xl,
          background: sm.bg, color: sm.color,
          border: `1px solid ${sm.border}`,
        }}>
          {t(sm.labelKey)}
        </span>
      }
    >
      {/* Assessment paragraph */}
      <div style={{
        background: theme.color.bg,
        border: `1px solid ${theme.color.border}`,
        borderLeft: `3px solid ${sm.color}`,
        borderRadius: theme.r.sm,
        padding: '10px 14px',
        marginBottom: 16,
        fontSize: 13,
        color: theme.color.text,
        lineHeight: 1.6,
      }}>
        {summary.assessment}
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

        {/* Left: Findings */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            {t('clinicalSummary.findings')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sortedFindings.map((finding, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '7px 10px',
                borderRadius: theme.r.sm,
                background: FINDING_BG[finding.status] + '55',
                border: `1px solid ${FINDING_COLOR[finding.status]}20`,
              }}>
                <StatusDot status={finding.status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: FINDING_COLOR[finding.status], marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {CATEGORY_KEY[finding.category] ? t(CATEGORY_KEY[finding.category]) : finding.category}
                  </div>
                  <div style={{ fontSize: 12, color: theme.color.text, lineHeight: 1.45 }}>
                    {finding.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recommendations + Risk Flags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Recommendations */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              {t('clinicalSummary.recommendations')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary.recommendations.map((rec, i) => {
                const pm = PRIO_META[rec.priority]
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '7px 10px',
                    borderRadius: theme.r.sm,
                    background: theme.color.bg,
                    border: `1px solid ${theme.color.border}`,
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      padding: '2px 6px', borderRadius: theme.r.xl,
                      flexShrink: 0, marginTop: 1,
                      color: pm.color, background: pm.bg,
                    }}>
                      {t(pm.labelKey).toUpperCase()}
                    </span>
                    <div style={{ fontSize: 12, color: theme.color.text, lineHeight: 1.45 }}>
                      {rec.text}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Risk flags — only shown when non-empty */}
          {summary.risk_flags.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
                {t('clinicalSummary.riskFlags')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {summary.risk_flags.map((flag, i) => {
                  const isHigh = flag.severity === 'high'
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px',
                      borderRadius: theme.r.sm,
                      background: isHigh ? '#FFEBEE' : '#FFF3E0',
                      border: `1px solid ${isHigh ? '#EF9A9A' : '#FFCC80'}`,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke={isHigh ? '#B71C1C' : '#E65100'} strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <span style={{ fontSize: 12, color: isHigh ? '#B71C1C' : '#E65100', lineHeight: 1.4 }}>
                        {flag.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Data completeness */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.color.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              {t('clinicalSummary.dataCompleteness')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {(Object.entries(summary.data_completeness) as [string, boolean][]).map(([key, val]) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, color: val ? theme.color.success : theme.color.muted,
                }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: val ? theme.color.success : theme.color.border,
                    flexShrink: 0,
                  }} />
                  {DATA_KEY[key] ? t(DATA_KEY[key]) : key}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
