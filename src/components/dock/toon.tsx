'use client'

// Shared look for the Dock scene: palette, cel-shading ramp and ink outlines.
import * as THREE from 'three'

// Poster + logo palette
export const INK = '#1e1714'
export const UMBER = '#2b1e1a'
export const MAROON = '#7b1e2e'
export const MAROON_DARK = '#5a1622'
export const GOLD = '#e2a11b'
export const CREAM = '#f3e6cf'
export const PAPER = '#fce6c3'
export const SEPIA_FOG = '#d8c4a2' // matches the page backdrop so the horizon dissolves into it
export const SEA_DEEP = '#1f3d4d'
export const SEA_SHALLOW = '#3f7f88'

// Three-step ramp shared by every toon material: hard light/mid/shadow bands.
export function makeToonRamp(): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array([70, 160, 255]), 3, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

export function Toon({ color, ramp }: { color: string; ramp: THREE.Texture }) {
  return <meshToonMaterial color={color} gradientMap={ramp} />
}

/** Inverted-hull ink outline: a slightly larger back-face copy drawn in flat ink. */
export function Outline({
  geometry,
  thickness = 1.045,
  enabled,
}: {
  geometry: THREE.BufferGeometry
  thickness?: number
  enabled: boolean
}) {
  if (!enabled) return null
  return (
    <mesh geometry={geometry} scale={thickness}>
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  )
}
