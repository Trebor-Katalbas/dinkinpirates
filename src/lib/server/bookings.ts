import 'server-only'
import { Types } from 'mongoose'
import type { BookingStatus } from '@/types'
import { connectDB } from '@/lib/db/mongoose'
import { Booking, Court } from '@/lib/db/models'
import { parseReclubUrl } from '@/lib/reclub'
import { VOYAGE_EXPIRY_MS } from '@/lib/voyage'
import { HttpError, assertObjectId } from './http'
import { resolveBookingWindow, type TimeRange } from './slots'
import type { BookingLean, CourtLean } from './serializers'
import type { CreateBookingInput, PatchBookingInput } from './validation'
import type { SessionUser } from './session'

/** Statuses that occupy the court. */
const BLOCKING: BookingStatus[] = ['pending', 'confirmed', 'completed']

export async function findBlockingBookings(
  courtId: string | Types.ObjectId,
  range: TimeRange,
  excludeId?: string | Types.ObjectId,
): Promise<BookingLean[]> {
  return Booking.find({
    courtId,
    status: { $in: BLOCKING },
    startAt: { $lt: range.endAt },
    endAt: { $gt: range.startAt },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean<BookingLean[]>()
}

/** Is another live booking already using this Reclub event? */
async function assertReclubNotDuplicate(externalId: string, excludeId?: Types.ObjectId) {
  const dupe = await Booking.exists({
    externalId,
    status: { $in: ['pending', 'confirmed'] },
    endAt: { $gt: new Date(Date.now() - VOYAGE_EXPIRY_MS) },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  })
  if (dupe) throw new HttpError(409, 'That Reclub link is already attached to another booking')
}

function parseReclubOrThrow(input: string) {
  const parsed = parseReclubUrl(input)
  if (!parsed.ok) throw new HttpError(400, parsed.error)
  return parsed
}

async function loadActiveCourt(courtId: string): Promise<CourtLean> {
  const court = await Court.findOne({ _id: courtId, active: true }).lean<CourtLean>()
  if (!court) throw new HttpError(404, 'Court not found')
  return court
}

export async function createBooking(user: SessionUser, input: CreateBookingInput) {
  await connectDB()
  const court = await loadActiveCourt(input.courtId)
  const window = resolveBookingWindow(input, court.openHours)
  if (!window.ok) throw new HttpError(400, window.error)

  let reclubUrl: string | null = null
  let externalId: string | null = null
  let voyageVisibility: 'private' | 'public' | null = null
  let voyageTitle: string | null = null

  if (input.type === 'voyage') {
    voyageVisibility = input.voyageVisibility ?? 'private'
    voyageTitle = input.voyageTitle || null
    if (input.reclubUrl) {
      const parsed = parseReclubOrThrow(input.reclubUrl)
      reclubUrl = parsed.url
      externalId = parsed.externalId
      await assertReclubNotDuplicate(externalId)
    } else if (voyageVisibility === 'public') {
      throw new HttpError(400, 'A public voyage needs a Reclub link')
    }
  }
  // Charter: Reclub link, visibility and title stay null. A private booking is never public.

  const range = { startAt: window.startAt, endAt: window.endAt }
  if ((await findBlockingBookings(court._id, range)).length > 0) {
    throw new HttpError(409, 'That court is already booked for this time')
  }

  const doc = await Booking.create({
    courtId: court._id,
    userId: user.id,
    type: input.type,
    startAt: window.startAt,
    endAt: window.endAt,
    status: 'confirmed',
    paymentIntentId: null,
    reclubUrl,
    voyageVisibility,
    voyageTitle,
    externalId,
  })

  // Race guard: if a concurrent request slipped in first, the earlier insert wins.
  const rivals = await findBlockingBookings(court._id, range, doc._id)
  if (rivals.some((r) => String(r._id) < String(doc._id))) {
    await Booking.deleteOne({ _id: doc._id })
    throw new HttpError(409, 'That court is already booked for this time')
  }
  return doc.toObject() as unknown as BookingLean
}

/** Loads a booking the caller may access (owner of booking or role owner); else 404. */
export async function loadAccessibleBooking(id: string, user: SessionUser): Promise<BookingLean> {
  assertObjectId(id, 'Booking')
  await connectDB()
  const booking = await Booking.findById(id).lean<BookingLean>()
  if (!booking || (String(booking.userId) !== user.id && user.role !== 'owner')) {
    throw new HttpError(404, 'Booking not found')
  }
  return booking
}

export async function loadCourt(courtId: Types.ObjectId): Promise<CourtLean> {
  const court = await Court.findById(courtId).lean<CourtLean>()
  if (!court) throw new HttpError(404, 'Court not found')
  return court
}

function assertEditable(b: BookingLean) {
  if (b.status === 'cancelled') throw new HttpError(409, 'This booking was cancelled')
  if (b.status === 'completed') throw new HttpError(409, 'This booking is already completed')
}

function assertVoyage(b: BookingLean, what: string) {
  if (b.type !== 'voyage') {
    throw new HttpError(400, `${what} is only available for Open Voyage bookings`)
  }
}

export async function patchBooking(
  booking: BookingLean,
  input: PatchBookingInput,
): Promise<BookingLean> {
  const id = booking._id
  const update = async (set: Record<string, unknown>) => {
    const next = await Booking.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true },
    ).lean<BookingLean>()
    if (!next) throw new HttpError(404, 'Booking not found')
    return next
  }

  switch (input.action) {
    case 'cancel': {
      if (booking.status === 'cancelled') return booking // idempotent
      assertEditable(booking)
      // Status alone hides the voyage and stops /go redirects and FB DMs (see lib/voyage.ts).
      const next = await Booking.findOneAndUpdate(
        { _id: id, status: { $in: ['pending', 'confirmed'] } },
        { $set: { status: 'cancelled', cancelledAt: new Date() } },
        { new: true },
      ).lean<BookingLean>()
      if (!next) throw new HttpError(409, 'Booking can no longer be cancelled')
      return next
    }

    case 'reschedule': {
      assertEditable(booking)
      const court = await loadCourt(booking.courtId)
      const window = resolveBookingWindow(input, court.openHours)
      if (!window.ok) throw new HttpError(400, window.error)
      const range = { startAt: window.startAt, endAt: window.endAt }
      if ((await findBlockingBookings(court._id, range, id)).length > 0) {
        throw new HttpError(409, 'That court is already booked for this time')
      }
      return update(range)
    }

    case 'setReclub': {
      assertEditable(booking)
      assertVoyage(booking, 'A Reclub link')
      const parsed = parseReclubOrThrow(input.reclubUrl)
      await assertReclubNotDuplicate(parsed.externalId, id)
      return update({
        reclubUrl: parsed.url,
        externalId: parsed.externalId,
        voyageVisibility: booking.voyageVisibility ?? 'private',
      })
    }

    case 'removeReclub': {
      assertEditable(booking)
      assertVoyage(booking, 'Removing a Reclub link')
      // Without a link there is nothing to publish: drop back to private.
      return update({ reclubUrl: null, externalId: null, voyageVisibility: 'private' })
    }

    case 'setVisibility': {
      assertEditable(booking)
      assertVoyage(booking, 'Visibility')
      if (input.visibility === 'public' && !booking.reclubUrl) {
        throw new HttpError(400, 'Add a Reclub link before making this voyage public')
      }
      return update({ voyageVisibility: input.visibility })
    }

    case 'setTitle': {
      assertEditable(booking)
      assertVoyage(booking, 'A voyage title')
      return update({ voyageTitle: input.voyageTitle || null })
    }
  }
}
