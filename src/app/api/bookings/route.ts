import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import { Booking, Court } from '@/lib/db/models'
import { createBooking } from '@/lib/server/bookings'
import { parseBody, withErrors } from '@/lib/server/http'
import {
  toBookingDTO,
  toBookingWithCourt,
  type BookingLean,
  type CourtLean,
} from '@/lib/server/serializers'
import { requireUser } from '@/lib/server/session'
import { createBookingSchema } from '@/lib/server/validation'

export const GET = withErrors(async () => {
  const user = await requireUser()
  await connectDB()
  const bookings = await Booking.find({ userId: user.id })
    .sort({ startAt: -1 })
    .limit(200)
    .lean<BookingLean[]>()
  const courtIds = [...new Set(bookings.map((b) => String(b.courtId)))]
  const courts = await Court.find({ _id: { $in: courtIds } }).lean<CourtLean[]>()
  const byId = new Map(courts.map((c) => [String(c._id), c]))
  const rows = bookings.flatMap((b) => {
    const court = byId.get(String(b.courtId))
    return court ? [toBookingWithCourt(b, court)] : []
  })
  return Response.json(rows)
})

export const POST = withErrors(async (req: NextRequest) => {
  const user = await requireUser()
  const input = await parseBody(req, createBookingSchema)
  const booking = await createBooking(user, input)
  return Response.json(toBookingDTO(booking), { status: 201 })
})
