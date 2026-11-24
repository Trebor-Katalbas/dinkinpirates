// Mock-mode request gate: /api/* fetches made before the MSW worker is running
// wait for it, so the very first requests (NextAuth session, queries) are mocked.

export const MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'

let resolveReady: () => void = () => {}
const ready = new Promise<void>((resolve) => {
  resolveReady = resolve
})

export function markMockReady(): void {
  resolveReady()
}

function isApiRequest(input: RequestInfo | URL): boolean {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const url = new URL(raw, window.location.href)
  return url.origin === window.location.origin && url.pathname.startsWith('/api/')
}

declare global {
  var __dpMockFetchPatched: boolean | undefined
}

if (MOCKING_ENABLED && typeof window !== 'undefined' && !globalThis.__dpMockFetchPatched) {
  globalThis.__dpMockFetchPatched = true
  const original = window.fetch.bind(window)
  window.fetch = async (input, init) => {
    if (isApiRequest(input)) await ready
    return original(input, init)
  }
}
