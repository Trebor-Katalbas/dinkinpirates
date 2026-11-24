import { CalendarDays, Clock, MapPin } from 'lucide-react'
import { courtMeta, formatMoney } from '@/components/booking/slot-utils'
import { formatVenueDate, formatVenueTime } from '@/lib/time'
import type { CourtDTO } from '@/types'

export function BookingSummary({
  court,
  startAt,
  endAt,
  showPrice = true,
}: {
  court: CourtDTO | undefined
  startAt: string
  endAt: string
  showPrice?: boolean
}) {
  const hours = Math.max(1, Math.round((Date.parse(endAt) - Date.parse(startAt)) / 3_600_000))
  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex items-start gap-2">
        <dt className="sr-only">Court</dt>
        <MapPin className="mt-0.5 size-4 shrink-0 text-sea-teal" aria-hidden />
        <dd>
          <span className="font-semibold text-sea-deep">{court?.name ?? 'Court'}</span>
          {court ? <span className="text-ink/65"> · {courtMeta(court)}</span> : null}
        </dd>
      </div>
      <div className="flex items-start gap-2">
        <dt className="sr-only">Date</dt>
        <CalendarDays className="mt-0.5 size-4 shrink-0 text-sea-teal" aria-hidden />
        <dd>{formatVenueDate(startAt)}</dd>
      </div>
      <div className="flex items-start gap-2">
        <dt className="sr-only">Time</dt>
        <Clock className="mt-0.5 size-4 shrink-0 text-sea-teal" aria-hidden />
        <dd>
          {formatVenueTime(startAt)} – {formatVenueTime(endAt)}{' '}
          <span className="text-ink/65">({hours}h)</span>
          {showPrice && court ? (
            <span className="text-ink/65">
              {' '}
              · {formatMoney(court.pricePerHour * hours, court.currency)}
            </span>
          ) : null}
        </dd>
      </div>
    </dl>
  )
}
