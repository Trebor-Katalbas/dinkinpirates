'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getJSON } from '@/components/site/fetch-json'
import { VoyageCard } from '@/components/voyage/voyage-card'
import type { PublicVoyageDTO } from '@/types'

export function VoyageFeed() {
  const params = useSearchParams()
  const expired = params.get('expired') === '1'
  const q = useQuery({
    queryKey: ['voyages'],
    queryFn: () => getJSON<PublicVoyageDTO[]>('/api/voyages'),
    staleTime: 60_000,
  })

  return (
    <div className="space-y-6">
      {expired ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-bounty-red/40 bg-bounty-red/10 p-4 text-bounty-red"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          That voyage link has expired or was cancelled.
        </p>
      ) : null}

      {q.isPending ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : q.isError ? (
        <div role="alert" className="rounded-xl bg-white/60 p-6">
          <p className="text-bounty-red">Could not load voyages: {q.error.message}</p>
          <Button className="tap mt-3" onClick={() => void q.refetch()}>
            Try again
          </Button>
        </div>
      ) : q.data.length === 0 ? (
        <div className="wanted-poster mx-auto max-w-md text-center">
          <p className="font-display text-3xl text-sea-deep">Calm seas</p>
          <p className="mt-2 text-ink/80">
            No Open Voyages are posted right now. Check back soon — or claim a court and share your
            own Reclub open-play link.
          </p>
          <Button
            asChild
            className="tap mt-4 bg-treasure-gold font-semibold text-sea-deep hover:bg-treasure-gold/90"
          >
            <Link href="/book?type=voyage">Start an Open Voyage</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((v) => (
            <li key={v.id} className="flex">
              <VoyageCard voyage={v} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
