import { describe, expect, it } from 'vitest'
import { freeRunFrom, summarizeDay } from './availability'

const NOW = new Date('2026-11-24T00:00:00Z')
const slot = (h: number, available: boolean) => ({
  startAt: `2026-11-25T${String(h).padStart(2, '0')}:00:00.000Z`,
  endAt: `2026-11-25T${String(h + 1).padStart(2, '0')}:00:00.000Z`,
  available,
})

describe('freeRunFrom', () => {
  it('counts consecutive free hours', () => {
    const s = [slot(1, true), slot(2, true), slot(3, false), slot(4, true)]
    expect(freeRunFrom(s, 0)).toBe(2)
    expect(freeRunFrom(s, 2)).toBe(0)
    expect(freeRunFrom(s, 3)).toBe(1)
  })
})

describe('summarizeDay', () => {
  it('is open when most start times have a free court', () => {
    const a = [slot(1, true), slot(2, true), slot(3, true)]
    expect(summarizeDay('2026-11-25', [a], 1, NOW).status).toBe('open')
  })

  it('counts a start as open if any court is free, and respects session length', () => {
    const a = [slot(1, true), slot(2, false), slot(3, true)]
    const b = [slot(1, false), slot(2, true), slot(3, false)]
    const one = summarizeDay('2026-11-25', [a, b], 1, NOW)
    expect(one).toMatchObject({ openStarts: 3, totalStarts: 3, status: 'open' })
    const two = summarizeDay('2026-11-25', [a, b], 2, NOW)
    expect(two).toMatchObject({ openStarts: 0, status: 'full' })
  })

  it('flags a mostly-booked day as filling up', () => {
    const a = Array.from({ length: 10 }, (_, i) => slot(i, i < 2))
    expect(summarizeDay('2026-11-25', [a], 1, NOW).status).toBe('limited')
  })

  it('is closed once every start time has passed', () => {
    const a = [slot(1, false), slot(2, false)]
    const later = new Date('2026-11-26T00:00:00Z')
    expect(summarizeDay('2026-11-25', [a], 1, later)).toMatchObject({
      totalStarts: 0,
      status: 'closed',
    })
  })
})
