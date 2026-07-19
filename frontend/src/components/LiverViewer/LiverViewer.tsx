/**
 * LiverViewer — the main exported canvas component.
 *
 * Features:
 *   • Loads GLB from /models/liver.glb (with Suspense + ErrorBoundary fallback)
 *   • Clinical morphology: shape / colour / surface driven by patient data
 *   • Toggleable overlays: fibrosis / perfusion / inflammation / tumor / risk
 *   • Anatomical labels via Html
 *   • Slow auto-rotation, orbit controls, double-click reset
 *   • Contact shadows, HDRI environment
 *   • Dark medical background
 *
 * Usage:
 *   <LiverViewer params={liverParams} height={320} />
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import * as THREE from 'three'

import { usePatientMorphology, type LiverViewerParams } from './usePatientMorphology'
import { generateOverlay, type OverlayMode } from './LiverHeatmap'
import { LiverModel } from './LiverModel'
import { useCameraReset } from './LiverAnimation'

// ── Overlay toggle button ─────────────────────────────────────────────────────
const OVERLAYS: Array<{ id: OverlayMode; label: string }> = [
  { id: 'fibrosis',     label: 'Fibrosis'     },
  { id: 'perfusion',    label: 'Perfusion'    },
  { id: 'inflammation', label: 'Inflammation' },
  { id: 'tumor',        label: 'Tumor'        },
  { id: 'risk',         label: 'Risk'         },
]

function OverlayBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding:       '3px 10px',
        borderRadius:   4,
        fontSize:       10,
        fontWeight:     active ? 700 : 400,
        cursor:        'pointer',
        background:    active ? 'rgba(60,110,200,0.28)' : 'rgba(255,255,255,0.04)',
        color:         active ? '#82b4ff' : '#667',
        border:        `1px solid ${active ? 'rgba(80,130,240,0.45)' : 'rgba(255,255,255,0.08)'}`,
        transition:    'all .12s',
        letterSpacing: '0.04em',
        whiteSpace:    'nowrap',
        userSelect:    'none',
      }}
    >
      {label}
    </button>
  )
}

// ── Inner canvas scene ────────────────────────────────────────────────────────
function Scene({
  morphology,
  overlayTex,
  autoRotate,
  showLabels,
  onResetRef,
}: {
  morphology: ReturnType<typeof usePatientMorphology>
  overlayTex: THREE.DataTexture | null
  autoRotate: boolean
  showLabels: boolean
  onResetRef: React.MutableRefObject<(() => void) | null>
}) {
  const orbitRef = useRef<OrbitControlsImpl>(null!)
  const reset    = useCameraReset()

  // Store reset so the outer component can trigger double-click reset
  onResetRef.current = reset

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.28} />
      <directionalLight
        position={[3.5, 5.0, 3.0]}
        intensity={1.55}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
      />
      <directionalLight position={[-3.0, 2.0, -2.5]} intensity={0.30} color="#4477cc" />
      <pointLight       position={[0, -2.5, 2.0]}    intensity={0.45} color="#ff6622" />

      {/* 3D Model */}
      <LiverModel
        morphology={morphology}
        overlayMesh={null}
        overlayTex={overlayTex}
        autoRotate={autoRotate}
        showLabels={showLabels}
      />

      {/* Contact shadow on virtual floor */}
      <ContactShadows
        position={[0, -0.78, 0]}
        opacity={0.55}
        scale={4}
        blur={2.2}
        far={1.2}
        color="#060608"
      />

      {/* HDRI environment for realistic reflections */}
      <Environment preset="studio" />

      {/* Camera controls */}
      <OrbitControls
        ref={orbitRef}
        enablePan={false}
        enableZoom
        enableRotate
        minDistance={1.8}
        maxDistance={7.0}
        minPolarAngle={Math.PI * 0.10}
        maxPolarAngle={Math.PI * 0.82}
        autoRotate={false}        // managed by useAutoRotate in LiverModel
        dampingFactor={0.08}
        enableDamping
      />
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
interface LiverViewerProps {
  params:      LiverViewerParams
  height?:     number
  showOverlayBar?: boolean
}

