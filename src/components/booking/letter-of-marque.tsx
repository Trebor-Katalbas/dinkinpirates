'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BookingLoadError, TypeBadge } from '@/components/booking/booking-states'
import { BookingSummary } from '@/components/booking/booking-summary'
import { useBooking } from '@/components/booking/queries'
import { Compass } from '@/components/site/compass'
import { useNow } from '@/components/site/use-now'
import { ShareLinks } from '@/components/voyage/share-links'
import { RECLUB_FOOTNOTE, VerifiedBookingBadge } from '@/components/voyage/verified-badge'
import { isPublicVoyageLive } from '@/lib/voyage'

function Scroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto max-w-2xl">
      <div
        className="relative z-10 mx-[-0.5rem] h-5 rounded-full bg-[linear-gradient(180deg,#c9a66b,#8b6a3a)] shadow-md"
        aria-hidden
      />
      <div className="parchment relative -my-2 border-x-4 border-[#c9a66b]/60 px-5 py-8 shadow-[inset_0_0_40px_rgb(139_94_40/0.25)] sm:px-10">
        {children}
      </div>
      <div
        className="relative z-10 mx-[-0.5rem] h-5 rounded-full bg-[linear-gradient(180deg,#c9a66b,#8b6a3a)] shadow-md"
        aria-hidden
      />
    </div>
  )
}

export function LetterOfMarque({ id }: { id: string }) {
  const q = useBooking(id)
  const { data: session } = useSession()
  const now = useNow()

  if (q.isPending) {
    return <Skeleton className="mx-auto h-[28rem] max-w-2xl rounded-xl" aria-busy="true" />
  }
  if (q.isError) {
    return <BookingLoadError error={q.error} callbackUrl={`/bookings/${id}/confirmed`} />
  }

  const b = q.data
  const live = now !== null && isPublicVoyageLive(b, new Date(now))
  const holder = session?.user?.name ?? 'the bearer'

  return (
    <Scroll>
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-sea-teal uppercase">
          Booking confirmed
        </p>
        <h1 className="mt-1 font-display text-5xl leading-none text-sea-deep sm:text-6xl">
          Letter of Marque
        </h1>
        <p className="mx-auto mt-3 max-w-md font-serif text-ink/80 italic">
          Be it known that {holder} holds lawful claim to the court below, for the hours written
          herein.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <TypeBadge type={b.type} />
          {b.status === 'confirmed' || b.status === 'completed' ? <VerifiedBookingBadge /> : null}
          {b.status === 'cancelled' ? (
            <span className="rounded-full bg-bounty-red/15 px-2.5 py-0.5 text-xs font-semibold text-bounty-red">
              Cancelled
            </span>
          ) : null}
        </div>
      </div>

      <div className="wave-divider my-6" aria-hidden />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {b.type === 'voyage' && b.voyageTitle ? (
            <p className="mb-2 font-heading text-2xl text-sea-deep">{b.voyageTitle}</p>
          ) : null}
          <BookingSummary court={b.court} startAt={b.startAt} endAt={b.endAt} />
        </div>
        <div
          className="flex size-20 shrink-0 rotate-[-12deg] items-center justify-center rounded-full border-4 border-double border-bounty-red/80 bg-bounty-red/10 text-bounty-red"
          aria-hidden
        >
          <Compass className="size-12" />
        </div>
      </div>

      {b.type === 'charter' ? (
        <p className="mt-6 text-sm text-ink/75">
          This is a Private Charter — it is never listed publicly. Payment at the venue for now.
        </p>
      ) : null}

      {b.type === 'voyage' ? (
        <section aria-labelledby="share-heading" className="mt-6 space-y-3">
          <h2 id="share-heading" className="font-heading text-2xl text-sea-deep">
            Spread the word
          </h2>
          {live ? (
            <>
              <p className="text-sm">Open play link shared by organizer.</p>
              <ShareLinks bookingId={b.id} />
            </>
          ) : !b.reclubUrl ? (
            <p className="text-sm text-ink/80">
              No Reclub link attached yet. Add one from the manage page to list this voyage on the
              Dock.
            </p>
          ) : b.voyageVisibility !== 'public' ? (
            <p className="text-sm text-ink/80">
              This voyage is private. Turn on public listing from the manage page to share it on the
              Dock and our Facebook page.
            </p>
          ) : (
            <p className="text-sm text-ink/80">This voyage is no longer listed.</p>
          )}
          {b.reclubUrl ? <p className="text-xs text-ink/65">{RECLUB_FOOTNOTE}</p> : null}
        </section>
      ) : null}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="tap flex-1">
          <Link href={`/bookings/${encodeURIComponent(b.id)}`}>Manage booking</Link>
        </Button>
        <Button asChild variant="outline" className="tap flex-1 bg-white/60">
          <Link href="/bookings">All my bookings</Link>
        </Button>
      </div>
    </Scroll>
  )
}
