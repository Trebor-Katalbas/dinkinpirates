'use client'

import { useQuery } from '@tanstack/react-query'
import { getJSON } from '@/components/site/fetch-json'
import type { BookingDTO, CourtDTO, DayAvailabilityDTO, SlotDTO } from '@/types'

export type BookingWithCourt = BookingDTO & { court: CourtDTO }

export const courtsQuery = {
  queryKey: ['courts'] as const,
  queryFn: () => getJSON<CourtDTO[]>('/api/courts'),
  staleTime: 5 * 60_000,
}

export function slotsQuery(courtId: string, date: string) {
  return {
    queryKey: ['slots', courtId, date] as const,
    queryFn: () =>
      getJSON<SlotDTO[]>(
        `/api/courts/${encodeURIComponent(courtId)}/slots?date=${encodeURIComponent(date)}`,
      ),
    staleTime: 30_000,
    // Keep times honest while someone is choosing: other crews may claim them.
    refetchInterval: 30_000,
  }
}

export function availabilityQuery(from: string, days: number, hours: number) {
  return {
    queryKey: ['availability', from, days, hours] as const,
    queryFn: () =>
      getJSON<DayAvailabilityDTO[]>(
        `/api/availability?from=${encodeURIComponent(from)}&days=${days}&hours=${hours}`,
      ),
    staleTime: 30_000,
    refetchInterval: 60_000,
  }
}

export function bookingQuery(id: string) {
  return {
    queryKey: ['booking', id] as const,
    queryFn: () => getJSON<BookingWithCourt>(`/api/bookings/${encodeURIComponent(id)}`),
  }
}

export function useCourts() {
  return useQuery(courtsQuery)
}

export function useBooking(id: string) {
  return useQuery(bookingQuery(id))
}
