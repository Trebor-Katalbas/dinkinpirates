import { describe, expect, it } from 'vitest'
import {
  VOYAGE_EXPIRY_MS,
  goPath,
  goUrl,
  isPublicVoyageLive,
  isRedirectable,
  parseClickSource,
  type VoyageLike,
} from './voyage'

const now = new Date('2026-06-01T12:00:00Z')
const base: VoyageLike = {
  type: 'voyage',
  status: 'confirmed',
  reclubUrl: 'https://reclub.co/m/x',
  voyageVisibility: 'public',
  endAt: new Date(now.getTime() + 3_600_000),
}

describe('isPublicVoyageLive', () => {
  it('is live for a confirmed public voyage with a link', () => {
    expect(isPublicVoyageLive(base, now)).toBe(true)
  })
  it('never lists charters', () => {
    expect(isPublicVoyageLive({ ...base, type: 'charter' }, now)).toBe(false)
  })
  it('hides private, cancelled, pending and linkless voyages', () => {
    expect(isPublicVoyageLive({ ...base, voyageVisibility: 'private' }, now)).toBe(false)
    expect(isPublicVoyageLive({ ...base, status: 'cancelled' }, now)).toBe(false)
    expect(isPublicVoyageLive({ ...base, status: 'pending' }, now)).toBe(false)
    expect(isPublicVoyageLive({ ...base, reclubUrl: null }, now)).toBe(false)
  })
  it('expires one hour after the booking ends', () => {
    const endAt = new Date(now.getTime() - VOYAGE_EXPIRY_MS + 1000)
    expect(isPublicVoyageLive({ ...base, endAt }, now)).toBe(true)
    expect(
      isPublicVoyageLive({ ...base, endAt: new Date(now.getTime() - VOYAGE_EXPIRY_MS) }, now),
    ).toBe(false)
  })
})

describe('isRedirectable', () => {
  it('allows privately shared voyage links', () => {
    expect(isRedirectable({ ...base, voyageVisibility: 'private' }, now)).toBe(true)
  })
  it('blocks charters, cancelled and expired', () => {
    expect(isRedirectable({ ...base, type: 'charter' }, now)).toBe(false)
    expect(isRedirectable({ ...base, status: 'cancelled' }, now)).toBe(false)
    expect(isRedirectable({ ...base, endAt: new Date('2026-05-30T00:00:00Z') }, now)).toBe(false)
  })
})

describe('click sources and links', () => {
  it('falls back to landing for unknown sources', () => {
    expect(parseClickSource('fb')).toBe('fb')
    expect(parseClickSource('qr')).toBe('qr')
    expect(parseClickSource('evil')).toBe('landing')
    expect(parseClickSource(null)).toBe('landing')
  })
  it('builds attributed links', () => {
    expect(goPath('abc', 'fb')).toBe('/go/abc?src=fb')
    expect(goUrl('abc', 'messenger', 'https://dinkinpirates.com/')).toBe(
      'https://dinkinpirates.com/go/abc?src=messenger',
    )
  })
})
