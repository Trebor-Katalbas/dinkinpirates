'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { REDUCED_MOTION, useMedia } from '../use-media'
import type { SceneName } from './scenes'

// three.js loads lazily, in the browser only.
const SceneCanvas = dynamic(() => import('./scene-canvas'), { ssr: false, loading: () => null })

/**
 * A box in the page layout with its own small 3D scene. The canvas is created when the
 * slot first comes near the viewport and only renders frames while it is on screen.
 */
export function SceneSlot({ name, className }: { name: SceneName; className?: string }) {
  const reduced = useMedia(REDUCED_MOTION)
  const box = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [onScreen, setOnScreen] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    // Mount a little early so the scene is ready by the time it scrolls in.
    const near = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setMounted(true)
          near.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    const visible = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting))
    near.observe(el)
    visible.observe(el)
    return () => {
      near.disconnect()
      visible.disconnect()
    }
  }, [])

  return (
    <div ref={box} className={cn('relative', className)} aria-hidden>
      {mounted ? <SceneCanvas name={name} animate={!reduced} active={onScreen} /> : null}
    </div>
  )
}
