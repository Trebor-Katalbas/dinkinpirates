import { describe, expect, it } from 'vitest'
import {
  addDays,
  dateKeysBetween,
  fillRevenue,
  fillSources,
  fillTiers,
  fillWeekly,
  mondayOf,
  rangeDays,
} from './metrics-fill'

describe('date keys', () => {
  it('adds days across month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('finds the Monday of a week', () => {
    expect(mondayOf('2026-06-01')).toBe('2026-06-01') // Monday
    expect(mondayOf('2026-06-07')).toBe('2026-06-01') // Sunday
    expect(mondayOf('2026-06-03')).toBe('2026-06-01')
  })
  it('lists inclusive date keys and parses ranges', () => {
    expect(dateKeysBetween('2026-06-01', '2026-06-03')).toHaveLength(3)
    expect(rangeDays('180d')).toBe(180)
  })
})

describe('zero-filling', () => {
  it('fills revenue days', () => {
    const rows = fillRevenue([{ date: '2026-06-02', revenue: 900 }], '2026-06-01', '2026-06-03')
    expect(rows).toEqual([
      { date: '2026-06-01', revenue: 0 },
      { date: '2026-06-02', revenue: 900 },
      { date: '2026-06-03', revenue: 0 },
    ])
  })
  it('pivots and fills weeks', () => {
    const rows = fillWeekly(
      [
        { week: '2026-06-01', type: 'charter', n: 2 },
        { week: '2026-06-01', type: 'voyage', n: 1 },
        { week: '2026-06-15', type: 'voyage', n: 4 },
      ],
      '2026-06-01',
      '2026-06-16',
    )
    expect(rows).toEqual([
      { week: '2026-06-01', charter: 2, voyage: 1 },
      { week: '2026-06-08', charter: 0, voyage: 0 },
      { week: '2026-06-15', charter: 0, voyage: 4 },
    ])
  })
  it('zero-fills all sources and tiers in order', () => {
    expect(fillSources([{ source: 'fb', clicks: 3 }])).toEqual([
      { source: 'landing', clicks: 0 },
      { source: 'messenger', clicks: 0 },
      { source: 'fb', clicks: 3 },
      { source: 'qr', clicks: 0 },
    ])
    expect(fillTiers([{ tier: 'captain', count: 2 }]).map((r) => r.tier)).toEqual([
      'deckhand',
      'buccaneer',
      'firstMate',
      'captain',
      'legend',
    ])
  })
})
