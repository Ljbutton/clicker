import type { BandDef, Cost } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { geomCost, geomCostN, geomMaxAffordable } from '@/engine/numbers'
import { type EffectTable, mult, add } from './effects'
import { spend, scaleCost, canAfford } from './economy'

/* ---------- GROW ---------- */
export function growCostOne(s: GameState, fx: EffectTable): number {
  return geomCost(BALANCE.grow.baseCost * mult(fx, 'grow_cost'), BALANCE.grow.costGrowth, s.grows)
}
export function growCost(s: GameState, fx: EffectTable, n: number): number {
  return geomCostN(BALANCE.grow.baseCost * mult(fx, 'grow_cost'), BALANCE.grow.costGrowth, s.grows, n)
}
export function vigor(fx: EffectTable): number { return Math.min(BALANCE.grow.vigorCap, mult(fx, 'grow_meters')) }
export function growMeters(s: GameState, fx: EffectTable, atGrows = s.grows): number {
  return (BALANCE.grow.baseMeters + atGrows * BALANCE.grow.slope + add(fx, 'grow_meters_add')) * vigor(fx)
}
export function growMaxAffordable(ci: ContentIndex, s: GameState, fx: EffectTable): number {
  return geomMaxAffordable(BALANCE.grow.baseCost * mult(fx, 'grow_cost'), BALANCE.grow.costGrowth, s.grows, s.res[ci.baseResource] ?? 0)
}
export function grow(ci: ContentIndex, s: GameState, fx: EffectTable, n = 1): { grows: number; meters: number } {
  let done = 0, meters = 0
  for (let i = 0; i < n; i++) {
    if (!spend(s, { [ci.baseResource]: growCostOne(s, fx) })) break
    const m = growMeters(s, fx)
    s.height += m; meters += m; s.grows++; s.stats.growsTotal++; done++
  }
  if (s.height > s.stats.maxHeight) s.stats.maxHeight = s.height
  if (s.height > s.prestige.bestHeight) s.prestige.bestHeight = s.height
  return { grows: done, meters }
}
/** GROWs and Sap needed to reach a height. */
export function growsToHeight(s: GameState, fx: EffectTable, target: number): { grows: number; cost: number } {
  if (s.height >= target) return { grows: 0, cost: 0 }
  let h = s.height, g = s.grows, n = 0
  while (h < target && n < 100000) { h += growMeters(s, fx, g); g++; n++ }
  return { grows: n, cost: growCost(s, fx, n) }
}

/* ---------- boughs ---------- */
export function bandAt(ci: ContentIndex, s: GameState): BandDef {
  let cur = ci.bands[0]!
  for (const b of ci.bands) if (s.boughs.includes(b.id) && b.index > cur.index) cur = b
  return cur
}
/** The band whose sky applies at the current height (line crossed), regardless of ritual. */
export function skyBandAt(ci: ContentIndex, height: number): BandDef {
  let cur = ci.bands[0]!
  for (const b of ci.bands) if (height >= b.line) cur = b
  return cur
}
export function nextBough(ci: ContentIndex, s: GameState): BandDef | null {
  const cur = bandAt(ci, s)
  return ci.bands.find((b) => b.index === cur.index + 1) ?? null
}
export function lineProgress(ci: ContentIndex, s: GameState): number {
  const nb = nextBough(ci, s)
  if (!nb) return 1
  const cur = bandAt(ci, s)
  return Math.max(0, Math.min(1, (s.height - cur.line) / Math.max(1, nb.line - cur.line)))
}
/** Ritual cost after Season, Quick Ritual and Rune discounts (floors per §8.2). */
export function ritualCost(ci: ContentIndex, s: GameState, bandId: string, fx: EffectTable): Cost | null {
  const b = ci.bandById.get(bandId)
  if (!b?.ritual) return null
  const r = BALANCE.ritual
  const seasonK = Math.max(r.seasonFloor, Math.pow(r.seasonDiscount, s.prestige.count))
  const k = Math.max(r.absoluteFloor, seasonK * mult(fx, 'ritual_cost'))
  const out: Cost = {}
  for (const [id, n] of Object.entries(b.ritual.cost)) out[id] = Math.ceil(n * k)
  return out
}
export function ritualAvailable(ci: ContentIndex, s: GameState, bandId: string): { ok: boolean; reason?: string } {
  const b = ci.bandById.get(bandId)
  if (!b?.ritual) return { ok: false, reason: 'No ritual' }
  if (s.boughs.includes(bandId)) return { ok: false, reason: 'Already open' }
  const prev = ci.bands.find((x) => x.index === b.index - 1)
  if (prev && !s.boughs.includes(prev.id)) return { ok: false, reason: `Open ${prev.name} first` }
  if (s.height < b.line) return { ok: false, reason: `GROW to ${b.line} m` }
  if (b.ritual.requiresSeason && s.prestige.count < b.ritual.requiresSeason) return { ok: false, reason: `Season ${b.ritual.requiresSeason + 1}` }
  return { ok: true }
}
export function performRitual(ci: ContentIndex, s: GameState, bandId: string, fx: EffectTable): boolean {
  if (!ritualAvailable(ci, s, bandId).ok) return false
  const cost = ritualCost(ci, s, bandId, fx)!
  if (!canAfford(s, cost)) return false
  spend(s, cost)
  s.boughs.push(bandId)
  s.stats.ritualsTotal++
  return true
}
export { scaleCost }
