import type { NextRequest } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import { Booking } from '@/lib/db/models'
import { logVoyageClick } from '@/lib/server/clicks'
import { HttpError, clientIp, parseBody, withErrors } from '@/lib/server/http'
import { voyageClickBodySchema } from '@/lib/server/validation'

export const POST = withErrors(async (req: NextRequest) => {
  const { bookingId, source } = await parseBody(req, voyageClickBodySchema)
  await connectDB()
  // Only count clicks for bookings that exist (cheap guard against junk ids).
  if (!(await Booking.exists({ _id: bookingId, type: 'voyage' }))) {
    throw new HttpError(404, 'Voyage not found')
  }
  const ok = await logVoyageClick({
    bookingId,
    source,
    userAgent: req.headers.get('user-agent'),
    ip: clientIp(req.headers),
  })
  if (!ok) throw new HttpError(500, 'Could not record click')
  return Response.json({ ok: true }, { status: 201 })
})
