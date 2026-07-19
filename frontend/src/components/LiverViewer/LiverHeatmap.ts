/**
 * Generates DataTexture overlays mapped onto the liver surface (UV space).
 *
 * Each mode produces a 256×256 RGBA DataTexture:
 *   fibrosis     — cold-to-warm heatmap (blue → red)
 *   perfusion    — blood-flow map (high=red, low=blue, ischaemia patches)
 *   inflammation — orange-red hotspot zones
 *   tumor        — focal dark lesion on right lobe (u > 0.5)
 *   risk         — clinical composite risk gradient
 *
 * The texture is applied as a semi-transparent overlay on a second mesh
 * using NormalBlending so the underlying liver colour shows through.
 */

import * as THREE from 'three'

export type OverlayMode = 'fibrosis' | 'perfusion' | 'inflammation' | 'tumor' | 'risk'

const RES = 256

// ── Colour helpers ────────────────────────────────────────────────────────────
function hsl(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60)       { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) {        g = c; b = x }
  else if (h < 240) {        g = x; b = c }
  else if (h < 300) { r = x;        b = c }
  else              { r = c;        b = x }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]
}

// ── Seeded noise ──────────────────────────────────────────────────────────────
function makeRng(seed: string) {
  let h = 2166136261
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) | 0 }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 0xffffffff }
}

// ── Per-pixel overlay generators ──────────────────────────────────────────────
function fibrosisPixel(u: number, v: number, n: number, intensity: number): [number, number, number, number] {
  const f = Math.min(1, intensity * (n * 0.35 + 0.65))
  const hue = (1 - f) * 225  // 225=blue, 0=red
  const [r, g, b] = hsl(hue, 0.88, 0.50)
  return [r, g, b, Math.round(f * 155)]
}

function perfusionPixel(u: number, v: number, n: number, intensity: number): [number, number, number, number] {
  const base = n * 0.55 + 0.25 * Math.sin(u * 5) * Math.sin(v * 5)
  const perf = Math.max(0, Math.min(1, base + (1 - intensity) * 0.2))
  const [r, g, b] = hsl(perf * 230, 0.90, 0.42)
  return [r, g, b, 145]
}

function inflammationPixel(u: number, v: number, n: number, intensity: number): [number, number, number, number] {
  const threshold = 1 - intensity * 0.75
  if (n < threshold) return [0, 0, 0, 0]
  const grade = (n - threshold) / (1 - threshold)
  const [r, g, b] = hsl(18 + grade * 15, 0.95, 0.44)
  return [r, g, b, Math.round(grade * 185)]
}

function tumorPixel(u: number, v: number, _n: number, intensity: number): [number, number, number, number] {
  // Single primary lesion in right lobe, secondary lesion further right
  const d1 = Math.sqrt((u - 0.68) ** 2 + (v - 0.52) ** 2)
  const d2 = Math.sqrt((u - 0.80) ** 2 + (v - 0.35) ** 2)
  const t1 = Math.max(0, 1 - d1 / (0.14 * intensity))
  const t2 = Math.max(0, 1 - d2 / (0.08 * intensity))
  const tumor = Math.max(t1, t2)
  if (tumor < 0.05) return [0, 0, 0, 0]
  const [r, g, b] = hsl(0, 0.82, 0.22 + tumor * 0.12)
  return [r, g, b, Math.round(tumor * 220)]
}

function riskPixel(u: number, v: number, n: number, intensity: number): [number, number, number, number] {
  const right = u > 0.5 ? (u - 0.5) * 2 : 0
  const risk  = Math.min(1, n * 0.45 + right * 0.35 * intensity + 0.1 * intensity)
  const [r, g, b] = hsl((1 - risk) * 115, 0.90, 0.44)
  return [r, g, b, Math.round(risk * 145)]
}

// ── Public API ────────────────────────────────────────────────────────────────
export function generateOverlay(
  mode: OverlayMode,
  intensity = 0.75,
  patientId = ''
): THREE.DataTexture {
  const data = new Uint8Array(RES * RES * 4)
  const rng  = makeRng(patientId + ':' + mode)
  const noise = Array.from({ length: RES * RES }, rng)

  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      const idx  = (y * RES + x) * 4
      const u    = x / RES
      const v    = y / RES
      const n    = noise[y * RES + x]

      let pixel: [number, number, number, number]
      switch (mode) {
        case 'fibrosis':     pixel = fibrosisPixel(u, v, n, intensity);     break
        case 'perfusion':    pixel = perfusionPixel(u, v, n, intensity);    break
        case 'inflammation': pixel = inflammationPixel(u, v, n, intensity); break
        case 'tumor':        pixel = tumorPixel(u, v, n, intensity);        break
        case 'risk':         pixel = riskPixel(u, v, n, intensity);         break
      }

      ;[data[idx], data[idx + 1], data[idx + 2], data[idx + 3]] = pixel
    }
  }

  const tex = new THREE.DataTexture(data, RES, RES, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}
