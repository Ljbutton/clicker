/** The Waystone: exactly one pinned goal from the Season Lane (authored for S1, generated for S2+) plus the Legacy Lane. */
import type { WaystoneGoalDef, Reward } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import { checkCondition } from './unlock'
import { applyReward, type Granted } from './milestones'
import { ringsNow } from './prestige'

const laneCache = new Map<string, WaystoneGoalDef[]>()

/** Generate the Season lane for Season N>=2 from the content template (§9.2). */
export function generateLane(ci: ContentIndex, s: GameState): WaystoneGoalDef[] {
  const goals: WaystoneGoalDef[] = []
  const season = s.prestige.count
  const scale = Math.min(BALANCE.laneRewardScale.cap, 1 + BALANCE.laneRewardScale.perSeason * season)
  const ff = (n: number): Reward => ({ fireflies: Math.round(n * scale) })
  const push = (g: WaystoneGoalDef) => goals.push(g)
  const mech = ci.raw.mechanics.find((m) => m.atTurn === season && m.implemented)
  for (const b of ci.bands) {
    if (b.index > 1) {
      if (b.line > 0) push({ id: `s${season}_line_${b.id}`, name: `GROW to ${b.line} m (${b.name} line)`, cond: { kind: 'height', min: b.line }, reward: ff(10), tab: 'grow', target: 'grow' })
      if (b.ritual) push({ id: `s${season}_ritual_${b.id}`, name: `Ritual: open ${b.name}`, cond: { kind: 'bough', id: b.id }, reward: { chest: 'amber' }, tab: 'grow', target: `ritual:${b.id}` })
    }
    const lodge = ci.raw.producers.find((p) => p.kind === 'lodge' && p.bandId === b.id && p.unlock.kind !== 'annex')
    if (lodge) push({ id: `s${season}_lodge_${lodge.id}`, name: `Hire a ${lodge.name.replace(' Lodge', '')}`, cond: { kind: 'producer', id: lodge.id, min: 1 }, reward: ff(5), tab: 'folk', target: lodge.id })
    for (const w of ci.raw.workshops.filter((x) => x.bandId === b.id).sort((x, y) => x.hook - y.hook)) {
      const r = ci.recipes.get(w.recipe)
      if (r?.discover) push({ id: `s${season}_discover_${r.id}`, name: `Rediscover ${r.name} (Codex)`, cond: { kind: 'discovered', recipe: r.id }, reward: ff(10), tab: 'craft', target: `crucible:${r.id}` })
      push({ id: `s${season}_build_${w.id}`, name: `Build the ${w.name}`, cond: { kind: 'workshop', id: w.id }, reward: ff(5), tab: 'craft', target: w.id })
      const crew = ci.crewByStation.get(w.id)
      if (crew) push({ id: `s${season}_foreman_${w.id}`, name: `Hire the ${w.name} Foreman`, cond: { kind: 'producer', id: crew.id, min: 1 }, reward: { ...ff(15), chest: 'bark' }, tab: 'craft', target: w.id })
      const rune = r ? ci.raw.runes.find((x) => x.good === r.output.id) : undefined
      if (rune) push({ id: `s${season}_rune_${rune.id}`, name: `Carve ${rune.name} I`, cond: { kind: 'rune', id: rune.id, min: 1 }, reward: ff(10), tab: 'grow', target: rune.id })
    }
    if (b.index === 3 && mech?.introGoals) for (const g of mech.introGoals) push({ ...g, id: `s${season}_${g.id}`, reward: { ...g.reward, fireflies: g.reward.fireflies ? Math.round(g.reward.fireflies * scale) : undefined } })
    if (b.index === 5) {
      push({ id: `s${season}_rings3`, name: `Reach ${BALANCE.prestige.minRings} Rings (Turn available)`, cond: { kind: 'rings', min: BALANCE.prestige.minRings }, reward: ff(25), tab: 'rings' })
      push({ id: `s${season}_rings5`, name: `Reach ${BALANCE.prestige.recommendRings} Rings (Turn recommended)`, cond: { kind: 'rings', min: BALANCE.prestige.recommendRings }, reward: ff(50), tab: 'rings' })
    }
  }
  // Landmarks every 10th goal, from the landmark list, skipping owned
  const owned = new Set(s.landmarks)
  const pool = ci.raw.landmarks.filter((l) => !owned.has(l.id))
  let li = 0
  goals.forEach((g, i) => { if ((i + 1) % 10 === 0 && pool[li]) { g.reward = { ...g.reward, landmark: pool[li]!.id, fireflies: (g.reward.fireflies ?? 0) + 50 }; li++ } })
  return goals
}

export function lane(ci: ContentIndex, s: GameState): WaystoneGoalDef[] {
  if (s.prestige.count === 0) return ci.raw.waystoneSeason1
  const key = `s${s.prestige.count}`
  let l = laneCache.get(key)
  if (!l) { l = generateLane(ci, s); laneCache.set(key, l) }
  return l
}
export function resetLaneCache() { laneCache.clear() }

export function currentGoal(ci: ContentIndex, s: GameState): WaystoneGoalDef | null { return lane(ci, s)[s.laneIndex] ?? null }
export function upcoming(ci: ContentIndex, s: GameState, n = 3): WaystoneGoalDef[] { return lane(ci, s).slice(s.laneIndex + 1, s.laneIndex + 1 + n) }

/** Next Legacy-lane entry not yet achieved. */
export function legacyNext(ci: ContentIndex, s: GameState) {
  const rn = ringsNow(s)
  return ci.raw.legacyLane.find((g) => !checkCondition(ci, s, g.cond, rn)) ?? null
}

/** Advance the lane: complete every goal whose condition is met. A goal already met when it becomes active completes silently. */
export function tickWaystone(ci: ContentIndex, s: GameState, now: number, baseRate: number): { goal: WaystoneGoalDef; got: Granted | null; index: number }[] {
  const out: { goal: WaystoneGoalDef; got: Granted | null; index: number }[] = []
  const l = lane(ci, s)
  const rn = ringsNow(s)
  let guard = 0
  while (s.laneIndex < l.length && guard++ < 100) {
    const g = l[s.laneIndex]!
    if (!checkCondition(ci, s, g.cond, rn)) {
      // optional goals never hold the lane once a Turn is recommended
      if (g.optional && rn >= BALANCE.prestige.recommendRings) { s.laneIndex++; continue }
      break
    }
    const wasActive = s.flags[`lane_active:${g.id}`]
    const silent = !wasActive && s.laneIndex > 0 && !g.tutorial && s.prestige.count > 0
    const got = silent ? null : applyReward(ci, s, g.reward, now, baseRate)
    out.push({ goal: g, got, index: s.laneIndex })
    s.laneIndex++
    const next = l[s.laneIndex]
    if (next) s.flags[`lane_active:${next.id}`] = !checkCondition(ci, s, next.cond, rn)
  }
  if (s.laneIndex === 0 && l[0]) s.flags[`lane_active:${l[0].id}`] = true
  return out
}
