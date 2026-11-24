import { connection } from 'next/server'
import { connectDB } from '@/lib/db/mongoose'
import { Booking, Court, User } from '@/lib/db/models'
import { withErrors } from '@/lib/server/http'
import {
  toPublicVoyageDTO,
  type BookingLean,
  type CourtLean,
  type UserLean,
} from '@/lib/server/serializers'
import { MAX_BOOKING_HOURS } from '@/lib/server/slots'
import { VOYAGE_EXPIRY_MS, isPublicVoyageLive } from '@/lib/voyage'

export const GET = withErrors(async () => {
  await connection()
  await connectDB()
  const now = new Date()
  // Anything still live started no earlier than (max length + expiry window) ago.
  const earliestStart = new Date(now.getTime() - VOYAGE_EXPIRY_MS - MAX_BOOKING_HOURS * 3_600_000)
  const candidates = await Booking.find({
    type: 'voyage',
    voyageVisibility: 'public',
    startAt: { $gte: earliestStart },
    status: 'confirmed',
  })
    .sort({ startAt: 1 })
    .limit(100)
    .lean<BookingLean[]>()
  const live = candidates.filter((b) => isPublicVoyageLive(b, now))

  const [courts, users] = await Promise.all([
    Court.find({ _id: { $in: [...new Set(live.map((b) => String(b.courtId)))] } }).lean<
      CourtLean[]
    >(),
    User.find({ _id: { $in: [...new Set(live.map((b) => String(b.userId)))] } }, { name: 1 }).lean<
      Pick<UserLean, '_id' | 'name'>[]
    >(),
  ])
  const courtById = new Map(courts.map((c) => [String(c._id), c]))
  const nameById = new Map(users.map((u) => [String(u._id), u.name]))

  const rows = live.flatMap((b) => {
    const court = courtById.get(String(b.courtId))
    return court ? [toPublicVoyageDTO(b, court, nameById.get(String(b.userId)) ?? 'A pirate')] : []
  })
  return Response.json(rows)
})
