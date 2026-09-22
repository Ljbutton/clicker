import type { Reward, MilestoneDef, ChestTier } from '@/content/types'
import type { GameState, PendingChest } from '@/engine/state'
import type { ContentIndex } from './index'
import type { Rng } from '@/engine/rng'
import { BALANCE } from '@/content/balance'
import { checkCondition } from './unlock'
import { gain } from './economy'

export interface Granted { resources?: Record<string, number>; fireflies?: number; glimmer?: number; cosmetic?: string; token?: { value: number; seconds: number }; landmark?: string; chest?: ChestTier }

/** Apply a reward directly. `baseRate` scales income-based rewards. */
export function applyReward(ci: ContentIndex, s: GameState, r: Reward, now: number, baseRate: number, scale = 1): Granted {
  const out: Granted = {}
  const resources: Record<string, number> = { ...(r.resources ?? {}) }
  if (r.incomeSeconds) resources[ci.baseResource] = (resources[ci.baseResource] ?? 0) + Math.max(10, Math.round(baseRate * r.incomeSeconds))
  if (Object.keys(resources).length) { for (const [id, n] of Object.entries(resources)) gain(ci, s, id, n); out.resources = resources }
  if (r.fireflies) { const n = Math.round(r.fireflies * scale); s.fireflies += n; s.firefliesLifetime += n; out.fireflies = n }
  if (r.glimmer) { s.glimmer += r.glimmer; s.glimmerEarned += r.glimmer; out.glimmer = r.glimmer }
  if (r.cosmetic && ci.cosmetics.has(r.cosmetic) && !s.cosmetics.owned.includes(r.cosmetic)) { s.cosmetics.owned.push(r.cosmetic); out.cosmetic = r.cosmetic }
  if (r.token) { addToken(s, r.token.value, r.token.seconds, now); out.token = r.token }
  if (r.landmark && !s.landmarks.includes(r.landmark)) { s.landmarks.push(r.landmark); out.landmark = r.landmark }
  if (r.chest) { pushChest(s, r.chest, 'Reward', now); out.chest = r.chest }
  return out
}

/** Tokens of the same value extend each other's duration (they never multiply). */
export function addToken(s: GameState, value: number, seconds: number, now: number) {
  const same = s.tokens.find((t) => t.value === value)
  if (same) same.until = Math.max(same.until, now) + seconds
  else s.tokens.push({ value, until: now + seconds })
}

export function pushChest(s: GameState, tier: ChestTier, source: string, now: number) {
  s.chests.push({ id: `${tier}:${source}:${Math.floor(now * 10)}:${s.chests.length}`, tier, source })
}

/** Pick an unowned cosmetic from the earnable pool by rarity tier (price band). */
function pickCosmetic(ci: ContentIndex, s: GameState, rng: Rng, rarity: 'common' | 'uncommon' | 'rare'): string | null {
  const pool = ci.raw.cosmetics.filter((c) => !s.cosmetics.owned.includes(c.id) && !c.supporter && c.category !== 'title' && c.fireflyPrice != null &&
    (rarity === 'common' ? c.fireflyPrice <= 100 : rarity === 'uncommon' ? c.fireflyPrice <= 200 : true))
  if (!pool.length) return null
  return rng.pick(pool).id
}

/** Generate a chest's contents at open time so they scale with current income. */
export function openChest(ci: ContentIndex, s: GameState, rng: Rng, chestId: string, now: number, baseRate: number): { chest: PendingChest; got: Granted } | null {
  const i = s.chests.findIndex((c) => c.id === chestId)
  if (i < 0) return null
  const chest = s.chests[i]!
  s.chests.splice(i, 1)
  s.stats.chestsOpened++
  const c = BALANCE.chests
  let reward: Reward
  if (chest.tier === 'bark') {
    reward = { incomeSeconds: c.bark.incomeSeconds, fireflies: rng.int(c.bark.fireflies[0], c.bark.fireflies[1]) }
    if (rng.chance(c.bark.cosmeticChance)) { const id = pickCosmetic(ci, s, rng, 'common'); if (id) reward.cosmetic = id }
  } else if (chest.tier === 'amber') {
    reward = { incomeSeconds: c.amber.incomeSeconds, fireflies: rng.int(c.amber.fireflies[0], c.amber.fireflies[1]), token: c.amber.token }
    const id = chest.cosmeticHint ?? pickCosmetic(ci, s, rng, 'uncommon'); if (id) reward.cosmetic = id; else reward.fireflies! += 50
  } else if (chest.tier === 'star') {
    reward = { incomeSeconds: c.star.incomeSeconds, fireflies: c.star.fireflies[0], token: c.star.token }
    const id = chest.cosmeticHint ?? pickCosmetic(ci, s, rng, 'rare'); if (id) reward.cosmetic = id; else reward.fireflies! += 100
  } else {
    reward = { glimmer: c.season.glimmer, fireflies: c.season.fireflies, token: c.season.token }
  }
  // income rewards are raw bundles weighted by worth: give the base currency plus a slice of each raw produced
  const got = applyReward(ci, s, reward, now, baseRate)
  return { chest, got }
}

/** Check all milestones; newly achieved ones apply their reward (chests become pending). Medium/big celebrations also drop an x2 token. */
export function tickMilestones(ci: ContentIndex, s: GameState, now: number, baseRate: number, ringsNow: number): { def: MilestoneDef; got: Granted }[] {
  const out: { def: MilestoneDef; got: Granted }[] = []
  const done = new Set(s.milestones)
  for (const m of ci.raw.milestones) {
    if (done.has(m.id)) continue
    if (!checkCondition(ci, s, m.cond, ringsNow)) continue
    s.milestones.push(m.id)
    const got = applyReward(ci, s, m.reward, now, baseRate)
    if (m.celebration === 'big' && !m.reward.token) { addToken(s, 2, 600, now); got.token = { value: 2, seconds: 600 } }
    out.push({ def: m, got })
  }
  // cap pending chests: the 6th auto-opens (handled by caller since it needs rng)
  return out
}

export function tickTokens(s: GameState, now: number): boolean {
  if (s.tokens.length && s.tokens.some((t) => t.until <= now)) { s.tokens = s.tokens.filter((t) => t.until > now); return true }
  return false
}
