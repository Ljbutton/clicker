import type { Cost } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { geomCost, geomCostN, geomMaxAffordable } from '@/engine/numbers'
import { type EffectTable, mult, add } from './effects'
import { isUnlocked } from './unlock'

/* ---------- resources & Heartwood ---------- */
export function have(s: GameState, id: string): number { return s.res[id] ?? 0 }

/** Add a resource; every unit produced counts toward Heartwood at its worth. */
export function gain(ci: ContentIndex, s: GameState, id: string, amount: number) {
  if (!(amount > 0) || !Number.isFinite(amount)) return
  s.res[id] = (s.res[id] ?? 0) + amount
  s.earned[id] = (s.earned[id] ?? 0) + amount
  const w = ci.resources.get(id)?.worth ?? 0
  if (w > 0) { s.heartwood += amount * w; s.lifetimeHeartwood += amount * w }
}

export function canAfford(s: GameState, cost: Cost, times = 1): boolean {
  for (const [id, n] of Object.entries(cost)) if ((s.res[id] ?? 0) + 1e-9 < n * times) return false
  return true
}

export function spend(s: GameState, cost: Cost, times = 1): boolean {
  if (!canAfford(s, cost, times)) return false
  for (const [id, n] of Object.entries(cost)) s.res[id] = Math.max(0, (s.res[id] ?? 0) - n * times)
  return true
}

export function scaleCost(cost: Cost, k: number): Cost {
  const out: Cost = {}
  for (const [id, n] of Object.entries(cost)) out[id] = n * k
  return out
}

/** The resource that most limits affording `cost` (largest shortfall in worth). */
export function bottleneck(ci: ContentIndex, s: GameState, cost: Cost): { id: string; have: number; need: number } {
  let worst: { id: string; have: number; need: number; gap: number } | null = null
  for (const [id, need] of Object.entries(cost)) {
    const h = s.res[id] ?? 0
    const gap = Math.max(0, need - h) * (ci.resources.get(id)?.worth ?? 1)
    if (!worst || gap > worst.gap) worst = { id, have: h, need, gap }
  }
  return worst ?? { id: ci.baseResource, have: 0, need: 0 }
}

/* ---------- milestone multiplier (lodges and crews) ---------- */
export function milestoneMult(n: number, fx?: EffectTable): number {
  const p = BALANCE.producers
  const bonus = fx ? add(fx, 'milestone_bonus') : 0 // Old Growth: +0.25 per level on the x2 steps
  let m = 1
  if (n >= p.firstMilestone) m *= p.firstMult
  for (const t of p.doubleAt) if (n >= t) m *= 2 + bonus
  const last = p.doubleAt[p.doubleAt.length - 1]!
  if (n >= last + p.everyAfter) m *= Math.pow(2 + bonus, Math.floor((n - last) / p.everyAfter))
  return m
}

export function nextMilestone(n: number): number {
  const p = BALANCE.producers
  if (n < p.firstMilestone) return p.firstMilestone
  for (const t of p.doubleAt) if (n < t) return t
  const last = p.doubleAt[p.doubleAt.length - 1]!
  return last + p.everyAfter * (Math.floor((n - last) / p.everyAfter) + 1)
}

/* ---------- producers: lodges and crews ---------- */
export function producerCount(s: GameState, id: string) { return s.producers[id] ?? 0 }

/** Is the Foreman (crew #1) the next purchase for this crew? */
export function needsForeman(ci: ContentIndex, s: GameState, id: string): boolean {
  const p = ci.producers.get(id)
  return !!p && p.kind === 'crew' && !!p.foremanCost && producerCount(s, id) === 0
}

/** Cost of the next n levels (Foreman excluded: it is bought via hireForeman). */
export function producerCost(ci: ContentIndex, s: GameState, id: string, fx: EffectTable, n = 1): Cost {
  const p = ci.producers.get(id)!
  const owned = producerCount(s, id)
  const disc = mult(fx, 'producer_cost') * (p.kind === 'crew' ? mult(fx, 'crew_cost') : 1)
  const k = p.kind === 'crew' && p.foremanCost ? Math.max(0, owned - 1) : owned
  const out: Cost = {}
  for (const [r, base] of Object.entries(p.baseCost)) out[r] = geomCostN(base * disc, p.costGrowth, k, n)
  return out
}

export function producerMaxAffordable(ci: ContentIndex, s: GameState, id: string, fx: EffectTable): number {
  const p = ci.producers.get(id)!
  const owned = producerCount(s, id)
  const disc = mult(fx, 'producer_cost') * (p.kind === 'crew' ? mult(fx, 'crew_cost') : 1)
  const k = p.kind === 'crew' && p.foremanCost ? Math.max(0, owned - 1) : owned
  let best = Infinity
  for (const [r, base] of Object.entries(p.baseCost)) best = Math.min(best, geomMaxAffordable(base * disc, p.costGrowth, k, s.res[r] ?? 0))
  return Number.isFinite(best) ? best : 0
}

