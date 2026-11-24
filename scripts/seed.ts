// Seed sample data: `npm run seed` (vpx ./scripts/seed.ts). Idempotent.
// Clears courts, bookings, voyage_clicks and fb_events, plus users whose email ends with
// SEED_DOMAIN (real sign-ups are left alone). Does not import anything 'server-only'.
import { existsSync } from 'node:fs'
import mongoose from 'mongoose'
import { Booking, Court, FbEvent, User, VoyageClick } from '../src/lib/db/schemas'
import { POINTS_PER_HOUR, tierForPoints } from '../src/lib/tiers'
import { venueDateKey, venueDateTime } from '../src/lib/time'

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) {
    process.loadEnvFile(file)
    break
  }
}

const SEED_DOMAIN = '@seed.dinkinpirates.test'
const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

// Small deterministic PRNG so reruns produce the same shape of data.
let state = 20260101
function rand(): number {
  state = (state * 1664525 + 1013904223) % 4294967296
  return state / 4294967296
}
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]

const COURTS = [
  { name: 'Skull Reef Court', surface: 'Acrylic hard court', indoor: false, pricePerHour: 450 },
  { name: 'Kraken Deck', surface: 'Cushioned', indoor: true, pricePerHour: 650 },
  { name: "Siren's Cove", surface: 'Acrylic hard court', indoor: true, pricePerHour: 600 },
  { name: 'Driftwood Alley', surface: 'Cushioned', indoor: false, pricePerHour: 500 },
]

