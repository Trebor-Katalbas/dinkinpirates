'use client'

import { Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { QUALITY_HIGH, type SceneQuality } from './scene-quality'
import { heroScrollProgress } from './hero-scroll'
import { PirateShip, type ShipPlacement } from './ship'
import {
  CREAM,
  GOLD,
  INK,
  MAROON,
  MAROON_DARK,
  Outline,
  PAPER,
  SEA_DEEP,
  SEA_SHALLOW,
  SEPIA_FOG,
  Toon,
  UMBER,
  makeToonRamp,
} from './toon'
import { OCEAN_FRAGMENT, OCEAN_VERTEX, waveHeight } from './waves'

function Ocean({ animate, segments }: { animate: boolean; segments: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: OCEAN_VERTEX,
        fragmentShader: OCEAN_FRAGMENT,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uDeep: { value: new THREE.Color(SEA_DEEP) },
            uShallow: { value: new THREE.Color(SEA_SHALLOW) },
            uFoam: { value: new THREE.Color(PAPER) },
            uInk: { value: new THREE.Color(INK) },
          },
        ]),
      }),
    [],
  )
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((state) => {
    const mat = mesh.current?.material as THREE.ShaderMaterial | undefined
    if (animate && mat) mat.uniforms.uTime.value = state.clock.elapsedTime
  })
  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} material={material}>
      <planeGeometry args={[80, 80, segments, segments]} />
    </mesh>
  )
}

/** Evenly spread points on a unit sphere (Fibonacci lattice). */
function fibonacciSphere(n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = golden * i
    pts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r))
  }
  return pts
}

/** Cream pickleball with maroon holes, like the club logo. */
function Pickleball({
  radius,
  ramp,
  outlines,
}: {
  radius: number
  ramp: THREE.Texture
  outlines: boolean
}) {
  const sphere = useMemo(() => new THREE.SphereGeometry(radius, 40, 28), [radius])
  const points = useMemo(() => fibonacciSphere(40), [])

  const setHoles = (mesh: THREE.InstancedMesh | null) => {
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const s = new THREE.Vector3(1, 1, 1)
    points.forEach((p, i) => {
      q.setFromUnitVectors(up, p)
      m.compose(p.clone().multiplyScalar(radius * 0.985), q, s)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }

  return (
    <group>
      <mesh geometry={sphere}>
        <Toon color={CREAM} ramp={ramp} />
      </mesh>
      <Outline geometry={sphere} thickness={1.05} enabled={outlines} />
      <instancedMesh ref={setHoles} args={[undefined, undefined, points.length]}>
        <cylinderGeometry args={[radius * 0.11, radius * 0.11, radius * 0.04, 16]} />
        <meshBasicMaterial color={MAROON} />
      </instancedMesh>
    </group>
  )
}

/** A rounded paddle face extruded into a slab, plus a wrapped handle. */
function Paddle({
  color,
  ramp,
  outlines,
}: {
  color: string
  ramp: THREE.Texture
  outlines: boolean
}) {
  const face = useMemo(() => {
    const w = 0.9
    const h = 1.15
    const r = 0.3
    const s = new THREE.Shape()
    s.moveTo(-w / 2 + r, -h / 2)
    s.lineTo(w / 2 - r, -h / 2)
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r)
    s.lineTo(w / 2, h / 2 - r)
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2)
    s.lineTo(-w / 2 + r, h / 2)
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r)
    s.lineTo(-w / 2, -h / 2 + r)
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2)
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.02,
      bevelSegments: 2,
      curveSegments: 6,
    })
    g.center()
    return g
  }, [])
  const handle = useMemo(() => new THREE.CylinderGeometry(0.075, 0.085, 0.6, 12), [])

  return (
    <group>
      <mesh geometry={face}>
        <Toon color={color} ramp={ramp} />
      </mesh>
      <Outline geometry={face} thickness={1.06} enabled={outlines} />
      <group position={[0, -0.85, 0]}>
        <mesh geometry={handle}>
          <Toon color={UMBER} ramp={ramp} />
        </mesh>
        <Outline geometry={handle} thickness={1.25} enabled={outlines} />
      </group>
      <mesh position={[0, -1.17, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.06, 12]} />
        <Toon color={GOLD} ramp={ramp} />
      </mesh>
    </group>
  )
}

