import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ManageBooking } from '@/components/booking/manage-booking'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Manage booking' }

export default function ManageBookingPage({ params }: PageProps<'/bookings/[id]'>) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
        {params.then(({ id }) => (
          <ManageBooking id={id} />
        ))}
      </Suspense>
    </div>
  )
}
