// Venue time helpers. All courts share one venue timezone; DB stores UTC Dates.

export const VENUE_TZ = process.env.NEXT_PUBLIC_VENUE_TZ ?? 'Asia/Manila'

/** Offset (minutes) of `tz` from UTC at instant `at`. */
export function tzOffsetMinutes(at: Date, tz: string = VENUE_TZ): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** Venue-local "YYYY-MM-DD" + "HH:mm" → UTC Date. */
export function venueDateTime(date: string, time: string, tz: string = VENUE_TZ): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm))
  const offset = tzOffsetMinutes(guess, tz)
  return new Date(guess.getTime() - offset * 60_000)
}

/** UTC instant → venue-local "YYYY-MM-DD". */
export function venueDateKey(at: Date | string, tz: string = VENUE_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(at))
}

export function formatVenueDate(at: Date | string, tz: string = VENUE_TZ): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(at))
}

export function formatVenueTime(at: Date | string, tz: string = VENUE_TZ): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(at))
}
