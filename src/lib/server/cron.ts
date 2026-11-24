import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import { connectDB } from '@/lib/db/mongoose'
import { Booking, User } from '@/lib/db/models'
import { POINTS_PER_HOUR, tierForPoints } from '@/lib/tiers'
import { HttpError } from './http'
import type { BookingLean } from './serializers'

const digest = (s: string) => createHash('sha256').update(s).digest()

/** Guards cron endpoints with `Authorization: Bearer ${CRON_SECRET}`. */
export function assertCronAuth(req: Request): void {
  const secret = process.env.CRON_SECRET
  if (!secret) throw new HttpError(503, 'CRON_SECRET is not configured')
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!timingSafeEqual(digest(token), digest(secret))) throw new HttpError(401, 'Unauthorized')
}

export function bookingHours(b: { startAt: Date; endAt: Date }): number {
  return Math.max(1, Math.round((b.endAt.getTime() - b.startAt.getTime()) / 3_600_000))
}

/**
 * Marks confirmed bookings whose end has passed as completed and awards Bounty.
 * Idempotent: the status flip is an atomic compare-and-set, so points are awarded only by the
 * caller that wins the transition (a crash between the two writes loses at most one award).
 */
export async function completeFinishedBookings(now: Date = new Date()) {
  await connectDB()
  const due = await Booking.find({ status: 'confirmed', endAt: { $lte: now } }, { _id: 1 }).lean<
    { _id: unknown }[]
  >()
  let completed = 0
  let pointsAwarded = 0
  for (const { _id } of due) {
    const b = await Booking.findOneAndUpdate(
      { _id, status: 'confirmed', endAt: { $lte: now } },
      { $set: { status: 'completed' } },
      { new: true },
    ).lean<BookingLean>()
    if (!b) continue // someone else (or a cancel) got there first
    completed += 1
    const points = POINTS_PER_HOUR * bookingHours(b)
    const user = await User.findByIdAndUpdate(b.userId, { $inc: { points } }, { new: true }).lean<{
      _id: unknown
      points: number
    }>()
    if (!user) continue
    pointsAwarded += points
    await User.updateOne({ _id: user._id }, { $set: { tier: tierForPoints(user.points) } })
  }
  return { completed, pointsAwarded }
}

/**
 * Messenger reminder stub. Users have no stored PSID (Messenger identity only appears when
 * someone comments LINK), so nothing can honestly be sent yet: we log what would be sent.
 */
export async function sweepReminders(now: Date = new Date()) {
  await connectDB()
  const upcoming = await Booking.find(
    {
      type: 'voyage',
      status: 'confirmed',
      startAt: { $gt: now, $lte: new Date(now.getTime() + 24 * 3_600_000) },
    },
    { _id: 1, startAt: 1, userId: 1 },
  ).lean<Pick<BookingLean, '_id' | 'startAt' | 'userId'>[]>()
  for (const b of upcoming) {
    console.info(
      `[cron/reminders] would remind user ${String(b.userId)} about voyage ${String(b._id)} at ${b.startAt.toISOString()} (no PSID on file, not sent)`,
    )
  }
  return {
    considered: upcoming.length,
    sent: 0,
    skipped: upcoming.length,
    note: 'Messenger reminders are not live: no PSID is stored for users, so nothing was sent.',
  }
}
