import { describe, expect, it } from 'vitest'
import { parseReclubUrl } from './reclub'

describe('parseReclubUrl', () => {
  it('accepts an https reclub.co link and builds a dedupe key', () => {
    const r = parseReclubUrl(' https://reclub.co/m/abc123/ ')
    expect(r).toEqual({
      ok: true,
      url: 'https://reclub.co/m/abc123',
      externalId: 'reclub.co/m/abc123',
    })
  })

  it('dedupes the same event across query strings, www and case', () => {
    const a = parseReclubUrl('https://reclub.co/m/ABC?utm=1')
    const b = parseReclubUrl('https://www.reclub.co/m/abc')
    expect(a.ok && b.ok && a.externalId === b.externalId).toBe(true)
  })

  it.each([
    ['http://reclub.co/m/abc', 'https'],
    ['https://evil.com/m/abc', 'reclub.co'],
    ['https://reclub.co.evil.com/m/abc', 'reclub.co'],
    ['https://notreclub.co/m/abc', 'reclub.co'],
    ['https://reclub.co/', 'specific'],
    ['https://user:pw@reclub.co/m/a', 'Invalid'],
    ['not a url', 'https'],
  ])('rejects %s', (input, fragment) => {
    const r = parseReclubUrl(input)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain(fragment)
  })
})