/** Compass ring floating around the ball. */
function Compass({ ramp }: { ramp: THREE.Texture }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * 0.12
  })
  const points = [0, 1, 2, 3, 4, 5, 6, 7]
  return (
    <group ref={ref} rotation-x={-Math.PI / 2}>
      <mesh>
        <torusGeometry args={[2.3, 0.045, 8, 72]} />
        <Toon color={GOLD} ramp={ramp} />
      </mesh>
      {points.map((i) => {
        const a = (i / points.length) * Math.PI * 2
        const long = i % 2 === 0
        const len = long ? 0.6 : 0.32
        const dist = 2.3 + len / 2 + 0.02
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * dist, Math.sin(a) * dist, 0]}
            rotation-z={a - Math.PI / 2}
          >
            <coneGeometry args={[long ? 0.12 : 0.08, len, 4]} />
            <Toon color={long ? GOLD : PAPER} ramp={ramp} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Gold doubloons orbiting the ball: two instanced meshes (coin + rim) = two draw calls. */
function Doubloons({
  count,
  ramp,
  animate,
}: {
  count: number
  ramp: THREE.Texture
  animate: boolean
}) {
  const coins = useRef<THREE.InstancedMesh>(null)
  const rims = useRef<THREE.InstancedMesh>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2,
        radius: 1.9 + (i % 3) * 0.4,
        height: 0.6 + ((i * 37) % 10) / 10,
        speed: 0.25 + ((i * 13) % 7) / 20,
        spin: 1.5 + (i % 4) * 0.6,
        phase: i * 1.7,
      })),
    [count],
  )
  const tmp = useMemo(
    () => ({
      m: new THREE.Matrix4(),
      q: new THREE.Quaternion(),
      e: new THREE.Euler(),
      p: new THREE.Vector3(),
      s: new THREE.Vector3(1, 1, 1),
      r: new THREE.Vector3(1.18, 1.18, 0.6),
    }),
    [],
  )

  useFrame((state) => {
    const t = animate ? state.clock.elapsedTime : 0
    const a = coins.current
    const b = rims.current
    if (!a || !b) return
    seeds.forEach((s, i) => {
      const ang = s.angle + t * s.speed
      tmp.p.set(
        Math.cos(ang) * s.radius,
        s.height + Math.sin(t * 1.4 + s.phase) * 0.18,
        Math.sin(ang) * s.radius,
      )
      tmp.e.set(Math.PI / 2, t * s.spin + s.phase, 0.3)
      tmp.q.setFromEuler(tmp.e)
      tmp.m.compose(tmp.p, tmp.q, tmp.s)
      a.setMatrixAt(i, tmp.m)
      tmp.m.compose(tmp.p, tmp.q, tmp.r)
      b.setMatrixAt(i, tmp.m)
    })
    a.instanceMatrix.needsUpdate = true
    b.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={coins} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.16, 0.16, 0.05, 18]} />
        <meshToonMaterial color={GOLD} gradientMap={ramp} />
      </instancedMesh>
      <instancedMesh ref={rims} args={[undefined, undefined, count]} frustumCulled={false}>
        <cylinderGeometry args={[0.16, 0.16, 0.05, 18]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </instancedMesh>
    </group>
  )
}

