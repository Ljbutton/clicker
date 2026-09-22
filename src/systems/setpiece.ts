import type { SetPieceDef } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import type { Rng } from '@/engine/rng'
import { bandAt } from './grow'
import { applyReward } from './milestones'
import { isUnlocked } from './unlock'

/** Set-pieces are short tap-only events (bee swarm, cloud-crab...) native to the current band. Taps are never mandatory: every reward has an idle equivalent. */
export function eligibleSetPieces(ci: ContentIndex, s: GameState): SetPieceDef[] {
  const band = bandAt(ci, s.height)
  const reached = new Set(ci.bands.filter((b) => b.minHeight <= s.height).map((b) => b.id))
  return ci.raw.setPieces.filter((sp) => reached.has(sp.bandId) && (sp.bandId === band.id || s.prestige.count >= 1))
}

export function tickSetPiece(ci: ContentIndex, s: GameState, rng: Rng, now: number): 'spawned' | 'expired' | null {
  if (s.setPiece) {
    if (now >= s.setPiece.expiresAt) { s.setPiece = null; scheduleNext(ci, s, rng, now); return 'expired' }
    return null
  }
  if (s.nextSetPieceAt === 0) { scheduleNext(ci, s, rng, now); return null }
  if (now < s.nextSetPieceAt) return null
  const pool = eligibleSetPieces(ci, s)
  if (!pool.length) { s.nextSetPieceAt = now + 30; return null }
  const sp = rng.pick(pool)
  s.setPiece = { id: sp.id, tapsDone: 0, expiresAt: now + sp.seconds, x: 0.15 + rng.next() * 0.7, y: 0.15 + rng.next() * 0.4 }
  return 'spawned'
}

function scheduleNext(ci: ContentIndex, s: GameState, rng: Rng, now: number) {
  const pool = eligibleSetPieces(ci, s)
  const every = pool.length ? Math.min(...pool.map((p) => p.every)) : 60
  s.nextSetPieceAt = now + every * (0.6 + rng.next() * 0.8)
}

/** Tap the active set-piece. Returns the reward when completed. */
export function tapSetPiece(ci: ContentIndex, s: GameState, rng: Rng, now: number, baseRate: number): { done: boolean; progress: number; got?: ReturnType<typeof applyReward>; def?: SetPieceDef } {
  const a = s.setPiece
  if (!a) return { done: false, progress: 0 }
  const def = ci.setPieces.get(a.id)
  if (!def) { s.setPiece = null; return { done: false, progress: 0 } }
  a.tapsDone++
  if (a.tapsDone >= def.taps) {
    s.setPiece = null
    s.setPiecesDone++; s.stats.setPiecesTotal++
    scheduleNext(ci, s, rng, now)
    const got = applyReward(ci, s, def.reward, now, baseRate)
    return { done: true, progress: 1, got, def }
  }
  return { done: false, progress: a.tapsDone / def.taps, def }
}

export { isUnlocked }
