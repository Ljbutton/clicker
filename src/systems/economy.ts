import type { Cost } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { geomCost, geomCostN, geomMaxAffordable } from '@/engine/numbers'
import { type EffectTable, mult, add } from './effects'
import { isUnlocked } from './unlock'

/* ---------- resources ---------- */
export function have(s: GameState, id: string): number { return s.res[id] ?? 0 }

export function gain(s: GameState, id: string, amount: number) {
  if (amount <= 0 || !Number.isFinite(amount)) return
  s.res[id] = (s.res[id] ?? 0) + amount
  s.earned[id] = (s.earned[id] ?? 0) + amount
}

export function canAfford(s: GameState, cost: Cost, times = 1): boolean {
  for (const [id, n] of Object.entries(cost)) if ((s.res[id] ?? 0) < n * times) return false
  return true
}

export function spend(s: GameState, cost: Cost, times = 1): boolean {
  if (!canAfford(s, cost, times)) return false
  for (const [id, n] of Object.entries(cost)) s.res[id] = (s.res[id] ?? 0) - n * times
  return true
}

/** The single resource that most limits affording `cost` (largest shortfall in worth terms). */
export function bottleneck(ci: ContentIndex, s: GameState, cost: Cost): { id: string; have: number; need: number } {
  let worst: { id: string; have: number; need: number; gap: number } | null = null
  for (const [id, need] of Object.entries(cost)) {
    const h = s.res[id] ?? 0
    const gap = Math.max(0, need - h) * (ci.resources.get(id)?.worth ?? 1)
    if (!worst || gap > worst.gap) worst = { id, have: h, need, gap }
  }
  return worst ?? { id: ci.baseResource, have: 0, need: 0 }
}

/* ---------- producers ---------- */
export function producerCount(s: GameState, id: string) { return s.producers[id] ?? 0 }

export function producerCost(ci: ContentIndex, s: GameState, id: string, fx: EffectTable, n = 1): Cost {
  const p = ci.producers.get(id)!
  const owned = producerCount(s, id)
  const disc = mult(fx, 'producer_cost')
  const out: Cost = {}
  for (const [r, base] of Object.entries(p.baseCost)) out[r] = geomCostN(base * disc, p.costGrowth, owned, n)
  return out
}

export function producerMaxAffordable(ci: ContentIndex, s: GameState, id: string, fx: EffectTable): number {
  const p = ci.producers.get(id)!
  const owned = producerCount(s, id)
  const disc = mult(fx, 'producer_cost')
  let best = Infinity
  for (const [r, base] of Object.entries(p.baseCost)) best = Math.min(best, geomMaxAffordable(base * disc, p.costGrowth, owned, s.res[r] ?? 0))
  return Number.isFinite(best) ? best : 0
}

export function buyProducer(ci: ContentIndex, s: GameState, id: string, fx: EffectTable, n = 1): number {
  const p = ci.producers.get(id)
  if (!p || n <= 0 || !isUnlocked(ci, s, p.unlock)) return 0
  const cost = producerCost(ci, s, id, fx, n)
  if (!spend(s, cost)) return 0
  s.producers[id] = producerCount(s, id) + n
  return n
}

/** Breakpoint multiplier for a producer at a given count. */
export function breakpointMult(ci: ContentIndex, id: string, count: number): number {
  const p = ci.producers.get(id)
  if (!p) return 1
  let m = 1
  for (const bp of p.breakpoints) if (count >= bp) m *= BALANCE.producers.breakpointMult
  return m
}

export function nextBreakpoint(ci: ContentIndex, id: string, count: number): number | null {
  const p = ci.producers.get(id)
  if (!p) return null
  for (const bp of p.breakpoints) if (count < bp) return bp
  return null
}

/** Per-second production of every resource from gatherers (not taps, not crafting). */
export function productionRates(ci: ContentIndex, s: GameState, fx: EffectTable): Record<string, number> {
  const out: Record<string, number> = {}
  const all = mult(fx, 'all_production')
  for (const [id, count] of Object.entries(s.producers)) {
    if (count <= 0) continue
    const p = ci.producers.get(id)
    if (!p || p.kind !== 'gatherer' || !p.produces) continue
    const res = p.produces.id
    let rate = p.produces.rate * count * breakpointMult(ci, id, count) * all * mult(fx, `producer:${id}`) * mult(fx, `resource:${res}`)
    if (res === ci.baseResource) rate *= mult(fx, 'base_production')
    rate += add(fx, `producer:${id}`) * count
    out[res] = (out[res] ?? 0) + rate
  }
  return out
}

/** Rate for a single resource (0 when none). */
export function rateOf(rates: Record<string, number>, id: string) { return rates[id] ?? 0 }

/* ---------- buildings ---------- */
export function buildingLevel(s: GameState, id: string) { return s.buildings[id] ?? 0 }

export function buildingCost(ci: ContentIndex, s: GameState, id: string, fx: EffectTable): Cost {
  const b = ci.buildings.get(id)!
  const lvl = buildingLevel(s, id)
  const disc = mult(fx, 'building_cost')
  const out: Cost = {}
  for (const [r, base] of Object.entries(b.baseCost)) out[r] = geomCost(base * disc, b.costGrowth, lvl)
  return out
}

export function canBuild(ci: ContentIndex, s: GameState, id: string): boolean {
  const b = ci.buildings.get(id)
  return !!b && s.height >= b.height && buildingLevel(s, id) < b.maxLevel
}

export function buyBuilding(ci: ContentIndex, s: GameState, id: string, fx: EffectTable): boolean {
  if (!canBuild(ci, s, id)) return false
  if (!spend(s, buildingCost(ci, s, id, fx))) return false
  s.buildings[id] = buildingLevel(s, id) + 1
  return true
}

/* ---------- boosts (grafts) ---------- */
export function boostTier(s: GameState, id: string) { return s.boosts[id] ?? 0 }

export function boostCost(ci: ContentIndex, s: GameState, id: string): Cost {
  const b = ci.boosts.get(id)!
  const tier = boostTier(s, id)
  const out: Cost = {}
  for (const [r, base] of Object.entries(b.baseCost)) out[r] = Math.ceil(geomCost(base, b.costGrowth, tier))
  return out
}

export function buyBoost(ci: ContentIndex, s: GameState, id: string): boolean {
  const b = ci.boosts.get(id)
  if (!b || boostTier(s, id) >= b.maxTier || !isUnlocked(ci, s, b.unlock)) return false
  if (!spend(s, boostCost(ci, s, id))) return false
  s.boosts[id] = boostTier(s, id) + 1
  return true
}
