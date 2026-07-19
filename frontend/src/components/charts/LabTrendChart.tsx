import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'
import type { LabResult } from '../../types'
import { fmt, LAB_RANGES } from '../../utils/format'
import { theme } from '../../styles/theme'

type LabKey = 'alt' | 'ast' | 'bilirubin' | 'creatinine'

interface Props {
  data:      LabResult[]
  keys?:     LabKey[]
  height?:   number
  refLines?: boolean
}

const CONFIG: Record<LabKey, { color: string; label: string; refHi: number }> = {
  alt:        { color: theme.color.alt,        label: 'ALT (U/L)',       refHi: 56  },
  ast:        { color: theme.color.ast,        label: 'AST (U/L)',       refHi: 40  },
  bilirubin:  { color: theme.color.bilirubin,  label: 'Bilirubin mg/dL', refHi: 1.2 },
  creatinine: { color: theme.color.creatinine, label: 'Creatinine mg/dL',refHi: 1.3 },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${theme.color.border}`,
      borderRadius: theme.r.md,
      padding: '10px 14px',
      boxShadow: theme.shadow.md,
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 600, color: theme.color.text, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: theme.color.text2 }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: theme.color.text }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function LabTrendChart({
  data,
  keys = ['alt', 'ast', 'bilirubin', 'creatinine'],
  height = 280,
  refLines = true,
}: Props) {
  const chartData = data.map(d => ({
    date: fmt.dateShort(d.date),
    alt:         d.alt,
    ast:         d.ast,
    bilirubin:   d.bilirubin,
    creatinine:  d.creatinine,
  }))

  // Show every 3rd label to avoid crowding
  const tickFormatter = (_: string, idx: number) => idx % 3 === 0 ? chartData[idx]?.date ?? '' : ''

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid stroke={theme.color.chartGrid} strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: theme.color.muted }}
          tickLine={false}
          axisLine={false}
          tickFormatter={tickFormatter}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: theme.color.muted }}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        {refLines && keys.map(k => (
          <ReferenceLine
            key={k + '-ref'}
            y={LAB_RANGES[k].hi}
            stroke={CONFIG[k].color}
            strokeDasharray="4 3"
            strokeOpacity={0.4}
          />
        ))}
        {keys.map(k => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            name={CONFIG[k].label}
            stroke={CONFIG[k].color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
