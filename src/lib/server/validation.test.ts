import { describe, expect, it } from 'vitest'
import {
  createBookingSchema,
  formatZodError,
  metricQuerySchema,
  patchBookingSchema,
  slotsQuerySchema,
  voyageClickBodySchema,
} from './validation'

const id = 'a'.repeat(24)
const valid = { courtId: id, date: '2026-06-02', startTime: '10:00', hours: 2, type: 'charter' }

describe('createBookingSchema', () => {
  it('accepts a minimal charter', () => {
    expect(createBookingSchema.safeParse(valid).success).toBe(true)
  })
  it('accepts a voyage with optional fields', () => {
    const r = createBookingSchema.safeParse({
      ...valid,
      type: 'voyage',
      reclubUrl: ' https://reclub.co/m/x ',
      voyageTitle: ' Dinkers ',
      voyageVisibility: 'public',
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.voyageTitle).toBe('Dinkers')
  })
  it.each([
    [{ hours: 0 }],
    [{ hours: 5 }],
    [{ hours: 1.5 }],
    [{ date: '2026-02-30' }],
    [{ startTime: '25:00' }],
    [{ courtId: 'nope' }],
    [{ type: 'party' }],
    [{ voyageVisibility: 'secret' }],
    [{ voyageTitle: 'x'.repeat(81) }],
  ])('rejects %j', (patch) => {
    expect(createBookingSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })
  it('strips mass-assignment fields', () => {
    const r = createBookingSchema.safeParse({ ...valid, userId: 'x', status: 'completed' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data).not.toHaveProperty('userId')
      expect(r.data).not.toHaveProperty('status')
    }
  })
})

describe('patchBookingSchema', () => {
  it('parses each action', () => {
    const bodies = [
      { action: 'reschedule', date: '2026-06-02', startTime: '10:00', hours: 1 },
      { action: 'cancel' },
      { action: 'setReclub', reclubUrl: 'https://reclub.co/m/x' },
      { action: 'removeReclub' },
      { action: 'setVisibility', visibility: 'public' },
      { action: 'setTitle', voyageTitle: null },
    ]
    for (const b of bodies) expect(patchBookingSchema.safeParse(b).success).toBe(true)
  })
  it('rejects unknown actions and bad payloads', () => {
    expect(patchBookingSchema.safeParse({ action: 'delete' }).success).toBe(false)
    expect(patchBookingSchema.safeParse({ action: 'setReclub', reclubUrl: '' }).success).toBe(false)
    expect(patchBookingSchema.safeParse({ action: 'setVisibility', visibility: 'x' }).success).toBe(
      false,
    )
  })
  it('formats the first issue', () => {
    const r = patchBookingSchema.safeParse({ action: 'reschedule', date: 'bad' })
    expect(!r.success && formatZodError(r.error)).toContain('date')
  })
})

describe('query / click schemas', () => {
  it('validates slot dates', () => {
    expect(slotsQuerySchema.safeParse({ date: '2026-06-02' }).success).toBe(true)
    expect(slotsQuerySchema.safeParse({}).success).toBe(false)
  })
  it('defaults the metric range to 90d', () => {
    const r = metricQuerySchema.parse({ metric: 'revenue' })
    expect(r.range).toBe('90d')
    expect(metricQuerySchema.safeParse({ metric: 'nope' }).success).toBe(false)
    expect(metricQuerySchema.safeParse({ metric: 'tiers', range: '7d' }).success).toBe(false)
  })
  it('defaults click source to landing', () => {
    expect(voyageClickBodySchema.parse({ bookingId: id }).source).toBe('landing')
    expect(voyageClickBodySchema.safeParse({ bookingId: id, source: 'x' }).success).toBe(false)
  })
})
