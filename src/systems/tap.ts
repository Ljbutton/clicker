import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import type { Rng } from '@/engine/rng'
import { BALANCE } from '@/content/balance'
import { type EffectTable, mult, add } from './effects'
import { gain, handCraft } from './economy'
import { bandAt } from './grow'

export interface StrikeResult {
  value: number
  crit: boolean
  thrum: number
  thrumMult: number
  resonance: boolean
  drop: { id: string; amount: number } | null
  bloom: boolean
  droplet: boolean
}

export function thrumMult(thrum: number): number {
  let m = 1
  for (const [n, k] of BALANCE.tap.thrumSteps) if (thrum >= n) m = k
  return m
}

export function thrumUnlocked(s: GameState): boolean {
  return s.prestige.count > 0 || s.laneIndex > BALANCE.tap.thrumUnlockGoal || !!s.workshops['sawmill']
}

export function critChance(fx: EffectTable): number {
  return Math.min(0.5, BALANCE.tap.critChance + add(fx, 'crit_chance'))
}

/** Value of a non-crit Strike right now. */
export function strikeValue(s: GameState, fx: EffectTable, idleSap: number): number {
  const t = BALANCE.tap
  const peg = t.peg * mult(fx, 'tap_peg')
  // pegged to idle income (which already carries every production multiplier), so only tap-specific multipliers apply here
  return t.base * Math.max(1, peg * idleSap) * thrumMult(thrumUnlocked(s) ? s.thrum : 0) * mult(fx, 'tap')
}

/** Process a Strike on the trunk. `idleSap` = current Sapper-lodge output per second. */
export function strike(ci: ContentIndex, s: GameState, fx: EffectTable, rng: Rng, now: number, idleSap: number): StrikeResult {
  const t = BALANCE.tap
  s.strikes++; s.stats.strikesTotal++
  // thrum
  let resonance = false
  if (thrumUnlocked(s)) {
    s.thrum = Math.min(100, s.thrum + t.thrumPerStrike)
    s.thrumLastAt = now
    if (s.thrum >= 100) {
      resonance = true
      s.thrum = 0
      s.resonanceUntil = now + t.resonanceSeconds + add(fx, 'resonance_seconds')
      s.resonances++; s.stats.resonancesTotal++
    }
  }
  const tm = thrumMult(thrumUnlocked(s) ? s.thrum : 0)
  const crit = s.strikes % t.critEvery === 0 || rng.chance(critChance(fx))
  let value = strikeValue(s, fx, idleSap)
  let droplet = false
  if (crit) {
    value *= t.critMult
    s.crits++; s.stats.critsTotal++
    if (!s.droplet) { s.droplet = { until: now + t.dropletSeconds, x: 0.5, y: 0.3 }; droplet = true }
  }
  gain(ci, s, ci.baseResource, value)
  // band drop
  let drop: StrikeResult['drop'] = null
  const band = bandAt(ci, s)
  if (band.drops.length && t.dropChance > 0 && rng.chance(t.dropChance)) {
    const total = band.drops.reduce((a, d) => a + d.weight, 0)
    let r = rng.next() * total
    let pick = band.drops[0]!
    for (const d of band.drops) { r -= d.weight; if (r <= 0) { pick = d; break } }
    const amount = crit ? 3 : 1
    gain(ci, s, pick.id, amount)
    drop = { id: pick.id, amount }
  }
  const bloom = s.strikes % t.bloomEvery === 0
  return { value, crit, thrum: s.thrum, thrumMult: tm, resonance, drop, bloom, droplet }
}

/** Tap the amber droplet: +100% crafting for 30 s. */
export function tapDroplet(s: GameState, now: number): boolean {
  if (!s.droplet || s.droplet.until < now) { s.droplet = null; return false }
  s.droplet = null
  s.dropletBoostUntil = now + BALANCE.tap.dropletBoostSeconds
  return true
}

/** Per-tick: Thrum drain, droplet expiry, Rally stamina, Auto-Thrum. */
export function tickTap(s: GameState, fx: EffectTable, dt: number, now: number): { autoResonance: boolean } {
  const t = BALANCE.tap
  if (s.thrum > 0 && now - s.thrumLastAt > t.thrumIdleBeforeDrain) s.thrum = Math.max(0, s.thrum - t.thrumDrainPerSec * dt)
  if (s.droplet && s.droplet.until < now) s.droplet = null
  // rally
  const r = BALANCE.rally
  const maxStam = r.staminaSeconds + add(fx, 'rally_stamina')
  const refill = r.refillSeconds / mult(fx, 'rally_refill')
  if (s.rally.holding && s.rally.stamina > 0 && now - s.rally.since >= r.holdMs / 1000) s.rally.stamina = Math.max(0, s.rally.stamina - dt / maxStam)
  else if (!s.rally.holding) s.rally.stamina = Math.min(1, s.rally.stamina + dt / refill)
  // auto-thrum
  let autoResonance = false
  if (mult(fx, 'auto_thrum') > 1 && now - s.lastAutoThrumAt >= t.autoThrumEvery && s.resonanceUntil < now) {
    s.lastAutoThrumAt = now
    s.resonanceUntil = now + t.resonanceSeconds + add(fx, 'resonance_seconds')
    s.resonances++; s.stats.resonancesTotal++
    autoResonance = true
  }
  return { autoResonance }
}

export function rallyUnlocked(s: GameState): boolean { return s.boughs.includes(BALANCE.rally.unlockBough) }

/** Tap a workshop hut: hand-craft one unit, with a Masterwork chance. */
export function tapWorkshop(ci: ContentIndex, s: GameState, fx: EffectTable, rng: Rng, station: string): { made: number; masterwork: boolean } {
  const chance = Math.min(0.5, BALANCE.tap.masterworkChance + add(fx, 'masterwork_chance'))
  const mw = rng.chance(chance)
  const made = handCraft(ci, s, station, fx, mw)
  return { made, masterwork: made > 0 && mw }
}
