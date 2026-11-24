'use client'

// Small toon-shaded scenes for the Dock's sections. Each renders inside a drei <View>
// (one shared WebGL canvas), brings its own camera + lights, and is low-poly so a
// phone can draw several per frame.

import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { CREAM, GOLD, INK, MAROON, Outline, PAPER, Toon, UMBER, makeToonRamp } from '../toon'

const WOOD = '#6b3f1f'

// One cel-shading ramp texture shared by every section scene.
let sharedRamp: THREE.DataTexture | null = null
function getSharedRamp(): THREE.DataTexture {
  sharedRamp ??= makeToonRamp()
  return sharedRamp
}
function useRamp(): THREE.DataTexture {
  return useMemo(() => getSharedRamp(), [])
}

/** Elapsed seconds, frozen at 0 when motion is reduced. */
function clock(state: { clock: THREE.Clock }, animate: boolean): number {
  return animate ? state.clock.elapsedTime : 0
}

function Stage({
  children,
  position = [0, 0.4, 5],
  fov = 35,
}: {
  children: ReactNode
  position?: [number, number, number]
  fov?: number
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={position} fov={fov} near={0.1} far={50} />
      <hemisphereLight args={['#fff4dc', UMBER, 1.3]} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} color="#fff0cc" />
      {children}
    </>
  )
}

export interface SceneProps {
  animate: boolean
}

// ---------------------------------------------------------------- Paddle + bouncing ball
export function PaddleBallScene({ animate }: SceneProps) {
  const ramp = useRamp()
  const ball = useRef<THREE.Mesh>(null)
  const paddle = useRef<THREE.Group>(null)
  const face = useMemo(() => {
    const s = new THREE.Shape()
    s.absellipse(0, 0, 0.55, 0.68, 0, Math.PI * 2, false, 0)
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false, curveSegments: 20 })
    g.center()
    return g
  }, [])
  const sphere = useMemo(() => new THREE.SphereGeometry(0.22, 16, 12), [])

  useFrame((state) => {
    const t = clock(state, animate)
    const p = (t * 1.6) % 1
    const h = 4 * p * (1 - p) // parabola 0..1..0
    if (ball.current) {
      ball.current.position.y = 0.25 + h * 1.1
      // Squash on contact.
      const squash = p < 0.08 || p > 0.92 ? 0.75 : 1
      ball.current.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
      ball.current.rotation.x = t * 4
    }
    if (paddle.current) paddle.current.rotation.x = -0.85 + (p < 0.1 || p > 0.9 ? -0.12 : 0)
  })

  return (
    <Stage position={[0, 0.15, 3.9]}>
      <group position={[0, -0.2, 0]}>
        <group ref={paddle} rotation-x={-0.85}>
          <mesh geometry={face}>
            <Toon color={MAROON} ramp={ramp} />
          </mesh>
          <Outline geometry={face} thickness={1.05} enabled />
          <mesh position={[0, -0.95, 0]}>
            <cylinderGeometry args={[0.08, 0.09, 0.6, 10]} />
            <Toon color={UMBER} ramp={ramp} />
          </mesh>
        </group>
        <mesh ref={ball} geometry={sphere}>
          <Toon color={CREAM} ramp={ramp} />
        </mesh>
      </group>
    </Stage>
  )
}

// ---------------------------------------------------------------- Chain links
export function ChainScene({ animate }: SceneProps) {
  const ramp = useRamp()
  const root = useRef<THREE.Group>(null)
  const link = useMemo(() => {
    const g = new THREE.TorusGeometry(0.5, 0.13, 10, 28)
    g.scale(1.35, 1, 1)
    return g
  }, [])
  useFrame((state) => {
    const t = clock(state, animate)
    if (!root.current) return
    root.current.rotation.y = t * 0.8
    root.current.rotation.z = Math.sin(t * 1.3) * 0.25
  })
  return (
    <Stage position={[0, 0, 4.3]}>
      <group ref={root}>
        <group position={[-0.5, 0, 0]}>
          <mesh geometry={link}>
            <Toon color={GOLD} ramp={ramp} />
          </mesh>
          <Outline geometry={link} thickness={1.04} enabled />
        </group>
        <group position={[0.5, 0, 0]} rotation-x={Math.PI / 2}>
          <mesh geometry={link}>
            <Toon color={MAROON} ramp={ramp} />
          </mesh>
          <Outline geometry={link} thickness={1.04} enabled />
        </group>
      </group>
    </Stage>
  )
}

