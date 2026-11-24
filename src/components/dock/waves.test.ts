import { describe, expect, it } from 'vitest'
import { OCEAN_VERTEX, WAVES, waveHeight } from './waves'

describe('waveHeight', () => {
  it('is bounded by the sum of amplitudes', () => {
    const max = WAVES.reduce((s, w) => s + w.amp, 0)
    for (let i = 0; i < 200; i++) {
      const h = waveHeight(Math.sin(i) * 20, Math.cos(i) * 20, i * 0.37)
      expect(Math.abs(h)).toBeLessThanOrEqual(max + 1e-9)
    }
  })

  it('moves over time', () => {
    expect(waveHeight(0, 0, 0)).not.toBeCloseTo(waveHeight(0, 0, 1.3), 3)
  })

  it('emits one GLSL term per wave with float literals', () => {
    const terms = OCEAN_VERTEX.match(/h \+= /g) ?? []
    expect(terms).toHaveLength(WAVES.length)
    expect(OCEAN_VERTEX).not.toMatch(/\* 1 \+|vec2\(1, /)
  })
})
