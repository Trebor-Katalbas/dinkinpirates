import { describe, expect, it } from 'vitest'
import { tzOffsetMinutes, venueDateKey, venueDateTime } from './time'

describe('venue time', () => {
  it('Manila is UTC+8', () => {
    expect(tzOffsetMinutes(new Date('2026-06-01T00:00:00Z'), 'Asia/Manila')).toBe(480)
  })

  it('converts venue-local date/time to UTC', () => {
    expect(venueDateTime('2026-06-01', '07:00', 'Asia/Manila').toISOString()).toBe(
      '2026-05-31T23:00:00.000Z',
    )
  })

  it('handles DST zones', () => {
    expect(venueDateTime('2026-07-01', '12:00', 'America/New_York').toISOString()).toBe(
      '2026-07-01T16:00:00.000Z',
    )
    expect(venueDateTime('2026-01-01', '12:00', 'America/New_York').toISOString()).toBe(
      '2026-01-01T17:00:00.000Z',
    )
  })

  it('maps instants back to the venue-local date', () => {
    expect(venueDateKey(new Date('2026-05-31T17:00:00Z'), 'Asia/Manila')).toBe('2026-06-01')
    expect(venueDateKey(new Date('2026-05-31T15:59:00Z'), 'Asia/Manila')).toBe('2026-05-31')
  })
})
