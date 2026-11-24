// Browser-side mock database for NEXT_PUBLIC_API_MOCKING=enabled.
// Persists to localStorage so reloads and sign-in redirects keep state.

import { venueDateKey, venueDateTime } from '@/lib/time'
import { tierForPoints } from '@/lib/tiers'
import type {
  BookingDTO,
  ClickSource,
  CourtDTO,
  UserDTO,
  UserRole,
  VoyageVisibility,
} from '@/types'

export interface MockClick {
  bookingId: string
  source: ClickSource
  createdAt: string
}

export interface MockDB {
  version: number
  users: UserDTO[]
  courts: CourtDTO[]
  bookings: BookingDTO[]
  clicks: MockClick[]
  sessionUserId: string | null
}

const KEY = 'dp-mock-db'
const VERSION = 1

let db: MockDB | null = null

/** 24-hex id, shaped like a Mongo ObjectId so the UI's id handling is exercised. */
export function mockId(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Small deterministic PRNG so seed data looks the same each reset. */
function prng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COURTS: Omit<CourtDTO, 'id'>[] = [
  {
    name: 'Grand Line Court 1',
    surface: 'Acrylic hard court',
    indoor: false,
    pricePerHour: 450,
    currency: 'PHP',
    openHours: { start: '06:00', end: '22:00' },
    photoUrls: [],
    active: true,
  },
  {
    name: 'Grand Line Court 2',
    surface: 'Acrylic hard court',
    indoor: false,
    pricePerHour: 450,
    currency: 'PHP',
    openHours: { start: '06:00', end: '22:00' },
    photoUrls: [],
    active: true,
  },
  {
    name: 'Harbor Hall A',
    surface: 'Cushioned',
    indoor: true,
    pricePerHour: 650,
    currency: 'PHP',
    openHours: { start: '06:00', end: '22:00' },
    photoUrls: [],
    active: true,
  },
  {
    name: 'Harbor Hall B',
    surface: 'Cushioned',
    indoor: true,
    pricePerHour: 650,
    currency: 'PHP',
    openHours: { start: '06:00', end: '22:00' },
    photoUrls: [],
    active: true,
  },
]

const PLAYERS: { name: string; email: string; role: UserRole; points: number }[] = [
  { name: 'Mock Owner', email: 'owner@mock.test', role: 'owner', points: 820 },
  { name: 'Rina Santos', email: 'rina@mock.test', role: 'organizer', points: 1620 },
  { name: 'Marco Dela Cruz', email: 'marco@mock.test', role: 'organizer', points: 410 },
  { name: 'Jess Tan', email: 'jess@mock.test', role: 'player', points: 150 },
  { name: 'Paolo Reyes', email: 'paolo@mock.test', role: 'player', points: 60 },
  { name: 'Ana Lim', email: 'ana@mock.test', role: 'player', points: 20 },
]

const VOYAGE_TITLES = [
  'Sunrise dink session',
  '3.0–3.5 open play',
  'After-work rally',
  'Beginners welcome',
  'Weekend smash fest',
  null,
]

function seed(now = new Date()): MockDB {
  const rand = prng(20261123)
  const users: UserDTO[] = PLAYERS.map((p) => ({
    id: mockId(),
    name: p.name,
    email: p.email,
    avatar: null,
    role: p.role,
    points: p.points,
    tier: tierForPoints(p.points),
  }))
  const courts: CourtDTO[] = COURTS.map((c) => ({ ...c, id: mockId() }))
  const bookings: BookingDTO[] = []
  const clicks: MockClick[] = []
  const taken = new Set<string>()
  const today = venueDateKey(now)
  const dayMs = 86_400_000

  // ~180 days of history plus 10 days ahead, busier in the evenings and on weekends.
  for (let offset = -180; offset <= 10; offset++) {
    const date = venueDateKey(new Date(venueDateTime(today, '12:00').getTime() + offset * dayMs))
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    const weekend = weekday === 0 || weekday === 6
    const count = Math.round((weekend ? 7 : 4) * (0.6 + rand() * 0.8) * (offset > 0 ? 0.5 : 1))
    for (let i = 0; i < count; i++) {
      const court = courts[Math.floor(rand() * courts.length)]
      const peak = rand() < 0.7
      const hour = peak ? 17 + Math.floor(rand() * 4) : 6 + Math.floor(rand() * 10)
      const hours = rand() < 0.7 ? 1 : 2
      if (hour + hours > 22) continue
      const keys = Array.from({ length: hours }, (_, h) => `${court.id}|${date}|${hour + h}`)
      if (keys.some((k) => taken.has(k))) continue
      keys.forEach((k) => taken.add(k))

      const startAt = venueDateTime(date, `${String(hour).padStart(2, '0')}:00`)
      const endAt = new Date(startAt.getTime() + hours * 3_600_000)
      const voyage = rand() < 0.4
      const user = users[1 + Math.floor(rand() * (users.length - 1))]
      const past = endAt.getTime() < now.getTime()
      const cancelled = rand() < 0.05
      const visibility: VoyageVisibility | null = voyage
        ? rand() < 0.8
          ? 'public'
          : 'private'
        : null
      const id = mockId()
      const slug = id.slice(-8)
      bookings.push({
        id,
        courtId: court.id,
        userId: user.id,
        type: voyage ? 'voyage' : 'charter',
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        status: cancelled ? 'cancelled' : past ? 'completed' : 'confirmed',
        paymentIntentId: null,
        reclubUrl: voyage ? `https://reclub.co/m/mock-${slug}` : null,
        voyageVisibility: visibility,
        voyageTitle: voyage ? VOYAGE_TITLES[Math.floor(rand() * VOYAGE_TITLES.length)] : null,
        externalId: voyage ? `reclub.co/m/mock-${slug}` : null,
        createdAt: new Date(startAt.getTime() - 3 * dayMs).toISOString(),
        cancelledAt: cancelled ? new Date(startAt.getTime() - dayMs).toISOString() : null,
      })
      if (voyage && visibility === 'public' && !cancelled) {
        const n = Math.floor(rand() * 14)
        for (let c = 0; c < n; c++) {
          const r = rand()
          const source: ClickSource =
            r < 0.4 ? 'fb' : r < 0.7 ? 'messenger' : r < 0.9 ? 'landing' : 'qr'
          clicks.push({
            bookingId: id,
            source,
            createdAt: new Date(startAt.getTime() - rand() * 2 * dayMs).toISOString(),
          })
        }
      }
    }
  }

  // The mock owner hosts one upcoming public voyage and one charter so My Bookings has content.
  const owner = users[0]
  const mine = [
    { offset: 1, hour: 18, type: 'voyage' as const },
    { offset: 3, hour: 7, type: 'charter' as const },
  ]
  for (const m of mine) {
    const date = venueDateKey(new Date(venueDateTime(today, '12:00').getTime() + m.offset * dayMs))
    const court = courts[2]
    if (taken.has(`${court.id}|${date}|${m.hour}`)) continue
    taken.add(`${court.id}|${date}|${m.hour}`)
    const startAt = venueDateTime(date, `${m.hour}:00`)
    const id = mockId()
    bookings.push({
      id,
      courtId: court.id,
      userId: owner.id,
      type: m.type,
      startAt: startAt.toISOString(),
      endAt: new Date(startAt.getTime() + 3_600_000).toISOString(),
      status: 'confirmed',
      paymentIntentId: null,
      reclubUrl: m.type === 'voyage' ? `https://reclub.co/m/mock-${id.slice(-8)}` : null,
      voyageVisibility: m.type === 'voyage' ? 'public' : null,
      voyageTitle: m.type === 'voyage' ? 'Owner’s open play' : null,
      externalId: m.type === 'voyage' ? `reclub.co/m/mock-${id.slice(-8)}` : null,
      createdAt: now.toISOString(),
      cancelledAt: null,
    })
  }

  return { version: VERSION, users, courts, bookings, clicks, sessionUserId: null }
}

function load(): MockDB {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDB
      if (parsed.version === VERSION) return parsed
    }
  } catch {
    // fall through to a fresh seed
  }
  return seed()
}

export function getDB(): MockDB {
  db ??= load()
  return db
}

export function saveDB(): void {
  if (!db) return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // storage unavailable (private mode) — keep state in memory only
  }
}

export function resetDB(): void {
  db = seed()
  saveDB()
}
