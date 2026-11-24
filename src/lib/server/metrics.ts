import 'server-only'
import type { ClickSource, Tier } from '@/types'
import type {
  BookingsWeeklyRow,
  ClicksBySourceRow,
  MetricName,
  MetricRange,
  OccupancyRow,
  RevenueRow,
  TierRow,
} from '@/types/metrics'
import { connectDB } from '@/lib/db/mongoose'
import { Booking, Court, User, VoyageClick } from '@/lib/db/models'
import { VENUE_TZ, venueDateKey } from '@/lib/time'
import { fillRevenue, fillSources, fillTiers, fillWeekly, rangeDays } from './metrics-fill'

export type {
  BookingsWeeklyRow,
  ClicksBySourceRow,
  MetricName,
  MetricRange,
  OccupancyRow,
  RevenueRow,
  TierRow,
}

const COUNTED = ['confirmed', 'completed']
const DAY_MS = 86_400_000

function since(range: MetricRange, now: Date): Date {
  return new Date(now.getTime() - rangeDays(range) * DAY_MS)
}

export async function bookingsWeekly(range: MetricRange): Promise<BookingsWeeklyRow[]> {
  await connectDB()
  const now = new Date()
  const from = since(range, now)
  const rows = await Booking.aggregate<{
    _id: { week: string; type: 'charter' | 'voyage' }
    n: number
  }>([
    { $match: { status: { $ne: 'cancelled' }, startAt: { $gte: from } } },
    {
      $group: {
        _id: {
          week: {
            $dateToString: {
              format: '%Y-%m-%d',
              timezone: VENUE_TZ,
              date: {
                $dateTrunc: {
                  date: '$startAt',
                  unit: 'week',
                  startOfWeek: 'monday',
                  timezone: VENUE_TZ,
                },
              },
            },
          },
          type: '$type',
        },
        n: { $sum: 1 },
      },
    },
  ])
  return fillWeekly(
    rows.map((r) => ({ week: r._id.week, type: r._id.type, n: r.n })),
    venueDateKey(from),
    venueDateKey(now),
  )
}

/** Booked court-hours by day-of-week (Mon = 0) x hour, venue time. */
export async function occupancy(range: MetricRange): Promise<OccupancyRow[]> {
  await connectDB()
  const from = since(range, new Date())
  const rows = await Booking.aggregate<{ _id: { day: number; hour: number }; bookings: number }>([
    { $match: { status: { $in: COUNTED }, startAt: { $gte: from } } },
    {
      $project: {
        day: { $subtract: [{ $isoDayOfWeek: { date: '$startAt', timezone: VENUE_TZ } }, 1] },
        startHour: { $hour: { date: '$startAt', timezone: VENUE_TZ } },
        span: { $dateDiff: { startDate: '$startAt', endDate: '$endAt', unit: 'hour' } },
      },
    },
    {
      $project: {
        day: 1,
        hour: {
          $map: {
            input: { $range: [0, { $max: ['$span', 1] }] },
            as: 'k',
            in: { $mod: [{ $add: ['$startHour', '$$k'] }, 24] },
          },
        },
      },
    },
    { $unwind: '$hour' },
    { $group: { _id: { day: '$day', hour: '$hour' }, bookings: { $sum: 1 } } },
    { $sort: { '_id.day': 1, '_id.hour': 1 } },
  ])
  return rows.map((r) => ({ day: r._id.day, hour: r._id.hour, bookings: r.bookings }))
}

export async function clicksBySource(range: MetricRange): Promise<ClicksBySourceRow[]> {
  await connectDB()
  const from = since(range, new Date())
  const rows = await VoyageClick.aggregate<{ _id: ClickSource; clicks: number }>([
    { $match: { createdAt: { $gte: from } } },
    { $group: { _id: '$source', clicks: { $sum: 1 } } },
  ])
  return fillSources(rows.map((r) => ({ source: r._id, clicks: r.clicks })))
}

export async function tierDistribution(): Promise<TierRow[]> {
  await connectDB()
  const rows = await User.aggregate<{ _id: Tier; count: number }>([
    { $group: { _id: '$tier', count: { $sum: 1 } } },
  ])
  return fillTiers(rows.map((r) => ({ tier: r._id, count: r.count })))
}

/** Daily revenue (hours x court pricePerHour) for confirmed/completed bookings, zero-filled. */
export async function revenue(range: MetricRange): Promise<RevenueRow[]> {
  await connectDB()
  const now = new Date()
  const from = since(range, now)
  const rows = await Booking.aggregate<{ _id: string; revenue: number }>([
    { $match: { status: { $in: COUNTED }, startAt: { $gte: from, $lte: now } } },
    {
      $lookup: {
        from: Court.collection.name,
        localField: 'courtId',
        foreignField: '_id',
        as: 'court',
      },
    },
    { $unwind: '$court' },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startAt', timezone: VENUE_TZ } },
        revenue: {
          $sum: {
            $multiply: [
              { $dateDiff: { startDate: '$startAt', endDate: '$endAt', unit: 'hour' } },
              '$court.pricePerHour',
            ],
          },
        },
      },
    },
  ])
  return fillRevenue(
    rows.map((r) => ({ date: r._id, revenue: r.revenue })),
    venueDateKey(from),
    venueDateKey(now),
  )
}

export async function runMetric(metric: MetricName, range: MetricRange) {
  switch (metric) {
    case 'bookings-weekly':
      return bookingsWeekly(range)
    case 'occupancy':
      return occupancy(range)
    case 'clicks-by-source':
      return clicksBySource(range)
    case 'tiers':
      return tierDistribution()
    case 'revenue':
      return revenue(range)
  }
}
