'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { CREAM, GOLD, MAROON, Outline, PAPER, Toon, UMBER } from './toon'
import { heroScrollProgress } from './hero-scroll'
import { waveHeight } from './waves'

const LOGO_URL = '/brand/logo-mark.webp'

/** Side profile of the hull (x = length, bow at +x; y = up), extruded across the beam. */
function makeHull(): THREE.ExtrudeGeometry {
  const s = new THREE.Shape()
  s.moveTo(-1.7, 0.95) // raised stern
  s.lineTo(-1.55, 0.05)
  s.quadraticCurveTo(-1.3, -0.5, -0.6, -0.5)
  s.lineTo(0.9, -0.5)
  s.quadraticCurveTo(1.7, -0.45, 2.15, 0.6) // swept-up bow
  s.lineTo(1.65, 0.45)
  s.lineTo(-0.9, 0.45) // main deck
  s.lineTo(-1.0, 0.95) // step up to the quarterdeck
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 1.1,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: 2,
    curveSegments: 8,
  })
  g.translate(0, 0, -0.55)
  return g
}

/** A sail as a plane bulged forward (local +z) like it is full of wind. */
function makeSail(width: number, height: number, bulge: number): THREE.PlaneGeometry {
  const g = new THREE.PlaneGeometry(width, height, 10, 8)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / (width / 2) // -1..1 across
    const v = pos.getY(i) / (height / 2) // -1..1 up
    const belly = (1 - u * u) * (0.75 + 0.25 * (1 - v * v))
    pos.setZ(i, belly * bulge)
  }
  g.computeVertexNormals()
  return g
}

function Sail({
  width,
  height,
  bulge,
  ramp,
  logo,
  sailRef,
}: {
  width: number
  height: number
  bulge: number
  ramp: THREE.Texture
  logo?: THREE.Texture
  sailRef?: React.Ref<THREE.Group>
}) {
  const geo = useMemo(() => makeSail(width, height, bulge), [width, height, bulge])
  return (
    <group ref={sailRef}>
      <mesh geometry={geo}>
        <meshToonMaterial color={CREAM} gradientMap={ramp} side={THREE.DoubleSide} />
      </mesh>
      {logo ? (
        // Same bulged geometry nudged forward, so the emblem follows the sail's curve.
        <mesh geometry={geo} position-z={0.015} renderOrder={1}>
          <meshBasicMaterial
            map={logo}
            transparent
            alphaTest={0.05}
            toneMapped={false}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>
      ) : null}
    </group>
  )
}

function Spar({ length, position }: { length: number; position: [number, number, number] }) {
  return (
    <mesh position={position} rotation-x={Math.PI / 2}>
      <cylinderGeometry args={[0.035, 0.035, length, 6]} />
      <meshBasicMaterial color={UMBER} />
    </mesh>
  )
}

export interface ShipPlacement {
  x: number
  z: number
  heading: number
  scale: number
}

/**
 * Procedural pirate ship with the club emblem on the main sail. ~14 draw calls and one
 * small texture (the 19 KB emblem), so it stays cheap on phones.
 */
