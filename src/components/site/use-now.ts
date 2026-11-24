'use client'

import { useSyncExternalStore } from 'react'

const TICK_MS = 60_000

function subscribe(onChange: () => void) {
  const t = setInterval(onChange, TICK_MS)
  return () => clearInterval(t)
}

// Rounded to the minute so the snapshot is stable between renders.
const getSnapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS
const getServerSnapshot = () => null

/**
 * Current time (ms, minute resolution) on the client; `null` during server rendering and
 * prerendering. Keeps clock reads out of prerender and avoids hydration mismatches.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