const PLAYERS = ['Mara Quill', 'Jonas Reyes', 'Tessa Bellweather', 'Kai Navarro', 'Lia Santos']
const VOYAGE_TITLES = [
  'Sunrise Dinkers',
  'Beginner-friendly rally',
  'Lunch Break Doubles',
  'Evening Open Play',
  'Weekend Warriors',
]

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set (add it to .env.local).')
  await mongoose.connect(uri)

  await Promise.all([
    Court.deleteMany({}),
    Booking.deleteMany({}),
    VoyageClick.deleteMany({}),
    FbEvent.deleteMany({}),
    User.deleteMany({ email: { $regex: `${SEED_DOMAIN.replace('.', '\\.')}$` } }),
  ])

  const courts = await Court.insertMany(
    COURTS.map((c) => ({
      ...c,
      currency: 'PHP',
      openHours: { start: '06:00', end: '22:00' },
      photoUrls: [],
      active: true,
    })),
  )

  const owner = await User.create({
    name: 'Captain Seed',
    email: `owner${SEED_DOMAIN}`,
    role: 'owner',
  })
  const players = await User.insertMany(
    PLAYERS.map((name, i) => ({
      name,
      email: `player${i + 1}${SEED_DOMAIN}`,
      role: i === 0 ? 'organizer' : 'player',
    })),
  )
  // Real owner emails from env get the owner role too (created if missing).
  for (const email of (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)) {
    await User.updateOne(
      { email },
      { $set: { role: 'owner' }, $setOnInsert: { name: email.split('@')[0], email } },
      { upsert: true },
    )
  }
  const bookers = [owner, ...players]

  const now = new Date()
  const today = venueDateKey(now)
  const dateAt = (offset: number) => venueDateKey(new Date(now.getTime() + offset * DAY_MS))

  interface Row {
    courtId: unknown
    userId: unknown
    type: 'charter' | 'voyage'
    startAt: Date
    endAt: Date
    status: 'confirmed' | 'completed' | 'cancelled'
    paymentIntentId: null
    reclubUrl: string | null
    voyageVisibility: 'private' | 'public' | null
    voyageTitle: string | null
    externalId: string | null
    fbPostId: null
    createdAt: Date
    cancelledAt: Date | null
  }
  const rows: Row[] = []
  const points = new Map<string, number>()
  let voyageN = 0

  for (let offset = -14; offset <= 7; offset++) {
    const date = dateAt(offset)
    for (const court of courts) {
      const taken = new Set<number>()
      const count = 2 + Math.floor(rand() * 3)
      for (let i = 0; i < count; i++) {
        const hours = 1 + Math.floor(rand() * 2)
        // Weekday evenings and weekend mornings are busier.
        const startHour = pick([7, 8, 9, 10, 16, 17, 18, 18, 19, 19, 20])
        const span = Array.from({ length: hours }, (_, k) => startHour + k)
        if (startHour + hours > 22 || span.some((h) => taken.has(h))) continue
        span.forEach((h) => taken.add(h))

        const startAt = venueDateTime(date, `${String(startHour).padStart(2, '0')}:00`)
        const endAt = new Date(startAt.getTime() + hours * HOUR_MS)
        const past = endAt.getTime() <= now.getTime()
        const isVoyage = rand() < 0.5
        const user = pick(bookers)
        const cancelled = rand() < 0.08
        const isPublic = isVoyage && rand() < 0.7

        let status: Row['status'] = past ? 'completed' : 'confirmed'
        if (cancelled) status = 'cancelled'
        if (status === 'completed') {
          const key = String(user._id)
          points.set(key, (points.get(key) ?? 0) + POINTS_PER_HOUR * hours)
        }

        voyageN += isVoyage ? 1 : 0
        const link = isVoyage ? `https://reclub.co/m/dp-sample-${voyageN}` : null
        rows.push({
          courtId: court._id,
          userId: user._id,
          type: isVoyage ? 'voyage' : 'charter',
          startAt,
          endAt,
          status,
          paymentIntentId: null,
          reclubUrl: link,
          voyageVisibility: isVoyage ? (isPublic ? 'public' : 'private') : null,
          voyageTitle: isVoyage ? pick(VOYAGE_TITLES) : null,
          externalId: link ? `reclub.co/m/dp-sample-${voyageN}` : null,
          fbPostId: null,
          createdAt: new Date(startAt.getTime() - (1 + Math.floor(rand() * 5)) * DAY_MS),
          cancelledAt: cancelled ? new Date(startAt.getTime() - DAY_MS / 2) : null,
        })
      }
    }
  }

  // Guarantee a few live public voyages in the next days for the /voyages feed.
  const tomorrowCourt = courts[0]
  for (let i = 0; i < 4; i++) {
    const date = dateAt(1 + i)
    const startAt = venueDateTime(date, '21:00')
    const clash = rows.some(
      (r) =>
        String(r.courtId) === String(tomorrowCourt._id) &&
        r.status !== 'cancelled' &&
        r.startAt < new Date(startAt.getTime() + HOUR_MS) &&
        r.endAt > startAt,
    )
    if (clash) continue
    voyageN++
    rows.push({
      courtId: tomorrowCourt._id,
      userId: players[0]._id,
      type: 'voyage',
      startAt,
      endAt: new Date(startAt.getTime() + HOUR_MS),
      status: 'confirmed',
      paymentIntentId: null,
      reclubUrl: `https://reclub.co/m/dp-sample-${voyageN}`,
      voyageVisibility: 'public',
      voyageTitle: 'Night Tide Open Play',
      externalId: `reclub.co/m/dp-sample-${voyageN}`,
      fbPostId: null,
      createdAt: now,
      cancelledAt: null,
    })
  }

  const inserted = await Booking.collection.insertMany(rows as never[])

  // Clicks for non-cancelled voyages with a link.
  const sources = ['landing', 'landing', 'landing', 'messenger', 'messenger', 'fb', 'qr'] as const
  const clicks: object[] = []
  const ids = Object.values(inserted.insertedIds)
  rows.forEach((r, i) => {
    if (r.type !== 'voyage' || !r.reclubUrl || r.status === 'cancelled') return
    const n = r.voyageVisibility === 'public' ? 3 + Math.floor(rand() * 10) : Math.floor(rand() * 3)
    for (let k = 0; k < n; k++) {
      const at = new Date(
        Math.min(now.getTime(), r.createdAt.getTime() + rand() * 3 * DAY_MS) - rand() * HOUR_MS,
      )
      clicks.push({
        bookingId: ids[i],
        source: pick(sources),
        userAgent: 'seed-script',
        ipHash: `seed-${Math.floor(rand() * 1e6)}`,
        createdAt: at,
      })
    }
  })
  if (clicks.length) await VoyageClick.collection.insertMany(clicks as never[])

  for (const [id, pts] of points) {
    await User.updateOne({ _id: id }, { $set: { points: pts, tier: tierForPoints(pts) } })
  }

  const byStatus = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})
  console.log('Seed complete')
  console.log(`  courts:        ${courts.length}`)
  console.log(`  users:         ${bookers.length} (owner: owner${SEED_DOMAIN})`)
  console.log(`  bookings:      ${rows.length} ${JSON.stringify(byStatus)}`)
  console.log(
    `  public voyages upcoming: ${rows.filter((r) => r.voyageVisibility === 'public' && r.status === 'confirmed').length}`,
  )
  console.log(`  voyage_clicks: ${clicks.length}`)
  console.log(`  (today in venue time: ${today})`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
