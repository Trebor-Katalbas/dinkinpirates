import type { BookingStatus, BookingType, ClickSource, VoyageVisibility } from '@/types'

/** Public Reclub links auto-expire this long after the court booking ends. */
export const VOYAGE_EXPIRY_MS = 60 * 60 * 1000

export interface VoyageLike {
  type: BookingType
  status: BookingStatus
  reclubUrl: string | null
  voyageVisibility: VoyageVisibility | null
  endAt: Date | string
}

/** Single source of truth for "may this booking's Reclub link be listed publicly?" */
export function isPublicVoyageLive(b: VoyageLike, now: Date = new Date()): boolean {
  if (b.type !== 'voyage') return false // Private Charter: never public, ever.
  if (b.voyageVisibility !== 'public') return false
  if (!b.reclubUrl) return false
  if (b.status !== 'confirmed') return false
  return new Date(b.endAt).getTime() + VOYAGE_EXPIRY_MS > now.getTime()
}

/** Whether /go/{id} may redirect (any voyage with a live link, public or shared privately). */
export function isRedirectable(b: VoyageLike, now: Date = new Date()): boolean {
  if (b.type !== 'voyage' || !b.reclubUrl) return false
  if (b.status !== 'confirmed') return false
  return new Date(b.endAt).getTime() + VOYAGE_EXPIRY_MS > now.getTime()
}

export const CLICK_SOURCES: readonly ClickSource[] = ['landing', 'messenger', 'fb', 'qr']

export function parseClickSource(v: string | null | undefined): ClickSource {
  return (CLICK_SOURCES as readonly string[]).includes(v ?? '') ? (v as ClickSource) : 'landing'
}

/** Every generated link carries ?src= for attribution. */
export function goPath(bookingId: string, src: ClickSource): string {
  return `/go/${encodeURIComponent(bookingId)}?src=${src}`
}

export function goUrl(
  bookingId: string,
  src: ClickSource,
  base: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): string {
  const origin = (base ?? 'https://dinkinpirates.com').replace(/\/+$/, '')
  return `${origin}${goPath(bookingId, src)}`
}
