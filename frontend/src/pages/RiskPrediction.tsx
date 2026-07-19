import { useCallback, useEffect } from 'react'
import { useAsync } from '../hooks/useAsync'
import { getMortalityRisk, getRejectionRisk, getInfectionRisk } from '../api/predictions'
import { fmt } from '../utils/format'
import { levelColor, levelBg } from '../utils/format'
import { usePatient } from '../contexts/PatientContext'
import { theme } from '../styles/theme'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { PieChart, Pie, Cell } from 'recharts'
import type { MortalityRiskResponse, RiskUnavailableResponse, RiskLevel } from '../types'

interface GaugeProps {
  value:     number   // 0–1
  label:     string
  riskBand:  RiskLevel
  size?:     number
}

function RiskGauge({ value, label, riskBand, size = 140 }: GaugeProps) {
  const color = levelColor(riskBand)
  const bg    = levelBg(riskBand)
  const pct   = Math.round(value * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size / 2 + 10 }}>
        <PieChart width={size} height={size / 2 + 10}>
          <Pie
            data={[{ v: value }, { v: 1 - value }]}
            cx={size / 2}
            cy={size / 2}
            startAngle={180}
            endAngle={0}
            innerRadius={size * 0.33}
            outerRadius={size * 0.46}
            dataKey="v"
            strokeWidth={0}
          >
            <Cell fill={color} />
            <Cell fill={theme.color.border} />
          </Pie>
        </PieChart>
        <div style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{pct}%</div>
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.color.text2, textAlign: 'center' }}>{label}</div>
      <div style={{
        fontSize: 11, padding: '2px 8px', borderRadius: '9999px',
        background: bg, color, fontWeight: 600,
      }}>
        {riskBand.charAt(0).toUpperCase() + riskBand.slice(1)}
      </div>
    </div>
  )
}

function UnavailableGauge({ label, size = 140 }: { label: string; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: size }}>
      <div style={{
        width: size, height: size / 2 + 10, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        paddingBottom: 8,
      }}>
        <span style={{ fontSize: 13, color: theme.color.text2, fontWeight: 700 }}>N/A</span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.color.text2, textAlign: 'center' }}>{label}</div>
      <Badge label="Insufficient data" variant="neutral" size="sm" />
    </div>
  )
}

