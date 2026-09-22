import type { RecipeDef } from '@/content/types'
import type { GameState, CraftJob } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { type EffectTable, mult } from './effects'
import { canAfford, spend, gain, producerCount, buildingLevel } from './economy'
import { isUnlocked } from './unlock'

export function recipeAvailable(ci: ContentIndex, s: GameState, r: RecipeDef): boolean {
  return buildingLevel(s, r.station) > 0 && isUnlocked(ci, s, r.unlock)
}

/** Worth multiplier of a recipe: output worth / input worth (shown on the card so crafting-up is legible). */
export function recipeWorthMult(ci: ContentIndex, r: RecipeDef): number {
  const inW = Object.entries(r.inputs).reduce((a, [id, n]) => a + n * (ci.resources.get(id)?.worth ?? 1), 0)
  const outW = r.output.count * (ci.resources.get(r.output.id)?.worth ?? 1)
  return inW > 0 ? outW / inW : 0
}

/** Speed multiplier for a station: building levels, crafters attached, and global craft_speed. */
export function stationSpeed(ci: ContentIndex, s: GameState, station: string, fx: EffectTable): number {
  const crafter = ci.craftersByStation.get(station)
  const n = crafter ? producerCount(s, crafter.id) : 0
  const crafterMult = n > 0 ? 1 + (n - 1) * BALANCE.producers.crafterSpeedPerExtra : 1
  return crafterMult * mult(fx, 'craft_speed') * mult(fx, `producer:${crafter?.id ?? ''}`)
}

export function isAutomated(ci: ContentIndex, s: GameState, station: string): boolean {
  const crafter = ci.craftersByStation.get(station)
  return !!crafter && producerCount(s, crafter.id) > 0
}

/** Queue a manual craft. Inputs are consumed at queue time. */
export function queueCraft(ci: ContentIndex, s: GameState, recipeId: string): boolean {
  const r = ci.recipes.get(recipeId)
  if (!r || !recipeAvailable(ci, s, r)) return false
  const q = s.queues[r.station] ?? (s.queues[r.station] = [])
  if (q.length >= BALANCE.producers.maxQueue) return false
  if (!spend(s, r.inputs)) return false
  q.push({ recipeId, remaining: r.seconds, total: r.seconds })
  return true
}

/** Inputs available above the station's reserve dial. */
function canAutoCraft(ci: ContentIndex, s: GameState, r: RecipeDef): boolean {
  const reserve = s.reserves[r.station] ?? 0
  for (const [id, n] of Object.entries(r.inputs)) if ((s.res[id] ?? 0) - reserve < n) return false
  return true
}

/** Advance all crafting queues; auto-queue for automated stations. Returns completed outputs. */
export function tickCraft(ci: ContentIndex, s: GameState, fx: EffectTable, dt: number): { recipeId: string; id: string; count: number }[] {
  const done: { recipeId: string; id: string; count: number }[] = []
  for (const b of ci.raw.buildings) {
    if (!b.recipes.length || buildingLevel(s, b.id) <= 0) continue
    const station = b.id
    const q = s.queues[station] ?? (s.queues[station] = [])
    const speed = stationSpeed(ci, s, station, fx)
    // auto-queue: keep one job running per automated station, cycling through enabled recipes (most valuable first that has inputs)
    if (q.length === 0 && isAutomated(ci, s, station)) {
      const recipes = (ci.recipesByStation.get(station) ?? []).filter((r) => recipeAvailable(ci, s, r) && !s.flags[`auto_off:${r.id}`])
      // prefer the highest-tier recipe whose inputs are available (crafting up the chain is always the efficient path)
      recipes.sort((a, b) => (ci.resources.get(b.output.id)?.tier ?? 0) - (ci.resources.get(a.output.id)?.tier ?? 0))
      for (const r of recipes) {
        if (canAutoCraft(ci, s, r) && canAfford(s, r.inputs)) { spend(s, r.inputs); q.push({ recipeId: r.id, remaining: r.seconds, total: r.seconds }); break }
      }
    }
    let budget = dt * speed
    while (q.length && budget > 0) {
      const job = q[0]!
      const used = Math.min(job.remaining, budget)
      job.remaining -= used; budget -= used
      if (job.remaining <= 1e-9) {
        q.shift()
        const r = ci.recipes.get(job.recipeId)
        if (r) { gain(s, r.output.id, r.output.count); s.crafts++; s.stats.craftsTotal++; s.craftsBy[r.id] = (s.craftsBy[r.id] ?? 0) + 1; done.push({ recipeId: r.id, id: r.output.id, count: r.output.count }) }
        // an automated station immediately starts the next job within the same tick budget
        if (q.length === 0 && isAutomated(ci, s, station) && budget > 0) {
          const recipes = (ci.recipesByStation.get(station) ?? []).filter((x) => recipeAvailable(ci, s, x) && !s.flags[`auto_off:${x.id}`])
          recipes.sort((a, b) => (ci.resources.get(b.output.id)?.tier ?? 0) - (ci.resources.get(a.output.id)?.tier ?? 0))
          for (const x of recipes) if (canAutoCraft(ci, s, x) && canAfford(s, x.inputs)) { spend(s, x.inputs); q.push({ recipeId: x.id, remaining: x.seconds, total: x.seconds }); break }
        }
      }
    }
  }
  return done
}

export function queueOf(s: GameState, station: string): CraftJob[] { return s.queues[station] ?? [] }
