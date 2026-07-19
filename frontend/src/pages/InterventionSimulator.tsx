import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/mock'
import { usePatient } from '../contexts/PatientContext'
import { generateCurrentRisk, simulateFromWLT } from '../utils/wltAdapters'
import { theme } from '../styles/theme'
import { fmt } from '../utils/format'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import OutcomeCurveChart from '../components/charts/OutcomeCurveChart'
import type { Intervention, OutcomePoint } from '../types'

const DEFAULT_IV: Intervention = {
  immunosuppression_level:  62,
  antiviral_flag:           true,
  lifestyle_score:          50,
  antibiotic_flag:          true,
  supportive_therapy_level: 40,
}

interface SliderProps {
  label:   string
  value:   number
  min?:    number
  max?:    number
  step?:   number
  unit?:   string
  onChange:(v: number) => void
  accentColor?: string
}

function Slider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange, accentColor = theme.color.primary }: SliderProps) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: theme.color.text2 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ accentColor }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: theme.color.muted, marginTop: 2 }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

interface ToggleProps {
  label:    string
  sub?:     string
  value:    boolean
  onChange: (v: boolean) => void
  color?:   string
}

function Toggle({ label, sub, value, onChange, color = theme.color.primary }: ToggleProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px',
      border: `1px solid ${value ? color + '40' : theme.color.border}`,
      borderRadius: theme.r.md,
      background: value ? color + '0A' : theme.color.bg,
      marginBottom: 8,
      cursor: 'pointer',
      transition: 'all .15s',
    }} onClick={() => onChange(!value)}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: theme.color.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{
        width: 38, height: 22, borderRadius: 11,
        background: value ? color : theme.color.border,
        position: 'relative',
        transition: 'background .2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 3, left: value ? 19 : 3,
          width: 16, height: 16, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
          transition: 'left .2s',
        }} />
      </div>
    </div>
  )
}

function DeltaChip({ baseline, current, invert }: { baseline: number; current: number; invert?: boolean }) {
  const delta   = current - baseline
  const better  = invert ? delta < 0 : delta > 0
  const color   = Math.abs(delta) < 0.005 ? theme.color.muted : better ? theme.color.success : theme.color.danger
  const sign    = delta >= 0 ? '+' : ''
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 6px',
      borderRadius: theme.r.xl, color,
      background: color + '18',
    }}>
      {sign}{(delta * 100).toFixed(1)}pp
    </span>
  )
}

export default function InterventionSimulator() {
  const { selected } = usePatient()
  const [iv, setIv]         = useState<Intervention>(DEFAULT_IV)
  const [outcomes, setOut]  = useState<OutcomePoint[] | null>(null)
  const [loading, setLoad]  = useState(true)

  const wltBaseline = useMemo(() => selected ? generateCurrentRisk(selected) : null, [selected])

  const updateIv = useCallback(<K extends keyof Intervention>(key: K, val: Intervention[K]) =>
    setIv(prev => ({ ...prev, [key]: val })), [])

  useEffect(() => {
    setLoad(true)
    const timer = setTimeout(() => {
      if (wltBaseline) {
        setOut(simulateFromWLT(selected!, iv))
        setLoad(false)
      } else {
        api.simulateIntervention(iv).then(data => {
          setOut(data)
          setLoad(false)
        })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [iv, wltBaseline, selected])

  const last     = outcomes?.[outcomes.length - 1]
  const midpoint = outcomes?.[45]

  return (
    <div style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>Intervention Simulator</h1>
          <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
            Adjust treatment parameters to project 90-day outcomes in silico
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge label="Simulation Mode" variant="primary" dot />
          <button
            onClick={() => setIv(DEFAULT_IV)}
            style={{
              padding: '5px 12px', borderRadius: theme.r.sm,
              border: `1px solid ${theme.color.border}`,
              fontSize: 12, color: theme.color.text2,
              background: theme.color.surface,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '290px 1fr', gap: 18 }}>
        {/* Control panel */}
        <div>
          <Card title="Intervention Controls" subtitle="Changes update projections automatically">
            {/* Immunosuppression */}
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${theme.color.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Immunosuppression
              </div>
              <Slider
                label="Tacrolimus Target Level"
                value={iv.immunosuppression_level}
                onChange={v => updateIv('immunosuppression_level', v)}
                unit="%"
                accentColor={theme.color.primary}
              />
            </div>

            {/* Antimicrobials */}
            <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${theme.color.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Antimicrobial Therapy
              </div>
              <Toggle
                label="Antiviral Therapy"
                sub="Valganciclovir prophylaxis"
                value={iv.antiviral_flag}
                onChange={v => updateIv('antiviral_flag', v)}
                color={theme.color.accent}
              />
              <Toggle
                label="Antibiotic Prophylaxis"
                sub="TMP-SMX for PCP"
                value={iv.antibiotic_flag}
                onChange={v => updateIv('antibiotic_flag', v)}
                color="#6A1B9A"
              />
            </div>

            {/* Supportive */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Supportive Care
              </div>
              <Slider
                label="Lifestyle Modification"
                value={iv.lifestyle_score}
                onChange={v => updateIv('lifestyle_score', v)}
                unit="%"
                accentColor="#2E7D32"
              />
              <Slider
                label="Supportive Therapy"
                value={iv.supportive_therapy_level}
                onChange={v => updateIv('supportive_therapy_level', v)}
                unit="%"
                accentColor={theme.color.warning}
              />
            </div>
          </Card>

          {/* Summary box */}
          {!loading && last && midpoint && (
            <Card title="90-Day Projection" style={{ marginTop: 14 }}>
              {[
                { label: 'Graft Survival at 90d',  val: last.graft_survival,  base: last.graft_survival_baseline,  inv: false },
                { label: 'Rejection Risk at 45d',  val: midpoint.rejection_risk, base: midpoint.rejection_risk_baseline, inv: true },
                { label: 'Infection Risk at 90d',  val: last.infection_risk,  base: last.infection_risk_baseline,  inv: true },
              ].map(row => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: `1px solid ${theme.color.border}`,
                }}>
                  <span style={{ fontSize: 12, color: theme.color.text2 }}>{row.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: theme.color.text }}>{fmt.pct(row.val)}</span>
                    <DeltaChip baseline={row.base} current={row.val} invert={row.inv} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: theme.color.muted, marginTop: 10, fontStyle: 'italic' }}>
                pp = percentage-point change vs. no-intervention baseline
              </div>
            </Card>
          )}
        </div>

        {/* Outcome curves */}
        <div>
          {loading ? (
            <div style={{
              background: theme.color.surface,
              border: `1px solid ${theme.color.border}`,
              borderRadius: theme.r.lg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 460,
            }}>
              <LoadingSpinner size={36} label="Running simulation…" />
            </div>
          ) : outcomes ? (
            <Card
              title="Outcome Projections"
              subtitle="Solid = with intervention · Dashed = no-intervention baseline · 90-day horizon"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 28, marginTop: 8 }}>
                <OutcomeCurveChart
                  data={outcomes}
                  metric="graft_survival"
                  label="Graft Survival Probability"
                  color={theme.color.survival}
                  height={200}
                />
                <OutcomeCurveChart
                  data={outcomes}
                  metric="rejection_risk"
                  label="Rejection Risk"
                  color={theme.color.rejection}
                  height={200}
                  invert
                />
                <OutcomeCurveChart
                  data={outcomes}
                  metric="infection_risk"
                  label="Infection Risk"
                  color={theme.color.infection}
                  height={200}
                  invert
                />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
