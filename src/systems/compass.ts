/** The Compass resolver (§9.3): candidates, ETA from net rates, exclusions, sub-step advice. */
import type { Cost, WaystoneGoalDef } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import { BALANCE } from '@/content/balance'
import type { EffectTable } from './effects'
import { producerCost, bottleneck, workshopBuildable, needsForeman, producerCount, nextMilestone, producerAvailable, runeCost, runeAvailable, runeTier, limbCost, annexCost, annexAvailable, freeLimb, throughput, recipeInputs } from './economy'
import { growsToHeight, nextBough, ritualCost, ritualAvailable } from './grow'
import { ringsNow, heartwoodFor, canTurn } from './prestige'
import { availableHints } from './codex'
import { conditionProgress } from './unlock'

export type GoalKind = 'lodge' | 'milestone' | 'workshop' | 'foreman' | 'rune' | 'annex' | 'ritual' | 'line' | 'crucible' | 'turn' | 'lane' | 'height' | 'tap' | 'craft' | 'wait'

export interface Goal {
  kind: GoalKind
  id: string
  name: string
  glyph: string
  tab: 'grow' | 'folk' | 'craft' | 'rings' | 'wardrobe'
  target?: string
  cost: Cost
  bottleneck: { id: string; have: number; need: number }
  eta: number
  ready: boolean
  fresh: boolean
  /** Progress 0..1 in worth terms. */
  progress: number
  /** Sub-step advice when the ETA is long or infinite. */
  advice?: { text: string; action?: { kind: 'lodge' | 'crew'; id: string } }
  /** For Waystone goals: the underlying lane entry. */
  lane?: WaystoneGoalDef
  reward?: string
}

function etaFor(cost: Cost, s: GameState, net: Record<string, number>): number {
  let worst = 0
  for (const [id, need] of Object.entries(cost)) {
    const gap = need - (s.res[id] ?? 0)
    if (gap <= 0) continue
    const r = net[id] ?? 0
    if (r <= 1e-9) return Infinity
    worst = Math.max(worst, gap / r)
  }
  return worst
}
function progressFor(ci: ContentIndex, s: GameState, cost: Cost): number {
  let deficit = 0, total = 0
  for (const [id, need] of Object.entries(cost)) { const w = ci.resources.get(id)?.worth ?? 1; total += need * w; deficit += Math.max(0, need - (s.res[id] ?? 0)) * w }
  return total > 0 ? 1 - deficit / total : 1
}

export function makeGoal(ci: ContentIndex, s: GameState, net: Record<string, number>, g: Omit<Goal, 'bottleneck' | 'eta' | 'ready' | 'progress'>): Goal {
  return { ...g, bottleneck: bottleneck(ci, s, g.cost), eta: etaFor(g.cost, s, net), ready: Object.entries(g.cost).every(([id, n]) => (s.res[id] ?? 0) + 1e-9 >= n), progress: progressFor(ci, s, g.cost) }
}

