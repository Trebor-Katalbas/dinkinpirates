// Client-safe row types for GET /api/admin/metrics (Captain's Log).
import type { ClickSource, Tier } from '@/types'

export type MetricName = 'bookings-weekly' | 'occupancy' | 'clicks-by-source' | 'tiers' | 'revenue'
export type MetricRange = '30d' | '90d' | '180d'

/** `week` is the venue-local Monday, "YYYY-MM-DD". */
export interface BookingsWeeklyRow {
  week: string
  charter: number
  voyage: number
}

/** `day`: 0-6 with Monday = 0; `hour`: 0-23 in venue time. */
export interface OccupancyRow {
  day: number
  hour: number
  bookings: number
}

export interface ClicksBySourceRow {
  source: ClickSource
  clicks: number
}

export interface TierRow {
  tier: Tier
  count: number
}

/** Daily revenue in the courts' currency, `date` is venue-local "YYYY-MM-DD". */
export interface RevenueRow {
  date: string
  revenue: number
}
