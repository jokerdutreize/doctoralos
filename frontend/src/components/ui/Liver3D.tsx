/**
 * 3D Liver visualization — procedurally generated geometry and material
 * driven entirely by patient clinical parameters.
 *
 * Visual encoding:
 *   Color        — MELD score (green → yellow → orange → deep red)
 *   Roughness    — Child-Pugh class (A=smooth, B=moderately rough, C=heavily nodular)
 *   Surface bump — cirrhosis / fibrosis noise amplitude
 *   Dark nodules — HCC coexisting tumor (code 4)
 *   Glow ring    — critical patients (MELD ≥ 25 or CP-C)
 *   Jaundice tint— elevated bilirubin approximation
 *   Opacity      — deceased patients fade to grey
 */

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Float } from '@react-three/drei'
import * as THREE from 'three'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface LiverParams {
  meldScore:         number | null
  childPughScore:    number | null
  childPughCategory: string
  diagnosisEtiological: number | null   // 1=Alcoholic, 2=NASH, 3=HCV, 4=HCC…
  diagnosisCoexisting:  number | null   // 4 = HCC
  status: string                        // 'Alive' | 'Dead'
  patientId: string                     // seed for per-patient deterministic noise
}

// ── Seeded pseudo-random (no library needed) ──────────────────────────────────
function seededRng(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0
    h ^= h >>> 16
    return (h >>> 0) / 0xFFFFFFFF
  }
}

// ── Color map ─────────────────────────────────────────────────────────────────
function liverColor(meld: number | null, status: string, childPugh: string): THREE.Color {
  if (status === 'Dead') return new THREE.Color(0.35, 0.32, 0.30)

  const m = meld ?? 10
  // Hue: 0.30 (green) → 0.13 (yellow) → 0.05 (orange) → 0.00 (red)
  const t = Math.min(Math.max((m - 6) / 30, 0), 1)
  const hue = 0.30 * (1 - t)
  const sat = 0.72
  const lit  = status === 'Dead' ? 0.30 : childPugh === 'C' ? 0.36 : childPugh === 'B' ? 0.40 : 0.44
  return new THREE.Color().setHSL(hue, sat, lit)
}

// ── Liver geometry (procedural) ───────────────────────────────────────────────
function buildLiverGeometry(params: LiverParams): THREE.BufferGeometry {
  const rng = seededRng(params.patientId + '_liver')

  // Base resolution — higher for cirrhotics
  const seg = params.childPughCategory === 'C' ? 80 : 60
  const geo = new THREE.SphereGeometry(1, seg, seg)
  const pos = geo.attributes.position as THREE.BufferAttribute

  // Noise amplitude from fibrosis / Child-Pugh
  const noiseAmp = params.childPughCategory === 'C' ? 0.13
                 : params.childPughCategory === 'B' ? 0.07 : 0.025

  // MELD-driven volume (higher MELD → enlarged liver for CP-C)
  const enlarge = params.childPughCategory === 'C' ? 1.18
                : params.childPughCategory === 'B' ? 1.06 : 1.0

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)

    // ── Liver shape transform ──────────────────────────────────────────
    // Right lobe is ~60 % bigger than left lobe
    const rightBias = x > 0 ? 1.45 : 0.78
    // Flatten inferior–superior axis
    const flatten = 0.72
    // Slight anterior bow
    const anteriorBow = z > 0 ? 1.08 : 0.90

    let nx = x * rightBias * enlarge
    let ny = y * flatten   * enlarge
    let nz = z * anteriorBow * enlarge

    // ── Surface noise (cirrhosis / fibrosis nodularity) ───────────────
    // Deterministic noise via trig series seeded by position
    const noise = (
      Math.sin(x * 9.1 + rng() * 2) *
      Math.cos(y * 8.3 + rng() * 2) *
      Math.sin(z * 7.7 + rng() * 2)
    ) * noiseAmp

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    nx += noise * (nx / len)
    ny += noise * (ny / len)
    nz += noise * (nz / len)

    pos.setXYZ(i, nx, ny, nz)
  }

  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