/** Every purchasable the player could pursue right now. */
export function candidates(ci: ContentIndex, s: GameState, fx: EffectTable, net: Record<string, number>, heartwoodRate: number): Goal[] {
  const out: Goal[] = []
  const base = ci.baseResource
  const mk = (g: Omit<Goal, 'bottleneck' | 'eta' | 'ready' | 'progress'>) => out.push(makeGoal(ci, s, net, g))
  // lodges: first hire (fresh) and next milestone
  for (const p of ci.raw.producers) {
    if (!producerAvailable(ci, s, p.id)) continue
    const n = producerCount(s, p.id)
    if (p.kind === 'lodge') {
      if (n === 0) mk({ kind: 'lodge', id: p.id, name: `Hire a ${p.name.replace(' Lodge', '')}`, glyph: p.glyph, tab: 'folk', target: p.id, cost: producerCost(ci, s, p.id, fx, 1), fresh: true })
      else { const m = nextMilestone(n); mk({ kind: 'milestone', id: p.id, name: `${p.name} ×${m >= 25 ? 2 : 1.5} at ${m}`, glyph: p.glyph, tab: 'folk', target: p.id, cost: producerCost(ci, s, p.id, fx, m - n), fresh: false }) }
    } else if (p.station && s.workshops[p.station]) {
      if (needsForeman(ci, s, p.id)) mk({ kind: 'foreman', id: p.id, name: `Hire the ${ci.workshops.get(p.station)?.name} Foreman`, glyph: '👷', tab: 'craft', target: p.station, cost: p.foremanCost!, fresh: true })
      else if (n > 0) { const m = nextMilestone(n); mk({ kind: 'milestone', id: p.id, name: `${ci.workshops.get(p.station)?.name} crew ×${m >= 25 ? 2 : 1.5} at ${m}`, glyph: '👷', tab: 'craft', target: p.station, cost: producerCost(ci, s, p.id, fx, m - n), fresh: false }) }
    }
  }
  // workshops with hook in range
  for (const w of ci.raw.workshops) if (workshopBuildable(ci, s, w.id)) mk({ kind: 'workshop', id: w.id, name: `Build the ${w.name}`, glyph: w.glyph, tab: 'craft', target: w.id, cost: w.cost, fresh: true })
  // runes: next tier, excluding tiers far above the cheapest unbought rune
  const avail = ci.raw.runes.filter((r) => runeAvailable(ci, s, r.id))
  const minTier = avail.length ? Math.min(...avail.map((r) => runeTier(s, r.id))) : 0
  for (const r of avail) { const t = runeTier(s, r.id); if (t - minTier > BALANCE.compass.runeTierWindow) continue; mk({ kind: 'rune', id: r.id, name: `Carve ${r.name} ${'I II III IV V VI VII VIII IX X XI XII'.split(' ')[t] ?? t + 1}`, glyph: r.glyph, tab: 'grow', target: r.id, cost: runeCost(ci, s, r.id), fresh: t === 0 }) }
  // annexes on free limbs (cheapest per bough)
  for (const b of ci.bands) {
    if (!freeLimb(ci, s, b.id)) continue
    for (const a of ci.raw.annexes) if (annexAvailable(ci, s, a.id, b.id)) {
      const cost: Cost = { ...annexCost(ci, s, a.id) }
      for (const [r, n] of Object.entries(limbCost(s))) cost[r] = (cost[r] ?? 0) + n
      mk({ kind: 'annex', id: a.id, name: `Sprout a limb: ${a.name}`, glyph: a.glyph, tab: 'grow', target: `annex:${a.id}`, cost, fresh: true })
    }
  }
  // next bough: ritual if height >= line else GROW to line
  const nb = nextBough(ci, s)
  if (nb) {
    const ra = ritualAvailable(ci, s, nb.id)
    if (ra.ok) mk({ kind: 'ritual', id: nb.id, name: `Ritual: open ${nb.name}`, glyph: nb.glyph, tab: 'grow', target: `ritual:${nb.id}`, cost: ritualCost(ci, s, nb.id, fx)!, fresh: true })
    else if (s.height < nb.line) { const g = growsToHeight(s, fx, nb.line); mk({ kind: 'line', id: nb.id, name: `GROW to ${nb.line} m (${nb.name})`, glyph: '🌳', tab: 'grow', target: 'grow', cost: { [base]: g.cost }, fresh: true }) }
  }
  // unbuilt workshops above current height: GROW to hook
  for (const w of ci.raw.workshops) {
    if (s.workshops[w.id] || !s.boughs.includes(w.bandId) || s.height >= w.hook) continue
    if (nb && w.hook >= nb.line) continue
    const r = ci.recipes.get(w.recipe); if (r?.discover && !s.codex.discovered.includes(r.id)) continue
    const g = growsToHeight(s, fx, w.hook)
    mk({ kind: 'height', id: w.id, name: `GROW to ${w.hook} m for the ${w.name}`, glyph: w.glyph, tab: 'grow', target: 'grow', cost: { [base]: g.cost }, fresh: true })
  }
  // crucible hint
  for (const h of availableHints(ci, s)) out.push({ kind: 'crucible', id: h.recipe.id, name: `Discover ${h.recipe.name} in the Crucible`, glyph: '🔮', tab: 'craft', target: `crucible:${h.recipe.id}`, cost: {}, bottleneck: { id: base, have: 0, need: 0 }, eta: 0, ready: true, fresh: true, progress: 0 })
  // season turn at rings+1
  if (s.heartwood > BALANCE.prestige.K * 3 || canTurn(s)) {
    const rn = ringsNow(s)
    const target = Math.max(BALANCE.prestige.minRings, rn + 1)
    const gap = Math.max(0, heartwoodFor(target) - s.heartwood)
    out.push({ kind: 'turn', id: 'turn', name: rn >= BALANCE.prestige.minRings ? `Turn the Season for ${rn} Rings (+1 at ${target})` : `Reach ${target} Rings to Turn`, glyph: '🌀', tab: 'rings', cost: {}, bottleneck: { id: 'heartwood', have: s.heartwood, need: heartwoodFor(target) }, eta: heartwoodRate > 0 ? gap / heartwoodRate : Infinity, ready: rn >= BALANCE.prestige.minRings, fresh: rn < BALANCE.prestige.minRings, progress: Math.min(1, s.heartwood / heartwoodFor(target)) })
  }
  return out
}

