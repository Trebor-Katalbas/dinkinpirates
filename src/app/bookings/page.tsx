import type { Metadata } from 'next'
import Link from 'next/link'
import { BookingsList } from '@/components/booking/bookings-list'
import { PageHeading } from '@/components/site/page-heading'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'My Bookings' }

export default function BookingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <PageHeading title="My Bookings" eyebrow="Ship's ledger">
        Manage your claimed courts, Reclub links, and voyage visibility.
      </PageHeading>
      <div className="mb-4 flex justify-end">
        <Button
          asChild
          className="tap bg-treasure-gold font-semibold text-sea-deep hover:bg-treasure-gold/90"
        >
          <Link href="/book">Claim a Court</Link>
        </Button>
      </div>
      <BookingsList />
    </div>
  )
}
