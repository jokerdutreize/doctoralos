/**
 * Procedural anatomical liver geometry.
 *
 * The shape is derived from a dual-ellipsoid SDF (Signed Distance Function)
 * representing right and left lobes joined by a smooth union (smin).
 * The surface is found per-direction using binary search (ray → surface).
 *
 * Clinical deformations applied:
 *   rightLobeScale → right lobe size (cirrhosis = smaller)
 *   leftLobeScale  → left lobe size (cirrhosis = larger)
 *   volumeFactor   → global scale (steatosis = bigger)
 *   nodularity     → surface displacement amplitude
 *
 * The inferior (visceral) surface is post-flattened to match anatomy:
 * the liver sits against the diaphragm on top (convex) and the visceral
 * organs below (relatively flat).
 */

import * as THREE from 'three'
import type { MorphologyParams } from './usePatientMorphology'

// ── Seeded deterministic RNG (no external library) ────────────────────────────
function seededRng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619) | 0
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    return (h >>> 0) / 0xffffffff
  }
}

// ── Dual-lobe SDF ─────────────────────────────────────────────────────────────
/**
 * Returns the SDF value at world point (x, y, z).
 * Negative = inside liver, 0 = on surface, positive = outside.
 *
 * Right lobe: large oblate ellipsoid offset to the right (+x)
 * Left lobe:  small, thinner ellipsoid offset to the left  (-x)
 * Connected by a smooth minimum (smin) with k=0.38
 *
 * Anatomical proportions (normalised to ~1 unit wide):
 *   Total width right: 0.30 + 1.05 = 1.35
 *   Total width left:  0.82 + 0.58 = 1.40 (left lobe tip)
 *   Height:            0.60 (right), 0.37 (left)
 *   Depth:             0.84 (right), 0.44 (left)
 */
function liverSDF(
  x: number, y: number, z: number,
  rS: number, lS: number, vol: number
): number {
  const v = vol

  // Right lobe ellipsoid
  const rCX = 0.30 * rS * v,  rA = 1.05 * rS * v
  const rCY = 0.0,             rB = 0.60 * rS * v
  const rCZ = 0.0,             rC = 0.84 * rS * v
  const dR = Math.sqrt(
    ((x - rCX) / rA) ** 2 +
    ((y - rCY) / rB) ** 2 +
    ((z - rCZ) / rC) ** 2
  ) - 1

  // Left lobe ellipsoid (smaller, slightly higher, tapers)
  const lCX = -0.82 * lS * v, lA = 0.58 * lS * v
  const lCY = 0.02,           lB = 0.37 * lS * v
  const lCZ = 0.0,            lC = 0.44 * lS * v
  const dL = Math.sqrt(
    ((x - lCX) / lA) ** 2 +
    ((y - lCY) / lB) ** 2 +
    ((z - lCZ) / lC) ** 2
  ) - 1

  // Smooth union (smin)
  const k = 0.38
  const h = Math.max(k - Math.abs(dR - dL), 0) / k
  return Math.min(dR, dL) - h * h * k * 0.25
}

// ── Surface point from ray direction ─────────────────────────────────────────
function surfacePoint(
  dx: number, dy: number, dz: number,
  rS: number, lS: number, vol: number
): THREE.Vector3 {
  // Binary search: origin is always inside the SDF (dSDF(0,0,0) < 0)
  let lo = 0.001, hi = 2.8
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) * 0.5
    if (liverSDF(dx * mid, dy * mid, dz * mid, rS, lS, vol) < 0) lo = mid
    else hi = mid
  }
  let r = (lo + hi) * 0.5

  let px = dx * r
  let py = dy * r
  const pz = dz * r

  // ── Post-process: flatten the inferior (visceral) surface ─────────────────
  // Real livers have a convex diaphragmatic dome (top) and a flat-ish bottom.
  // Compress any point below y = -0.22 toward a floor at y ≈ -0.40
  if (py < -0.22) {
    py = -0.22 + (py + 0.22) * 0.38
  }

  // ── Post-process: superior dome curvature ─────────────────────────────────
  // Lift the very top slightly for a rounder diaphragmatic dome
  if (py > 0.45) {
    py = 0.45 + (py - 0.45) * 1.22
  }

  return new THREE.Vector3(px, py, pz)
}

// ── Main geometry builder ─────────────────────────────────────────────────────
export function createLiverGeometry(params: MorphologyParams, segments = 80): THREE.BufferGeometry {
  const { rightLobeScale: rS, leftLobeScale: lS, volumeFactor: vol, nodularity, patientId } = params
  const rng = seededRng(patientId + ':liver_geo')

  // Segment resolution — higher for nodular/cirrhotic livers (more surface detail)
  const uSeg = segments
  const vSeg = Math.round(segments * 0.55)

  const positions: number[] = []
  const uvCoords: number[]  = []
  const indices:  number[]  = []

  for (let vi = 0; vi <= vSeg; vi++) {
    for (let ui = 0; ui <= uSeg; ui++) {
      const u = ui / uSeg
      const v = vi / vSeg

      // Spherical direction — avoid exact poles (degenerate normals)
      const theta = u * Math.PI * 2
      const phi   = (v - 0.5) * Math.PI * 0.94

      const dx = Math.cos(phi) * Math.cos(theta)
      const dy = Math.sin(phi)
      const dz = Math.cos(phi) * Math.sin(theta)

      const p = surfacePoint(dx, dy, dz, rS, lS, vol)

      // Cirrhosis nodularity: trig-based noise (deterministic per patient)
      if (nodularity > 0.01) {
        const noise = (
          Math.sin(dx * 14 + rng() * 5) *
          Math.cos(dy * 13 + rng() * 5) *
          Math.sin(dz * 11 + rng() * 5)
        ) * nodularity * 0.075

        // Displace outward along the surface normal direction (approximate = ray dir)
        p.x += dx * noise
        p.y += dy * noise
        p.z += dz * noise
      }

      positions.push(p.x, p.y, p.z)
      uvCoords.push(u, v)
    }
  }

  // Build triangle index buffer
  for (let vi = 0; vi < vSeg; vi++) {
    for (let ui = 0; ui < uSeg; ui++) {
      const a = vi * (uSeg + 1) + ui
      const b = a + 1
      const c = (vi + 1) * (uSeg + 1) + ui
      const d = c + 1
      indices.push(a, b, d,  a, d, c)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvCoords, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  return geo
}
