'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isRedirectable, parseClickSource } from '@/lib/voyage'
import { MOCKING_ENABLED } from '@/mocks/mock-gate'

type State =
  | { kind: 'loading' }
  | { kind: 'off' }
  | { kind: 'expired' }
  | { kind: 'ok'; url: string; source: string }

/**
 * Mock stand-in for the /go/{id} redirect: applies the same redirect rule, logs the
 * click into the mock store, and shows where the real route would send the visitor
 * (the mock Reclub links are placeholders, so we don't navigate there).
 */
export function MockGoClient({ id }: { id: string }) {
  const search = useSearchParams()
  const [state, setState] = useState<State>({ kind: MOCKING_ENABLED ? 'loading' : 'off' })

  useEffect(() => {
    if (!MOCKING_ENABLED) return
    void import('@/mocks/store').then(({ getDB, saveDB }) => {
      const db = getDB()
      const booking = db.bookings.find((b) => b.id === id)
      const source = parseClickSource(search.get('src'))
      if (!booking?.reclubUrl || !isRedirectable(booking)) {
        setState({ kind: 'expired' })
        return
      }
      db.clicks.push({ bookingId: id, source, createdAt: new Date().toISOString() })
      saveDB()
      setState({ kind: 'ok', url: booking.reclubUrl, source })
    })
  }, [id, search])

  return (
    <section className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-xs font-semibold tracking-widest text-bounty-red uppercase">Mock mode</p>
      <h1 className="mt-2 font-display text-4xl text-sea-deep">Opening Reclub…</h1>
      {state.kind === 'loading' ? <p className="mt-4 text-ink/70">Checking the voyage…</p> : null}
      {state.kind === 'off' ? (
        <p className="mt-4 text-ink/70">Mock mode is off. Real links go through /go/{id}.</p>
      ) : null}
      {state.kind === 'expired' ? (
        <p className="mt-4 text-ink/70">
          The real route would send you to{' '}
          <Link href="/voyages?expired=1" className="font-semibold text-sea-teal underline">
            /voyages?expired=1
          </Link>{' '}
          because this voyage link has expired or was cancelled.
        </p>
      ) : null}
      {state.kind === 'ok' ? (
        <div className="mt-4 space-y-3 text-ink/80">
          <p>
            Click logged with source <strong>{state.source}</strong>. The real route would now
            redirect (302) to the organizer&apos;s Reclub link:
          </p>
          <p className="rounded-lg border border-ink/20 bg-card px-3 py-2 font-mono text-sm break-all">
            {state.url}
          </p>
          <p className="text-sm">It is a placeholder link in mock data, so we stop here.</p>
          <Link
            href="/voyages"
            className="tap inline-flex items-center rounded-lg bg-sea-deep px-4 font-semibold text-parchment"
          >
            Back to Open Voyages
          </Link>
        </div>
      ) : null}
    </section>
  )
}
