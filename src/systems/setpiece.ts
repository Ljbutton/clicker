import type { SetPieceDef } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import type { Rng } from '@/engine/rng'
import { BALANCE } from '@/content/balance'
import { isUnlocked } from './unlock'
import { applyReward, type Granted } from './milestones'
import { hasMechanic } from './prestige'
import { gain } from './economy'
import { type EffectTable, mult } from './effects'
import { offlineRate } from './offline'

export function eligibleSetPieces(ci: ContentIndex, s: GameState): SetPieceDef[] {
  return ci.raw.setPieces.filter((sp) => {
    if (sp.special === 'gust' && !hasMechanic(ci, s, 'wind')) return false
    if (sp.special === 'lightning' && !hasMechanic(ci, s, 'storm')) return false
    return isUnlocked(ci, s, sp.unlock)
  })
}

function scheduleNext(ci: ContentIndex, s: GameState, rng: Rng, now: number) {
  const pool = eligibleSetPieces(ci, s)
  if (!pool.length) { s.nextSetPieceAt = now + 60; return }
  // pick the set-piece whose own cadence comes soonest (randomized within its range)
  let best = Infinity
  for (const p of pool) best = Math.min(best, p.every[0] + rng.next() * (p.every[1] - p.every[0]))
  s.nextSetPieceAt = Math.max(now + best, BALANCE.setPieces.minPlaySeconds)
}

export function tickSetPiece(ci: ContentIndex, s: GameState, rng: Rng, now: number): 'spawned' | 'expired' | null {
  if (s.setPiece) {
    if (now >= s.setPiece.expiresAt) { s.setPiece = null; scheduleNext(ci, s, rng, now); return 'expired' }
    return null
  }
  if (s.nextSetPieceAt === 0) { scheduleNext(ci, s, rng, now); return null }
  if (now < s.nextSetPieceAt || s.playTime < BALANCE.setPieces.minPlaySeconds) return null
  const pool = eligibleSetPieces(ci, s)
  if (!pool.length) { s.nextSetPieceAt = now + 60; return null }
  // weight toward set-pieces with shorter cadence
  const weights = pool.map((p) => 1 / ((p.every[0] + p.every[1]) / 2))
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng.next() * total
  let def = pool[0]!
  for (let i = 0; i < pool.length; i++) { r -= weights[i]!; if (r <= 0) { def = pool[i]!; break } }
  s.setPiece = { id: def.id, tapsDone: 0, expiresAt: now + Math.min(def.seconds, BALANCE.setPieces.maxOnScreen), x: 0.15 + rng.next() * 0.7, y: 0.15 + rng.next() * 0.45, lastTapAt: 0 }
  return 'spawned'
}

/** Tap the active set-piece. Returns progress and, on completion, the reward. */
export function tapSetPiece(ci: ContentIndex, s: GameState, fx: EffectTable, rng: Rng, now: number, baseRate: number): { done: boolean; progress: number; got?: Granted; def?: SetPieceDef; paid?: number } {
  const a = s.setPiece
  if (!a) return { done: false, progress: 0 }
  const def = ci.setPieces.get(a.id)
  if (!def) { s.setPiece = null; return { done: false, progress: 0 } }
  // woodpecker: taps must be at least 0.25 s apart (any rhythm) to count
  if (def.special === 'woodpecker' && now - a.lastTapAt < 0.25) return { done: false, progress: a.tapsDone / def.taps, def }
  a.tapsDone++; a.lastTapAt = now
  let paid: number | undefined
  if (def.payPerTap) {
    const n = Math.max(1, Math.round(baseRate * (def.reward.incomeSeconds ?? 10)))
    gain(ci, s, ci.baseResource, n); paid = n
  }
  if (a.tapsDone >= def.taps) {
    s.setPiece = null
    s.setPieceCounts[def.id] = (s.setPieceCounts[def.id] ?? 0) + 1
    s.stats.setPiecesTotal++
    if (def.special === 'gust') s.stats.gusts++
    scheduleNext(ci, s, rng, now)
    let got: Granted
    if (def.special === 'acorn') {
      // 15 min (30 with Golden Hours) of offline-rate production instantly
      const minutes = BALANCE.bloom ? (15 + (mult(fx, 'acorn_minutes') > 1 ? 15 : 0)) : 15
      const secs = minutes * 60 * offlineRate(fx)
      const n = Math.max(10, Math.round(baseRate * secs))
      gain(ci, s, ci.baseResource, n)
      got = { resources: { [ci.baseResource]: n } }
    } else if (def.payPerTap) {
      got = {}
    } else {
      const reward = { ...def.reward }
      if (def.special === 'star' && (s.setPieceCounts[def.id] ?? 0) <= 3) reward.chest = 'star'
      got = applyReward(ci, s, reward, now, baseRate)
    }
    return { done: true, progress: 1, got, def, paid }
  }
  return { done: false, progress: a.tapsDone / def.taps, def, paid }
}