/** Everything that floats: rides the shared wave function. */
function Flotilla({ animate, quality }: { animate: boolean; quality: SceneQuality }) {
  const ramp = useMemo(() => makeToonRamp(), [])
  const root = useRef<THREE.Group>(null)
  const ball = useRef<THREE.Group>(null)
  const spin = useRef(0.4)

  useFrame((state, delta) => {
    const t = animate ? state.clock.elapsedTime : 0
    const g = root.current
    if (!g) return
    // Sit right of the headline on wide screens; lower and smaller on portrait screens.
    const wide = state.size.width / state.size.height >= 1.1
    const x = wide ? Math.min(3.4, state.viewport.width * 0.2) : -0.55
    const scale = wide ? 1 : 0.78
    g.position.x = x
    g.scale.setScalar(scale)
    const h = waveHeight(x, 0, t)
    const hx = waveHeight(x + 0.8, 0, t) - waveHeight(x - 0.8, 0, t)
    const hz = waveHeight(x, 0.8, t) - waveHeight(x, -0.8, t)
    g.position.y = h + 0.55 * scale
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -hx * 0.35, 6, delta)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, hz * 0.35, 6, delta)
    if (ball.current && animate) {
      spin.current = THREE.MathUtils.damp(spin.current, 0.4, 0.8, delta)
      ball.current.rotation.y += delta * spin.current
      ball.current.rotation.x += delta * spin.current * 0.3
    }
    // Scrolling away from the hero pulls the camera back and up for a wider shot.
    const scroll = heroScrollProgress()
    const cam = state.camera
    cam.position.x = THREE.MathUtils.damp(cam.position.x, state.pointer.x * 1.2, 2.5, delta)
    cam.position.y = THREE.MathUtils.damp(
      cam.position.y,
      3.2 + state.pointer.y * 0.5 + scroll * 1.6,
      5,
      delta,
    )
    cam.position.z = THREE.MathUtils.damp(cam.position.z, 7.5 + scroll * 3, 5, delta)
    cam.lookAt(0, (wide ? 2.1 : 2.6) - scroll * 0.8, 0)
  })

  return (
    <group ref={root}>
      <Compass ramp={ramp} />
      <Doubloons count={quality.coins} ramp={ramp} animate={animate} />
      {/* Crossed paddles behind the ball. */}
      <group position={[0, 1.25, -0.9]}>
        <group rotation-z={0.6} position={[-0.45, 0, 0]}>
          <Paddle color={MAROON} ramp={ramp} outlines={quality.outlines} />
        </group>
        <group rotation-z={-0.6} position={[0.45, 0, -0.05]}>
          <Paddle color={MAROON_DARK} ramp={ramp} outlines={quality.outlines} />
        </group>
      </group>
      <group
        ref={ball}
        position={[0, 0.75, 0.2]}
        onClick={(e) => {
          e.stopPropagation()
          spin.current = 6
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <Pickleball radius={0.75} ramp={ramp} outlines={quality.outlines} />
      </group>
    </group>
  )
}

/** Where the ship sails: behind the ball, nudged to keep the hero copy clear. */
function shipPlacement({
  aspect,
  viewportWidth,
}: {
  aspect: number
  viewportWidth: number
}): ShipPlacement {
  if (aspect >= 1.1) {
    const ballX = Math.min(3.4, viewportWidth * 0.2)
    return { x: ballX + 3.9, z: -9.5, heading: -Math.PI / 2 + 0.55, scale: 1.65 }
  }
  return { x: 1.1, z: -4.2, heading: -Math.PI / 2 + 0.5, scale: 0.8 }
}

function ShipLayer({ animate, outlines }: { animate: boolean; outlines: boolean }) {
  const ramp = useMemo(() => makeToonRamp(), [])
  return <PirateShip ramp={ramp} outlines={outlines} animate={animate} placement={shipPlacement} />
}

export default function DockScene({
  animate = true,
  active = true,
  quality = QUALITY_HIGH,
  children,
}: {
  animate?: boolean
  /** False while the hero is off-screen: stop rendering frames entirely. */
  active?: boolean
  quality?: SceneQuality
  children?: ReactNode
}) {
  // Lower the pixel ratio when the measured frame rate drops (e.g. older phones).
  const [dpr, setDpr] = useState<[number, number] | number>(quality.dpr)

  return (
    <Canvas
      dpr={dpr}
      frameloop={active && animate ? 'always' : 'demand'}
      camera={{ position: [0, 3.2, 7.5], fov: 45, near: 0.1, far: 120 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(quality.dpr)}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />
      <fog attach="fog" args={[SEPIA_FOG, 16, 46]} />
      <hemisphereLight args={['#fff4dc', SEA_DEEP, 1.4]} />
      <directionalLight position={[6, 9, 4]} intensity={2.6} color="#fff0cc" />
      <Ocean animate={animate} segments={quality.oceanSegments} />
      <Suspense fallback={null}>
        <ShipLayer animate={animate} outlines={quality.outlines} />
      </Suspense>
      <Flotilla animate={animate} quality={quality} />
      {children}
    </Canvas>
  )
}
