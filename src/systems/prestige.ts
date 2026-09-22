import type { GameState } from '@/engine/state'
import { seasonDefaults } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { geomCost } from '@/engine/numbers'

/** rings = floor( mult · (log10(max(HW,K)/K))^exp ) */
export function ringsFor(heartwood: number): number {
  const p = BALANCE.prestige
  if (!(heartwood > p.K)) return 0
  return Math.floor(p.mult * Math.pow(Math.log10(heartwood / p.K), p.exponent))
}
/** Heartwood needed for `rings` Rings. */
export function heartwoodFor(rings: number): number {
  const p = BALANCE.prestige
  if (rings <= 0) return p.K
  return p.K * Math.pow(10, Math.pow(rings / p.mult, 1 / p.exponent))
}
export function ringsNow(s: GameState): number { return ringsFor(s.heartwood) }
export function canTurn(s: GameState): boolean { return ringsNow(s) >= BALANCE.prestige.minRings }

export function nodeLevel(s: GameState, id: string) { return s.prestige.nodes[id] ?? 0 }
export function nodeCost(ci: ContentIndex, s: GameState, id: string): number {
  const n = ci.prestigeNodes.get(id)!
  return Math.ceil(geomCost(n.baseCost, n.costGrowth, nodeLevel(s, id)))
}
export function nodeVisible(ci: ContentIndex, s: GameState, id: string): boolean {
  const n = ci.prestigeNodes.get(id)
  if (!n) return false
  if (n.requiresSeason && s.prestige.count < n.requiresSeason) return false
  if (n.requiresNode && nodeLevel(s, n.requiresNode) <= 0) return false
  if (n.mechanic) { const m = ci.mechanics.get(n.mechanic); if (m && (!m.implemented || s.prestige.count < m.atTurn)) return false }
  return true
}
export function buyNode(ci: ContentIndex, s: GameState, id: string): boolean {
  const n = ci.prestigeNodes.get(id)
  if (!n || !nodeVisible(ci, s, id) || nodeLevel(s, id) >= n.maxLevel) return false
  const cost = nodeCost(ci, s, id)
  if (s.prestige.rings < cost) return false
  s.prestige.rings -= cost
  s.prestige.nodes[id] = nodeLevel(s, id) + 1
  return true
}

/** Mechanics unlocked by Turn count. */
export function activeMechanics(ci: ContentIndex, s: GameState): string[] {
  return ci.raw.mechanics.filter((m) => m.implemented && m.atTurn > 0 && s.prestige.count >= m.atTurn).map((m) => m.id)
}
export function hasMechanic(ci: ContentIndex, s: GameState, id: string): boolean {
  const m = ci.mechanics.get(id)
  return !!m && m.implemented && s.prestige.count >= m.atTurn
}

/** Turn the Season: pay Rings, reset the run, apply persistent starting bonuses. Returns Rings gained (0 if not allowed). */
export function turnSeason(ci: ContentIndex, s: GameState, now: number): number {
  const gained = ringsNow(s)
  if (gained < BALANCE.prestige.minRings) return 0
  s.prestige.rings += gained
  s.prestige.lifetimeRings += gained
  s.prestige.count++
  s.stats.seasons++
  const keptRunes: Record<string, number> = {}
  const deep = nodeLevel(s, 'canopy_carve')
  if (deep > 0) for (const [id, tier] of Object.entries(s.runes)) { const k = Math.min(tier, deep); if (k > 0) keptRunes[id] = k }
  const feed = s.feed
  const prevLimbs = s.limbs
  void prevLimbs
  Object.assign(s, seasonDefaults(now))
  s.feed = feed
  s.runes = keptRunes
  // Head Start: +5 Sappers per level
  const hs = nodeLevel(s, 'roots_start')
  if (hs > 0) s.producers['sapper'] = 5 * hs
  // Sprout: start at 30 m with Bough 2 open (then 60 m + Bough 3)
  const sprout = nodeLevel(s, 'crown_sprout')
  if (sprout >= 1) { s.height = Math.max(s.height, 30); if (!s.boughs.includes('roots')) s.boughs.push('roots') }
  if (sprout >= 2) { s.height = Math.max(s.height, 60); if (!s.boughs.includes('canopy')) s.boughs.push('canopy') }
  // Kept Foremen: workshops built and staffed
  const kept = nodeLevel(s, 'canopy_kept')
  const tiers: string[][] = [['kiln', 'sawmill'], ['brickyard', 'ropewalk'], ['beamworks', 'glasshouse']]
  for (let i = 0; i < kept && i < tiers.length; i++) for (const w of tiers[i]!) {
    const def = ci.workshops.get(w)
    if (!def) continue
    if (!s.boughs.includes(def.bandId)) continue
    s.workshops[w] = true
    const crew = ci.crewByStation.get(w); if (crew) s.producers[crew.id] = Math.max(1, s.producers[crew.id] ?? 0)
  }
  s.nextSetPieceAt = now + BALANCE.setPieces.minPlaySeconds
  return gained
}
