import type { Cost } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import type { EffectTable } from './effects'
import { producerCost, buildingCost, boostCost, bottleneck, canBuild, nextBreakpoint, producerCount, buildingLevel, boostTier } from './economy'
import { growsToHeight, nextBand } from './grow'
import { isUnlocked } from './unlock'
import { prestigeGain, heightForGain, canPrestige } from './prestige'
import { recipeAvailable } from './craft'

export type GoalKind = 'band' | 'producer' | 'breakpoint' | 'building' | 'upgrade' | 'boost' | 'prestige' | 'height'

export interface Goal {
  kind: GoalKind
  id: string
  name: string
  glyph: string
  /** Where the UI should navigate when the goal is tapped. */
  tab: 'grow' | 'hatch' | 'craft' | 'tree'
  cost: Cost
  bottleneck: { id: string; have: number; need: number }
  /** Seconds until affordable at current net rates; Infinity when the bottleneck has no income. */
  eta: number
  /** True when the goal is affordable right now. */
  ready: boolean
  /** True when this goal unlocks new content (preferred over pure upgrades). */
  fresh: boolean
  /** A suggested sub-step when the ETA is long ("hatch a 2nd Barker"). */
  hint?: string
}

function eta(cost: Cost, s: GameState, rates: Record<string, number>): number {
  let worst = 0
  for (const [id, need] of Object.entries(cost)) {
    const gap = need - (s.res[id] ?? 0)
    if (gap <= 0) continue
    const r = rates[id] ?? 0
    if (r <= 0) return Infinity
    worst = Math.max(worst, gap / r)
  }
  return worst
}

/** Rates including estimated auto-crafted output so crafted-goods goals get a finite ETA. */
export function goalRates(ci: ContentIndex, s: GameState, fx: EffectTable, production: Record<string, number>): Record<string, number> {
  const rates = { ...production }
  for (const b of ci.raw.buildings) {
    if (!b.recipes.length || buildingLevel(s, b.id) <= 0) continue
    const crafter = ci.craftersByStation.get(b.id)
    if (!crafter || producerCount(s, crafter.id) <= 0) continue
    const q = s.queues[b.id]
    const r = q && q[0] ? ci.recipes.get(q[0].recipeId) : (ci.recipesByStation.get(b.id) ?? []).find((x) => recipeAvailable(ci, s, x))
    if (!r) continue
    const n = producerCount(s, crafter.id)
    const speed = (1 + (n - 1) * BALANCE.producers.crafterSpeedPerExtra) * (fx.mult['craft_speed'] ?? 1)
    // bounded by the slowest input's supply
    let perSec = (r.output.count / r.seconds) * speed
    for (const [id, need] of Object.entries(r.inputs)) { const supply = (rates[id] ?? 0) / need; if ((s.res[id] ?? 0) < need * 3) perSec = Math.min(perSec, supply * r.output.count) }
    rates[r.output.id] = (rates[r.output.id] ?? 0) + perSec
  }
  return rates
}