// ---------------------------------------------------------------- Cannon
export function CannonScene({ animate }: SceneProps) {
  const ramp = useRamp()
  const barrel = useRef<THREE.Group>(null)
  const shot = useRef<THREE.Mesh>(null)
  const puff = useRef<THREE.Mesh>(null)
  const barrelGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.2, 0.28, 1.3, 14)
    g.rotateZ(-Math.PI / 2 + 0.45)
    return g
  }, [])

  useFrame((state, delta) => {
    const t = clock(state, animate)
    const p = (t % 2.4) / 2.4
    const fire = p < 0.06
    // Kick back on firing, then ease home (frame-rate independent).
    if (barrel.current) {
      barrel.current.position.x = fire
        ? -0.12
        : THREE.MathUtils.damp(barrel.current.position.x, 0, 6, delta)
    }
    if (shot.current) {
      const k = Math.min(p / 0.55, 1)
      shot.current.position.set(0.55 + k * 1.3, 0.55 + Math.sin(k * Math.PI) * 0.7 + k * 0.2, 0)
      shot.current.visible = animate && p < 0.55
    }
    if (puff.current) {
      const s = p < 0.3 ? p / 0.3 : 0
      puff.current.scale.setScalar(0.2 + s * 0.6)
      puff.current.visible = animate && s > 0
      const mat = puff.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.8 * (1 - s)
    }
  })

  return (
    <Stage position={[0.15, 0.15, 4.4]}>
      <group position={[-0.25, -0.25, 0]}>
        <group ref={barrel}>
          <mesh geometry={barrelGeo}>
            <Toon color={INK} ramp={ramp} />
          </mesh>
          <mesh position={[0.62, 0.3, 0]} rotation-z={-Math.PI / 2 + 0.45}>
            <torusGeometry args={[0.22, 0.05, 8, 18]} />
            <Toon color={GOLD} ramp={ramp} />
          </mesh>
        </group>
        <mesh position={[-0.1, -0.35, 0]}>
          <boxGeometry args={[1, 0.3, 0.6]} />
          <Toon color={WOOD} ramp={ramp} />
        </mesh>
        {[-0.38, 0.38].map((x) =>
          [-0.34, 0.34].map((z) => (
            <mesh key={`${x}${z}`} position={[x - 0.1, -0.5, z]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.2, 0.2, 0.08, 14]} />
              <Toon color={UMBER} ramp={ramp} />
            </mesh>
          )),
        )}
        <mesh ref={shot}>
          <sphereGeometry args={[0.14, 12, 10]} />
          <Toon color={CREAM} ramp={ramp} />
        </mesh>
        <mesh ref={puff} position={[0.85, 0.45, 0]}>
          <sphereGeometry args={[0.5, 10, 8]} />
          <meshBasicMaterial color={PAPER} transparent opacity={0.8} depthWrite={false} />
        </mesh>
      </group>
    </Stage>
  )
}

// ---------------------------------------------------------------- Message in a bottle
export function BottleScene({ animate }: SceneProps) {
  const ramp = useRamp()
  const root = useRef<THREE.Group>(null)
  const bottle = useMemo(() => {
    const pts = [
      new THREE.Vector2(0, -0.9),
      new THREE.Vector2(0.38, -0.88),
      new THREE.Vector2(0.4, 0.2),
      new THREE.Vector2(0.18, 0.55),
      new THREE.Vector2(0.14, 0.95),
    ]
    return new THREE.LatheGeometry(pts, 18)
  }, [])
  useFrame((state) => {
    const t = clock(state, animate)
    const g = root.current
    if (!g) return
    g.position.y = Math.sin(t * 1.6) * 0.12
    g.rotation.z = -1.1 + Math.sin(t * 1.2) * 0.15
    g.rotation.y = Math.sin(t * 0.5) * 0.5
  })
  return (
    <Stage position={[0, 0.1, 3.2]}>
      <group ref={root}>
        {/* Rolled note inside */}
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.9, 12]} />
          <Toon color={PAPER} ramp={ramp} />
        </mesh>
        <mesh position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.08, 12]} />
          <meshBasicMaterial color={MAROON} />
        </mesh>
        <mesh geometry={bottle}>
          <meshToonMaterial
            color="#5fa28f"
            gradientMap={ramp}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <cylinderGeometry args={[0.13, 0.11, 0.2, 10]} />
          <Toon color={WOOD} ramp={ramp} />
        </mesh>
      </group>
    </Stage>
  )
}

export const SCENES = {
  paddle: PaddleBallScene,
  chain: ChainScene,
  cannon: CannonScene,
  bottle: BottleScene,
} as const

export type SceneName = keyof typeof SCENES
