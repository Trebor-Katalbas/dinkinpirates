import type { Tier } from '@/types'

export const TIERS: { tier: Tier; label: string; min: number }[] = [
  { tier: 'deckhand', label: 'Deckhand', min: 0 },
  { tier: 'buccaneer', label: 'Buccaneer', min: 100 },
  { tier: 'firstMate', label: 'First Mate', min: 300 },
  { tier: 'captain', label: 'Captain', min: 700 },
  { tier: 'legend', label: "Dinkin' Legend", min: 1500 },
]

/** Bounty awarded per completed court-hour. */
export const POINTS_PER_HOUR = 10

export function tierForPoints(points: number): Tier {
  let t: Tier = 'deckhand'
  for (const row of TIERS) if (points >= row.min) t = row.tier
  return t
}

export function tierLabel(t: Tier): string {
  return TIERS.find((r) => r.tier === t)?.label ?? 'Deckhand'
}