/** Enumerate every goal the player could pursue right now. */
export function candidateGoals(ci: ContentIndex, s: GameState, fx: EffectTable, rates: Record<string, number>): Goal[] {
  const goals: Goal[] = []
  const base = ci.baseResource
  const mk = (g: Omit<Goal, 'bottleneck' | 'eta' | 'ready'>): Goal => ({ ...g, bottleneck: bottleneck(ci, s, g.cost), eta: eta(g.cost, s, rates), ready: Object.entries(g.cost).every(([id, n]) => (s.res[id] ?? 0) >= n) })

  // next band
  const nb = nextBand(ci, s.height)
  if (nb) { const g = growsToHeight(s, fx, nb.minHeight); goals.push(mk({ kind: 'band', id: nb.id, name: `Reach ${nb.name}`, glyph: nb.glyph, tab: 'grow', cost: { [base]: g.cost }, fresh: true })) }

  // buildings below current height not yet built, and locked buildings above (as height goals)
  for (const b of ci.raw.buildings) {
    const lvl = buildingLevel(s, b.id)
    if (lvl === 0 && s.height < b.height) {
      const g = growsToHeight(s, fx, b.height)
      if (!nb || b.height < nb.minHeight) goals.push(mk({ kind: 'height', id: b.id, name: `Grow to ${b.height} m for ${b.name}`, glyph: b.glyph, tab: 'grow', cost: { [base]: g.cost }, fresh: true }))
    } else if (canBuild(ci, s, b.id)) {
      if (lvl === 0) goals.push(mk({ kind: 'building', id: b.id, name: `Build ${b.name}`, glyph: b.glyph, tab: 'hatch', cost: buildingCost(ci, s, b.id, fx), fresh: true }))
      else if (lvl < 3 || lvl % 5 === 4) goals.push(mk({ kind: 'upgrade', id: b.id, name: `${b.name} Lv ${lvl + 1}`, glyph: b.glyph, tab: 'hatch', cost: buildingCost(ci, s, b.id, fx), fresh: false }))
    }
  }

  // producers: first purchase (fresh) and next breakpoint
  for (const p of ci.raw.producers) {
    if (!isUnlocked(ci, s, p.unlock)) continue
    const n = producerCount(s, p.id)
    if (n === 0) goals.push(mk({ kind: 'producer', id: p.id, name: `Hatch ${p.name}`, glyph: p.glyph, tab: 'hatch', cost: producerCost(ci, s, p.id, fx, 1), fresh: true }))
    else { const bp = nextBreakpoint(ci, p.id, n); if (bp) goals.push(mk({ kind: 'breakpoint', id: p.id, name: `${p.name} ×${bp}`, glyph: p.glyph, tab: 'hatch', cost: producerCost(ci, s, p.id, fx, bp - n), fresh: false })) }
  }

  // boosts: next tier
  for (const b of ci.raw.boosts) {
    if (!isUnlocked(ci, s, b.unlock)) continue
    const t = boostTier(s, b.id)
    if (t >= b.maxTier) continue
    goals.push(mk({ kind: 'boost', id: b.id, name: `${b.name} ${t + 1 > 1 ? 'II III IV V VI VII VIII IX X'.split(' ')[t - 1] ?? `T${t + 1}` : ''}`.trim(), glyph: b.glyph, tab: 'grow', cost: boostCost(ci, s, b.id), fresh: t === 0 }))
  }

  // prestige: when it would pay at least 1 (or the next +1)
  if (s.height >= BALANCE.prestige.minHeight * 0.5) {
    const now = prestigeGain(s, fx)
    const target = heightForGain(now + 1)
    const g = growsToHeight(s, fx, target)
    goals.push(mk({ kind: 'prestige', id: 'prestige', name: now >= 1 ? `Replant for ${now + 1}` : 'Unlock Replant', glyph: '🌱', tab: 'tree', cost: { [base]: g.cost }, fresh: now === 0 }))
  }
  return goals
}

/** Pick the compass goal: the soonest-affordable goal, preferring ones that unlock something new, with a sub-step hint when everything is far. */
export function pickGoals(ci: ContentIndex, s: GameState, fx: EffectTable, rates: Record<string, number>): { primary: Goal | null; then: Goal[] } {
  const all = candidateGoals(ci, s, fx, rates).filter((g) => !g.ready || g.fresh)
  if (!all.length) return { primary: null, then: [] }
  // With no income for a resource the ETA is infinite; rank those by how much value is still missing (the player can tap for it).
  const gapWorth = (g: Goal) => Object.entries(g.cost).reduce((a, [id, n]) => a + Math.max(0, n - (s.res[id] ?? 0)) * (ci.resources.get(id)?.worth ?? 1), 0)
  const score = (g: Goal) => (g.ready ? 0 : Number.isFinite(g.eta) ? g.eta : 1e9 + gapWorth(g)) * (g.fresh ? 0.5 : 1) * (g.kind === 'prestige' ? 1.5 : 1)
  all.sort((a, b) => score(a) - score(b))
  const list = all
  const primary = list[0]!
  if (primary.eta > BALANCE.compass.maxEtaSeconds || !Number.isFinite(primary.eta)) {
    // suggest a sub-step: the cheapest producer of the bottleneck resource
    const bn = primary.bottleneck.id
    const producers = ci.raw.producers.filter((p) => p.kind === 'gatherer' && p.produces?.id === bn && isUnlocked(ci, s, p.unlock))
    const cheapest = producers.map((p) => ({ p, c: producerCost(ci, s, p.id, fx, 1) })).sort((a, b) => eta(a.c, s, rates) - eta(b.c, s, rates))[0]
    if (cheapest) primary.hint = `Hatch a ${producerCount(s, cheapest.p.id) > 0 ? 'nother' : ''} ${cheapest.p.name} to speed this up`.replace('a nother', 'another')
    else if (!Number.isFinite(primary.eta)) primary.hint = `You need a source of ${ci.resources.get(bn)?.name ?? bn}`
  }
  return { primary, then: list.slice(1, 3) }
}

export { canPrestige }
