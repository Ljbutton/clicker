/**
 * Headless bot player. Plays the game through the public Game API the way a reasonable player would:
 * taps at a given rate while "active", follows the compass, grows when growth is the goal, queues manual crafts,
 * opens chests, and prestiges when the compass says so. Records a timeline of every unlock.
 */
import { Game } from '@/engine/game'
import type { Content } from '@/content/types'
import { memoryStorage } from '@/engine/storage'
import { fmt, fmtDuration } from '@/engine/numbers'
import { recipeAvailable, isAutomated } from '@/systems/craft'
import { canBuild } from '@/systems/economy'
import { isUnlocked } from '@/systems/unlock'

export interface BotOptions {
  /** Taps per second while actively tapping. */
  tapRate?: number
  /** Fraction of each minute spent tapping (players don't tap constantly). */
  tapDuty?: number
  /** Stop tapping entirely after this many seconds (simulates a player who goes idle). */
  tapUntil?: number
  /** Simulated seconds to play. */
  seconds: number
  /** Sim step in seconds. */
  step?: number
  /** Prestige when the compass points at it and it is ready. */
  prestige?: boolean
  seed?: number
  /** Log every event. */
  verbose?: boolean
  /** Sessions: play `sessionOn` seconds then leave for `sessionOff` seconds (offline progress applied). */
  sessionOn?: number
  sessionOff?: number
}

export interface TimelineEntry { t: number; kind: string; what: string; detail?: string }

export interface BotResult {
  timeline: TimelineEntry[]
  finalHeight: number
  finalBase: number
  baseRate: number
  prestiges: number
  taps: number
  game: Game
}