function RiskFactor({ label, contribution, direction }: { label: string; contribution: number; direction: 'increases_risk' | 'decreases_risk' }) {
  const color = direction === 'increases_risk' ? theme.color.rejection : '#2E7D32'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: theme.color.text2 }}>
          {label} <span style={{ color, fontWeight: 500 }}>({direction === 'increases_risk' ? '↑ risk' : '↓ risk'})</span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{contribution}%</span>
      </div>
      <div style={{ height: 6, background: theme.color.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${contribution}%`, background: color, borderRadius: 3, transition: 'width .5s ease' }} />
      </div>
    </div>
  )
}

function UnavailableCard({ title, reason }: { title: string; reason: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.color.text, marginBottom: 8 }}>{title}</div>
      <div style={{
        fontSize: 12, color: theme.color.text2, background: theme.color.surface,
        border: `1px dashed ${theme.color.border}`, borderRadius: theme.r.md, padding: '10px 12px',
      }}>
        {reason}
      </div>
    </div>
  )
}

export default function RiskPrediction() {
  const { selected } = usePatient()

  const { state: mortalityState, execute: fetchMortality } = useAsync(
    useCallback(() => getMortalityRisk(selected!.id), [selected]),
    false,
  )
  const { state: rejectionState, execute: fetchRejection } = useAsync(
    useCallback(() => getRejectionRisk(selected!.id), [selected]),
    false,
  )
  const { state: infectionState, execute: fetchInfection } = useAsync(
    useCallback(() => getInfectionRisk(selected!.id), [selected]),
    false,
  )

  useEffect(() => {
    if (selected) {
      fetchMortality()
      fetchRejection()
      fetchInfection()
    }
    // fetch* are stable (useCallback identity changes with `selected`, but useAsync ignores that after mount)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  if (!selected) return null
  if (mortalityState.status === 'loading' || mortalityState.status === 'idle') {
    return <LoadingSpinner fullPage label="Computing risk scores…" />
  }
  if (mortalityState.status === 'error') {
    return <div style={{ padding: 28, color: theme.color.text2 }}>Could not load risk data: {mortalityState.error}</div>
  }

  const mortality = mortalityState.data as MortalityRiskResponse | RiskUnavailableResponse
  const rejection = rejectionState.data as RiskUnavailableResponse | null
  const infection = infectionState.data as RiskUnavailableResponse | null

  const overallColor = mortality.available ? levelColor(mortality.risk_band) : theme.color.text2

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>Risk Prediction</h1>
          <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
            Model-derived mortality risk for {selected.name} ({selected.patient_id})
          </div>
        </div>
        {mortality.available && (
          <Badge label={`${mortality.risk_band.toUpperCase()} MORTALITY RISK`} variant={mortality.risk_band} dot />
        )}
      </div>

      {/* Gauge row */}
      <Card title="Current Risk Scores" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '16px 0 8px' }}>
          {mortality.available ? (
            <RiskGauge value={mortality.probability} label="Mortality Risk" riskBand={mortality.risk_band} />
          ) : (
            <UnavailableGauge label="Mortality Risk" />
          )}
          <div style={{ width: 1, background: theme.color.border, margin: '8px 0' }} />
          <UnavailableGauge label="Rejection Risk" />
          <div style={{ width: 1, background: theme.color.border, margin: '8px 0' }} />
          <UnavailableGauge label="Infection Risk" />
        </div>
      </Card>

      {/* Breakdown */}
      <Card title="Risk Factor Breakdown" style={{ marginBottom: 18 }}>
        {mortality.available ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.color.text, marginBottom: 12 }}>
              Mortality Risk Contributors
            </div>
            {mortality.contributions.map(f => (
              <RiskFactor key={f.label} label={f.label} contribution={f.contribution_pct} direction={f.direction} />
            ))}
          </div>
        ) : (
          <UnavailableCard title="Mortality Risk Contributors" reason={mortality.reason} />
        )}
        {rejection && <UnavailableCard title="Rejection Risk Contributors" reason={rejection.reason} />}
        {infection && <UnavailableCard title="Infection Risk Contributors" reason={infection.reason} />}
      </Card>

      {/* Clinical Interpretation */}
      <Card title="Clinical Interpretation" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <div style={{
            background: mortality.available ? levelBg(mortality.risk_band) : theme.color.surface,
            borderRadius: theme.r.md, padding: '14px 16px',
            border: `1px solid ${overallColor}30`,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: overallColor, marginBottom: 10 }}>Mortality Risk</div>
            {mortality.available ? (
              <>
                <div style={{ fontSize: 12, color: theme.color.text2, marginBottom: 6 }}>
                  Estimated probability: {fmt.pct(mortality.probability)}
                </div>
                <div style={{ fontSize: 12, color: theme.color.text2 }}>
                  {mortality.risk_band === 'high' ? 'High risk — close monitoring advised' :
                    mortality.risk_band === 'moderate' ? 'Moderate risk — routine follow-up' :
                    'Low risk — standard surveillance'}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: theme.color.text2 }}>{mortality.reason}</div>
            )}
          </div>
          <div style={{ background: theme.color.surface, borderRadius: theme.r.md, padding: '14px 16px', border: `1px solid ${theme.color.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text2, marginBottom: 10 }}>Rejection Surveillance</div>
            <div style={{ fontSize: 12, color: theme.color.text2 }}>{rejection?.reason}</div>
          </div>
          <div style={{ background: theme.color.surface, borderRadius: theme.r.md, padding: '14px 16px', border: `1px solid ${theme.color.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text2, marginBottom: 10 }}>Infection Surveillance</div>
            <div style={{ fontSize: 12, color: theme.color.text2 }}>{infection?.reason}</div>
          </div>
        </div>
      </Card>

      {/* Model info footnote */}
      {mortality.available && (
        <div style={{ fontSize: 11, color: theme.color.text2, lineHeight: 1.5, padding: '0 4px' }}>
          Trained on N={mortality.model_info.n_total} patients, {mortality.model_info.n_events} recorded deaths,
          {' '}cross-validated AUC={mortality.model_info.cv_auc.toFixed(2)} (leave-one-out).{' '}
          {mortality.model_info.caveat}
        </div>
      )}
    </div>
  )
}
