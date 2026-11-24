import { VENUE_TZ, venueDateKey, venueDateTime } from '@/lib/time'
import type { CourtDTO, SlotDTO } from '@/types'

export const MAX_HOURS = 4
export const HOUR_OPTIONS = [1, 2, 3, 4] as const
export const STRIP_DAYS = 14
export const CALENDAR_DAYS = 60

/** Selected court + time, in the shape POST /api/bookings expects. */
export interface SlotSelection {
  courtId: string
  date: string // YYYY-MM-DD (venue-local)
  startTime: string // HH:mm (venue-local)
  hours: number
  startAt: string // ISO
  endAt: string // ISO
}

/** UTC instant → venue-local "HH:mm". */
export function venueHHmm(at: Date | string, tz: string = VENUE_TZ): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(at))
}

export function todayKey(): string {
  return venueDateKey(new Date())
}

/** Pure calendar arithmetic on a "YYYY-MM-DD" key. */
export function addDaysKey(key: string, days: number): string {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

export function nextDayKeys(count: number, from: string = todayKey()): string[] {
  return Array.from({ length: count }, (_, i) => addDaysKey(from, i))
}

/** Date key → a browser-local Date at midnight (for the Calendar component). */
export function keyToLocalDate(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function localDateToKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

/** Format a venue date key with Intl options (evaluated at venue noon to avoid TZ drift). */
export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: VENUE_TZ, ...opts }).format(
    venueDateTime(key, '12:00'),
  )
}

export function sortSlots(slots: SlotDTO[]): SlotDTO[] {
  return [...slots].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
}

/**
 * If `hours` consecutive slots starting at index `i` are all available and contiguous,
 * returns the run's end ISO; otherwise null.
 */
export function runEnd(slots: SlotDTO[], i: number, hours: number): string | null {
  let end: string | null = null
  for (let k = 0; k < hours; k++) {
    const slot = slots[i + k]
    if (!slot?.available) return null
    if (k > 0) {
      const prev = slots[i + k - 1]
      if (!prev || Date.parse(prev.endAt) !== Date.parse(slot.startAt)) return null
    }
    end = slot.endAt
  }
  return end
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

export function courtMeta(court: Pick<CourtDTO, 'surface' | 'indoor'>): string {
  return `${court.indoor ? 'Indoor' : 'Outdoor'} · ${court.surface}`
}
