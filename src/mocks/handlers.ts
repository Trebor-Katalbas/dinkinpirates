// MSW handlers that stand in for /api/* while NEXT_PUBLIC_API_MOCKING=enabled.
// They mirror the real route handlers' rules and status codes, reusing the same
// pure validation, slot and Reclub logic.

import { http, HttpResponse } from 'msw'
import { summarizeDay } from '@/lib/availability'
import { parseReclubUrl } from '@/lib/reclub'
import {
  generateSlots,
  overlapsAny,
  resolveBookingWindow,
  type TimeRange,
} from '@/lib/server/slots'
import {
  availabilityQuerySchema,
  createBookingSchema,
  formatZodError,
  metricQuerySchema,
  patchBookingSchema,
  slotsQuerySchema,
} from '@/lib/server/validation'
import {
  addDays,
  fillRevenue,
  fillSources,
  fillTiers,
  fillWeekly,
  mondayOf,
  rangeDays,
} from '@/lib/server/metrics-fill'
import { VENUE_TZ, venueDateKey } from '@/lib/time'
import { tierForPoints } from '@/lib/tiers'
import { goPath, isPublicVoyageLive, parseClickSource } from '@/lib/voyage'
import type { BookingDTO, CourtDTO, PublicVoyageDTO, UserDTO } from '@/types'
import type { OccupancyRow } from '@/types/metrics'
import { getDB, mockId, saveDB } from './store'

const fail = (status: number, error: string) => HttpResponse.json({ error }, { status })

function currentUser(): UserDTO | null {
  const db = getDB()
  return db.users.find((u) => u.id === db.sessionUserId) ?? null
}

function courtOf(b: BookingDTO): CourtDTO {
  const court = getDB().courts.find((c) => c.id === b.courtId)
  if (!court) throw new Error(`Mock court ${b.courtId} missing`)
  return court
}

const withCourt = (b: BookingDTO) => ({ ...b, court: courtOf(b) })

function busyRanges(courtId: string, exceptId?: string): TimeRange[] {
  return getDB()
    .bookings.filter((b) => b.courtId === courtId && b.status !== 'cancelled' && b.id !== exceptId)
    .map((b) => ({ startAt: new Date(b.startAt), endAt: new Date(b.endAt) }))
}

/** Same visibility rule as the real API: the owner of the booking, or an owner-role user. */
function findAccessible(id: string): BookingDTO | null {
  const user = currentUser()
  const b = getDB().bookings.find((x) => x.id === id)
  if (!user || !b) return null
  return b.userId === user.id || user.role === 'owner' ? b : null
}

/** A Reclub link may only be attached to one live booking at a time. */
function duplicateLink(externalId: string, exceptId?: string): boolean {
  const now = Date.now()
  return getDB().bookings.some(
    (b) =>
      b.id !== exceptId &&
      b.externalId === externalId &&
      b.status !== 'cancelled' &&
      new Date(b.endAt).getTime() > now,
  )
}

const venueHour = new Intl.DateTimeFormat('en-US', {
  timeZone: VENUE_TZ,
  hour: 'numeric',
  hourCycle: 'h23',
})

function sessionPayload(user: UserDTO | null) {
  if (!user) return null
  return {
    user: { id: user.id, name: user.name, email: user.email, image: null, role: user.role },
    expires: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  }
}

/** Mock sign-in: any email works and gets the owner role so every page can be explored. */
function signInAs(email: string, name: string): UserDTO {
  const db = getDB()
  const lower = email.toLowerCase()
  let user = db.users.find((u) => u.email === lower)
  if (!user) {
    user = {
      id: mockId(),
      name,
      email: lower,
      avatar: null,
      role: 'owner',
      points: 0,
      tier: 'deckhand',
    }
    db.users.push(user)
  }
  db.sessionUserId = user.id
  saveDB()
  return user
}

