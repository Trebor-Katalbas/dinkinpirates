import 'server-only'
import type { Types } from 'mongoose'
import type {
  BookingDTO,
  BookingStatus,
  BookingType,
  CourtDTO,
  PublicVoyageDTO,
  Tier,
  UserDTO,
  UserRole,
  VoyageVisibility,
} from '@/types'
import { goPath } from '@/lib/voyage'
import { tierForPoints } from '@/lib/tiers'

// Lean (plain object) shapes as returned by .lean<T>().
export interface CourtLean {
  _id: Types.ObjectId
  name: string
  surface: string
  indoor: boolean
  pricePerHour: number
  currency: string
  openHours: { start: string; end: string }
  photoUrls: string[]
  active: boolean
}

export interface BookingLean {
  _id: Types.ObjectId
  courtId: Types.ObjectId
  userId: Types.ObjectId
  type: BookingType
  startAt: Date
  endAt: Date
  status: BookingStatus
  paymentIntentId: string | null
  reclubUrl: string | null
  voyageVisibility: VoyageVisibility | null
  voyageTitle: string | null
  externalId: string | null
  fbPostId?: string | null
  createdAt: Date
  cancelledAt: Date | null
}

export interface UserLean {
  _id: Types.ObjectId
  name: string
  email: string
  avatar: string | null
  role: UserRole
  points: number
  tier: Tier
}

export function toCourtDTO(c: CourtLean): CourtDTO {
  return {
    id: String(c._id),
    name: c.name,
    surface: c.surface,
    indoor: c.indoor,
    pricePerHour: c.pricePerHour,
    currency: c.currency,
    openHours: { start: c.openHours.start, end: c.openHours.end },
    photoUrls: c.photoUrls ?? [],
    active: c.active,
  }
}

/** Explicit allow-list of fields (no fbPostId etc. leaking). */
export function toBookingDTO(b: BookingLean): BookingDTO {
  return {
    id: String(b._id),
    courtId: String(b.courtId),
    userId: String(b.userId),
    type: b.type,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    status: b.status,
    paymentIntentId: b.paymentIntentId ?? null,
    reclubUrl: b.reclubUrl ?? null,
    voyageVisibility: b.voyageVisibility ?? null,
    voyageTitle: b.voyageTitle ?? null,
    externalId: b.externalId ?? null,
    createdAt: b.createdAt.toISOString(),
    cancelledAt: b.cancelledAt ? b.cancelledAt.toISOString() : null,
  }
}

export type BookingWithCourtDTO = BookingDTO & { court: CourtDTO }

/** `court` may be missing if a court was deleted; callers should skip those rows. */
export function toBookingWithCourt(b: BookingLean, court: CourtLean): BookingWithCourtDTO {
  return { ...toBookingDTO(b), court: toCourtDTO(court) }
}

/** Public card: only data we own. Never the Reclub URL, never slot/roster info. */
export function toPublicVoyageDTO(
  b: BookingLean,
  court: CourtLean,
  organizerName: string,
): PublicVoyageDTO {
  return {
    id: String(b._id),
    title: b.voyageTitle ?? null,
    startAt: b.startAt.toISOString(),
    endAt: b.endAt.toISOString(),
    court: {
      id: String(court._id),
      name: court.name,
      surface: court.surface,
      indoor: court.indoor,
    },
    organizerName,
    goUrl: goPath(String(b._id), 'landing'),
  }
}

export function toUserDTO(u: UserLean): UserDTO {
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    avatar: u.avatar ?? null,
    role: u.role,
    points: u.points,
    tier: tierForPoints(u.points),
  }
}
