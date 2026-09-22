import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import type { Rng } from '@/engine/rng'
import { BALANCE } from '@/content/balance'
import { type EffectTable, mult, add } from './effects'
import { gain } from './economy'
import { bandAt } from './grow'

export interface TapResult {
  value: number
  burst: boolean
  combo: number
  comboMult: number
  drop: { id: string; amount: number } | null
  bloom: boolean
}

export function comboMult(count: number): number {
  let m = 1
  for (const [n, k] of BALANCE.tap.comboSteps) if (count >= n) m = k
  return m
}

/** Value of one (non-burst) tap right now. */
export function tapValue(ci: ContentIndex, s: GameState, fx: EffectTable, idleRate: number): number {
  const t = BALANCE.tap
  const base = (t.base + add(fx, 'tap')) * mult(fx, 'tap') * mult(fx, 'all_production')
  const peg = idleRate * t.idlePegSeconds
  return Math.max(base, peg)
}

export function burstChance(fx: EffectTable): number {
  return Math.min(0.5, BALANCE.tap.burstChance + add(fx, 'tap_burst_chance'))
}

/** Process a tap on the tip. `idleRate` is the base-resource production rate (for the idle peg). */
export function tap(ci: ContentIndex, s: GameState, fx: EffectTable, rng: Rng, now: number, idleRate: number): TapResult {
  const t = BALANCE.tap
  // combo
  const since = now - s.combo.lastTapAt
  if (since <= t.comboWindow * mult(fx, 'combo_window')) s.combo.count++
  else s.combo.count = 1
  s.combo.lastTapAt = now
  if (s.combo.count > s.combo.best) s.combo.best = s.combo.count
  const cm = comboMult(s.combo.count)

  s.taps++; s.stats.tapsTotal++
  const burst = s.taps % t.burstEvery === 0 || rng.chance(burstChance(fx))
  let value = tapValue(ci, s, fx, idleRate) * cm
  if (burst) { value *= t.burstMult; s.bursts++; s.stats.burstsTotal++ }
  gain(s, ci.baseResource, value)

  // band drop
  let drop: TapResult['drop'] = null
  const band = bandAt(ci, s.height)
  if (band.drops.length && (burst || rng.chance(t.dropChance * mult(fx, 'drop_chance')))) {
    const total = band.drops.reduce((a, d) => a + d.weight, 0)
    let r = rng.next() * total
    let pick = band.drops[0]!
    for (const d of band.drops) { r -= d.weight; if (r <= 0) { pick = d; break } }
    const amount = burst ? 3 + rng.int(0, 2) : 1
    gain(s, pick.id, amount)
    drop = { id: pick.id, amount }
  }

  // cheer window
  if (s.height >= BALANCE.cheer.unlockHeight) { s.cheer.active = true; s.cheer.until = Math.max(s.cheer.until, now + BALANCE.cheer.windowSeconds) }

  const bloom = s.taps % t.bloomEvery === 0
  return { value, burst, combo: s.combo.count, comboMult: cm, drop, bloom }
}

/** Per-tick combo decay and cheer stamina. */
export function tickTap(s: GameState, fx: EffectTable, dt: number, now: number, holding: boolean) {
  if (s.combo.count > 0 && now - s.combo.lastTapAt > BALANCE.tap.comboDecay) s.combo.count = 0
  const c = BALANCE.cheer
  const maxStam = c.staminaSeconds * mult(fx, 'cheer_stamina')
  if (holding && s.height >= c.unlockHeight && s.cheer.stamina > 0) {
    s.cheer.stamina = Math.max(0, s.cheer.stamina - dt / maxStam)
    s.cheer.active = true; s.cheer.until = Math.max(s.cheer.until, now + 0.25)
  } else {
    s.cheer.stamina = Math.min(1, s.cheer.stamina + dt / c.staminaRefillSeconds)
  }
  if (s.cheer.active && now >= s.cheer.until) s.cheer.active = false
}
