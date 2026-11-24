import type { NextRequest } from 'next/server'
import { summarizeDay } from '@/lib/availability'
import { connectDB } from '@/lib/db/mongoose'
import { Booking, Court } from '@/lib/db/models'
import { parseQuery, withErrors } from '@/lib/server/http'
import type { BookingLean, CourtLean } from '@/lib/server/serializers'
import { addDays } from '@/lib/server/metrics-fill'
import { generateSlots } from '@/lib/server/slots'
import { availabilityQuerySchema } from '@/lib/server/validation'
import type { BookingStatus } from '@/types'
import { venueDateTime } from '@/lib/time'

const BLOCKING: BookingStatus[] = ['pending', 'confirmed', 'completed']

/**
 * GET /api/availability?from=YYYY-MM-DD&days=N&hours=H
 * Per-day summary of open court start times for an H-hour session, so the date picker
 * can flag full or filling-up days. One bookings query for the whole range.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const { from, days, hours } = parseQuery(req.nextUrl.searchParams, availabilityQuerySchema)
  await connectDB()
  const courts = await Court.find({ active: true }).lean<CourtLean[]>()
  const rangeStart = venueDateTime(from, '00:00')
  const rangeEnd = venueDateTime(addDays(from, days), '00:00')
  const bookings = await Booking.find(
    {
      courtId: { $in: courts.map((c) => c._id) },
      status: { $in: BLOCKING },
      startAt: { $lt: rangeEnd },
      endAt: { $gt: rangeStart },
    },
    { courtId: 1, startAt: 1, endAt: 1 },
  ).lean<Pick<BookingLean, 'courtId' | 'startAt' | 'endAt'>[]>()

  const busyByCourt = new Map<string, { startAt: Date; endAt: Date }[]>()
  for (const b of bookings) {
    const key = String(b.courtId)
    const list = busyByCourt.get(key) ?? []
    list.push({ startAt: b.startAt, endAt: b.endAt })
    busyByCourt.set(key, list)
  }

  const now = new Date()
  const out = Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i)
    const perCourt = courts.map((c) =>
      generateSlots(date, c.openHours, busyByCourt.get(String(c._id)) ?? [], now),
    )
    return summarizeDay(date, perCourt, hours, now)
  })
  return Response.json(out, { headers: { 'Cache-Control': 'no-store' } })
})
