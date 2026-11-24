'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/components/site/fetch-json'
import { signInHref } from '@/components/site/safe-callback'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '@/types'

/** Error card for booking queries: 401 → sign-in prompt, 403/404 → not found. */
export function BookingLoadError({ error, callbackUrl }: { error: Error; callbackUrl: string }) {
  const status = error instanceof ApiError ? error.status : 0
  if (status === 401) {
    return (
      <div className="wanted-poster mx-auto max-w-md text-center">
        <p className="font-display text-3xl text-sea-deep">Sign in to view this booking</p>
        <Button asChild className="tap mt-4">
          <Link href={signInHref(callbackUrl)}>Sign in</Link>
        </Button>
      </div>
    )
  }
  const notFound = status === 404 || status === 403
  return (
    <div role="alert" className="wanted-poster mx-auto max-w-md text-center">
      <p className="font-display text-3xl text-sea-deep">
        {notFound ? 'Booking not found' : 'Something went wrong'}
      </p>
      <p className="mt-2 text-ink/75">
        {notFound ? 'This booking does not exist or belongs to another crew.' : error.message}
      </p>
      <Button asChild variant="outline" className="tap mt-4">
        <Link href="/bookings">Back to My Bookings</Link>
      </Button>
    </div>
  )
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: 'bg-treasure-gold/25 text-ink',
  confirmed: 'bg-sea-teal/15 text-sea-teal',
  cancelled: 'bg-bounty-red/15 text-bounty-red',
  completed: 'bg-ink/10 text-ink/70',
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function TypeBadge({ type }: { type: 'charter' | 'voyage' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        type === 'voyage' ? 'bg-treasure-gold text-sea-deep' : 'bg-sea-deep text-parchment',
      )}
    >
      {type === 'voyage' ? 'Open Voyage' : 'Private Charter'}
    </span>
  )
}
