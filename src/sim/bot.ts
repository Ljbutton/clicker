/**
 * Headless bot player (GDD §17). Plays through the public Game API: strikes at a duty cycle, follows the
 * Waystone's pinned goal, takes the Compass's advice, buys lodges/crew when cheap relative to stock, carves
 * Runes when cheap, performs Rituals, hand-crafts to hire Foremen, discovers recipes, and Turns the Season
 * when recommended. Records a timeline of every notable event.
 */
import { Game } from '@/engine/game'
import type { Content } from '@/content/types'
import { memoryStorage } from '@/engine/storage'
import { fmt, fmtDuration } from '@/engine/numbers'
import { producerAvailable, producerCost, needsForeman, runeAvailable, runeCost, workshopBuildable, canAfford } from '@/systems/economy'
import { BALANCE } from '@/content/balance'

export type Profile = 'active' | 'casual' | 'notap'

export interface BotOptions {
  profile?: Profile
  /** Simulated seconds of play. */
  seconds: number
  step?: number
  seed?: number
  verbose?: boolean
  /** Model sessions: play `sessionOn` s then leave for `sessionOff` s (offline applied). */
  sessionOn?: number
  sessionOff?: number
  /** Turn the Season when the recommended Rings are reached. */
  turn?: boolean
  /** Stop after this many Turns. */
  maxTurns?: number
}

export interface TimelineEntry { t: number; kind: string; what: string; detail?: string }
export interface BotResult { timeline: TimelineEntry[]; game: Game; tapSap: number; totalSap: number; seconds: number }

const PROFILES = {
  active: { rate: 3, duty: [[180, 1], [600, 0.6], [1800, 0.35], [Infinity, 0.2]] as [number, number][], buyFrac: 0.2, runeFrac: 0.5, tapUntil: Infinity },
  casual: { rate: 2, duty: [[180, 0.5], [600, 0.3], [1800, 0.18], [Infinity, 0.1]] as [number, number][], buyFrac: 0.12, runeFrac: 0.5, tapUntil: Infinity },
  notap: { rate: 3, duty: [[120, 1], [Infinity, 0]] as [number, number][], buyFrac: 0.2, runeFrac: 0.5, tapUntil: 120 },
}