export const handlers = [
  // ---------- NextAuth client endpoints ----------
  http.get('/api/auth/session', () => HttpResponse.json(sessionPayload(currentUser()))),
  http.get('/api/auth/csrf', () => HttpResponse.json({ csrfToken: 'mock-csrf' })),
  http.get('/api/auth/providers', () =>
    HttpResponse.json({
      dev: {
        id: 'dev',
        name: 'Dev login',
        type: 'credentials',
        signinUrl: '/api/auth/signin/dev',
        callbackUrl: '/api/auth/callback/dev',
      },
      google: {
        id: 'google',
        name: 'Google',
        type: 'oidc',
        signinUrl: '/api/auth/signin/google',
        callbackUrl: '/api/auth/callback/google',
      },
    }),
  ),
  http.post('/api/auth/callback/dev', async ({ request }) => {
    const form = new URLSearchParams(await request.text())
    const email = form.get('email')?.trim() || 'owner@mock.test'
    signInAs(email, form.get('name')?.trim() || email.split('@')[0])
    return HttpResponse.json({ url: form.get('callbackUrl') || '/' })
  }),
  http.post('/api/auth/signin/google', async ({ request }) => {
    const form = new URLSearchParams(await request.text())
    signInAs('google.user@mock.test', 'Google Mock User')
    return HttpResponse.json({ url: form.get('callbackUrl') || '/' })
  }),
  http.post('/api/auth/signout', async ({ request }) => {
    const form = new URLSearchParams(await request.text())
    getDB().sessionUserId = null
    saveDB()
    return HttpResponse.json({ url: form.get('callbackUrl') || '/' })
  }),
  http.post('/api/auth/_log', () => new HttpResponse(null, { status: 204 })),

  // ---------- app API ----------
  http.get('/api/me', () => {
    const user = currentUser()
    if (!user) return fail(401, 'Sign in required')
    return HttpResponse.json({ ...user, tier: tierForPoints(user.points) })
  }),

  http.get('/api/courts', () =>
    HttpResponse.json(
      getDB()
        .courts.filter((c) => c.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    ),
  ),

  http.get('/api/courts/:id/slots', ({ request, params }) => {
    const court = getDB().courts.find((c) => c.id === params.id)
    if (!court) return fail(404, 'Court not found')
    const q = slotsQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!q.success) return fail(400, formatZodError(q.error))
    return HttpResponse.json(generateSlots(q.data.date, court.openHours, busyRanges(court.id)))
  }),

  http.get('/api/availability', ({ request }) => {
    const q = availabilityQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    if (!q.success) return fail(400, formatZodError(q.error))
    const { from, days, hours } = q.data
    const courts = getDB().courts.filter((c) => c.active)
    const now = new Date()
    return HttpResponse.json(
      Array.from({ length: days }, (_, i) => {
        const date = addDays(from, i)
        const perCourt = courts.map((c) => generateSlots(date, c.openHours, busyRanges(c.id), now))
        return summarizeDay(date, perCourt, hours, now)
      }),
    )
  }),

  http.get('/api/bookings', () => {
    const user = currentUser()
    if (!user) return fail(401, 'Sign in required')
    const mine = getDB()
      .bookings.filter((b) => b.userId === user.id)
      .sort((a, b) => b.startAt.localeCompare(a.startAt))
    return HttpResponse.json(mine.map(withCourt))
  }),

  http.post('/api/bookings', async ({ request }) => {
    const user = currentUser()
    if (!user) return fail(401, 'Sign in required')
    const parsed = createBookingSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return fail(400, formatZodError(parsed.error))
    const input = parsed.data
    const db = getDB()
    const court = db.courts.find((c) => c.id === input.courtId && c.active)
    if (!court) return fail(404, 'Court not found')
    const window = resolveBookingWindow(input, court.openHours)
    if (!window.ok) return fail(400, window.error)
    if (overlapsAny(window, busyRanges(court.id))) {
      return fail(409, 'That court is already booked for this time')
    }

    let reclubUrl: string | null = null
    let externalId: string | null = null
    let visibility: BookingDTO['voyageVisibility'] = null
    let title: string | null = null
    if (input.type === 'voyage') {
      if (input.reclubUrl) {
        const r = parseReclubUrl(input.reclubUrl)
        if (!r.ok) return fail(400, r.error)
        if (duplicateLink(r.externalId)) {
          return fail(409, 'That Reclub link is already attached to another booking')
        }
        reclubUrl = r.url
        externalId = r.externalId
      }
      visibility = input.voyageVisibility ?? 'private'
      if (visibility === 'public' && !reclubUrl) {
        return fail(400, 'Add a Reclub link before publishing a voyage')
      }
      title = input.voyageTitle || null
    }

    const booking: BookingDTO = {
      id: mockId(),
      courtId: court.id,
      userId: user.id,
      type: input.type,
      startAt: window.startAt.toISOString(),
      endAt: window.endAt.toISOString(),
      status: 'confirmed',
      paymentIntentId: null,
      reclubUrl,
      voyageVisibility: visibility,
      voyageTitle: title,
      externalId,
      createdAt: new Date().toISOString(),
      cancelledAt: null,
    }
    db.bookings.push(booking)
    saveDB()
    return HttpResponse.json(booking, { status: 201 })
  }),

  http.get('/api/bookings/:id', ({ params }) => {
    if (!currentUser()) return fail(401, 'Sign in required')
    const b = findAccessible(String(params.id))
    return b ? HttpResponse.json(withCourt(b)) : fail(404, 'Booking not found')
  }),

  http.patch('/api/bookings/:id', async ({ request, params }) => {
    if (!currentUser()) return fail(401, 'Sign in required')
    const b = findAccessible(String(params.id))
    if (!b) return fail(404, 'Booking not found')
    const parsed = patchBookingSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return fail(400, formatZodError(parsed.error))
    const body = parsed.data

    if (body.action === 'cancel') {
      if (b.status === 'completed') return fail(409, 'Completed bookings cannot be changed')
      if (b.status !== 'cancelled') {
        b.status = 'cancelled'
        b.cancelledAt = new Date().toISOString()
        saveDB()
      }
      return HttpResponse.json(withCourt(b))
    }
    if (b.status === 'cancelled' || b.status === 'completed') {
      return fail(409, `This booking is ${b.status} and can no longer be changed`)
    }
    if (body.action !== 'reschedule' && b.type === 'charter') {
      return fail(400, 'Private Charters cannot carry a Reclub link')
    }

    switch (body.action) {
      case 'reschedule': {
        const court = courtOf(b)
        const window = resolveBookingWindow(body, court.openHours)
        if (!window.ok) return fail(400, window.error)
        if (overlapsAny(window, busyRanges(court.id, b.id))) {
          return fail(409, 'That court is already booked for this time')
        }
        b.startAt = window.startAt.toISOString()
        b.endAt = window.endAt.toISOString()
        break
      }
      case 'setReclub': {
        const r = parseReclubUrl(body.reclubUrl)
        if (!r.ok) return fail(400, r.error)
        if (duplicateLink(r.externalId, b.id)) {
          return fail(409, 'That Reclub link is already attached to another booking')
        }
        b.reclubUrl = r.url
        b.externalId = r.externalId
        b.voyageVisibility ??= 'private'
        break
      }
      case 'removeReclub':
        b.reclubUrl = null
        b.externalId = null
        b.voyageVisibility = 'private'
        break
      case 'setVisibility':
        if (body.visibility === 'public' && !b.reclubUrl) {
          return fail(400, 'Add a Reclub link before publishing a voyage')
        }
        b.voyageVisibility = body.visibility
        break
      case 'setTitle':
        b.voyageTitle = body.voyageTitle || null
        break
    }
    saveDB()
    return HttpResponse.json(withCourt(b))
  }),

  http.get('/api/voyages', () => {
    const db = getDB()
    const live: PublicVoyageDTO[] = db.bookings
      .filter((b) => isPublicVoyageLive(b))
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .map((b) => {
        const court = courtOf(b)
        return {
          id: b.id,
          title: b.voyageTitle,
          startAt: b.startAt,
          endAt: b.endAt,
          court: { id: court.id, name: court.name, surface: court.surface, indoor: court.indoor },
          organizerName: db.users.find((u) => u.id === b.userId)?.name ?? 'Organizer',
          goUrl: goPath(b.id, 'landing'),
        }
      })
    return HttpResponse.json(live)
  }),

  http.post('/api/voyages/:id/fb-post', () =>
    fail(501, 'Facebook is not configured in mock mode. Use Copy link to share instead.'),
  ),

  http.post('/api/voyage-clicks', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      bookingId?: string
      source?: string
    } | null
    const db = getDB()
    if (
      !body?.bookingId ||
      !db.bookings.some((b) => b.id === body.bookingId && b.type === 'voyage')
    ) {
      return fail(404, 'Voyage not found')
    }
    db.clicks.push({
      bookingId: body.bookingId,
      source: parseClickSource(body.source),
      createdAt: new Date().toISOString(),
    })
    saveDB()
    return HttpResponse.json({ ok: true }, { status: 201 })
  }),

  http.get('/api/admin/metrics', ({ request }) => {
    const user = currentUser()
    if (!user) return fail(401, 'Sign in required')
    if (user.role !== 'owner') return fail(403, 'Owners only')
    const q = metricQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!q.success) return fail(400, formatZodError(q.error))

    const db = getDB()
    const now = new Date()
    const to = venueDateKey(now)
    const from = addDays(to, -(rangeDays(q.data.range) - 1))
    const inRange = (iso: string) => {
      const k = venueDateKey(iso)
      return k >= from && k <= to
    }
    const active = db.bookings.filter((b) => b.status !== 'cancelled')

    switch (q.data.metric) {
      case 'bookings-weekly': {
        const rows = active
          .filter((b) => inRange(b.startAt))
          .map((b) => ({ week: mondayOf(venueDateKey(b.startAt)), type: b.type, n: 1 }))
        return HttpResponse.json(fillWeekly(rows, from, to))
      }
      case 'occupancy': {
        const cells = new Map<string, OccupancyRow>()
        for (const b of active.filter((x) => inRange(x.startAt))) {
          for (
            let t = new Date(b.startAt).getTime();
            t < new Date(b.endAt).getTime();
            t += 3_600_000
          ) {
            const at = new Date(t)
            const day = (new Date(`${venueDateKey(at)}T12:00:00Z`).getUTCDay() + 6) % 7
            const hour = Number(venueHour.format(at))
            const key = `${day}-${hour}`
            const cell = cells.get(key) ?? { day, hour, bookings: 0 }
            cell.bookings += 1
            cells.set(key, cell)
          }
        }
        return HttpResponse.json([...cells.values()])
      }
      case 'clicks-by-source': {
        const counts = new Map<string, number>()
        for (const c of db.clicks.filter((x) => inRange(x.createdAt))) {
          counts.set(c.source, (counts.get(c.source) ?? 0) + 1)
        }
        return HttpResponse.json(
          fillSources(
            [...counts].map(([source, clicks]) => ({
              source: parseClickSource(source),
              clicks,
            })),
          ),
        )
      }
      case 'tiers': {
        const counts = new Map<string, number>()
        for (const u of db.users) counts.set(u.tier, (counts.get(u.tier) ?? 0) + 1)
        return HttpResponse.json(
          fillTiers(db.users.map((u) => ({ tier: u.tier, count: counts.get(u.tier) ?? 0 }))),
        )
      }
      case 'revenue': {
        const byDate = new Map<string, number>()
        for (const b of active) {
          if (b.status === 'pending' || new Date(b.startAt) > now || !inRange(b.startAt)) continue
          const hours = (new Date(b.endAt).getTime() - new Date(b.startAt).getTime()) / 3_600_000
          const key = venueDateKey(b.startAt)
          byDate.set(key, (byDate.get(key) ?? 0) + hours * courtOf(b).pricePerHour)
        }
        return HttpResponse.json(
          fillRevenue(
            [...byDate].map(([date, revenue]) => ({ date, revenue })),
            from,
            to,
          ),
        )
      }
    }
  }),
]
