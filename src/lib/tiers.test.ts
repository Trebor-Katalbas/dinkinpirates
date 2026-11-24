import { describe, expect, it } from 'vitest'
import { TIERS, tierForPoints, tierLabel } from './tiers'

describe('tierForPoints', () => {
  it.each([
    [0, 'deckhand'],
    [99, 'deckhand'],
    [100, 'buccaneer'],
    [299, 'buccaneer'],
    [300, 'firstMate'],
    [700, 'captain'],
    [1499, 'captain'],
    [1500, 'legend'],
    [99999, 'legend'],
  ])('%i points -> %s', (points, tier) => {
    expect(tierForPoints(points)).toBe(tier)
  })

  it('has ascending thresholds and labels', () => {
    const mins = TIERS.map((t) => t.min)
    expect(mins).toEqual([...mins].sort((a, b) => a - b))
    expect(tierLabel('legend')).toBe("Dinkin' Legend")
  })
})