export function runBot(content: Content, opts: BotOptions): BotResult {
  const P = PROFILES[opts.profile ?? 'active']
  const step = opts.step ?? 0.25
  let wall = 1_700_000_000_000
  const game = new Game(content, { storage: memoryStorage(), seed: opts.seed ?? 42, clock: () => wall })
  const timeline: TimelineEntry[] = []
  const log = (kind: string, what: string, detail?: string) => { timeline.push({ t: game.now, kind, what, detail }); if (opts.verbose) console.log(`${fmtDuration(game.now).padStart(9)}  ${kind.padEnd(9)} ${what}${detail ? '  (' + detail + ')' : ''}`) }
  let tapSap = 0
  game.events.on('strike', (e) => { tapSap += e.value })
  game.events.on('goal', (e) => log('goal', `#${e.index + 1} ${e.goal.name}`, `sap ${fmt(game.s.res.sap ?? 0)} · ${fmt(game.idleSap)}/s`))
  game.events.on('producer', (e) => { if (e.foreman) log('foreman', game.ci.workshops.get(game.ci.producers.get(e.id)?.station ?? '')?.name ?? e.id); else if (e.count === e.added) log('lodge', game.ci.producers.get(e.id)?.name ?? e.id) })
  game.events.on('workshop', (e) => log('workshop', game.ci.workshops.get(e.id)?.name ?? e.id, `h=${Math.round(game.s.height)}m`))
  game.events.on('ritual', (e) => log('ritual', e.name, `h=${Math.round(game.s.height)}m`))
  game.events.on('line', (e) => log('line', e.name, `h=${Math.round(game.s.height)}m`))
  game.events.on('rune', (e) => { if (e.tier === 1) log('rune', game.ci.runes.get(e.id)?.name ?? e.id) })
  game.events.on('annex', (e) => { if (e.level <= 1) log('annex', game.ci.annexes.get(e.id)?.name ?? e.id) })
  game.events.on('discovery', (e) => { if (e.success) log('discover', game.ci.recipes.get(e.recipeId)?.name ?? e.recipeId) })
  game.events.on('turn', (e) => log('turn', `#${e.count} +${e.gained} Rings → ${e.seasonName}`))
  game.events.on('milestone', (e) => { if (e.def.celebration === 'big') log('milestone', e.def.name) })
  game.events.on('offline', (b) => log('offline', `away ${fmtDuration(b.summary.elapsed)}`, `+${fmt(b.summary.gained.sap ?? 0)} sap`))
  game.events.on('season', (e) => { if (e.kind === 'gust' || e.kind === 'bloom_start' || e.kind === 'storm_start' || e.kind === 'caravan_dock') log('season', e.kind) })

  let elapsed = 0, tapAcc = 0, sessionT = 0, turns = 0
  let rings3 = false, rings5 = false
  const duty = (t: number) => { for (const [until, d] of P.duty) if (t < until) return d; return 0 }
  while (elapsed < opts.seconds) {
    if (opts.sessionOn && opts.sessionOff && sessionT >= opts.sessionOn) {
      game.save(); wall += opts.sessionOff * 1000; game.load(); sessionT = 0; elapsed += opts.sessionOff
      for (const c of [...game.s.chests]) game.openChest(c.id)
      continue
    }
    game.tick(step); elapsed += step; sessionT += step; wall += step * 1000
    // tapping at the profile's rate/duty (duty modelled as fraction of each minute)
    const active = game.now < P.tapUntil && (game.now % 60) < 60 * duty(game.s.runTime)
    if (active) {
      tapAcc += P.rate * step
      while (tapAcc >= 1) {
        tapAcc -= 1
        game.strike()
        if (game.s.setPiece) game.tapSetPiece()
        if (game.s.droplet) game.tapDroplet()
      }
    }
    for (const c of [...game.s.chests]) game.openChest(c.id)
    if (game.s.frost.frozenSeconds > 0) for (let i = 0; i < 10; i++) game.tapFrozen()
    if (game.s.storm.charges >= 3) game.dischargeRod()
    if (!rings3 && game.rings >= 3) { rings3 = true; log('rings', '3 Rings (Turn available)') }
    if (!rings5 && game.rings >= 5) { rings5 = true; log('rings', '5 Rings (Turn recommended)') }

    // decide every 2 s
    if (Math.round(elapsed / step) % Math.round(2 / step) !== 0) continue
    const g = game.pinned
    const s = game.s
    // 1) act on the pinned goal
    if (g) {
      switch (g.kind) {
        case 'lodge': case 'milestone': if (g.ready && g.target) { const id = g.target; if (game.ci.producers.get(id)?.kind === 'crew' && needsForeman(game.ci, s, id)) game.hireForeman(id); else game.buyProducer(id, g.kind === 'milestone' ? 'max' : 1) } break
        case 'foreman': { const crewId = g.lane ? (g.lane.cond.kind === 'producer' ? g.lane.cond.id : g.id) : g.id; const p = game.ci.producers.get(crewId); if (p?.station) { if (!s.workshops[p.station]) { if (workshopBuildable(game.ci, s, p.station) && canAfford(s, game.ci.workshops.get(p.station)!.cost)) game.buildWorkshop(p.station) } else if (needsForeman(game.ci, s, crewId)) { for (let i = 0; i < 6 && !game.hireForeman(crewId); i++) if (game.tapWorkshop(p.station).made === 0) break } } break }
        case 'workshop': if (g.ready) game.buildWorkshop(g.target ?? g.id); break
        case 'height': case 'line': game.grow('max'); break
        case 'ritual': { const id = (g.target ?? '').replace('ritual:', '') || g.id; if (game.canAffordRitual(id)) game.performRitual(id); break }
        case 'rune': if (g.ready) game.carveRune(g.target ?? g.id); break
        case 'annex': { const [, aid, band] = (g.target ?? '').split(':'); const a = aid ?? g.id; const bandId = band ?? game.ci.annexes.get(a)?.bandId ?? game.ci.bands.find((b) => b.index > 1 && s.boughs.includes(b.id))?.id; if (bandId && g.ready) game.buildAnnex(a, bandId); break }
        case 'crucible': { const rid = (g.target ?? '').replace('crucible:', '') || g.id; const r = game.ci.recipes.get(rid); if (r && game.hints().some((h) => h.recipe.id === rid)) game.crucible(rid, Object.keys(r.inputs)); break }
        case 'craft': { const rid = g.lane?.cond.kind === 'crafted' ? g.lane.cond.id : null; const w = rid ? game.ci.raw.workshops.find((x) => x.recipe === rid) : null; if (w && !s.workshops[w.id] && workshopBuildable(game.ci, s, w.id)) game.buildWorkshop(w.id); if (w && s.workshops[w.id]) { const crew = game.ci.crewByStation.get(w.id); if (crew && needsForeman(game.ci, s, crew.id)) { for (let i = 0; i < 6 && !game.hireForeman(crew.id); i++) if (game.tapWorkshop(w.id).made === 0) break } } break }
        case 'tap': { if (g.lane?.cond.kind === 'handcrafts') { const st = g.lane.cond.station; if (!s.workshops[st] && workshopBuildable(game.ci, s, st)) game.buildWorkshop(st); for (let i = 0; i < 3; i++) game.tapWorkshop(st) } else if (g.lane?.cond.kind === 'kites') { game.craftKite('kite_carp', { cord: 50, lacquer: 20 }, 60) } break }
        case 'turn': if (opts.turn !== false && game.rings >= BALANCE.prestige.recommendRings) { game.turnSeason(); turns++; buyNodes(game); if (opts.maxTurns && turns >= opts.maxTurns) return finish() } break
      }
      if (g.advice?.action) { const a = g.advice.action; if (a.kind === 'lodge') game.buyProducer(a.id, 1); else if (needsForeman(game.ci, s, a.id)) { const st = game.ci.producers.get(a.id)?.station; if (st) for (let i = 0; i < 6 && !game.hireForeman(a.id); i++) if (game.tapWorkshop(st).made === 0) break } else game.buyProducer(a.id, 1) }
    }
    // 2) opportunistic: GROW when the pinned goal isn't a crafted-goods sink and Sap is plentiful
    if (g && (g.kind === 'height' || g.kind === 'line')) game.grow('max')
    else if (!g || g.bottleneck.id !== 'sap') { if ((s.res.sap ?? 0) > 0) game.grow(Math.max(1, Math.floor(growAffordableFrac(game, 0.3)))) }
    // 3) buy lodges/crew when cost ≤ buyFrac of the paying stock; carve Runes when ≤ runeFrac
    for (const p of game.ci.raw.producers) {
      if (!producerAvailable(game.ci, s, p.id)) continue
      if (needsForeman(game.ci, s, p.id)) continue
      const n = s.producers[p.id] ?? 0
      if (p.kind === 'crew' && n === 0) continue
      const cost = producerCost(game.ci, s, p.id, game.fx, 1)
      if (Object.entries(cost).every(([r, c]) => c <= P.buyFrac * (s.res[r] ?? 0))) game.buyProducer(p.id, 1)
    }
    for (const r of game.ci.raw.runes) {
      if (!runeAvailable(game.ci, s, r.id)) continue
      const cost = runeCost(game.ci, s, r.id)
      if (Object.entries(cost).every(([res, c]) => c <= P.runeFrac * (s.res[res] ?? 0))) game.carveRune(r.id)
    }
    // build any buildable workshop we can pay 2x for, and hire its foreman by hand-crafting
    for (const w of game.ci.raw.workshops) {
      if (workshopBuildable(game.ci, s, w.id) && Object.entries(w.cost).every(([r, c]) => c * 2 <= (s.res[r] ?? 0))) game.buildWorkshop(w.id)
      const crew = game.ci.crewByStation.get(w.id)
      if (s.workshops[w.id] && crew && needsForeman(game.ci, s, crew.id)) { for (let i = 0; i < 4 && !game.hireForeman(crew.id); i++) if (game.tapWorkshop(w.id).made === 0) break }
    }
    // discover any available hint
    for (const h of game.hints()) game.crucible(h.recipe.id, Object.keys(h.recipe.inputs))
    // rituals when affordable
    const nb = game.nextBough(); if (nb && game.canAffordRitual(nb.id)) game.performRitual(nb.id)
    // caravan trades
    if (game.s.caravan.offers.length) for (const o of game.s.caravan.offers) game.trade(o)
  }
  return finish()
  function finish(): BotResult { return { timeline, game, tapSap, totalSap: game.s.earned.sap ?? 0, seconds: elapsed } }
}

