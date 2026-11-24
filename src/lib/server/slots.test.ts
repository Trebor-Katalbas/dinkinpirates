import { describe, expect, it } from 'vitest'
import { venueDateTime } from '@/lib/time'
import {
  MAX_ADVANCE_DAYS,
  generateSlots,
  hhmmToMinutes,
  isRealDate,
  minutesToHhmm,
  overlapsAny,
  rangesOverlap,
  resolveBookingWindow,
} from './slots'

const open = { start: '06:00', end: '22:00' }
// 2026-06-01 00:00 venue time; everything below is relative to this.
const now = venueDateTime('2026-06-01', '00:00')
const range = (date: string, from: string, to: string) => ({
  startAt: venueDateTime(date, from),
  endAt: venueDateTime(date, to),
})

describe('time math', () => {
  it('round-trips HH:mm', () => {
    expect(hhmmToMinutes('06:30')).toBe(390)
    expect(minutesToHhmm(390)).toBe('06:30')
  })
  it('validates calendar dates', () => {
    expect(isRealDate('2026-02-28')).toBe(true)
    expect(isRealDate('2026-02-30')).toBe(false)
    expect(isRealDate('2026-13-01')).toBe(false)
    expect(isRealDate('26-1-1')).toBe(false)
  })
})

describe('overlap detection', () => {
  it('detects partial, contained and identical overlaps', () => {
    const a = range('2026-06-02', '10:00', '12:00')
    expect(rangesOverlap(a, range('2026-06-02', '11:00', '13:00'))).toBe(true)
    expect(rangesOverlap(a, range('2026-06-02', '10:30', '11:30'))).toBe(true)
    expect(rangesOverlap(a, a)).toBe(true)
  })
  it('treats back-to-back bookings as non-overlapping', () => {
    const a = range('2026-06-02', '10:00', '12:00')
    expect(rangesOverlap(a, range('2026-06-02', '12:00', '13:00'))).toBe(false)
    expect(rangesOverlap(a, range('2026-06-02', '09:00', '10:00'))).toBe(false)
  })
  it('overlapsAny scans a list', () => {
    const list = [range('2026-06-02', '08:00', '09:00'), range('2026-06-02', '14:00', '16:00')]
    expect(overlapsAny(range('2026-06-02', '15:00', '17:00'), list)).toBe(true)
    expect(overlapsAny(range('2026-06-02', '09:00', '14:00'), list)).toBe(false)
  })
})

describe('generateSlots', () => {
  it('makes 16 one-hour slots for 06:00-22:00', () => {
    const slots = generateSlots('2026-06-02', open, [], now)
    expect(slots).toHaveLength(16)
    expect(slots[0].startAt).toBe(venueDateTime('2026-06-02', '06:00').toISOString())
    expect(slots[15].endAt).toBe(venueDateTime('2026-06-02', '22:00').toISOString())
    expect(slots.every((s) => s.available)).toBe(true)
  })

  it('marks past slots unavailable', () => {
    const at = venueDateTime('2026-06-02', '09:30')
    const slots = generateSlots('2026-06-02', open, [], at)
    const byHour = (h: string) =>
      slots.find((s) => s.startAt === venueDateTime('2026-06-02', h).toISOString())
    expect(byHour('09:00')?.available).toBe(false)
    expect(byHour('10:00')?.available).toBe(true)
  })

  it('marks slots overlapping bookings unavailable', () => {
    const busy = [range('2026-06-02', '10:00', '12:00')]
    const slots = generateSlots('2026-06-02', open, busy, now)
    const unavailable = slots.filter((s) => !s.available).map((s) => s.startAt)
    expect(unavailable).toEqual([
      venueDateTime('2026-06-02', '10:00').toISOString(),
      venueDateTime('2026-06-02', '11:00').toISOString(),
    ])
  })

  it('does not emit a trailing partial slot', () => {
    expect(generateSlots('2026-06-02', { start: '06:00', end: '07:30' }, [], now)).toHaveLength(1)
  })
})

describe('resolveBookingWindow', () => {
  const ok = { date: '2026-06-02', startTime: '10:00', hours: 2 }

  it('resolves a valid window', () => {
    const r = resolveBookingWindow(ok, open, now)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.endAt.getTime() - r.startAt.getTime()).toBe(2 * 3_600_000)
  })
  it('rejects outside open hours', () => {
    expect(resolveBookingWindow({ ...ok, startTime: '05:00' }, open, now).ok).toBe(false)
    expect(resolveBookingWindow({ ...ok, startTime: '21:00' }, open, now).ok).toBe(false)
    expect(resolveBookingWindow({ ...ok, startTime: '20:00' }, open, now).ok).toBe(true)
  })
  it('rejects off-grid starts', () => {
    expect(resolveBookingWindow({ ...ok, startTime: '10:30' }, open, now).ok).toBe(false)
  })
  it('rejects the past and the far future', () => {
    expect(resolveBookingWindow({ ...ok, date: '2026-05-31' }, open, now).ok).toBe(false)
    const later = new Date(now.getTime() + (MAX_ADVANCE_DAYS + 2) * 86_400_000)
    expect(resolveBookingWindow(ok, open, later).ok).toBe(false)
    const far = resolveBookingWindow({ ...ok, date: '2027-01-01' }, open, now)
    expect(far.ok).toBe(false)
  })
})
