import { CalendarDays, Clock, MapPin, User } from 'lucide-react'
import { ReclubButton } from '@/components/voyage/reclub-button'
import { RECLUB_FOOTNOTE, VerifiedBookingBadge } from '@/components/voyage/verified-badge'
import { formatVenueDate, formatVenueTime } from '@/lib/time'
import type { PublicVoyageDTO } from '@/types'

/** Public Open Voyage card. Shows only data we own — never roster, slot or player counts. */
export function VoyageCard({ voyage }: { voyage: PublicVoyageDTO }) {
  const headingId = `voyage-${voyage.id}`
  return (
    <article aria-labelledby={headingId} className="wanted-poster reveal flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id={headingId} className="font-heading text-2xl leading-tight text-sea-deep">
          {voyage.title?.trim() || 'Open play'}
        </h2>
        <VerifiedBookingBadge />
      </div>
      <dl className="grid gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Court</dt>
          <MapPin className="size-4 shrink-0 text-sea-teal" aria-hidden />
          <dd>
            {voyage.court.name}
            <span className="text-ink/60"> · {voyage.court.indoor ? 'Indoor' : 'Outdoor'}</span>
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Date</dt>
          <CalendarDays className="size-4 shrink-0 text-sea-teal" aria-hidden />
          <dd>{formatVenueDate(voyage.startAt)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Time</dt>
          <Clock className="size-4 shrink-0 text-sea-teal" aria-hidden />
          <dd>
            {formatVenueTime(voyage.startAt)} – {formatVenueTime(voyage.endAt)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Organizer</dt>
          <User className="size-4 shrink-0 text-sea-teal" aria-hidden />
          <dd>Organized by {voyage.organizerName}</dd>
        </div>
      </dl>
      <p className="text-sm font-medium text-ink/80">Open play link shared by organizer</p>
      <ReclubButton href={voyage.goUrl} className="mt-auto w-full" />
      <p className="text-xs text-ink/60">{RECLUB_FOOTNOTE}</p>
    </article>
  )
}
