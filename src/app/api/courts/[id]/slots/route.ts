import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import { Court } from '@/lib/db/models'
import { findBlockingBookings } from '@/lib/server/bookings'
import { HttpError, assertObjectId, parseQuery, withErrors } from '@/lib/server/http'
import type { CourtLean } from '@/lib/server/serializers'
import { generateSlots } from '@/lib/server/slots'
import { slotsQuerySchema } from '@/lib/server/validation'
import { venueDateTime } from '@/lib/time'

export const GET = withErrors(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params
    assertObjectId(id, 'Court')
    const { date } = parseQuery(req.nextUrl.searchParams, slotsQuerySchema)
    await connectDB()
    const court = await Court.findOne({ _id: id, active: true }).lean<CourtLean>()
    if (!court) throw new HttpError(404, 'Court not found')

    // Fetch everything that could touch the day (venue midnight to next midnight).
    const dayStart = venueDateTime(date, '00:00')
    const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000)
    const busy = await findBlockingBookings(court._id, { startAt: dayStart, endAt: dayEnd })
    return Response.json(generateSlots(date, court.openHours, busy))
  },
)
