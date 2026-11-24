import type { NextRequest } from 'next/server'
import { loadAccessibleBooking, loadCourt, patchBooking } from '@/lib/server/bookings'
import { parseBody, withErrors } from '@/lib/server/http'
import { toBookingWithCourt } from '@/lib/server/serializers'
import { requireUser } from '@/lib/server/session'
import { patchBookingSchema } from '@/lib/server/validation'

type Ctx = { params: Promise<{ id: string }> }

export const GET = withErrors(async (_req: NextRequest, { params }: Ctx) => {
  const user = await requireUser()
  const booking = await loadAccessibleBooking((await params).id, user)
  const court = await loadCourt(booking.courtId)
  return Response.json(toBookingWithCourt(booking, court))
})

export const PATCH = withErrors(async (req: NextRequest, { params }: Ctx) => {
  const user = await requireUser()
  const booking = await loadAccessibleBooking((await params).id, user)
  const input = await parseBody(req, patchBookingSchema)
  const next = await patchBooking(booking, input)
  const court = await loadCourt(next.courtId)
  return Response.json(toBookingWithCourt(next, court))
})