export default function LiverViewer({
  params,
  height = 340,
  showOverlayBar = true,
}: LiverViewerProps) {
  const morphology      = usePatientMorphology(params)
  const [activeOverlay, setActiveOverlay] = useState<OverlayMode | null>(null)
  const [autoRotate,    setAutoRotate]    = useState(true)
  const [showLabels,    setShowLabels]    = useState(false)
  const [hovered,       setHovered]       = useState(false)
  const resetRef = useRef<(() => void) | null>(null)

  const overlayTex = useMemo(() => {
    if (!activeOverlay) return null
    return generateOverlay(activeOverlay, 0.78, params.patientId)
  }, [activeOverlay, params.patientId])

  const handleOverlayToggle = useCallback((id: OverlayMode) => {
    setActiveOverlay(prev => prev === id ? null : id)
  }, [])

  const handleDoubleClick = useCallback(() => {
    resetRef.current?.()
  }, [])

  // ── Background colour: varies by severity ──────────────────────────────────
  const bgColor =
    morphology.stage === 'deceased'  ? '#100c0c' :
    morphology.stage === 'critical'  ? '#110808' :
    morphology.stage === 'severe'    ? '#100c08' :
                                       '#090d12'

  const stageColor =
    morphology.stage === 'deceased'  ? '#666' :
    morphology.stage === 'critical'  ? '#ff5555' :
    morphology.stage === 'severe'    ? '#ff8c44' :
    morphology.stage === 'moderate'  ? '#f0c040' :
    morphology.stage === 'mild'      ? '#88cc66' :
                                       '#44cc88'

  return (
    <div style={{
      display:    'flex',
      flexDirection: 'column',
      borderRadius: 12,
      overflow:   'hidden',
      background: bgColor,
      border:     `1px solid rgba(255,255,255,0.06)`,
      userSelect: 'none',
    }}>

      {/* ── Canvas ────────────────────────────────────────────────────────── */}
      <div
        style={{ height, position: 'relative', cursor: hovered ? 'grab' : 'default' }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Top-left: stage badge */}
        <div style={{
          position:  'absolute', top: 10, left: 12, zIndex: 2,
          fontSize:  10, fontWeight: 700, letterSpacing: '0.07em',
          color:     stageColor, textTransform: 'uppercase',
          display:   'flex', alignItems: 'center', gap: 5,
          pointerEvents: 'none',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: stageColor, display: 'inline-block' }} />
          {morphology.stage}
        </div>

        {/* Top-right: MELD badge */}
        {params.meldScore != null && (
          <div style={{
            position: 'absolute', top: 10, right: 12, zIndex: 2,
            fontSize: 11, fontWeight: 700, color: stageColor,
            letterSpacing: '0.04em', pointerEvents: 'none',
          }}>
            MELD {params.meldScore.toFixed(0)}
          </div>
        )}

        {/* Bottom-right: double-click hint */}
        <div style={{
          position: 'absolute', bottom: 9, right: 12, zIndex: 2,
          fontSize: 9, color: '#333', pointerEvents: 'none',
        }}>
          double-click to reset
        </div>

        <Canvas
          shadows
          camera={{ position: [0, 0.25, 3.4], fov: 42 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
          style={{ background: bgColor }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <Scene
            morphology={morphology}
            overlayTex={overlayTex}
            autoRotate={autoRotate}
            showLabels={showLabels}
            onResetRef={resetRef}
          />
        </Canvas>
      </div>

      {/* ── Control bar ───────────────────────────────────────────────────── */}
      {showOverlayBar && (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          gap:            6,
          padding:        '8px 12px',
          borderTop:      '1px solid rgba(255,255,255,0.05)',
          background:     'rgba(0,0,0,0.25)',
          flexWrap:       'wrap',
          justifyContent: 'space-between',
        }}>
          {/* Overlay toggles */}
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {OVERLAYS.map(o => (
              <OverlayBtn
                key={o.id}
                label={o.label}
                active={activeOverlay === o.id}
                onClick={() => handleOverlayToggle(o.id)}
              />
            ))}
          </div>

          {/* View toggles */}
          <div style={{ display: 'flex', gap: 5 }}>
            <OverlayBtn
              label="Rotate"
              active={autoRotate}
              onClick={() => setAutoRotate(v => !v)}
            />
            <OverlayBtn
              label="Labels"
              active={showLabels}
              onClick={() => setShowLabels(v => !v)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
