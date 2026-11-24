import { describe, expect, it } from 'vitest'
import { openRanges } from './open-ranges'

const slot = (h: number, available: boolean) => ({
  startAt: `2026-11-24T${String(h).padStart(2, '0')}:00:00.000Z`,
  endAt: `2026-11-24T${String(h + 1).padStart(2, '0')}:00:00.000Z`,
  available,
})

describe('openRanges', () => {
  it('merges consecutive open slots and splits on booked ones', () => {
    const r = openRanges([slot(6, true), slot(7, true), slot(8, false), slot(9, true)])
    expect(r).toEqual([
      { startAt: slot(6, true).startAt, endAt: slot(7, true).endAt },
      { startAt: slot(9, true).startAt, endAt: slot(9, true).endAt },
    ])
  })

  it('returns nothing when every slot is taken', () => {
    expect(openRanges([slot(6, false), slot(7, false)])).toEqual([])
  })
})
