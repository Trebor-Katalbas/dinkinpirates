'use client'

import { Canvas } from '@react-three/fiber'
import { SCENES, type SceneName } from './scenes'

/**
 * Browser-only: a small canvas that lives inside its slot in the page, so it scrolls
 * natively with the content (no frame of lag, unlike a fixed overlay canvas).
 */
export default function SceneCanvas({
  name,
  animate,
  active,
}: {
  name: SceneName
  animate: boolean
  /** False while the slot is off-screen: stop rendering frames. */
  active: boolean
}) {
  const Scene = SCENES[name]
  return (
    <Canvas
      className="!absolute inset-0"
      frameloop={active && animate ? 'always' : 'demand'}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      aria-hidden
    >
      <Scene animate={animate} />
    </Canvas>
  )
}
