'use client'

import dynamic from 'next/dynamic'
import { Component, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { QUALITY_HIGH, QUALITY_LOW } from './scene-quality'

// three.js only ever loads in the browser, and only on the Dock.
const DockScene = dynamic(() => import('./dock-scene'), { ssr: false, loading: () => null })

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** If WebGL is unavailable the scene throws; fall back to the CSS backdrop silently. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[dock] 3D scene disabled:', error)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function DockHeroCanvas() {
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  // Phones and touch tablets get the lighter scene (fewer vertices, coins, pixels).
  const lowPower = useMedia('(max-width: 767px), (pointer: coarse)')
  const box = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(true)

  // Stop rendering frames while the hero is scrolled out of view.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), {
      rootMargin: '64px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={box} className="absolute inset-0">
      <SceneBoundary>
        <DockScene
          animate={!reduced}
          active={onScreen}
          quality={lowPower ? QUALITY_LOW : QUALITY_HIGH}
        />
      </SceneBoundary>
    </div>
  )
}
