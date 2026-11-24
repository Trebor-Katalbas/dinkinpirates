// Pure slot / overlap / booking-window logic (no DB, no Next) so it is unit-testable.
import type { SlotDTO } from '@/types'
import { venueDateTime } from '@/lib/time'

export const SLOT_MINUTES = 60
export const MAX_BOOKING_HOURS = 4
export const MAX_ADVANCE_DAYS = 90

export interface TimeRange {
  startAt: Date
  endAt: Date
}

export interface OpenHours {
  start: string
  end: string
}

export function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

export function minutesToHhmm(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Half-open interval overlap: back-to-back bookings do not overlap. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.startAt.getTime() < b.endAt.getTime() && b.startAt.getTime() < a.endAt.getTime()
}

export function overlapsAny(range: TimeRange, others: readonly TimeRange[]): boolean {
  return others.some((o) => rangesOverlap(range, o))
}

/** True for a real calendar date in "YYYY-MM-DD" form. */
export function isRealDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

/** 1-hour slots across the court's open hours (venue time) for a venue-local date. */
export function generateSlots(
  date: string,
  openHours: OpenHours,
  busy: readonly TimeRange[],
  now: Date = new Date(),
): SlotDTO[] {
  const open = hhmmToMinutes(openHours.start)
  const close = hhmmToMinutes(openHours.end)
  const slots: SlotDTO[] = []
  for (let m = open; m + SLOT_MINUTES <= close; m += SLOT_MINUTES) {
    const startAt = venueDateTime(date, minutesToHhmm(m))
    const endAt = venueDateTime(date, minutesToHhmm(m + SLOT_MINUTES))
    const available = startAt.getTime() > now.getTime() && !overlapsAny({ startAt, endAt }, busy)
    slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), available })
  }
  return slots
}

export type WindowResult = { ok: true; startAt: Date; endAt: Date } | { ok: false; error: string }

/** Validates a requested booking window against open hours, the slot grid, past and horizon. */
export function resolveBookingWindow(
  input: { date: string; startTime: string; hours: number },
  openHours: OpenHours,
  now: Date = new Date(),
): WindowResult {
  const open = hhmmToMinutes(openHours.start)
  const close = hhmmToMinutes(openHours.end)
  const start = hhmmToMinutes(input.startTime)
  const end = start + input.hours * 60
  if (start < open || end > close) {
    return { ok: false, error: `Court is open ${openHours.start}-${openHours.end}` }
  }
  if ((start - open) % SLOT_MINUTES !== 0) {
    return { ok: false, error: 'Start time must be on the hour grid' }
  }
  const startAt = venueDateTime(input.date, input.startTime)
  const endAt = new Date(startAt.getTime() + input.hours * 3_600_000)
  if (startAt.getTime() <= now.getTime())
    return { ok: false, error: 'That time has already passed' }
  if (startAt.getTime() > now.getTime() + MAX_ADVANCE_DAYS * 86_400_000) {
    return { ok: false, error: `Bookings open up to ${MAX_ADVANCE_DAYS} days ahead` }
  }
  return { ok: true, startAt, endAt }
}
