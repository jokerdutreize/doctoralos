import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import type { RiskScore } from '../../types'
import { fmt } from '../../utils/format'
import { theme } from '../../styles/theme'

interface Props {
  data:    RiskScore[]
  height?: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.md, padding: '10px 14px',
      boxShadow: theme.shadow.md, fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: theme.color.text2 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{(p.value * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  )
}

export default function RiskScoreChart({ data, height = 260 }: Props) {
  const chartData = data.map(d => ({
    date:     fmt.dateShort(d.date),
    rejection: d.rejection_risk,
    infection: d.infection_risk,
    survival:  d.graft_survival_probability,
  }))

  const pctFmt = (v: number) => `${(v * 100).toFixed(0)}%`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={theme.color.chartGrid} strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.color.muted }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: theme.color.muted }} tickLine={false} axisLine={false} tickFormatter={pctFmt} domain={[0, 1]} width={44} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Line type="monotone" dataKey="survival"  name="Graft Survival" stroke={theme.color.survival}  strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: theme.color.survival }}  />
        <Line type="monotone" dataKey="rejection" name="Rejection Risk" stroke={theme.color.rejection} strokeWidth={2}   dot={{ r: 3, strokeWidth: 0, fill: theme.color.rejection }} />
        <Line type="monotone" dataKey="infection" name="Infection Risk" stroke={theme.color.infection} strokeWidth={2}   dot={{ r: 3, strokeWidth: 0, fill: theme.color.infection }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
