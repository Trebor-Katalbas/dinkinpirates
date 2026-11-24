import type { Metadata } from 'next'
import { Suspense } from 'react'
import { BookFlow } from '@/components/booking/book-flow'
import { PageHeading } from '@/components/site/page-heading'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = {
  title: 'Claim a Court',
  description: 'Book a pickleball court as a Private Charter or an Open Voyage.',
}

export default function BookPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <PageHeading title="Claim a Court" eyebrow="Book">
        One court, two ways to play: a Private Charter for your crew, or an Open Voyage with your
        Reclub open-play link attached.
      </PageHeading>
      <Suspense
        fallback={
          <div className="grid gap-6 sm:grid-cols-2" aria-busy="true">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        }
      >
        <BookFlow />
      </Suspense>
    </div>
  )
}