export function PirateShip({
  ramp,
  outlines,
  animate,
  placement,
}: {
  ramp: THREE.Texture
  outlines: boolean
  animate: boolean
  placement: (state: { aspect: number; viewportWidth: number }) => ShipPlacement
}) {
  const logoSource = useLoader(THREE.TextureLoader, LOGO_URL)
  const SAIL_W = 1.6
  const SAIL_H = 1.35
  const LOGO = 1.25 // emblem size on the sail
  const logo = useMemo(() => {
    // Fit the square emblem in the middle of the sail; the transparent PNG edges clamp out.
    const t = logoSource.clone()
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = THREE.ClampToEdgeWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.repeat.set(SAIL_W / LOGO, SAIL_H / LOGO)
    t.offset.set(-(SAIL_W / LOGO - 1) / 2, -(SAIL_H / LOGO - 1) / 2 + 0.04)
    t.anisotropy = 4
    t.needsUpdate = true
    return t
  }, [logoSource])

  const hull = useMemo(() => makeHull(), [])
  const root = useRef<THREE.Group>(null)
  const mainSail = useRef<THREE.Group>(null)
  const topSail = useRef<THREE.Group>(null)
  const flag = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    const g = root.current
    if (!g) return
    const t = animate ? state.clock.elapsedTime : 0
    const base = placement({
      aspect: state.size.width / state.size.height,
      viewportWidth: state.viewport.width,
    })
    // As the reader scrolls on, the ship sails off toward the horizon.
    const scroll = heroScrollProgress()
    const p = { ...base, x: base.x + scroll * 5, z: base.z - scroll * 4 }
    const h = waveHeight(p.x, p.z, t)
    const pitch = waveHeight(p.x + 1.2, p.z, t) - waveHeight(p.x - 1.2, p.z, t)
    const roll = waveHeight(p.x, p.z + 0.8, t) - waveHeight(p.x, p.z - 0.8, t)
    g.position.set(p.x, h + 0.15, p.z)
    g.scale.setScalar(p.scale)
    g.rotation.set(
      THREE.MathUtils.damp(g.rotation.x, roll * 0.3, 5, delta),
      p.heading,
      THREE.MathUtils.damp(g.rotation.z, -pitch * 0.25, 5, delta),
    )
    // Sails breathe with the wind; the pennant flaps.
    const gust = 1 + 0.18 * Math.sin(t * 1.3)
    if (mainSail.current) mainSail.current.scale.z = gust
    if (topSail.current) topSail.current.scale.z = 1 + 0.18 * Math.sin(t * 1.3 + 0.6)
    if (flag.current) flag.current.rotation.y = Math.sin(t * 4) * 0.35
  })

  return (
    <group ref={root}>
      {/* Hull with maroon strake and gold rail. */}
      <mesh geometry={hull}>
        <Toon color={UMBER} ramp={ramp} />
      </mesh>
      <Outline geometry={hull} thickness={1.03} enabled={outlines} />
      <mesh position={[0.1, 0.22, 0]}>
        <boxGeometry args={[3.2, 0.14, 1.22]} />
        <Toon color={MAROON} ramp={ramp} />
      </mesh>
      <mesh position={[0.35, 0.5, 0]}>
        <boxGeometry args={[2.4, 0.05, 1.16]} />
        <Toon color={GOLD} ramp={ramp} />
      </mesh>

      {/* Main mast: sails face the bow (+x), rotated so their front is the +x side. */}
      <group position={[0.25, 0, 0]}>
        <mesh position={[0, 2.05, 0]}>
          <cylinderGeometry args={[0.055, 0.07, 3.3, 8]} />
          <Toon color={UMBER} ramp={ramp} />
        </mesh>
        <group position={[0.06, 1.75, 0]} rotation-y={Math.PI / 2}>
          <Sail
            width={SAIL_W}
            height={SAIL_H}
            bulge={0.22}
            ramp={ramp}
            logo={logo}
            sailRef={mainSail}
          />
        </group>
        <Spar length={1.8} position={[0.02, 2.45, 0]} />
        <Spar length={1.7} position={[0.02, 1.08, 0]} />
        <group position={[0.05, 2.95, 0]} rotation-y={Math.PI / 2}>
          <Sail width={1.15} height={0.6} bulge={0.12} ramp={ramp} sailRef={topSail} />
        </group>
        <Spar length={1.3} position={[0.02, 3.27, 0]} />
        {/* Crow's nest + pennant */}
        <mesh position={[0, 3.45, 0]}>
          <cylinderGeometry args={[0.16, 0.12, 0.14, 10]} />
          <Toon color={UMBER} ramp={ramp} />
        </mesh>
        <mesh ref={flag} position={[0, 3.85, 0]}>
          <planeGeometry args={[0.55, 0.28]} />
          <meshBasicMaterial color={MAROON} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Mizzen mast */}
      <group position={[-1.05, 0.5, 0]}>
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.045, 0.06, 2.3, 8]} />
          <Toon color={UMBER} ramp={ramp} />
        </mesh>
        <group position={[0.05, 1.3, 0]} rotation-y={Math.PI / 2}>
          <Sail width={1.1} height={0.9} bulge={0.15} ramp={ramp} />
        </group>
        <Spar length={1.25} position={[0.02, 1.78, 0]} />
      </group>

      {/* Bowsprit */}
      <mesh position={[2.35, 0.75, 0]} rotation-z={-1.25}>
        <cylinderGeometry args={[0.03, 0.045, 0.9, 6]} />
        <meshBasicMaterial color={PAPER} />
      </mesh>
    </group>
  )
}