export function producerAvailable(ci: ContentIndex, s: GameState, id: string): boolean {
  const p = ci.producers.get(id)
  if (!p) return false
  if (!s.boughs.includes(p.bandId)) return false
  if (p.kind === 'crew' && p.station && !s.workshops[p.station]) return false
  return isUnlocked(ci, s, p.unlock)
}

export function buyProducer(ci: ContentIndex, s: GameState, id: string, fx: EffectTable, n = 1): number {
  const p = ci.producers.get(id)
  if (!p || n <= 0 || !producerAvailable(ci, s, id)) return 0
  if (needsForeman(ci, s, id)) return 0
  const cost = producerCost(ci, s, id, fx, n)
  if (!spend(s, cost)) return 0
  s.producers[id] = producerCount(s, id) + n
  return n
}

/** Hire the Foreman: pay N units of the workshop's own output. */
export function hireForeman(ci: ContentIndex, s: GameState, id: string): boolean {
  const p = ci.producers.get(id)
  if (!p || !needsForeman(ci, s, id) || !producerAvailable(ci, s, id)) return false
  if (!spend(s, p.foremanCost!)) return false
  s.producers[id] = 1
  return true
}

/* ---------- workshops ---------- */
export function workshopBuilt(s: GameState, id: string) { return !!s.workshops[id] }

export function workshopBuildable(ci: ContentIndex, s: GameState, id: string): boolean {
  const w = ci.workshops.get(id)
  if (!w || s.workshops[id]) return false
  if (!s.boughs.includes(w.bandId) || s.height < w.hook) return false
  const r = ci.recipes.get(w.recipe)
  if (r?.discover && !s.codex.discovered.includes(r.id)) return false
  return true
}

export function buildWorkshop(ci: ContentIndex, s: GameState, id: string): boolean {
  if (!workshopBuildable(ci, s, id)) return false
  const w = ci.workshops.get(id)!
  if (!spend(s, w.cost)) return false
  s.workshops[id] = true
  if (s.feed[id] == null) s.feed[id] = BALANCE.producers.feedDefault
  return true
}

export function crewOf(ci: ContentIndex, s: GameState, station: string): number {
  const c = ci.crewByStation.get(station)
  return c ? producerCount(s, c.id) : 0
}

/** Effective recipe inputs after Thrifty Recipes. */
export function recipeInputs(ci: ContentIndex, recipeId: string, fx: EffectTable): Cost {
  const r = ci.recipes.get(recipeId)!
  const k = mult(fx, 'recipe_inputs')
  return k === 1 ? r.inputs : scaleCost(r.inputs, k)
}

/** Crafts per second for a workshop (0 when no crew). Hearth Annex doubles one chosen workshop. */
export function throughput(ci: ContentIndex, s: GameState, station: string, fx: EffectTable): number {
  const w = ci.workshops.get(station)
  if (!w || !s.workshops[station]) return 0
  const crew = crewOf(ci, s, station)
  if (crew <= 0) return 0
  const r = ci.recipes.get(w.recipe)!
  let t = crew * (1 / r.seconds) * milestoneMult(crew, fx) * mult(fx, 'craft_throughput') * mult(fx, 'all_production') * mult(fx, `station:${station}`)
  if (s.hearthTarget === station) t *= 2
  const bm = fx.bandMult[w.bandId]; if (bm) t *= bm
  return t
}

/** Gross lodge production per second for every raw (before workshops draw). */
export function lodgeRates(ci: ContentIndex, s: GameState, fx: EffectTable, offlineMult = 1): Record<string, number> {
  const out: Record<string, number> = {}
  const all = mult(fx, 'all_production') * mult(fx, 'raw_production') * offlineMult
  for (const [id, n] of Object.entries(s.producers)) {
    if (n <= 0) continue
    const p = ci.producers.get(id)
    if (!p || p.kind !== 'lodge' || !p.produces) continue
    let rate = n * p.produces.rate * milestoneMult(n, fx) * all * mult(fx, `resource:${p.produces.id}`)
    const bm = fx.bandMult[p.bandId]; if (bm) rate *= bm
    if (p.id === 'beekeeper' && (s.annexLevels['grove'] ?? 0) > 0) rate *= 2
    out[p.produces.id] = (out[p.produces.id] ?? 0) + rate
  }
  return out
}

export interface EconomyRates { gross: Record<string, number>; consumed: Record<string, number>; net: Record<string, number>; starved: Record<string, string | null> }

