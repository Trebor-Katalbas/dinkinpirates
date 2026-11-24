// Shared domain types (DTOs) — the JSON shapes that cross the API boundary.

export type UserRole = 'player' | 'organizer' | 'owner'
export type Tier = 'deckhand' | 'buccaneer' | 'firstMate' | 'captain' | 'legend'
export type BookingType = 'charter' | 'voyage'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type VoyageVisibility = 'private' | 'public'
export type ClickSource = 'landing' | 'messenger' | 'fb' | 'qr'

export interface CourtDTO {
  id: string
  name: string
  surface: string
  indoor: boolean
  pricePerHour: number
  currency: string
  openHours: { start: string; end: string } // "07:00" / "22:00" (venue-local time)
  photoUrls: string[]
  active: boolean
}

export interface BookingDTO {
  id: string
  courtId: string
  userId: string
  type: BookingType
  startAt: string // ISO
  endAt: string // ISO
  status: BookingStatus
  paymentIntentId: string | null
  reclubUrl: string | null
  voyageVisibility: VoyageVisibility | null
  voyageTitle: string | null
  externalId: string | null
  createdAt: string
  cancelledAt: string | null
}

/** Public voyage card — only data we own. Never slot counts / roster info. */
export interface PublicVoyageDTO {
  id: string
  title: string | null
  startAt: string
  endAt: string
  court: Pick<CourtDTO, 'id' | 'name' | 'surface' | 'indoor'>
  organizerName: string
  goUrl: string // /go/{id}?src=landing
}

export interface SlotDTO {
  startAt: string
  endAt: string
  available: boolean
}

export interface UserDTO {
  id: string
  name: string
  email: string
  avatar: string | null
  role: UserRole
  points: number
  tier: Tier
}

export type DayStatus = 'open' | 'limited' | 'full' | 'closed'

/** Per-day court availability for a given session length (our booking data only). */
export interface DayAvailabilityDTO {
  date: string // YYYY-MM-DD (venue-local)
  /** Start times today/that day where at least one court is free for the whole session. */
  openStarts: number
  /** Start times that haven't passed yet, across all courts. */
  totalStarts: number
  status: DayStatus
}
