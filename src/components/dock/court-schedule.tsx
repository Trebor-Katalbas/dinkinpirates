'use client'

import { useQueries, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { courtsQuery, slotsQuery } from '@/components/booking/queries'
import { useNow } from '@/components/site/use-now'
import { Skeleton } from '@/components/ui/skeleton'
import { VENUE_TZ, formatVenueTime, venueDateKey } from '@/lib/time'
import { openRanges } from './open-ranges'

const posterDate = new Intl.DateTimeFormat('en-US', {
  timeZone: VENUE_TZ,
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

/**
 * Today's open court times, laid out like the club's schedule posters.
 * Shows only court availability (our own data) — never who booked or Reclub details.
 */
export function CourtSchedule() {
  const now = useNow()
  const today = now === null ? null : venueDateKey(new Date(now))
  const tomorrow = now === null ? null : venueDateKey(new Date(now + 86_400_000))
  const courts = useQuery(courtsQuery)
  const todaySlots = useQueries({
    queries: (courts.data ?? []).map((c) => ({
      ...slotsQuery(c.id, today ?? ''),
      enabled: today !== null,
    })),
  })
  // After closing time every slot today has started: show tomorrow's sheet instead.
  const todayLoaded = todaySlots.length > 0 && todaySlots.every((q) => q.isSuccess)
  const closedForToday =
    now !== null &&
    todayLoaded &&
    todaySlots.every((q) => (q.data ?? []).every((s) => new Date(s.startAt).getTime() <= now))
  const tomorrowSlots = useQueries({
    queries: (courts.data ?? []).map((c) => ({
      ...slotsQuery(c.id, tomorrow ?? ''),
      enabled: closedForToday && tomorrow !== null,
    })),
  })
  const slots = closedForToday ? tomorrowSlots : todaySlots
  const sheetDate = now === null ? null : closedForToday ? now + 86_400_000 : now

  const loading = today === null || courts.isLoading || slots.some((q) => q.isLoading)

  return (
    <div className="paper paper-torn mx-auto max-w-2xl px-5 pt-10 pb-9 sm:px-10">
      <p className="text-center text-xs font-bold tracking-[0.3em] text-maroon uppercase">
        {closedForToday ? 'Courts are closed for today · Open tomorrow' : 'Open courts today'}
      </p>
      <h2 id="schedule-title" className="manga-title mt-1 text-center text-4xl sm:text-6xl">
        {sheetDate === null ? 'Today' : posterDate.format(new Date(sheetDate))}
      </h2>

      <div className="mt-6 overflow-hidden rounded-sm shadow-[0_2px_0_rgb(43_30_26/0.2)]">
        <table className="poster-table">
          <thead>
            <tr>
              <th scope="col" className="w-1/3 border-r-2 border-paper/30">
                Court
                <br />
                Number
              </th>
              <th scope="col">Open times</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td>
                      <Skeleton className="mx-auto h-10 w-8 bg-scorch/20" />
                    </td>
                    <td>
                      <Skeleton className="mx-auto h-5 w-40 bg-scorch/20" />
                    </td>
                  </tr>
                ))
              : (courts.data ?? []).map((court, i) => {
                  const courtSlots = slots[i]?.data ?? []
                  const ranges = openRanges(courtSlots)
                  const anyAhead = courtSlots.some(
                    (s) => now !== null && new Date(s.startAt).getTime() > now,
                  )
                  return (
                    <tr key={court.id}>
                      <th scope="row" className="border border-scorch/25 !bg-paper/80 !text-ink">
                        <span className="block font-display text-5xl leading-none">{i + 1}</span>
                        <span className="mt-1 block text-[11px] font-semibold tracking-normal text-ink/60 normal-case">
                          {court.name}
                        </span>
                      </th>
                      <td className="text-base sm:text-lg">
                        {slots[i]?.isError ? (
                          <span className="text-ink/60">Couldn&apos;t load times</span>
                        ) : ranges.length === 0 ? (
                          <span className="text-bounty-red">
                            {anyAhead ? 'Fully claimed' : 'Closed for the day'}
                          </span>
                        ) : (
                          <ul className="space-y-1">
                            {ranges.map((r) => (
                              <li key={r.startAt} className="tabular-nums">
                                {formatVenueTime(r.startAt)} – {formatVenueTime(r.endAt)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-center">
        <Link
          href="/book"
          className="tap inline-flex items-center rounded-md border-2 border-umber bg-treasure-gold px-6 font-display text-xl tracking-wide text-umber uppercase shadow-[4px_4px_0_var(--color-umber)] transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-umber/40 focus-visible:outline-none"
        >
          Claim a Court
        </Link>
      </div>
    </div>
  )
}
