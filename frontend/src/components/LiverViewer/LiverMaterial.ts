/**
 * PBR material factory for the liver visualization.
 *
 * Uses THREE.MeshPhysicalMaterial which supports:
 *   clearcoat        → Glisson's capsule (thin fibrous sheath over liver)
 *   transmission     → slight translucency of liver tissue
 *   thickness        → subsurface scattering approximation
 *   attenuationColor → internal tissue color (deep red)
 *
 * The material is memoized externally (only recreated when stage changes).
 */

import * as THREE from 'three'
import type { MorphologyParams } from './usePatientMorphology'

export function createLiverMaterial(params: MorphologyParams): THREE.MeshPhysicalMaterial {
  const base = new THREE.Color(params.baseColor)

  // Steatosis: yellow-orange fat infiltration tint
  if (params.steatosisTint > 0) {
    base.lerp(new THREE.Color('#b8942a'), params.steatosisTint * 0.45)
  }

  // Ischaemia: purple discolouration (venous congestion / ischaemia)
  if (params.ischemiaTint > 0) {
    base.lerp(new THREE.Color('#5e1a6e'), params.ischemiaTint * 0.50)
  }

  // Transplant: healthy pinkish-red graft colour
  if (params.isTransplant) {
    base.lerp(new THREE.Color('#a03022'), 0.25)
  }

  const mat = new THREE.MeshPhysicalMaterial({
    color: base,

    // ── Physically based properties ──────────────────────────────────────────
    roughness:  params.roughness,
    metalness:  0.0,

    // Glisson's capsule — thin fibrous membrane gives a subtle wet sheen
    clearcoat:          params.stage === 'deceased' ? 0.0 : 0.20,
    clearcoatRoughness: 0.50,

    // Subsurface scattering approximation (MeshPhysicalMaterial)
    // Very low transmission — liver tissue is nearly opaque
    transmission:       0.04,
    thickness:          0.90,                         // SSS depth
    attenuationColor:   new THREE.Color('#c02010'),   // internal red
    attenuationDistance: 0.45,
    ior:                1.42,                         // biological tissue ~1.4

    // Emissive for critical/ischaemic states
    emissive:          new THREE.Color(params.emissiveColor),
    emissiveIntensity: params.emissiveIntensity,

    // Deceased: grey, translucent
    transparent: params.stage === 'deceased',
    opacity:     params.stage === 'deceased' ? 0.58 : 1.0,

    side: THREE.FrontSide,
  })

  return mat
}

// Tumour nodule material — dark necrotic appearance
export function createTumorMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color:     new THREE.Color('#1a0808'),
    roughness: 0.88,
    metalness: 0.0,
    clearcoat: 0.06,
  })
}

// Overlay material — additive blend on top of liver
export function createOverlayMaterial(texture: THREE.DataTexture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map:        texture,
    transparent: true,
    blending:   THREE.NormalBlending,
    depthWrite: false,
    side:       THREE.FrontSide,
  })
}
