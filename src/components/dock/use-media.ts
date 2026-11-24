'use client'

import { useSyncExternalStore } from 'react'

/** Live `matchMedia` result; false during server rendering. */
export function useMedia(query: string): boolean {
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

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
export const LOW_POWER = '(max-width: 767px), (pointer: coarse)'
