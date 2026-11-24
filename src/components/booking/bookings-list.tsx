'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookingLoadError, StatusBadge, TypeBadge } from '@/components/booking/booking-states'
import type { BookingWithCourt } from '@/components/booking/queries'
import { getJSON } from '@/components/site/fetch-json'
import { useNow } from '@/components/site/use-now'
import { formatVenueDate, formatVenueTime } from '@/lib/time'

function isUpcoming(b: BookingWithCourt, now: number): boolean {
  return b.status !== 'cancelled' && b.status !== 'completed' && Date.parse(b.endAt) > now
}

function BookingRow({ b }: { b: BookingWithCourt }) {
  return (
    <li className="reveal">
      <Link
        href={`/bookings/${encodeURIComponent(b.id)}`}
        className="flex min-h-20 items-center gap-3 rounded-xl border border-ink/15 bg-white/70 p-4 transition-colors outline-none hover:border-sea-teal focus-visible:ring-3 focus-visible:ring-treasure-gold"
      >
        <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-sea-deep py-1.5 text-parchment">
          <span className="text-xs uppercase">{formatVenueDate(b.startAt).split(',')[0]}</span>
          <span className="text-lg leading-tight font-semibold">
            {formatVenueDate(b.startAt).split(' ').at(-1)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sea-deep">
            {b.type === 'voyage' && b.voyageTitle ? b.voyageTitle : b.court.name}
          </p>
          <p className="text-sm text-ink/70">
            {formatVenueDate(b.startAt)} · {formatVenueTime(b.startAt)} – {formatVenueTime(b.endAt)}
            {b.type === 'voyage' && b.voyageTitle ? ` · ${b.court.name}` : ''}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <TypeBadge type={b.type} />
            <StatusBadge status={b.status} />
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-ink/40" aria-hidden />
      </Link>
    </li>
  )
}

function Empty({ upcoming }: { upcoming: boolean }) {
  return (
    <div className="wanted-poster mx-auto max-w-md text-center">
      <p className="font-display text-3xl text-sea-deep">
        {upcoming ? 'No courts claimed yet' : 'No past voyages'}
      </p>
      <p className="mt-2 text-ink/75">
        {upcoming
          ? 'Claim a court for a Private Charter or an Open Voyage.'
          : 'Completed and cancelled bookings will appear here.'}
      </p>
      {upcoming ? (
        <Button
          asChild
          className="tap mt-4 bg-treasure-gold font-semibold text-sea-deep hover:bg-treasure-gold/90"
        >
          <Link href="/book">Claim a Court</Link>
        </Button>
      ) : null}
    </div>
  )
}

export function BookingsList() {
  const now = useNow()
  const q = useQuery({
    queryKey: ['bookings'],
    queryFn: () => getJSON<BookingWithCourt[]>('/api/bookings'),
  })

  if (q.isPending || now === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-56 rounded-lg" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }
  if (q.isError) return <BookingLoadError error={q.error} callbackUrl="/bookings" />

  const upcoming = q.data
    .filter((b) => isUpcoming(b, now))
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
  const past = q.data
    .filter((b) => !isUpcoming(b, now))
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt))

  return (
    <Tabs defaultValue="upcoming">
      <TabsList className="h-11! w-full sm:w-auto">
        <TabsTrigger value="upcoming" className="min-h-9 px-4">
          Upcoming ({upcoming.length})
        </TabsTrigger>
        <TabsTrigger value="past" className="min-h-9 px-4">
          Past & cancelled ({past.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="upcoming" className="mt-4">
        {upcoming.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {upcoming.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </ul>
        ) : (
          <Empty upcoming />
        )}
      </TabsContent>
      <TabsContent value="past" className="mt-4">
        {past.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {past.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </ul>
        ) : (
          <Empty upcoming={false} />
        )}
      </TabsContent>
    </Tabs>
  )
}
