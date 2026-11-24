'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ReclubButton } from '@/components/voyage/reclub-button'
import { formatVenueDate, formatVenueTime } from '@/lib/time'
import type { PublicVoyageDTO } from '@/types'

async function fetchVoyages(): Promise<PublicVoyageDTO[]> {
  const res = await fetch('/api/voyages')
  if (!res.ok) throw new Error('Could not load voyages')
  return (await res.json()) as PublicVoyageDTO[]
}

/** A short preview of public voyages for the Dock. Only shows data we own. */
export function DockVoyages() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['voyages', 'public'],
    queryFn: fetchVoyages,
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError || !data || data.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-ink/30 bg-card/60 p-6 text-center">
        <p className="font-display text-2xl text-sea-deep">Calm seas for now</p>
        <p className="mt-1 text-sm text-ink/70">
          No public voyages yet.{' '}
          <Link href="/book?type=voyage" className="font-semibold text-sea-teal underline">
            Host one
          </Link>
          .
        </p>
      </div>
    )
  }

  return (
    <ul className="reveal-stagger mt-6 grid gap-4 md:grid-cols-3">
      {data.slice(0, 3).map((v) => (
        <li
          key={v.id}
          className="flex flex-col rounded-xl border border-ink/15 bg-card p-5 shadow-sm"
        >
          <Badge className="self-start bg-sea-teal text-parchment">Verified court booking</Badge>
          <h3 className="mt-3 text-lg leading-snug font-semibold">{v.title ?? 'Open play'}</h3>
          <p className="text-sm text-ink/75">
            {formatVenueDate(v.startAt)} · {formatVenueTime(v.startAt)}–{formatVenueTime(v.endAt)}
          </p>
          <p className="text-sm text-ink/75">{v.court.name}</p>
          <p className="mt-1 text-xs text-ink/60">Organized by {v.organizerName}</p>
          <ReclubButton
            href={v.goUrl}
            className="tap mt-4 inline-flex items-center justify-center rounded-lg bg-sea-deep px-4 text-sm font-semibold text-parchment hover:bg-sea-deep/90"
          />
        </li>
      ))}
    </ul>
  )
}
