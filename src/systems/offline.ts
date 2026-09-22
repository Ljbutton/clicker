import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { type EffectTable, mult, add } from './effects'
import { productionRates, gain } from './economy'
import { tickCraft } from './craft'

export interface OfflineSummary { elapsed: number; effective: number; gained: Record<string, number>; crafted: Record<string, number>; capped: boolean }

/** Effective productive seconds for an absence of `elapsed` seconds under the rate windows. */
export function effectiveOfflineSeconds(elapsed: number, fx: EffectTable): { effective: number; capped: boolean } {
  const o = BALANCE.offline
  const rate = mult(fx, 'offline_rate')
  const capH = (o.capHours + add(fx, 'offline_cap')) * mult(fx, 'offline_cap')
  const fullH = o.fullRateHours + add(fx, 'offline_cap') * 0.25
  const e = Math.min(elapsed, capH * 3600)
  const full = Math.min(e, fullH * 3600)
  const half = Math.max(0, Math.min(e, o.halfRateHours * 3600) - fullH * 3600)
  const quarter = Math.max(0, e - Math.max(fullH, o.halfRateHours) * 3600)
  return { effective: (full + half * 0.5 + quarter * o.quarterRate) * rate, capped: elapsed > capH * 3600 }
}

/**
 * Apply offline progress: gatherers produce in closed form; automated crafting runs in coarse steps
 * interleaved with production so chains progress (not just raw piles). GROW never happens offline.
 */
export function applyOffline(ci: ContentIndex, s: GameState, fx: EffectTable, elapsed: number): OfflineSummary {
  const gained: Record<string, number> = {}
  const crafted: Record<string, number> = {}
  if (elapsed <= 5) return { elapsed, effective: 0, gained, crafted, capped: false }
  const { effective, capped } = effectiveOfflineSeconds(elapsed, fx)
  const rates = productionRates(ci, s, fx)
  const hasAuto = ci.raw.buildings.some((b) => b.recipes.length && (s.buildings[b.id] ?? 0) > 0 && ci.craftersByStation.get(b.id) && (s.producers[ci.craftersByStation.get(b.id)!.id] ?? 0) > 0)
  const o = BALANCE.offline
  let steps = hasAuto ? Math.ceil(effective / o.craftStep) : 1
  if (steps > o.maxCraftSteps) steps = o.maxCraftSteps
  const step = effective / Math.max(1, steps)
  const before = { ...s.res }
  for (let i = 0; i < steps; i++) {
    for (const [id, r] of Object.entries(rates)) gain(s, id, r * step)
    if (hasAuto) for (const d of tickCraft(ci, s, fx, step)) crafted[d.id] = (crafted[d.id] ?? 0) + d.count
  }
  for (const id of new Set([...Object.keys(before), ...Object.keys(s.res)])) {
    const diff = (s.res[id] ?? 0) - (before[id] ?? 0)
    if (diff > 1e-9) gained[id] = diff
  }
  s.stats.offlineEarned += gained[ci.baseResource] ?? 0
  return { elapsed, effective, gained, crafted, capped }
}