// ── HCC tumour nodules ────────────────────────────────────────────────────────
function HCCNodules({ patientId }: { patientId: string }) {
  const rng   = seededRng(patientId + '_hcc')
  const count = 2 + Math.floor(rng() * 3)   // 2–4 nodules per patient

  const nodules = useMemo(() => {
    const r2 = seededRng(patientId + '_hcc2')
    return Array.from({ length: count }, () => {
      // Place on right-lobe surface (x > 0, z > 0)
      const theta = (r2() * 0.6 + 0.1) * Math.PI
      const phi   = r2() * Math.PI * 2
      const r     = 0.90 + r2() * 0.15
      return {
        x: r * 1.4 * Math.sin(theta) * Math.cos(phi),
        y: r * 0.7 * Math.sin(theta) * Math.sin(phi),
        z: r * 1.0 * Math.cos(theta),
        size: 0.06 + r2() * 0.10,
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  return (
    <>
      {nodules.map((n, i) => (
        <mesh key={i} position={[n.x, n.y, n.z]}>
          <sphereGeometry args={[n.size, 16, 16]} />
          <meshStandardMaterial color="#1a0a0a" roughness={0.8} />
        </mesh>
      ))}
    </>
  )
}

// ── Critical glow ring ────────────────────────────────────────────────────────
function CriticalGlow() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.06
    ref.current.scale.set(s, s, s)
    ;(ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.12 + Math.sin(clock.elapsedTime * 2.2) * 0.06
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1.65, 32, 32]} />
      <meshStandardMaterial
        color="#ff1a1a"
        transparent
        opacity={0.14}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}

// ── Main liver mesh ───────────────────────────────────────────────────────────
function LiverMesh({ params }: { params: LiverParams }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const meld = params.meldScore ?? 10

  useFrame((_, delta) => {
    meshRef.current.rotation.y += delta * 0.25
  })

  const geo   = useMemo(() => buildLiverGeometry(params), [params.patientId, params.childPughCategory])
  const color = useMemo(() => liverColor(params.meldScore, params.status, params.childPughCategory),
    [params.meldScore, params.status, params.childPughCategory])

  const roughness = params.childPughCategory === 'C' ? 0.90
                  : params.childPughCategory === 'B' ? 0.72 : 0.50
  const metalness = 0.08
  const isDead    = params.status === 'Dead'
  const isCritical = params.childPughCategory === 'C' || meld >= 25
  const hasHCC     = params.diagnosisCoexisting === 4

  // Jaundice tint — warm yellow secondary emissive
  const jaundice = meld > 18
    ? new THREE.Color(0.12, 0.08, 0).multiplyScalar(Math.min((meld - 18) / 20, 1))
    : new THREE.Color(0, 0, 0)

  return (
    <group>
      {isCritical && !isDead && <CriticalGlow />}

      <Float speed={1.2} rotationIntensity={0} floatIntensity={0.3}>
        <mesh ref={meshRef} geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial
            color={color}
            roughness={roughness}
            metalness={metalness}
            emissive={jaundice}
            transparent={isDead}
            opacity={isDead ? 0.55 : 1}
          />
        </mesh>

        {hasHCC && !isDead && <HCCNodules patientId={params.patientId} />}
      </Float>
    </group>
  )
}

// ── Exported canvas component ─────────────────────────────────────────────────
interface Liver3DProps {
  params:  LiverParams
  height?: number
}

export default function Liver3D({ params, height = 320 }: Liver3DProps) {
  const meld       = params.meldScore ?? 10
  const isCritical = params.childPughCategory === 'C' || meld >= 25
  const isDead     = params.status === 'Dead'

  const bgColor = isDead ? '#1a1818'
    : isCritical          ? '#1a0a0a'
    : meld >= 15          ? '#0d120a'
    :                       '#080e0d'

  return (
    <div style={{ height, borderRadius: 12, overflow: 'hidden', background: bgColor, position: 'relative' }}>
      {/* Status label */}
      <div style={{
        position: 'absolute', top: 10, left: 12, zIndex: 2,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
        color: isDead ? '#888' : isCritical ? '#ff6b6b' : '#5dde8a',
        textTransform: 'uppercase',
      }}>
        {isDead ? '● Deceased' : isCritical ? '● Critical' : '● Stable'}
      </div>

      {/* MELD badge */}
      {params.meldScore != null && (
        <div style={{
          position: 'absolute', top: 10, right: 12, zIndex: 2,
          fontSize: 11, fontWeight: 700,
          color: isCritical ? '#ff6b6b' : '#aaa',
        }}>
          MELD {params.meldScore.toFixed(0)}
        </div>
      )}

      {/* Diagnosis label */}
      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0, zIndex: 2,
        textAlign: 'center', fontSize: 10, color: '#555', letterSpacing: '0.05em',
      }}>
        {[
          params.childPughCategory ? `CP-${params.childPughCategory}` : null,
          params.diagnosisCoexisting === 4 ? 'HCC' : null,
        ].filter(Boolean).join('  ·  ')}
      </div>

      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 38 }}
        shadows
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 4]} intensity={1.4} castShadow />
        <directionalLight position={[-3, -2, -3]} intensity={0.25} color="#4488ff" />
        <pointLight position={[0, -3, 2]} intensity={0.4} color="#ff8844" />

        <LiverMesh params={params} />

        <Environment preset="studio" />
        <OrbitControls
          enablePan={false}
          minDistance={2.2}
          maxDistance={6}
          autoRotate={false}
        />
      </Canvas>
    </div>
  )
}
