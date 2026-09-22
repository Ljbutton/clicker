import type { Reward, MilestoneDef } from '@/content/types'
import type { GameState, PendingChest } from '@/engine/state'
import type { ContentIndex } from './index'
import { checkCondition } from './unlock'
import { gain } from './economy'

/** Apply a reward directly to state (used when a chest is opened, or immediately for token-only rewards). */
export function applyReward(ci: ContentIndex, s: GameState, r: Reward, now: number, baseRate = 0): { cosmetic?: string; petals?: number; token?: Reward['token']; resources?: Record<string, number> } {
  const out: ReturnType<typeof applyReward> = {}
  const resources: Record<string, number> = { ...(r.resources ?? {}) }
  if (r.incomeSeconds) resources[ci.baseResource] = (resources[ci.baseResource] ?? 0) + Math.max(r.incomeFloor ?? 10, Math.round(baseRate * r.incomeSeconds))
  if (Object.keys(resources).length) { for (const [id, n] of Object.entries(resources)) gain(s, id, n); out.resources = resources }
  if (r.petals) { s.cosmetics.petals += r.petals; s.cosmetics.petalsEarned += r.petals; out.petals = r.petals }
  if (r.cosmetic && ci.cosmetics.has(r.cosmetic) && !s.cosmetics.owned.includes(r.cosmetic)) { s.cosmetics.owned.push(r.cosmetic); out.cosmetic = r.cosmetic }
  if (r.token) { s.tokens.push({ value: r.token.value, until: now + r.token.seconds }); out.token = r.token }
  return out
}

/** Check all milestones; newly achieved ones become pending chests (or apply instantly when they carry no chest). */
export function tickMilestones(ci: ContentIndex, s: GameState, now: number, baseRate = 0): MilestoneDef[] {
  const achieved: MilestoneDef[] = []
  const done = new Set(s.milestones)
  for (const m of ci.raw.milestones) {
    if (done.has(m.id)) continue
    if (!checkCondition(s, m.cond)) continue
    s.milestones.push(m.id)
    achieved.push(m)
    if (m.reward.chest) s.chests.push({ id: `${m.id}:${s.chests.length}:${Math.floor(now)}`, tier: m.reward.chest, source: m.name, reward: m.reward })
    else applyReward(ci, s, m.reward, now, baseRate)
  }
  return achieved
}

export function openChest(ci: ContentIndex, s: GameState, chestId: string, now: number, baseRate = 0): { chest: PendingChest; got: ReturnType<typeof applyReward> } | null {
  const i = s.chests.findIndex((c) => c.id === chestId)
  if (i < 0) return null
  const chest = s.chests[i]!
  s.chests.splice(i, 1)
  const got = applyReward(ci, s, chest.reward, now, baseRate)
  return { chest, got }
}

/** Scale a chest's resource reward to the player's current income so chests stay meaningful at every scale. */
export function scaledResourceReward(baseRate: number, seconds: number, floor: number): number {
  return Math.max(floor, Math.round(baseRate * seconds))
}

/** Expire finished multiplier tokens. */
export function tickTokens(s: GameState, now: number) {
  if (s.tokens.length && s.tokens.some((t) => t.until <= now)) s.tokens = s.tokens.filter((t) => t.until > now)
}
