/**
 * Anatomical HTML labels positioned in 3D space using @react-three/drei Html.
 * Labels are anchored to well-known anatomical landmarks on the liver.
 */

import { Html } from '@react-three/drei'

interface LiverLabelsProps {
  visible: boolean
}

const LABELS: Array<{ position: [number, number, number]; text: string; side: 'right' | 'left' }> = [
  { position: [1.05, 0.15, 0.30],  text: 'Right Lobe',              side: 'right' },
  { position: [-0.85, 0.20, 0.20], text: 'Left Lobe',               side: 'left'  },
  { position: [0.40, 0.68, 0.00],  text: 'Diaphragmatic Surface',   side: 'right' },
  { position: [0.45, -0.36, 0.50], text: 'Visceral Surface',        side: 'right' },
  { position: [0.05, -0.20, 0.62], text: 'Porta Hepatis',           side: 'right' },
]

const labelStyle = (side: 'right' | 'left'): React.CSSProperties => ({
  background:    'rgba(8, 16, 24, 0.88)',
  color:         '#90c4e8',
  fontSize:       9,
  padding:       '2px 8px',
  borderRadius:   4,
  border:        `1px solid rgba(80,140,200,0.35)`,
  whiteSpace:    'nowrap',
  letterSpacing: '0.05em',
  pointerEvents: 'none',
  fontFamily:    'system-ui, sans-serif',
  userSelect:    'none',
})

export function LiverLabels({ visible }: LiverLabelsProps) {
  if (!visible) return null

  return (
    <>
      {LABELS.map(({ position, text, side }) => (
        <Html key={text} position={position} center distanceFactor={5.5}>
          <div style={labelStyle(side)}>
            {text}
          </div>
        </Html>
      ))}
    </>
  )
}
