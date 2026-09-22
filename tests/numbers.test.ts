import { describe, it, expect } from 'vitest'
import { fmt, fmtDuration, geomCost, geomCostN, geomMaxAffordable } from '../src/engine/numbers'

describe('fmt', () => {
  it('formats small integers plainly', () => {
    expect(fmt(0)).toBe('0'); expect(fmt(7)).toBe('7'); expect(fmt(999)).toBe('999')
  })
  it('formats suffixes with sensible precision', () => {
    expect(fmt(1000)).toBe('1.00K'); expect(fmt(12345)).toBe('12.3K'); expect(fmt(123456)).toBe('123K')
    expect(fmt(1.5e6)).toBe('1.50M'); expect(fmt(2e9)).toBe('2.00B'); expect(fmt(3.3e12)).toBe('3.30T')
    expect(fmt(1e15)).toBe('1.00Qa'); expect(fmt(1e18)).toBe('1.00Qi'); expect(fmt(1e33)).toBe('1.00Dc')
  })
  it('handles fractions under 10', () => { expect(fmt(2.5)).toBe('2.5') })
  it('falls back to exponent beyond the suffix table', () => { expect(fmt(1e70)).toMatch(/e\+70$/) })
})

describe('fmtDuration', () => {
  it('formats ranges', () => {
    expect(fmtDuration(45)).toBe('45s'); expect(fmtDuration(192)).toBe('3m 12s'); expect(fmtDuration(7500)).toBe('2h 05m'); expect(fmtDuration(100000)).toBe('1d 3h')
  })
})

describe('geometric costs', () => {
  it('sums correctly', () => {
    expect(geomCostN(10, 1.15, 0, 1)).toBeCloseTo(10)
    expect(geomCostN(10, 1.15, 0, 3)).toBeCloseTo(10 + 11.5 + 13.225)
    expect(geomCost(10, 1.15, 2)).toBeCloseTo(13.225)
  })
  it('computes max affordable consistently with the sum', () => {
    for (const money of [0, 5, 10, 21.4, 21.5, 34.7, 34.8, 1000, 1e6]) {
      const n = geomMaxAffordable(10, 1.15, 4, money)
      expect(geomCostN(10, 1.15, 4, n)).toBeLessThanOrEqual(money + 1e-9)
      expect(geomCostN(10, 1.15, 4, n + 1)).toBeGreaterThan(money)
    }
  })
})
