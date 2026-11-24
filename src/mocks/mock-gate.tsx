'use client'

import dynamic from 'next/dynamic'
import { Suspense, type ReactNode } from 'react'
import { MOCKING_ENABLED } from './ready'

export { MOCKING_ENABLED }

// msw/browser has no Node build, so it must never enter the server bundle.
const WorkerStarter = dynamic(() => import('./worker-starter'), { ssr: false })

/**
 * Mock mode (NEXT_PUBLIC_API_MOCKING=enabled): starts the MSW worker and shows a badge.
 * `./ready` holds /api/* fetches until the worker is running, so the app renders normally.
 * Outside mock mode this is a pass-through and MSW is never loaded.
 */
export function MockGate({ children }: { children: ReactNode }) {
  if (!MOCKING_ENABLED) return children
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <WorkerStarter />
      </Suspense>
      <MockBadge />
    </>
  )
}

function MockBadge() {
  async function reset() {
    const { resetDB } = await import('./store')
    resetDB()
    window.location.reload()
  }
  return (
    <div className="fixed right-3 bottom-24 z-50 flex items-center gap-2 rounded-full border border-ink/20 bg-parchment/95 py-1 pr-1 pl-3 text-xs shadow-md md:bottom-4">
      <span className="font-semibold text-bounty-red">Mock data</span>
      <button
        type="button"
        onClick={() => void reset()}
        className="min-h-8 rounded-full bg-sea-deep px-3 font-semibold text-parchment hover:bg-sea-deep/90"
      >
        Reset
      </button>
    </div>
  )
}