/**
 * The single economy step used live, offline and by the simulator.
 * Lodges produce; then workshops in tier order convert inputs to outputs, drawing at most `feed` × gross(input) per second.
 */
export function stepEconomy(ci: ContentIndex, s: GameState, fx: EffectTable, dt: number, offlineMult = 1): EconomyRates {
  const gross = lodgeRates(ci, s, fx, offlineMult)
  const consumed: Record<string, number> = {}
  const starved: Record<string, string | null> = {}
  for (const [id, r] of Object.entries(gross)) gain(ci, s, id, r * dt)
  // Feed dials are shared per resource: all consumers together may draw at most the sum of their dials, capped at the
  // greediest setting (90%), so at least a tenth of every good always accumulates for hand-crafting, Rituals and lodges.
  const drawn: Record<string, number> = {}
  const capOf: Record<string, number> = {}
  const maxShare = BALANCE.producers.feedOptions[BALANCE.producers.feedOptions.length - 1] ?? 0.9
  for (const w of ci.workshopOrder) {
    if (!s.workshops[w.id]) continue
    const f = s.feed[w.id] ?? BALANCE.producers.feedDefault
    for (const rid of Object.keys(ci.recipes.get(w.recipe)?.inputs ?? {})) capOf[rid] = Math.min(maxShare, (capOf[rid] ?? 0) + f)
  }
  for (const w of ci.workshopOrder) {
    if (!s.workshops[w.id]) continue
    const tp = throughput(ci, s, w.id, fx)
    if (tp <= 0) continue
    const r = ci.recipes.get(w.recipe)!
    const inputs = recipeInputs(ci, w.recipe, fx)
    const feed = s.feed[w.id] ?? BALANCE.producers.feedDefault
    const capacity = tp * dt
    let allowed = capacity
    let limiter: string | null = null
    for (const [rid, n] of Object.entries(inputs)) {
      // draw rate capped by this dial, by the shared per-resource cap, and by stock on hand
      const g = (gross[rid] ?? 0) * dt
      const byFeed = (feed * g) / n
      const byShared = Math.max(0, (capOf[rid] ?? feed) * g - (drawn[rid] ?? 0)) / n
      const byStock = (s.res[rid] ?? 0) / n
      const mc = Math.min(byFeed, byShared, byStock)
      if (mc < allowed) { allowed = mc; limiter = rid }
    }
    let acc = (s.craftAcc[w.id] ?? 0) + Math.max(0, allowed)
    let whole = Math.floor(acc)
    for (const [rid, n] of Object.entries(inputs)) whole = Math.min(whole, Math.floor((s.res[rid] ?? 0) / n))
    if (whole > 0) {
      for (const [rid, n] of Object.entries(inputs)) { s.res[rid] = Math.max(0, (s.res[rid] ?? 0) - n * whole); consumed[rid] = (consumed[rid] ?? 0) + (n * whole) / dt; drawn[rid] = (drawn[rid] ?? 0) + n * whole }
      const outN = r.output.count * whole
      gain(ci, s, r.output.id, outN)
      gross[r.output.id] = (gross[r.output.id] ?? 0) + outN / dt
      s.crafted[r.id] = (s.crafted[r.id] ?? 0) + whole
      s.stats.craftsTotal += whole
      if (r.output.id === 'lantern') s.lifetimeLanterns += whole
      acc -= whole
    }
    // bank at most two crafts of progress so a starved workshop cannot store a backlog
    s.craftAcc[w.id] = Math.min(acc, 2)
    starved[w.id] = allowed < capacity * 0.5 ? limiter : null
  }
  const net: Record<string, number> = {}
  for (const id of new Set([...Object.keys(gross), ...Object.keys(consumed)])) net[id] = (gross[id] ?? 0) - (consumed[id] ?? 0)
  return { gross, consumed, net, starved }
}

/** Hand-craft one unit at a workshop from stock (ignores feed). Returns units produced (3 on a Masterwork). */
export function handCraft(ci: ContentIndex, s: GameState, station: string, fx: EffectTable, masterwork: boolean): number {
  const w = ci.workshops.get(station)
  if (!w || !s.workshops[station]) return 0
  const r = ci.recipes.get(w.recipe)!
  const inputs = recipeInputs(ci, w.recipe, fx)
  if (!spend(s, inputs)) return 0
  const n = r.output.count * (masterwork ? BALANCE.tap.masterworkMult : 1)
  gain(ci, s, r.output.id, n)
  s.crafted[r.id] = (s.crafted[r.id] ?? 0) + 1
  s.handcrafts[station] = (s.handcrafts[station] ?? 0) + 1
  s.stats.craftsTotal += 1; s.stats.handcraftsTotal += 1
  if (masterwork) { s.masterworks++; s.stats.masterworksTotal++ }
  if (r.output.id === 'lantern') s.lifetimeLanterns += n
  return n
}

