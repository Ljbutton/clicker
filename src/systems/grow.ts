import type { BandDef } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { geomCost, geomCostN, geomMaxAffordable } from '@/engine/numbers'
import { type EffectTable, mult, add } from './effects'
import { spend } from './economy'

export function growCost(s: GameState, fx: EffectTable, n = 1): number {
  const g = BALANCE.grow
  return geomCostN(g.baseCost * mult(fx, 'grow_cost'), g.costGrowth, s.grows, n)
}

export function growCostOne(s: GameState, fx: EffectTable): number {
  return geomCost(BALANCE.grow.baseCost * mult(fx, 'grow_cost'), BALANCE.grow.costGrowth, s.grows)
}

/** Meters gained by the next GROW. */
export function growMeters(s: GameState, fx: EffectTable, atGrows = s.grows): number {
  const g = BALANCE.grow
  return (g.baseMeters + atGrows * g.slope + add(fx, 'grow_meters')) * mult(fx, 'grow_meters')
}

export function growMaxAffordable(ci: ContentIndex, s: GameState, fx: EffectTable): number {
  return geomMaxAffordable(BALANCE.grow.baseCost * mult(fx, 'grow_cost'), BALANCE.grow.costGrowth, s.grows, s.res[ci.baseResource] ?? 0)
}

/** Perform up to n GROWs. Returns meters gained and grows performed. */
export function grow(ci: ContentIndex, s: GameState, fx: EffectTable, n = 1): { grows: number; meters: number } {
  let done = 0, meters = 0
  for (let i = 0; i < n; i++) {
    const cost = growCostOne(s, fx)
    if (!spend(s, { [ci.baseResource]: cost })) break
    const m = growMeters(s, fx)
    s.height += m; meters += m; s.grows++; s.stats.growsTotal++; done++
    if (s.height > s.stats.maxHeight) s.stats.maxHeight = s.height
    if (s.height > s.prestige.bestHeight) s.prestige.bestHeight = s.height
  }
  return { grows: done, meters }
}

/** Number of GROWs needed to reach a height, and their total cost. */
export function growsToHeight(s: GameState, fx: EffectTable, target: number): { grows: number; cost: number } {
  if (s.height >= target) return { grows: 0, cost: 0 }
  let h = s.height, g = s.grows, n = 0
  while (h < target && n < 100000) { h += growMeters(s, fx, g); g++; n++ }
  return { grows: n, cost: growCost(s, fx, n) }
}

export function bandAt(ci: ContentIndex, height: number): BandDef {
  let cur = ci.bands[0]!
  for (const b of ci.bands) if (height >= b.minHeight) cur = b
  return cur
}

export function nextBand(ci: ContentIndex, height: number): BandDef | null {
  for (const b of ci.bands) if (height < b.minHeight) return b
  return null
}

/** Fraction of the way through the current band. */
export function bandProgress(ci: ContentIndex, height: number): number {
  const cur = bandAt(ci, height), nx = nextBand(ci, height)
  if (!nx) return 1
  return Math.max(0, Math.min(1, (height - cur.minHeight) / (nx.minHeight - cur.minHeight)))
}
