'use client'

import { useQuery } from '@tanstack/react-query'
import { getJSON } from '@/components/site/fetch-json'
import type {
  BookingsWeeklyRow,
  ClicksBySourceRow,
  MetricName,
  MetricRange,
  OccupancyRow,
  RevenueRow,
  TierRow,
} from '@/types/metrics'

interface MetricRows {
  'bookings-weekly': BookingsWeeklyRow
  occupancy: OccupancyRow
  'clicks-by-source': ClicksBySourceRow
  tiers: TierRow
  revenue: RevenueRow
}

export const RANGES: MetricRange[] = ['30d', '90d', '180d']

export function useMetric<M extends MetricName>(metric: M, range: MetricRange) {
  return useQuery({
    queryKey: ['admin', metric, range],
    queryFn: () =>
      getJSON<MetricRows[M][]>(
        `/api/admin/metrics?metric=${encodeURIComponent(metric)}&range=${encodeURIComponent(range)}`,
      ),
    staleTime: 60_000,
  })
}
