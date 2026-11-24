import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageHeading } from '@/components/site/page-heading'
import { Skeleton } from '@/components/ui/skeleton'
import { VoyageFeed } from '@/components/voyage/voyage-feed'

export const metadata: Metadata = {
  title: 'Open Voyages',
  description:
    'Verified court bookings with an organizer-shared Reclub open-play link. Check Reclub for availability.',
}

export default function VoyagesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <PageHeading title="Open Voyages" eyebrow="Open play">
        Courts booked by organizers who shared a Reclub open-play link. Check Reclub for
        availability.
      </PageHeading>
      <Suspense
        fallback={
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        }
      >
        <VoyageFeed />
      </Suspense>
    </div>
  )
}
