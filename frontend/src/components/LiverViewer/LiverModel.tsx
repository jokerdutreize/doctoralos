/**
 * LiverModel — loads a real anatomical GLB from /models/liver.glb when present,
 * falls back to the procedural SDF-based geometry when the file is absent.
 *
 * Architecture:
 *   1. <ModelErrorBoundary>  catches 404 / parse errors from useGLTF
 *   2. <Suspense>            shows a spinning skeleton while the GLB loads
 *   3. <GLBLiver>            renders the actual GLB model with clinical material
 *   4. <ProceduralLiver>     rendered as Suspense fallback AND ErrorBoundary fallback
 *
 * Placing the GLB:
 *   Download a free anatomical liver model (GLB format) and save it to:
 *     frontend/public/models/liver.glb
 *   Recommended sources:
 *     • Sketchfab — search "liver anatomy" → filter Free + GLB
 *     • NIH 3D Print Exchange — https://3d.nih.gov
 *     • Free3D   — https://free3d.com/3d-models/liver
 *   Once placed, the GLB is loaded automatically and the procedural mesh is
 *   no longer shown.
 */

import { Component, Suspense, useRef, useEffect, useMemo, memo } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { MorphologyParams } from './usePatientMorphology'
import { createLiverGeometry } from './LiverMorphology'
import { createLiverMaterial, createTumorMaterial, createOverlayMaterial } from './LiverMaterial'
import { useAutoRotate, useVascularPulse, useCriticalGlow } from './LiverAnimation'
import { LiverLabels } from './LiverLabels'

const MODEL_URL = '/models/liver.glb'

// ── Preload — starts download before component mounts ─────────────────────────
useGLTF.preload(MODEL_URL)

// ── Shared props type ─────────────────────────────────────────────────────────
interface ModelProps {
  morphology:   MorphologyParams
  overlayMesh:  THREE.BufferGeometry | null   // if non-null, a second mesh is rendered with the overlay material
  overlayTex:   THREE.DataTexture | null
  autoRotate:   boolean
  showLabels:   boolean
  onHover?:     (hovered: boolean) => void
}

// ── GLB model loader ──────────────────────────────────────────────────────────
function GLBLiver({ morphology, overlayTex, autoRotate, showLabels }: ModelProps) {
  const { scene } = useGLTF(MODEL_URL)
  const groupRef  = useRef<THREE.Group>(null!)

  useAutoRotate(groupRef, autoRotate)

  const material = useMemo(
    () => createLiverMaterial(morphology),
    [morphology.stage, morphology.baseColor, morphology.roughness, morphology.steatosisTint, morphology.ischemiaTint]
  )

  useEffect(() => {
    const cloned = scene.clone(true)
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
        child.castShadow    = true
        child.receiveShadow = true
      }
    })
    if (groupRef.current) {
      groupRef.current.clear()
      groupRef.current.add(cloned)
    }
    return () => { material.dispose() }
  }, [scene, material])

  return (
    <group ref={groupRef}>
      <LiverLabels visible={showLabels} />
    </group>
  )
}

// ── Procedural liver (SDF-based, always available) ────────────────────────────
export const ProceduralLiver = memo(function ProceduralLiver({
  morphology, overlayMesh, overlayTex, autoRotate, showLabels, onHover,
}: ModelProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const meshRef  = useRef<THREE.Mesh>(null!)

  useAutoRotate(groupRef, autoRotate)
  useVascularPulse(meshRef, morphology.portalHypertension && !morphology.isTransplant)
  useCriticalGlow(meshRef,  morphology.stage === 'critical')

  const geometry = useMemo(
    () => createLiverGeometry(morphology),
    [morphology.rightLobeScale, morphology.leftLobeScale, morphology.volumeFactor,
     morphology.nodularity, morphology.patientId]
  )

  const material = useMemo(
    () => createLiverMaterial(morphology),
    [morphology.stage, morphology.baseColor, morphology.roughness,
     morphology.steatosisTint, morphology.ischemiaTint]
  )

  const tumorMat = useMemo(() => createTumorMaterial(), [])

  const overlayMat = useMemo(
    () => overlayTex ? createOverlayMaterial(overlayTex) : null,
    [overlayTex]
  )

  // Estimate tumor position on the right lobe anterior surface
  const tumorPos: [number, number, number] = [0.75, 0.08, 0.68]

  return (
    <group ref={groupRef}>
      {/* Primary liver mesh */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        castShadow
        receiveShadow
        onPointerEnter={() => onHover?.(true)}
        onPointerLeave={() => onHover?.(false)}
      />

      {/* Overlay (heatmap, perfusion map, etc.) — same geometry, additive */}
      {overlayMat && (
        <mesh geometry={geometry} material={overlayMat} renderOrder={1} />
      )}

      {/* HCC tumour nodule */}
      {morphology.tumorPresent && (
        <mesh position={tumorPos} material={tumorMat} castShadow>
          <sphereGeometry args={[0.17, 28, 28]} />
        </mesh>
      )}

      <LiverLabels visible={showLabels} />
    </group>
  )
})

// ── Suspense loading skeleton ─────────────────────────────────────────────────
function LoadingSkeleton({ morphology }: { morphology: MorphologyParams }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  useAutoRotate(meshRef, true, 0.4)
  const geo = useMemo(() => createLiverGeometry(morphology, 32), [morphology.patientId])
  return (
    <mesh ref={meshRef} geometry={geo} castShadow>
      <meshStandardMaterial color="#1a0a0a" wireframe opacity={0.35} transparent />
    </mesh>
  )
}

// ── Error boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean }
interface EBProps  { children: ReactNode; fallback: ReactNode }

class ModelErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError(): EBState { return { hasError: true } }
  componentDidCatch(_err: Error, _info: ErrorInfo) {}   // silently fall back
  render() { return this.state.hasError ? this.props.fallback : this.props.children }
}

// ── Public: chooses GLB or Procedural ─────────────────────────────────────────
export function LiverModel(props: ModelProps) {
  const fallback = <ProceduralLiver {...props} />

  return (
    <ModelErrorBoundary fallback={fallback}>
      <Suspense fallback={<LoadingSkeleton morphology={props.morphology} />}>
        <GLBLiver {...props} />
      </Suspense>
    </ModelErrorBoundary>
  )
}
