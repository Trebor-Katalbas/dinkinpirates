import type { SlotDTO } from '@/types'

export interface OpenRange {
  startAt: string
  endAt: string
}

/** Merge back-to-back available slots into continuous ranges (e.g. 2:00 PM – 6:00 PM). */
export function openRanges(slots: readonly SlotDTO[]): OpenRange[] {
  const out: OpenRange[] = []
  for (const s of slots) {
    if (!s.available) continue
    const last = out.at(-1)
    if (last && last.endAt === s.startAt) last.endAt = s.endAt
    else out.push({ startAt: s.startAt, endAt: s.endAt })
  }
  return out
}