/** Pick the best candidate with the §9.3 exclusions. */
export function best(all: Goal[]): Goal | null {
  const list = all.filter((g) => !(g.ready && !g.fresh))
  if (!list.length) return null
  const anyQuick = list.some((g) => g.eta < BALANCE.compass.maxEta)
  const eligible = anyQuick ? list.filter((g) => g.eta <= BALANCE.compass.excludeAbove) : list
  const score = (g: Goal) => (g.ready ? 0 : Number.isFinite(g.eta) ? g.eta : 1e9) * (g.fresh ? 0.5 : 1) * (g.kind === 'turn' ? 1.5 : 1)
  return [...eligible].sort((a, b) => score(a) - score(b))[0] ?? null
}

/** Convert a Waystone lane goal into a Goal with cost/ETA. */
export function laneGoal(ci: ContentIndex, s: GameState, fx: EffectTable, net: Record<string, number>, g: WaystoneGoalDef, heartwoodRate: number): Goal {
  const base = ci.baseResource
  const c = g.cond
  const mk = (kind: GoalKind, cost: Cost, extra: Partial<Goal> = {}) => ({ ...makeGoal(ci, s, net, { kind, id: g.id, name: g.name, glyph: extra.glyph ?? '📍', tab: g.tab ?? 'grow', target: g.target, cost, fresh: true }), lane: g, reward: rewardText(ci, g), ...extra })
  const pr = conditionProgress(ci, s, c)
  switch (c.kind) {
    case 'producer': { const p = ci.producers.get(c.id); if (!p) break
      if (p.kind === 'crew' && needsForeman(ci, s, c.id)) return mk('foreman', s.workshops[p.station!] ? p.foremanCost! : (ci.workshops.get(p.station!)?.cost ?? {}), { glyph: '👷', name: g.name })
      return mk(p.kind === 'lodge' ? 'lodge' : 'milestone', producerAvailable(ci, s, c.id) ? producerCost(ci, s, c.id, fx, Math.max(1, c.min - producerCount(s, c.id))) : {}, { glyph: p.glyph }) }
    case 'workshop': { const w = ci.workshops.get(c.id); if (!w) break
      if (s.height < w.hook) { const gr = growsToHeight(s, fx, w.hook); return mk('height', { [base]: gr.cost }, { glyph: w.glyph }) }
      return mk('workshop', w.cost, { glyph: w.glyph }) }
    case 'height': { const gr = growsToHeight(s, fx, c.min); return mk('height', { [base]: gr.cost }, { glyph: '🌳' }) }
    case 'bough': { const b = ci.bandById.get(c.id); if (!b) break
      if (s.height < b.line) { const gr = growsToHeight(s, fx, b.line); return mk('line', { [base]: gr.cost }, { glyph: b.glyph }) }
      return mk('ritual', ritualCost(ci, s, c.id, fx) ?? {}, { glyph: b.glyph }) }
    case 'rune': { const r = ci.runes.get(c.id); if (!r) break; return mk('rune', runeCost(ci, s, c.id), { glyph: r.glyph }) }
    case 'annex': { const a = ci.annexes.get(c.id); if (!a) break
      const band = a.bandId ?? ci.bands.find((b) => b.index > 1 && freeLimb(ci, s, b.id))?.id ?? 'roots'
      const cost: Cost = { ...annexCost(ci, s, c.id) }; for (const [r, n] of Object.entries(limbCost(s))) cost[r] = (cost[r] ?? 0) + n
      return mk('annex', cost, { glyph: a.glyph, target: `annex:${c.id}:${band}` }) }
    case 'crafted': { const r = ci.recipes.get(c.id); const w = ci.raw.workshops.find((x) => x.recipe === c.id)
      const rate = w ? (net[r?.output.id ?? ''] ?? 0) + (Object.values(s.crafted).length ? 0 : 0) : 0
      const tp = w ? throughput(ci, s, w.id, fx) : 0
      const remaining = Math.max(0, pr.need - pr.have)
      const goal = mk('craft', {}, { glyph: r ? ci.resources.get(r.output.id)?.glyph : '⚒️' })
      goal.eta = tp > 0 ? remaining / Math.max(tp, rate > 0 ? rate : tp) : Infinity; goal.ready = remaining <= 0; goal.progress = pr.need ? pr.have / pr.need : 1
      goal.bottleneck = { id: r?.output.id ?? base, have: pr.have, need: pr.need }
      if (!Number.isFinite(goal.eta)) goal.advice = { text: w && !s.workshops[w.id] ? `Build the ${w.name} first` : `Hire the ${w?.name ?? ''} Foreman or tap the hut to craft` }
      return goal }
    case 'handcrafts': { const w = ci.workshops.get(c.station); const goal = mk('tap', {}, { glyph: w?.glyph ?? '⚒️', tab: 'craft', target: c.station }); goal.eta = 0; goal.ready = false; goal.progress = pr.need ? pr.have / pr.need : 1; goal.bottleneck = { id: c.station, have: pr.have, need: pr.need }; goal.advice = { text: `Tap the ${w?.name ?? 'workshop'} hut to hand-craft` }
      if (w && !s.workshops[w.id]) { const inputs = recipeInputs(ci, w.recipe, fx); void inputs; return mk('workshop', w.cost, { glyph: w.glyph, name: `Build the ${w.name}` }) }
      return goal }
    case 'rings': { const target = c.min; const gap = Math.max(0, heartwoodFor(target) - s.heartwood); const goal = mk('turn', {}, { glyph: '🌀', tab: 'rings' }); goal.eta = heartwoodRate > 0 ? gap / heartwoodRate : Infinity; goal.ready = ringsNow(s) >= target; goal.progress = Math.min(1, s.heartwood / heartwoodFor(target)); goal.bottleneck = { id: 'heartwood', have: s.heartwood, need: heartwoodFor(target) }; return goal }
    case 'discovered': { const goal = mk('crucible', {}, { glyph: '🔮', tab: 'craft', target: `crucible:${c.recipe}` }); const hint = availableHints(ci, s).find((h) => h.recipe.id === c.recipe); goal.eta = hint ? 0 : Infinity; goal.ready = !!hint; goal.progress = hint ? 0.5 : 0
      if (!hint) { const r = ci.recipes.get(c.recipe); const missing = r ? Object.keys(r.inputs).filter((i) => !(s.earned[i] ?? 0)) : []; goal.advice = { text: missing.length > 1 ? `Produce ${missing.slice(0, -1).map((m) => ci.resources.get(m)?.name).join(' and ')} first` : 'Open the Crucible at the stump' } }
      return goal }
    default: break
  }
  // strikes, resonances, set-pieces, etc.: tap goals with progress
  const goal = mk('tap', {}, { glyph: c.kind === 'grows' ? '🌳' : '👆', tab: 'grow', target: c.kind === 'grows' ? 'grow' : undefined })
  goal.eta = 0; goal.ready = false; goal.progress = pr.need ? Math.min(1, pr.have / pr.need) : 1; goal.bottleneck = { id: c.kind, have: pr.have, need: pr.need }
  if (c.kind === 'setpiece' || c.kind === 'setpieces' || c.kind === 'gusts') goal.advice = { text: 'Wait for the next set-piece to cross the tree' }
  else if (c.kind === 'grows') { const need = growsToHeight(s, fx, s.height + 0.01); void need; goal.advice = { text: (s.res[base] ?? 0) >= 10 ? 'Press GROW' : 'Strike the trunk for Sap, then press GROW' }; goal.cost = { [base]: 10 }; goal.ready = (s.res[base] ?? 0) >= 10; goal.bottleneck = { id: base, have: s.res[base] ?? 0, need: 10 } }
  else if (c.kind === 'resonances') goal.advice = { text: 'Strike quickly to fill the Thrum ring' }
  else if (c.kind === 'expeditions') { goal.advice = { text: 'Send Folk from the Trailhead (Grow tab)' }; goal.glyph = '🧭'; goal.tab = 'grow'; goal.target = 'expedition' }
  else if (c.kind === 'charts') { goal.advice = { text: 'Choose a constellation on the Rings tab' }; goal.glyph = '🔭'; goal.tab = 'rings'; goal.target = 'charts' }
  else if (c.kind === 'stewardBuys') { goal.advice = { text: 'Keep the Stewards switched on' }; goal.glyph = '🧑‍🌾'; goal.target = 'stewards' }
  else if (c.kind === 'thaws') { goal.advice = { text: 'Tap the frozen bundle after a long night' }; goal.glyph = '🧊' }
  else if (c.kind === 'trades') { goal.advice = { text: 'Trade when the caravan docks' }; goal.glyph = '🐫' }
  else if (c.kind === 'discharges') { goal.advice = { text: 'Tap the Lightning Rod during a storm' }; goal.glyph = '🌩️' }
  else if (c.kind === 'blooms') { goal.advice = { text: 'Wait for the next blossom wave' }; goal.glyph = '🌸' }
  else if (c.kind === 'kites') { goal.advice = { text: 'Craft a kite at the Kite Yard (More tab)' }; goal.glyph = '🪁'; goal.tab = 'wardrobe' }
  else goal.advice = { text: 'Strike the trunk' }
  return goal
}