function growAffordableFrac(game: Game, frac: number): number {
  const sap = (game.s.res.sap ?? 0) * frac
  let n = 0, cost = 0
  const base = BALANCE.grow.baseCost * (game.fx.mult['grow_cost'] ?? 1)
  while (n < 500) { const c = base * Math.pow(BALANCE.grow.costGrowth, game.s.grows + n); if (cost + c > sap) break; cost += c; n++ }
  return n
}

/** Greedy Ring Tree: the doc's recommended first nodes, then cheapest visible. */
function buyNodes(game: Game) {
  for (const id of ['roots_rich', 'roots_start', 'hw_wind', 'trunk_grip', 'canopy_pride', 'crown_night', 'canopy_kept', 'roots_vigor1']) game.buyNode(id)
  for (let i = 0; i < 40; i++) {
    const nodes = game.ci.raw.prestigeNodes.filter((n) => (game.s.prestige.nodes[n.id] ?? 0) < n.maxLevel)
    const priced = nodes.map((n) => ({ n, c: Math.ceil(n.baseCost * Math.pow(n.costGrowth, game.s.prestige.nodes[n.id] ?? 0)) })).sort((a, b) => a.c - b.c)
    let bought = false
    for (const p of priced) { if (p.c > game.s.prestige.rings) break; if (game.buyNode(p.n.id)) { bought = true; break } }
    if (!bought) break
  }
}

export function firstTime(r: BotResult, kind: string, match?: (e: TimelineEntry) => boolean): number | null {
  const e = r.timeline.find((x) => x.kind === kind && (!match || match(x)))
  return e ? e.t : null
}
export function goalTime(r: BotResult, index1: number): number | null { return firstTime(r, 'goal', (e) => e.what.startsWith(`#${index1} `)) }
