// Pure helpers for zero-filling metric series (date keys are venue-local "YYYY-MM-DD").
import type { BookingsWeeklyRow, ClicksBySourceRow, RevenueRow, TierRow } from '@/types/metrics'
import type { ClickSource, Tier } from '@/types'

const DAY_MS = 86_400_000

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function utcToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(key: string, days: number): string {
  return utcToKey(keyToUtc(key) + days * DAY_MS)
}

/** Monday of the week containing `key`. */
export function mondayOf(key: string): string {
  const dow = new Date(keyToUtc(key)).getUTCDay() // 0 = Sunday
  return addDays(key, -((dow + 6) % 7))
}

export function rangeDays(range: '30d' | '90d' | '180d'): number {
  return Number.parseInt(range, 10)
}

/** Inclusive list of date keys. */
export function dateKeysBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k)
  return out
}

export function fillRevenue(rows: RevenueRow[], from: string, to: string): RevenueRow[] {
  const byDate = new Map(rows.map((r) => [r.date, r.revenue]))
  return dateKeysBetween(from, to).map((date) => ({ date, revenue: byDate.get(date) ?? 0 }))
}

export function fillWeekly(
  rows: { week: string; type: 'charter' | 'voyage'; n: number }[],
  from: string,
  to: string,
): BookingsWeeklyRow[] {
  const map = new Map<string, BookingsWeeklyRow>()
  const last = rows.reduce((max, r) => (r.week > max ? r.week : max), mondayOf(to))
  for (let w = mondayOf(from); w <= last; w = addDays(w, 7)) {
    map.set(w, { week: w, charter: 0, voyage: 0 })
  }
  for (const r of rows) {
    const row = map.get(r.week) ?? { week: r.week, charter: 0, voyage: 0 }
    row[r.type] += r.n
    map.set(r.week, row)
  }
  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week))
}

export const ALL_SOURCES: ClickSource[] = ['landing', 'messenger', 'fb', 'qr']
export const ALL_TIERS: Tier[] = ['deckhand', 'buccaneer', 'firstMate', 'captain', 'legend']

export function fillSources(rows: { source: ClickSource; clicks: number }[]): ClicksBySourceRow[] {
  return ALL_SOURCES.map((source) => ({
    source,
    clicks: rows.find((r) => r.source === source)?.clicks ?? 0,
  }))
}

export function fillTiers(rows: { tier: Tier; count: number }[]): TierRow[] {
  return ALL_TIERS.map((tier) => ({ tier, count: rows.find((r) => r.tier === tier)?.count ?? 0 }))
}