function rewardText(ci: ContentIndex, g: WaystoneGoalDef): string {
  const r = g.reward; const parts: string[] = []
  if (r.fireflies) parts.push(`✨${r.fireflies}`)
  if (r.glimmer) parts.push(`🫙${r.glimmer}`)
  if (r.chest) parts.push(r.chest === 'bark' ? '🪵 chest' : r.chest === 'amber' ? '🟠 chest' : '⭐ chest')
  if (r.cosmetic) parts.push(ci.cosmetics.get(r.cosmetic)?.glyph ?? '🎁')
  if (r.landmark) parts.push('🏛️ landmark')
  if (r.resources) for (const [id, n] of Object.entries(r.resources)) parts.push(`${ci.resources.get(id)?.glyph ?? id}${n}`)
  return parts.join(' ')
}

/** Advice for a long/infinite ETA: the blocking reason, or the cheapest purchase that raises the bottleneck's net rate. */
export function advise(ci: ContentIndex, s: GameState, fx: EffectTable, net: Record<string, number>, g: Goal): Goal['advice'] | undefined {
  if (g.advice) return g.advice
  if (g.ready || (Number.isFinite(g.eta) && g.eta <= BALANCE.compass.maxEta)) return undefined
  const bn = g.bottleneck.id
  const res = ci.resources.get(bn)
  if (!res) return undefined
  const deficit = Math.max(0, g.bottleneck.need - g.bottleneck.have)
  // raw: a lodge level; crafted: a crew member (or the workshop / Foreman)
  const lodge = ci.lodgeByResource.get(bn)
  if (lodge && producerAvailable(ci, s, lodge.id)) {
    const n = producerCount(s, lodge.id)
    const per = lodge.produces!.rate * (fx.mult['all_production'] ?? 1) * (fx.mult['raw_production'] ?? 1) * (fx.mult[`resource:${bn}`] ?? 1)
    const k = n === 0 ? 1 : Math.max(1, Math.ceil(n * 0.25))
    const newNet = (net[bn] ?? 0) + per * k
    const eta = newNet > 0 ? deficit / newNet : Infinity
    return { text: `${n === 0 ? 'Hire a' : `Hire ${k} more`} ${lodge.name.replace(' Lodge', '')}${Number.isFinite(eta) ? ` → ~${Math.max(1, Math.round(eta / 60))} m` : ''}`, action: { kind: 'lodge', id: lodge.id } }
  }
  const w = ci.workshopByOutput.get(bn)
  if (w) {
    if (!s.workshops[w.id]) return { text: s.height < w.hook ? `GROW to ${w.hook} m and build the ${w.name}` : `Build the ${w.name}` }
    const crew = ci.crewByStation.get(w.id)
    if (crew && needsForeman(ci, s, crew.id)) return { text: `Tap the ${w.name} to hand-craft and hire its Foreman`, action: { kind: 'crew', id: crew.id } }
    if (crew) return { text: `Hire more ${w.name} crew`, action: { kind: 'crew', id: crew.id } }
  }
  if (!Number.isFinite(g.eta)) return { text: res.source }
  return undefined
}
