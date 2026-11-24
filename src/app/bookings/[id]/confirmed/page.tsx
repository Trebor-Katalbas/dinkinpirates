import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LetterOfMarque } from '@/components/booking/letter-of-marque'
import { Skeleton } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Letter of Marque' }

export default function ConfirmedPage({ params }: PageProps<'/bookings/[id]/confirmed'>) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
      <Suspense fallback={<Skeleton className="mx-auto h-[28rem] max-w-2xl rounded-xl" />}>
        {params.then(({ id }) => (
          <LetterOfMarque id={id} />
        ))}
      </Suspense>
    </div>
  )
}
