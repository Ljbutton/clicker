import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { type EffectTable, add, mult } from './effects'
import { stepEconomy } from './economy'
import { hasMechanic } from './prestige'
import { annexBuilt } from './economy'

export interface OfflineSummary {
  elapsed: number
  simulated: number
  rate: number
  cap: number
  gained: Record<string, number>
  crafted: Record<string, number>
  capped: boolean
  frozenSeconds: number
}

export function offlineRate(fx: EffectTable): number { return Math.min(1, BALANCE.offline.rate + add(fx, 'offline_rate_add')) }
export function offlineCapSeconds(fx: EffectTable): number { return Math.min(BALANCE.offline.maxCapHours, BALANCE.offline.capHours + add(fx, 'offline_cap_add')) * 3600 }

/**
 * Nightwatch: run the same stepEconomy used live, in 60 s steps, for min(elapsed, cap) seconds with the offline
 * multiplier on lodge output. Production beyond the cap goes to the Frost Cellar (if built) as frozen income-seconds.
 */
export function applyOffline(ci: ContentIndex, s: GameState, fx: EffectTable, elapsed: number): OfflineSummary {
  const gained: Record<string, number> = {}
  const crafted: Record<string, number> = {}
  const rate = offlineRate(fx), cap = offlineCapSeconds(fx)
  if (!(elapsed > BALANCE.offline.minSeconds) || elapsed > 30 * 86400) return { elapsed: Math.max(0, elapsed), simulated: 0, rate, cap, gained, crafted, capped: false, frozenSeconds: 0 }
  const simulated = Math.min(elapsed, cap)
  const steps = Math.min(BALANCE.offline.maxSteps, Math.max(1, Math.ceil(simulated / BALANCE.offline.step)))
  const dt = simulated / steps
  const before = { ...s.res }
  const craftedBefore = { ...s.crafted }
  for (let i = 0; i < steps; i++) stepEconomy(ci, s, fx, dt, rate)
  for (const id of new Set([...Object.keys(before), ...Object.keys(s.res)])) { const d = (s.res[id] ?? 0) - (before[id] ?? 0); if (d > 1e-9) gained[id] = d }
  for (const [id, n] of Object.entries(s.crafted)) { const d = n - (craftedBefore[id] ?? 0); if (d > 1e-9) crafted[ci.recipes.get(id)?.output.id ?? id] = d }
  s.stats.offlineEarned += gained[ci.baseResource] ?? 0
  // Frost Cellar overflow
  let frozenSeconds = 0
  if (elapsed > cap && hasMechanic(ci, s, 'frost') && annexBuilt(s, 'frost_cellar')) {
    const cellar = (BALANCE.frost.cellarHours + add(fx, 'cellar_hours')) * 3600
    frozenSeconds = Math.min(elapsed - cap, cellar) * rate
    s.frost.frozenSeconds += frozenSeconds
    s.frost.frozenAt = s.playTime
    s.frost.thawTaps = 0
  }
  return { elapsed, simulated, rate, cap, gained, crafted, capped: elapsed > cap, frozenSeconds }
}
export { mult }
