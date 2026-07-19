/**
 * Animation hooks for the liver viewer.
 * All hooks must be called inside the R3F Canvas context.
 */

import { useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ── Slow Y-axis auto-rotation ─────────────────────────────────────────────────
export function useAutoRotate(
  ref: React.RefObject<THREE.Object3D | null>,
  enabled: boolean,
  speed = 0.18
) {
  useFrame((_, delta) => {
    if (enabled && ref.current) {
      ref.current.rotation.y += delta * speed
    }
  })
}

// ── Vascular pulse (portal hypertension) ─────────────────────────────────────
export function useVascularPulse(
  ref: React.RefObject<THREE.Mesh | null>,
  active: boolean,
  intensity = 0.022,
  bpm = 72
) {
  const rate = (bpm / 60) * Math.PI * 2

  useFrame(({ clock }) => {
    if (!active || !ref.current) return
    const beat = Math.pow(Math.max(0, Math.sin(clock.elapsedTime * rate)), 3)
    ref.current.scale.setScalar(1.0 + beat * intensity)
  })
}

// ── Critical glow pulse ───────────────────────────────────────────────────────
export function useCriticalGlow(
  ref: React.RefObject<THREE.Mesh | null>,
  active: boolean
) {
  useFrame(({ clock }) => {
    if (!active || !ref.current) return
    const mat = ref.current.material as THREE.MeshStandardMaterial
    if (mat?.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = 0.08 + Math.sin(clock.elapsedTime * 2.4) * 0.05
    }
  })
}

// ── Camera reset to default position ─────────────────────────────────────────
export function useCameraReset() {
  const { camera, controls } = useThree()

  return useCallback(() => {
    const targetPos  = new THREE.Vector3(0, 0.25, 3.4)
    const targetLook = new THREE.Vector3(0, -0.1, 0)
    const start = camera.position.clone()
    const startTime = performance.now()
    const dur = 600  // ms

    const animate = () => {
      const t = Math.min((performance.now() - startTime) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)  // cubic ease-out

      camera.position.lerpVectors(start, targetPos, ease)
      camera.lookAt(targetLook)

      if (t < 1) requestAnimationFrame(animate)
    }

    animate()
  }, [camera])
}