export function runBot(content: Content, opts: BotOptions): BotResult {
  const step = opts.step ?? 0.5
  const tapRate = opts.tapRate ?? 4
  const tapDuty = opts.tapDuty ?? 0.6
  const tapUntil = opts.tapUntil ?? Infinity
  let wall = 1_700_000_000_000
  const game = new Game(content, { storage: memoryStorage(), seed: opts.seed ?? 42, clock: () => wall })
  const timeline: TimelineEntry[] = []
  const t = () => game.now
  const log = (kind: string, what: string, detail?: string) => { timeline.push({ t: t(), kind, what, detail }); if (opts.verbose) console.log(`${fmtDuration(t()).padStart(8)}  ${kind.padEnd(10)} ${what}${detail ? '  (' + detail + ')' : ''}`) }

  game.events.on('producer', (e) => { if (e.count === e.added) log('producer', game.ci.producers.get(e.id)?.name ?? e.id, `sap ${fmt(game.s.res[game.base] ?? 0)}`) })
  game.events.on('breakpoint', (e) => log('breakpt', `${game.ci.producers.get(e.id)?.name} x${e.count}`))
  game.events.on('building', (e) => { if (e.level === 1) log('building', game.ci.buildings.get(e.id)?.name ?? e.id, `h=${Math.round(game.s.height)}m`) })
  game.events.on('boost', (e) => { if (e.tier === 1) log('boost', game.ci.boosts.get(e.id)?.name ?? e.id) })
  game.events.on('band', (e) => log('band', e.name, `h=${Math.round(game.s.height)}m rate ${fmt(game.baseRate)}/s`))
  game.events.on('milestone', (m) => log('milestone', m.name))
  game.events.on('prestige', (e) => log('prestige', `#${e.count} +${e.gained}`))
  game.events.on('craft', (d) => { if ((game.s.craftsBy[d.recipeId] ?? 0) === 1) log('craft', `first ${game.ci.resources.get(d.id)?.name ?? d.id}`) })
  game.events.on('offline', (o) => log('offline', `${fmtDuration(o.elapsed)} away`, `+${fmt(o.gained[game.base] ?? 0)} ${game.base}`))

  let elapsed = 0
  let tapAcc = 0
  let sessionT = 0
  let inSession = true
  while (elapsed < opts.seconds) {
    // session handling (sim leaving the app)
    if (opts.sessionOn && opts.sessionOff) {
      if (inSession && sessionT >= opts.sessionOn) {
        game.save(); wall += opts.sessionOff * 1000; game.load(); inSession = true; sessionT = 0; elapsed += opts.sessionOff
        continue
      }
      sessionT += step
    }
    game.tick(step)
    elapsed += step; wall += step * 1000

    // tapping
    const active = t() < tapUntil && (t() % 60) < 60 * tapDuty
    if (active) { tapAcc += tapRate * step; while (tapAcc >= 1) { tapAcc -= 1; game.tap(); if (game.s.setPiece) game.tapSetPiece() } }

    // open any chests immediately
    for (const c of [...game.s.chests]) game.openChest(c.id)

    // manual crafting for non-automated stations: queue the highest-tier recipe we can afford
    for (const b of game.ci.raw.buildings) {
      if (!b.recipes.length || (game.s.buildings[b.id] ?? 0) <= 0 || isAutomated(game.ci, game.s, b.id)) continue
      if ((game.s.queues[b.id]?.length ?? 0) >= 2) continue
      const rs = (game.ci.recipesByStation.get(b.id) ?? []).filter((r) => recipeAvailable(game.ci, game.s, r)).sort((a, c) => (game.ci.resources.get(c.output.id)?.tier ?? 0) - (game.ci.resources.get(a.output.id)?.tier ?? 0))
      for (const r of rs) { if (game.canAfford(r.inputs)) { game.queueCraft(r.id); break } }
    }

    // follow the compass every ~2s
    if (Math.round(elapsed / step) % Math.round(2 / step) === 0) {
      const g = game.goals.primary
      if (g) {
        if (g.kind === 'band' || g.kind === 'height') { game.grow('max') }
        else if (g.kind === 'producer' || g.kind === 'breakpoint') { if (g.ready) game.buyProducer(g.id, g.kind === 'breakpoint' ? 'max' : 1) }
        else if (g.kind === 'building' || g.kind === 'upgrade') { if (g.ready) game.buyBuilding(g.id) }
        else if (g.kind === 'boost') { if (g.ready) game.buyBoost(g.id) }
        else if (g.kind === 'prestige' && opts.prestige !== false) { if (game.prestigeGain() >= 1 && g.ready) { game.prestige(); buyBestNodes(game) } else game.grow('max') }
      }
      // opportunistic: cheap crafters / producers already unlocked & affordable that the compass isn't pointing at
      for (const p of game.ci.raw.producers) {
        if ((game.s.producers[p.id] ?? 0) === 0 && isUnlocked(game.ci, game.s, p.unlock)) {
          const cost = Object.fromEntries(Object.entries(p.baseCost))
          const cheap = Object.entries(cost).every(([id, n]) => (game.s.res[id] ?? 0) >= n * 3)
          if (cheap) game.buyProducer(p.id, 1)
        }
      }
      for (const b of game.ci.raw.buildings) if ((game.s.buildings[b.id] ?? 0) === 0 && canBuild(game.ci, game.s, b.id)) { const cost = game.ci.buildings.get(b.id)!.baseCost; if (Object.entries(cost).every(([id, n]) => (game.s.res[id] ?? 0) >= n * 2)) game.buyBuilding(b.id) }
    }
  }
  return { timeline, finalHeight: game.s.height, finalBase: game.s.res[game.base] ?? 0, baseRate: game.baseRate, prestiges: game.s.prestige.count, taps: game.s.stats.tapsTotal, game }
}

function buyBestNodes(game: Game) {
  // greedy: buy the cheapest visible node until out of currency
  for (let i = 0; i < 50; i++) {
    const nodes = game.ci.raw.prestigeNodes.filter((n) => game.s.prestige.count >= (n.requiresPrestiges ?? 0) && (game.s.prestige.nodes[n.id] ?? 0) < n.maxLevel)
    const priced = nodes.map((n) => ({ n, c: Math.ceil(n.baseCost * Math.pow(n.costGrowth, game.s.prestige.nodes[n.id] ?? 0)) })).sort((a, b) => a.c - b.c)
    const pick = priced[0]
    if (!pick || pick.c > game.s.prestige.currency) break
    game.buyNode(pick.n.id)
  }
}
