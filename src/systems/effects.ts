import type { Effect, EffectTarget } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'

/** Aggregated multipliers/adds per target. */
export interface EffectTable { mult: Partial<Record<string, number>>; add: Partial<Record<string, number>>; bandMult: Record<string, number> }

export function emptyEffects(): EffectTable { return { mult: {}, add: {}, bandMult: {} } }

function apply(t: EffectTable, e: Effect, times: number) {
  if (times <= 0) return
  if (e.op === 'mult') t.mult[e.target] = (t.mult[e.target] ?? 1) * Math.pow(e.value, times)
  else t.add[e.target] = (t.add[e.target] ?? 0) + e.value * times
}

export function mult(t: EffectTable, target: EffectTarget | string): number { return t.mult[target] ?? 1 }
export function add(t: EffectTable, target: EffectTarget | string): number { return t.add[target] ?? 0 }

/** Lit boughs this Season from Lanterns crafted. */
export function litBoughs(ci: ContentIndex, s: GameState, fx?: EffectTable): number {
  const every = Math.max(1, BALANCE.lanterns.litEvery * (fx ? mult(fx, 'lit_every') : 1))
  return Math.min(BALANCE.lanterns.maxLit, Math.floor((s.crafted['lantern'] ?? 0) / every))
}

/**
 * Fold every multiplier source into one table: Runes, Ring passive, Ring Tree, lit boughs, annex levels,
 * tokens, Resonance, Rally, droplet, Dawn Rush, season events (Snowfall, Storm), Bloom (per bough).
 */
export function buildEffects(ci: ContentIndex, s: GameState, now: number, steady = false): EffectTable {
  const t = emptyEffects()
  for (const [id, tier] of Object.entries(s.runes)) { const r = ci.runes.get(id); if (r && tier > 0) apply(t, r.effect, tier) }
  for (const [id, lvl] of Object.entries(s.prestige.nodes)) { const n = ci.prestigeNodes.get(id); if (n?.effect && lvl > 0) apply(t, n.effect, lvl) }
  for (const [id, lvl] of Object.entries(s.annexLevels)) { const a = ci.annexes.get(id); if (a?.perLevel && lvl > 0) for (const e of a.perLevel) apply(t, e, lvl) }
  // ring passive: +5% per lifetime ring, additive then multiplied
  if (s.prestige.lifetimeRings > 0) apply(t, { target: 'all_production', op: 'mult', value: 1 + BALANCE.prestige.ringPassive * s.prestige.lifetimeRings }, 1)
  // lit boughs
  const lit = litBoughs(ci, s, t)
  if (lit > 0) apply(t, { target: 'all_production', op: 'mult', value: 1 + BALANCE.lanterns.litBonus * lit }, 1)
  // temporary
  // x2 tokens stack in duration, not value: only the strongest active token applies
  let tokMax = 1
  for (const tok of s.tokens) if (tok.until > now && tok.value > tokMax) tokMax = tok.value
  if (steady) return t
  // temporary boosts apply to Folk and crews (raws + crafting), never to strikes (strikes are pegged to idle income)
  const boost = (v: number) => { apply(t, { target: 'raw_production', op: 'mult', value: v }, 1); apply(t, { target: 'craft_throughput', op: 'mult', value: v }, 1) }
  if (tokMax > 1) boost(tokMax)
  if (s.resonanceUntil > now) boost(BALANCE.tap.resonanceMult * mult(t, 'resonance_mult'))
  if (s.rally.holding && s.rally.stamina > 0 && now - s.rally.since >= BALANCE.rally.holdMs / 1000) boost(BALANCE.rally.mult)
  if (s.dropletBoostUntil > now) apply(t, { target: 'craft_throughput', op: 'mult', value: BALANCE.tap.dropletBoostMult }, 1)
  if (s.dawnRushUntil > now) apply(t, { target: 'tap', op: 'mult', value: BALANCE.tap.dawnRushMult }, 1)
  if (s.frost.snowUntil > now) apply(t, { target: 'craft_throughput', op: 'mult', value: BALANCE.frost.snowMult }, 1)
  // bloom wave: boughs the front passed within boostSeconds get x4
  if (s.bloom.active) {
    const elapsed = now - s.bloom.startedAt
    for (const b of ci.bands) {
      if (!s.boughs.includes(b.id)) continue
      const passedAt = (b.index - 1) * BALANCE.bloom.perBough
      if (elapsed >= passedAt && elapsed < passedAt + BALANCE.bloom.boostSeconds) t.bandMult[b.id] = BALANCE.bloom.mult
    }
  }
  return t
}
