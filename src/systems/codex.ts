/** Crucible discovery of cross-chain recipes; the Codex persists across Seasons. */
import type { RecipeDef } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { type EffectTable, mult } from './effects'
import { gain } from './economy'

export interface Hint { recipe: RecipeDef; known: string[]; hidden: string[]; attempts: number }

/** Hints show when all-but-one input has ever been owned this Season and the workshop's bough is open. */
export function availableHints(ci: ContentIndex, s: GameState): Hint[] {
  const out: Hint[] = []
  for (const r of ci.raw.recipes) {
    if (!r.discover || s.codex.discovered.includes(r.id)) continue
    const w = ci.raw.workshops.find((x) => x.recipe === r.id)
    if (!w || !s.boughs.includes(w.bandId)) continue
    const inputs = Object.keys(r.inputs)
    const owned = inputs.filter((id) => (s.earned[id] ?? 0) > 0)
    if (owned.length < inputs.length - 1) continue
    const revealed = s.codex.revealed[r.id] ?? 0
    const known = inputs.slice(0, Math.max(inputs.length - 1, Math.min(inputs.length, inputs.length - 1 + revealed)))
    out.push({ recipe: r, known, hidden: inputs.filter((i) => !known.includes(i)), attempts: s.codex.attempts[r.id] ?? 0 })
  }
  return out
}

/** Attempt a combination: `slots` are resource ids the player chose (one unit each is consumed on failure at 80% refund). */
export function attempt(ci: ContentIndex, s: GameState, fx: EffectTable, recipeId: string, slots: string[]): { success: boolean; fireflies?: number; revealed?: string } {
  const r = ci.recipes.get(recipeId)
  if (!r || !r.discover || s.codex.discovered.includes(recipeId)) return { success: false }
  const hint = availableHints(ci, s).find((h) => h.recipe.id === recipeId)
  if (!hint) return { success: false }
  const need = new Set(Object.keys(r.inputs))
  const chosen = new Set(slots)
  for (const id of chosen) if ((s.res[id] ?? 0) < 1) return { success: false }
  s.codex.attempts[recipeId] = (s.codex.attempts[recipeId] ?? 0) + 1
  const correct = chosen.size === need.size && [...need].every((i) => chosen.has(i))
  const guaranteed = s.codex.attempts[recipeId]! >= BALANCE.codex.guaranteedAttempt
  if (correct || guaranteed) {
    s.codex.discovered.push(recipeId)
    const tier = ci.resources.get(r.output.id)?.tier ?? 1
    const ff = Math.round(BALANCE.codex.firefliesPerTier * tier * mult(fx, 'discovery_fireflies'))
    s.fireflies += ff; s.firefliesLifetime += ff
    return { success: true, fireflies: ff }
  }
  // wrong: consume 20% of a unit of each slotted good, reveal one more input
  for (const id of chosen) s.res[id] = Math.max(0, (s.res[id] ?? 0) - (1 - BALANCE.codex.refund))
  s.codex.revealed[recipeId] = (s.codex.revealed[recipeId] ?? 0) + 1
  const revealedNow = [...need].find((i) => !hint.known.includes(i))
  return { success: false, revealed: revealedNow }
}
export { gain }
