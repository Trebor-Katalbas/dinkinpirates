'use client'

import { useEffect } from 'react'
import { worker } from './browser'
import { markMockReady } from './ready'

let starting: Promise<unknown> | null = null

/** Browser-only (loaded with ssr:false): starts the MSW service worker exactly once. */
export default function WorkerStarter() {
  useEffect(() => {
    starting ??= worker
      .start({
        onUnhandledFrame: 'bypass',
        quiet: true,
        serviceWorker: { url: '/mockServiceWorker.js' },
      })
      .catch((err: unknown) => console.error('[mock] failed to start MSW', err))
      .finally(markMockReady)
  }, [])
  return null
}
