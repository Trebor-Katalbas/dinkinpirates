// Pure availability maths shared by the API, the mock API and the booking UI.
// Works only on our own court-booking data (never anything from Reclub).

import type { DayAvailabilityDTO, DayStatus, SlotDTO } from '@/types'

/** Below this share of open start times a day counts as "filling up". */
export const LIMITED_RATIO = 0.35

/** Longest run of consecutive free hours starting at slot `i` (0 if that slot is taken/past). */
export function freeRunFrom(slots: readonly SlotDTO[], i: number): number {
  let n = 0
  for (let k = i; k < slots.length; k++) {
    const s = slots[k]
    if (!s?.available) break
    if (k > i) {
      const prev = slots[k - 1]
      if (!prev || Date.parse(prev.endAt) !== Date.parse(s.startAt)) break
    }
    n++
  }
  return n
}

/**
 * Summarise one day across courts for a session of `hours`.
 * `slotsByCourt` holds each court's sorted 1-hour slots for that day.
 */
export function summarizeDay(
  date: string,
  slotsByCourt: readonly (readonly SlotDTO[])[],
  hours: number,
  now: Date = new Date(),
): DayAvailabilityDTO {
  // Start times are compared across courts by their ISO instant.
  const upcoming = new Set<string>()
  const open = new Set<string>()
  for (const slots of slotsByCourt) {
    slots.forEach((s, i) => {
      if (Date.parse(s.startAt) <= now.getTime()) return
      upcoming.add(s.startAt)
      if (freeRunFrom(slots, i) >= hours) open.add(s.startAt)
    })
  }
  const totalStarts = upcoming.size
  const openStarts = open.size
  let status: DayStatus
  if (totalStarts === 0) status = 'closed'
  else if (openStarts === 0) status = 'full'
  else if (openStarts / totalStarts < LIMITED_RATIO) status = 'limited'
  else status = 'open'
  return { date, openStarts, totalStarts, status }
}

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  open: 'Open',
  limited: 'Filling up',
  full: 'Fully claimed',
  closed: 'Closed',
}
