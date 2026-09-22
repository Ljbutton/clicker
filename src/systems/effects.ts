import type { Effect } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'

/** Aggregated multipliers/adds per target. Rebuilt whenever state that affects effects changes. */
export interface EffectTable { mult: Record<string, number>; add: Record<string, number> }

export function emptyEffects(): EffectTable { return { mult: {}, add: {} } }

function apply(t: EffectTable, e: Effect, times: number) {
  if (times <= 0) return
  if (e.op === 'mult') t.mult[e.target] = (t.mult[e.target] ?? 1) * Math.pow(e.value, times)
  else t.add[e.target] = (t.add[e.target] ?? 0) + e.value * times
}

export function buildEffects(ci: ContentIndex, s: GameState, now: number): EffectTable {
  const t = emptyEffects()
  for (const [id, tier] of Object.entries(s.boosts)) { const b = ci.boosts.get(id); if (b && tier > 0) apply(t, b.effect, tier) }
  for (const [id, lvl] of Object.entries(s.buildings)) { const b = ci.buildings.get(id); if (b && lvl > 0) for (const e of b.perLevel) apply(t, e, lvl) }
  for (const [id, lvl] of Object.entries(s.prestige.nodes)) { const n = ci.prestigeNodes.get(id); if (n?.effect && lvl > 0) apply(t, n.effect, lvl) }
  for (const tok of s.tokens) if (tok.until > now) apply(t, { target: 'all_production', op: 'mult', value: tok.value }, 1)
  if (s.cheer.active && s.cheer.until > now) apply(t, { target: 'all_production', op: 'mult', value: BALANCE.cheer.mult }, 1)
  return t
}

export const mult = (t: EffectTable, target: string) => t.mult[target] ?? 1
export const add = (t: EffectTable, target: string) => t.add[target] ?? 0
