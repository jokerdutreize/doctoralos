import { theme } from '../styles/theme'
import Card from '../components/ui/Card'
import { usePatient } from '../contexts/PatientContext'
import { generateCurrentRisk } from '../utils/wltAdapters'
import { useMemo } from 'react'

export default function DigitalTwin() {
  const { selected } = usePatient()
  const risk = useMemo(() => selected ? generateCurrentRisk(selected) : null, [selected])

  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.color.text, margin: 0 }}>Digital Twin</h1>
        <div style={{ fontSize: 13, color: theme.color.text2, marginTop: 3 }}>
          {selected ? `${selected.name} · 3D liver model and organ simulation` : 'Select a patient to view the digital twin'}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>
        <Card title="Liver 3D Model" subtitle="Couinaud segments I–VIII · Drag to rotate">
          <div style={{
            height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.color.muted, fontSize: 14, fontWeight: 600,
          }}>
            Coming in the next update
          </div>
        </Card>
        <Card title="Organ Status">
          {risk ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Overall Risk',      value: risk.overall_risk.toUpperCase(),                color: risk.overall_risk === 'high' ? theme.color.danger : risk.overall_risk === 'moderate' ? theme.color.warning : theme.color.success },
                { label: 'Graft Survival',    value: `${(risk.graft_survival_probability * 100).toFixed(0)}%`, color: theme.color.success },
                { label: 'Rejection Risk',    value: `${(risk.rejection_risk * 100).toFixed(0)}%`,   color: theme.color.danger  },
                { label: 'Infection Risk',    value: `${(risk.infection_risk * 100).toFixed(0)}%`,   color: theme.color.warning },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: theme.color.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{row.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: row.color }}>{row.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: theme.color.muted }}>Select a patient first.</div>
          )}
        </Card>
      </div>
    </div>
  )
}
