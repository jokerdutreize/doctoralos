import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import type { OutcomePoint } from '../../types'
import { theme } from '../../styles/theme'

type MetricKey = 'graft_survival' | 'rejection_risk' | 'infection_risk'

interface Props {
  data:      OutcomePoint[]
  metric:    MetricKey
  label:     string
  color:     string
  height?:   number
  invert?:   boolean   // true for risk metrics (lower = better)
}

const CustomTooltip = ({ active, payload, label, invert }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff', border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.md, padding: '10px 14px',
      boxShadow: theme.shadow.md, fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Day {label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: theme.color.text2 }}>{p.name}:</span>
          <span style={{ fontWeight: 600 }}>{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
      {invert && (
        <div style={{ fontSize: 10, color: theme.color.muted, marginTop: 6, borderTop: `1px solid ${theme.color.border}`, paddingTop: 4 }}>
          Lower is better
        </div>
      )}
    </div>
  )
}

export default function OutcomeCurveChart({ data, metric, label, color, height = 220, invert }: Props) {
  const baseKey = `${metric}_baseline` as const
  const pctFmt  = (v: number) => `${(v * 100).toFixed(0)}%`

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text, marginBottom: 10 }}>{label}</div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={theme.color.chartGrid} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: theme.color.muted }}
            tickLine={false} axisLine={false}
            tickFormatter={(v) => `D${v}`}
            interval={14}
          />
          <YAxis
            tick={{ fontSize: 11, fill: theme.color.muted }}
            tickLine={false} axisLine={false}
            tickFormatter={pctFmt}
            domain={['auto', 'auto']}
            width={44}
          />
          <Tooltip content={<CustomTooltip invert={invert} />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
          {/* Baseline as dashed line */}
          <Line
            type="monotone"
            dataKey={baseKey}
            name="No intervention"
            stroke={theme.color.baseline}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
          />
          {/* Intervention as filled area */}
          <Area
            type="monotone"
            dataKey={metric}
            name="With intervention"
            stroke={color}
            fill={color + '20'}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