/* ---------- runes ---------- */
export function runeTier(s: GameState, id: string) { return s.runes[id] ?? 0 }
export function runeCost(ci: ContentIndex, s: GameState, id: string): Cost {
  const r = ci.runes.get(id)!
  return { [r.good]: Math.ceil(geomCost(r.baseCost, r.costGrowth, runeTier(s, id))) }
}
export function runeAvailable(ci: ContentIndex, s: GameState, id: string): boolean {
  const r = ci.runes.get(id)
  return !!r && runeTier(s, id) < r.maxTier && isUnlocked(ci, s, r.unlock)
}
export function carveRune(ci: ContentIndex, s: GameState, id: string): boolean {
  if (!runeAvailable(ci, s, id)) return false
  if (!spend(s, runeCost(ci, s, id))) return false
  s.runes[id] = runeTier(s, id) + 1
  s.lifetimeRunes++; s.stats.runesTotal++
  return true
}

/* ---------- limbs & annexes ---------- */
export function limbCost(s: GameState): Cost { return { [BALANCE.limbs.good]: Math.ceil(BALANCE.limbs.baseCost * Math.pow(BALANCE.limbs.growth, s.limbsBought)) } }
export function limbsOn(s: GameState, bandId: string) { return s.limbs[bandId] ?? [] }
export function freeLimb(ci: ContentIndex, s: GameState, bandId: string): boolean {
  const b = ci.bandById.get(bandId)
  return !!b && s.boughs.includes(bandId) && limbsOn(s, bandId).length < b.limbSlots
}
export function annexBuilt(s: GameState, id: string): boolean { return Object.values(s.limbs).some((l) => l.includes(id)) }
export function annexAvailable(ci: ContentIndex, s: GameState, id: string, bandId: string): boolean {
  const a = ci.annexes.get(id)
  if (!a || annexBuilt(s, id) || !freeLimb(ci, s, bandId)) return false
  if (a.bandId && a.bandId !== bandId) return false
  if (a.bandId == null && bandId === 'trunk') return false
  return isUnlocked(ci, s, a.unlock)
}
export function annexCost(ci: ContentIndex, s: GameState, id: string): Cost {
  const a = ci.annexes.get(id)!
  return s.annexDiscovered.includes(id) ? scaleCost(a.cost, BALANCE.limbs.rediscoverDiscount) : a.cost
}
/** Sprout a limb on a bough and build an annex on it (one purchase: limb Beams + annex cost). */
export function buildAnnex(ci: ContentIndex, s: GameState, id: string, bandId: string): boolean {
  if (!annexAvailable(ci, s, id, bandId)) return false
  const lc = limbCost(s), ac = annexCost(ci, s, id)
  const total: Cost = { ...ac }
  for (const [r, n] of Object.entries(lc)) total[r] = (total[r] ?? 0) + n
  if (!spend(s, total)) return false
  ;(s.limbs[bandId] ??= []).push(id)
  s.limbsBought++
  if (!s.annexDiscovered.includes(id)) s.annexDiscovered.push(id)
  const a = ci.annexes.get(id)!
  if (a.maxLevel) s.annexLevels[id] = 1
  return true
}
export function annexLevelCost(ci: ContentIndex, s: GameState, id: string): Cost | null {
  const a = ci.annexes.get(id)
  if (!a?.maxLevel) return null
  const lvl = s.annexLevels[id] ?? 0
  if (lvl >= a.maxLevel) return null
  return scaleCost(a.cost, Math.pow(a.levelCostGrowth ?? 1.13, lvl))
}
export function upgradeAnnex(ci: ContentIndex, s: GameState, id: string): boolean {
  if (!annexBuilt(s, id)) return false
  const c = annexLevelCost(ci, s, id)
  if (!c || !spend(s, c)) return false
  s.annexLevels[id] = (s.annexLevels[id] ?? 0) + 1
  return true
}

/** Can the ritual be performed and paid for right now? */
export function performRitualCheck(ci: ContentIndex, s: GameState, bandId: string, fx: EffectTable): boolean {
  const b = ci.bandById.get(bandId)
  if (!b?.ritual || s.boughs.includes(bandId) || s.height < b.line) return false
  const r = BALANCE.ritual
  const k = Math.max(r.absoluteFloor, Math.max(r.seasonFloor, Math.pow(r.seasonDiscount, s.prestige.count)) * mult(fx, 'ritual_cost'))
  for (const [id, n] of Object.entries(b.ritual.cost)) if ((s.res[id] ?? 0) + 1e-9 < Math.ceil(n * k)) return false
  return true
}
