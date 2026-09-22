/**
 * Game orchestrator: owns state + content, runs the simulation tick, exposes every player action.
 * UI, canvas scene and the headless simulator all drive this same class.
 */
import type { Content, CosmeticCategory, MilestoneDef, WaystoneGoalDef } from '@/content/types'
import { BALANCE } from '@/content/balance'
import { type GameState, defaultState, normalizeState, SAVE_VERSION } from './state'
import { createEmitter } from './events'
import { makeRng, type Rng } from './rng'
import { createSaveStore, type Storage, memoryStorage } from './storage'
import { indexContent, type ContentIndex } from '@/systems/index'
import { buildEffects, type EffectTable, emptyEffects, litBoughs, add } from '@/systems/effects'
import { stepEconomy, lodgeRates, buyProducer, hireForeman, buildWorkshop, carveRune, buildAnnex, upgradeAnnex, performRitualCheck, producerMaxAffordable, canAfford, producerCount, type EconomyRates } from '@/systems/economy'
import { grow, growMaxAffordable, bandAt, skyBandAt, performRitual, nextBough } from '@/systems/grow'
import { strike, tickTap, tapDroplet, tapWorkshop, type StrikeResult, thrumUnlocked, rallyUnlocked } from '@/systems/tap'
import { tickMilestones, tickTokens, openChest, pushChest, applyReward, type Granted } from '@/systems/milestones'
import { turnSeason, buyNode, ringsNow, canTurn, hasMechanic } from '@/systems/prestige'
import { applyOffline, type OfflineSummary } from '@/systems/offline'
import { candidates, best, laneGoal, advise, type Goal } from '@/systems/compass'
import { tickSetPiece, tapSetPiece } from '@/systems/setpiece'
import { tickSeasons, tapFrozen, discharge, tradeCaravan, dockCaravan, type SeasonEvent } from '@/systems/seasons'
import { tickWaystone, currentGoal, upcoming, legacyNext, resetLaneCache } from '@/systems/waystone'
import { attempt as crucibleAttempt, availableHints } from '@/systems/codex'
import { conditionProgress } from '@/systems/unlock'

export interface ReturnBoard {
  summary: OfflineSummary
  chest: 'bark' | 'amber' | null
  morningDew: { glimmer: number; fireflies: number } | null
  growsAffordable: number
  reachable: { name: string; kind: 'line' | 'ritual' } | null
  streak: number
}

export interface GameEvents {
  strike: StrikeResult & { x?: number; y?: number }
  grow: { grows: number; meters: number; height: number }
  line: { id: string; name: string }
  ritual: { id: string; name: string; direction: 'up' | 'down' }
  producer: { id: string; count: number; added: number; foreman: boolean }
  milestoneMult: { id: string; count: number }
  workshop: { id: string }
  handcraft: { station: string; made: number; masterwork: boolean }
  rune: { id: string; tier: number }
  annex: { id: string; bandId: string; level: number }
  goal: { goal: WaystoneGoalDef; got: Granted | null; index: number; landmark?: string }
  milestone: { def: MilestoneDef; got: Granted }
  chest: { tier: string; source: string; got: Granted }
  chestDropped: { tier: string; source: string }
  setpiece: { kind: 'spawned' | 'expired' | 'progress' | 'done'; id?: string; progress?: number; got?: Granted; paid?: number }
  turn: { gained: number; count: number; seasonName: string }
  node: { id: string; level: number }
  cosmetic: { id: string; how: 'earned' | 'bought' | 'equipped' | 'crafted' }
  offline: ReturnBoard
  bloom: { strikes: number }
  droplet: { caught: boolean }
  resonance: { auto: boolean }
  discovery: { recipeId: string; fireflies: number; success: boolean; revealed?: string }
  season: SeasonEvent
  night: { night: boolean }
  firefly: { count: number }
  wish: { id: string; fireflies: number }
  thaw: { sap: number; taps: number }
}

export interface GameOptions { storage?: Storage; saveKey?: string; seed?: number; clock?: () => number }

export class Game {
  readonly ci: ContentIndex
  s: GameState
  fx: EffectTable = emptyEffects()
  /** Gross lodge production per second (before workshops draw). */
  gross: Record<string, number> = {}
  /** 10 s EMA of net rates (gross − Foreman draw), taps excluded. */
  net: Record<string, number> = {}
  heartwoodRate = 0
  /** Sapper output per second without temporary boosts; scales chests and set-piece rewards. */
  steadyIdleSap = 0
  private hwLast = 0
  starved: Record<string, string | null> = {}
  pinned: Goal | null = null
  compassBest: Goal | null = null
  then: Goal[] = []
  readonly events = createEmitter<GameEvents>()
  readonly rng: Rng
  private fxDirty = true
  private secondAcc = 0
  private readonly store
  private readonly clock: () => number
  private lastSky: string
  private lastNight = false

  constructor(content: Content, opts: GameOptions = {}) {
    this.ci = indexContent(content)
    this.clock = opts.clock ?? (() => Date.now())
    this.rng = makeRng(opts.seed ?? (this.clock() & 0x7fffffff))
    this.store = createSaveStore<GameState>({ storage: opts.storage ?? memoryStorage(), key: opts.saveKey ?? 'hollowspire.save', version: SAVE_VERSION, migrations: { 1: (d) => d } })
    this.s = defaultState(this.clock())
    this.lastSky = skyBandAt(this.ci, 0).id
    this.grantStarters()
    this.refresh(true)
  }

  /* ---------- basics ---------- */
  get now() { return this.s.playTime }
  get base() { return this.ci.baseResource }
  /** Sapper-lodge output per second (the tap peg). */
  get idleSap() { return this.gross[this.base] ?? 0 }
  get baseRate() { return this.idleSap }
  get bough() { return bandAt(this.ci, this.s) }
  get sky() { return skyBandAt(this.ci, this.s.height) }
  get isNight() { const n = BALANCE.night; return this.s.playTime % n.cycleSeconds >= n.daySeconds }
  get litBoughs() { return litBoughs(this.ci, this.s, this.fx) }
  get rings() { return ringsNow(this.s) }
  get canTurn() { return canTurn(this.s) }
  get thrumUnlocked() { return thrumUnlocked(this.s) }
  get rallyUnlocked() { return rallyUnlocked(this.s) }
  hasMechanic(id: string) { return hasMechanic(this.ci, this.s, id) }
  canAfford(cost: Record<string, number>) { return canAfford(this.s, cost) }
  hints() { return availableHints(this.ci, this.s) }
  upcomingGoals(n = 3) { return upcoming(this.ci, this.s, n) }
  legacyNext() { return legacyNext(this.ci, this.s) }
  nextBough() { return nextBough(this.ci, this.s) }

  private grantStarters() {
    for (const c of this.ci.raw.cosmetics) if (c.starter && !this.s.cosmetics.owned.includes(c.id)) { this.s.cosmetics.owned.push(c.id); if (!this.s.cosmetics.equipped[c.category]) this.s.cosmetics.equipped[c.category] = c.id }
  }

  /* ---------- persistence ---------- */
  load(): ReturnBoard | null {
    const env = this.store.load()
    if (!env) { this.s = defaultState(this.clock()); this.grantStarters(); this.refresh(true); return null }
    this.s = normalizeState(env.data, this.clock())
    this.grantStarters()
    resetLaneCache()
    this.lastSky = this.sky.id
    this.refresh(true)
    const elapsed = Math.max(0, (this.clock() - (env.savedAt || this.s.lastSeen)) / 1000)
    const summary = applyOffline(this.ci, this.s, this.fx, elapsed)
    this.s.lastSeen = this.clock()
    this.refresh(true)
    if (summary.simulated <= 0) return null
    const board = this.returnBoard(summary)
    this.events.emit('offline', board)
    return board
  }
  private returnBoard(summary: OfflineSummary): ReturnBoard {
    const s = this.s
    const o = BALANCE.offline
    let chest: ReturnBoard['chest'] = null
    if (summary.elapsed > o.amberChestHours * 3600) chest = 'amber'
    else if (summary.elapsed > o.returnChestHours * 3600) chest = 'bark'
    if (chest) pushChest(s, chest, 'Nightwatch', this.now)
    // Dawn Rush
    s.dawnRushUntil = this.now + BALANCE.tap.dawnRushSeconds * (add(this.fx, 'dawn_rush_seconds') > 0 ? 2 : 1)
    if (this.thrumUnlocked) s.thrum = Math.max(s.thrum, BALANCE.tap.dawnRushThrum)
    // Morning Dew + streak
    const day = Math.floor(this.clock() / 86400000)
    let morningDew: ReturnBoard['morningDew'] = null
    if (s.stats.lastDailyBonus !== day && s.stats.strikesTotal > 20) {
      s.stats.lastDailyBonus = day
      s.glimmer += BALANCE.daily.glimmer; s.glimmerEarned += BALANCE.daily.glimmer
      s.fireflies += BALANCE.daily.fireflies; s.firefliesLifetime += BALANCE.daily.fireflies
      morningDew = { glimmer: BALANCE.daily.glimmer, fireflies: BALANCE.daily.fireflies }
      s.streak.count = s.streak.lastDay === day - 1 ? s.streak.count + 1 : 1
      s.streak.lastDay = day
    }
    if (this.hasMechanic('caravan')) dockCaravan(this.ci, s, this.rng, this.now)
    const growsAffordable = growMaxAffordable(this.ci, s, this.fx)
    let reachable: ReturnBoard['reachable'] = null
    const nb = nextBough(this.ci, s)
    if (nb) {
      if (s.height >= nb.line && this.canAffordRitual(nb.id)) reachable = { name: nb.name, kind: 'ritual' }
      else if (s.height < nb.line) { const g = growsToHeightCost(this, nb.line); if (g <= (s.res[this.base] ?? 0)) reachable = { name: nb.name, kind: 'line' } }
    }
    this.fxDirty = true; this.refresh(true)
    return { summary, chest, morningDew, growsAffordable, reachable, streak: s.streak.count }
  }
  save() { this.s.lastSeen = this.clock(); this.store.save(this.s, this.clock()) }
  exportSave(): string { this.save(); return btoa(unescape(encodeURIComponent(this.store.export() ?? ''))) }
  importSave(b64: string): boolean {
    try { const raw = decodeURIComponent(escape(atob(b64.trim()))); if (!this.store.import(raw)) return false; this.load(); return true } catch { return false }
  }
  reset() { this.store.clear(); this.s = defaultState(this.clock()); resetLaneCache(); this.grantStarters(); this.fxDirty = true; this.refresh(true) }

  /* ---------- simulation ---------- */
  private refresh(force = false) {
    if (this.fxDirty || force) {
      this.fx = buildEffects(this.ci, this.s, this.now); this.fxDirty = false
      this.steadyIdleSap = lodgeRates(this.ci, this.s, buildEffects(this.ci, this.s, this.now, true))[this.base] ?? 0
    }
    this.gross = lodgeRates(this.ci, this.s, this.fx)
  }
  private dirty() { this.fxDirty = true; this.refresh() }

  tick(dt: number) {
    const s = this.s
    s.playTime += dt; s.runTime += dt
    let changed = tickTokens(s, this.now)
    const wasRes = s.resonanceUntil > this.now - dt, wasRally = s.rally.holding
    const tt = tickTap(s, this.fx, dt, this.now)
    if (tt.autoResonance) { changed = true; this.events.emit('resonance', { auto: true }) }
    if (wasRes !== s.resonanceUntil > this.now || wasRally !== s.rally.holding || s.rally.holding) changed = true
    if (changed) this.fxDirty = true
    if (this.fxDirty) this.refresh()
    const rates: EconomyRates = stepEconomy(this.ci, s, this.fx, dt)
    this.gross = rates.gross
    this.starved = rates.starved
    // EMA of net rates
    const a = Math.min(1, dt / BALANCE.compass.ema)
    for (const id of new Set([...Object.keys(rates.net), ...Object.keys(this.net)])) this.net[id] = (this.net[id] ?? 0) + (((rates.net[id] ?? 0)) - (this.net[id] ?? 0)) * a
    // set-pieces and seasons
    const sp = tickSetPiece(this.ci, s, this.rng, this.now)
    if (sp) this.events.emit('setpiece', { kind: sp, id: s.setPiece?.id })
    for (const ev of tickSeasons(this.ci, s, this.fx, this.rng, this.now, this.steadyIdleSap)) { this.events.emit('season', ev); this.fxDirty = true }
    // once per second: lanes, milestones, compass, night, wishes
    this.secondAcc += dt
    if (this.secondAcc >= 1) {
      this.secondAcc = 0
      this.heartwoodRate = this.heartwoodRate + ((s.heartwood - this.hwLast) - this.heartwoodRate) * 0.1
      this.hwLast = s.heartwood
      this.checkLane()
      this.checkMilestones()
      this.checkWishes()
      const night = this.isNight
      if (night !== this.lastNight) { this.lastNight = night; if (night) { s.nightIndex++; s.nightFireflies = 0 } this.events.emit('night', { night }) }
      while (s.chests.length > BALANCE.chests.maxPending) this.openChest(s.chests[0]!.id)
      this.fxDirty = true; this.refresh()
      this.resolveGoals()
    }
  }

  private checkLane() {
    for (const done of tickWaystone(this.ci, this.s, this.now, this.steadyIdleSap)) {
      if (done.got?.chest) this.events.emit('chestDropped', { tier: done.got.chest, source: done.goal.name })
      if (done.got?.cosmetic) this.events.emit('cosmetic', { id: done.got.cosmetic, how: 'earned' })
      if (done.got?.token) this.fxDirty = true
      this.events.emit('goal', { ...done, landmark: done.got?.landmark })
    }
  }
  private checkMilestones() {
    for (const m of tickMilestones(this.ci, this.s, this.now, this.steadyIdleSap, this.rings)) {
      if (m.got.cosmetic) this.events.emit('cosmetic', { id: m.got.cosmetic, how: 'earned' })
      if (m.got.chest) this.events.emit('chestDropped', { tier: m.got.chest, source: m.def.name })
      this.fxDirty = true
      this.events.emit('milestone', m)
    }
  }
  private checkWishes() {
    const s = this.s
    const day = Math.floor(this.clock() / 86400000)
    if (s.wishes.day !== day || !s.wishes.list.length) {
      const pool = this.ci.raw.wishes
      if (!pool.length) return
      const r = makeRng(day)
      const picks = new Set<number>()
      while (picks.size < Math.min(2, pool.length)) picks.add(r.int(0, pool.length - 1))
      s.wishes = { day, list: [...picks].map((i) => { const w = pool[i]!; return { id: w.id, base: conditionProgress(this.ci, s, w.cond).have, done: false } }) }
    }
    for (const w of s.wishes.list) {
      if (w.done) continue
      const def = this.ci.wishes.get(w.id); if (!def) continue
      const p = conditionProgress(this.ci, s, def.cond)
      if (p.have - w.base >= p.need) { w.done = true; s.fireflies += def.fireflies; s.firefliesLifetime += def.fireflies; this.events.emit('wish', { id: w.id, fireflies: def.fireflies }) }
    }
  }
  wishProgress(id: string): { have: number; need: number } | null {
    const w = this.s.wishes.list.find((x) => x.id === id); const def = this.ci.wishes.get(id)
    if (!w || !def) return null
    const p = conditionProgress(this.ci, this.s, def.cond)
    return { have: Math.min(p.need, p.have - w.base), need: p.need }
  }

  /** Pinned goal = Season lane head while the lane has entries; otherwise the Compass's best. */
  resolveGoals() {
    const all = candidates(this.ci, this.s, this.fx, this.net, this.heartwoodRate)
    this.compassBest = best(all)
    const cg = currentGoal(this.ci, this.s)
    const laneHead = cg ? laneGoal(this.ci, this.s, this.fx, this.net, cg, this.heartwoodRate) : null
    // The lane head is pinned while it is reachable soon; when it is far away (or waiting on time), the Compass's
    // nearest goal takes the bar and the lane head moves to the runway, so the bar always shows something close.
    let pinned = laneHead ?? this.compassBest
    const far = laneHead && !laneHead.ready && (laneHead.eta > BALANCE.compass.maxEta || (!Number.isFinite(laneHead.eta) && laneHead.kind !== 'tap' && laneHead.kind !== 'crucible'))
    if (far && this.compassBest && (this.compassBest.ready || this.compassBest.eta < BALANCE.compass.maxEta)) pinned = this.compassBest
    if (pinned) pinned.advice = advise(this.ci, this.s, this.fx, this.net, pinned)
    this.pinned = pinned
    const others = all.filter((g) => g !== this.compassBest && !(g.ready && !g.fresh) && Number.isFinite(g.eta)).sort((a, b) => a.eta - b.eta)
    this.then = [laneHead, this.compassBest, ...others].filter((g): g is Goal => !!g && g !== pinned && g.id !== pinned?.id).slice(0, 2)
  }

  /* ---------- tap layer ---------- */
  strike(x?: number, y?: number): StrikeResult {
    const r = strike(this.ci, this.s, this.fx, this.rng, this.now, this.steadyIdleSap)
    if (r.resonance) { this.dirty(); this.events.emit('resonance', { auto: false }) }
    if (r.bloom) { pushChest(this.s, 'bark', 'Bloom', this.now); this.events.emit('bloom', { strikes: this.s.strikes }); this.events.emit('chestDropped', { tier: 'bark', source: 'Bloom' }) }
    if (r.droplet) this.events.emit('droplet', { caught: false })
    this.events.emit('strike', { ...r, x, y })
    return r
  }
  tapDroplet(): boolean { const ok = tapDroplet(this.s, this.now); if (ok) { this.dirty(); this.events.emit('droplet', { caught: true }) } return ok }
  setRally(holding: boolean) {
    if (!this.rallyUnlocked) return
    if (holding && !this.s.rally.holding) this.s.rally.since = this.now
    this.s.rally.holding = holding
    this.dirty()
  }
  tapWorkshop(station: string) {
    const r = tapWorkshop(this.ci, this.s, this.fx, this.rng, station)
    if (r.made > 0) this.events.emit('handcraft', { station, ...r })
    return r
  }
  tapSetPiece() {
    const r = tapSetPiece(this.ci, this.s, this.fx, this.rng, this.now, this.steadyIdleSap)
    if (r.done) { if (r.got?.chest) this.events.emit('chestDropped', { tier: r.got.chest, source: r.def?.name ?? 'Set-piece' }); this.events.emit('setpiece', { kind: 'done', id: r.def?.id, got: r.got, paid: r.paid }) }
    else if (r.def) this.events.emit('setpiece', { kind: 'progress', id: r.def.id, progress: r.progress, paid: r.paid })
    return r
  }
  tapFirefly(): boolean {
    if (!this.isNight || this.s.nightFireflies >= BALANCE.night.maxFireflies) return false
    this.s.nightFireflies++; this.s.fireflies++; this.s.firefliesLifetime++
    this.events.emit('firefly', { count: this.s.nightFireflies })
    return true
  }
  tapFrozen() { const r = tapFrozen(this.ci, this.s, this.fx, this.idleSap); if (r.done) this.events.emit('thaw', { sap: r.sap ?? 0, taps: r.taps }); return r }
  dischargeRod() { const n = discharge(this.ci, this.s, this.fx, 1); return n }
  trade(offerId: string) { const g = tradeCaravan(this.ci, this.s, offerId, this.now, this.steadyIdleSap); if (g?.cosmetic) this.events.emit('cosmetic', { id: g.cosmetic, how: 'earned' }); return g }
  tapBloomFront() { if (this.s.bloom.active) { this.s.bloom.startedAt -= BALANCE.bloom.perBough; this.dirty(); return true } return false }

  /* ---------- growth ---------- */
  grow(n: number | 'max' = 1) {
    const count = n === 'max' ? growMaxAffordable(this.ci, this.s, this.fx) : n
    if (count <= 0) return { grows: 0, meters: 0 }
    const r = grow(this.ci, this.s, this.fx, count)
    if (r.grows > 0) {
      this.events.emit('grow', { ...r, height: this.s.height })
      const sky = this.sky
      if (sky.id !== this.lastSky) { this.lastSky = sky.id; this.events.emit('line', { id: sky.id, name: sky.name }) }
      this.resolveGoals()
    }
    return r
  }
  canAffordRitual(bandId: string) { return performRitualCheck(this.ci, this.s, bandId, this.fx) }
  performRitual(bandId: string): boolean {
    const ok = performRitual(this.ci, this.s, bandId, this.fx)
    if (ok) {
      const b = this.ci.bandById.get(bandId)!
      resetLaneCache()
      this.dirty()
      this.events.emit('ritual', { id: bandId, name: b.name, direction: b.direction })
      this.checkLane(); this.checkMilestones(); this.resolveGoals()
    }
    return ok
  }

  /* ---------- purchases ---------- */
  buyProducer(id: string, n: number | 'max' = 1): number {
    if (!this.ci.producers.has(id)) return 0
    const count = n === 'max' ? Math.max(1, producerMaxAffordable(this.ci, this.s, id, this.fx)) : n
    const before = producerCount(this.s, id)
    const added = buyProducer(this.ci, this.s, id, this.fx, count)
    if (added > 0) {
      this.dirty()
      const after = before + added
      this.events.emit('producer', { id, count: after, added, foreman: false })
      for (const bp of [10, 25, 50, 100, 200, 300, 400, 500]) if (before < bp && after >= bp) this.events.emit('milestoneMult', { id, count: bp })
      this.resolveGoals()
    }
    return added
  }
  hireForeman(id: string): boolean {
    const ok = hireForeman(this.ci, this.s, id)
    if (ok) { this.dirty(); this.events.emit('producer', { id, count: 1, added: 1, foreman: true }); this.resolveGoals() }
    return ok
  }
  buildWorkshop(id: string): boolean {
    const ok = buildWorkshop(this.ci, this.s, id)
    if (ok) { this.dirty(); this.events.emit('workshop', { id }); this.resolveGoals() }
    return ok
  }
  carveRune(id: string): boolean {
    const ok = carveRune(this.ci, this.s, id)
    if (ok) { this.dirty(); this.events.emit('rune', { id, tier: this.s.runes[id] ?? 0 }); this.resolveGoals() }
    return ok
  }
  buildAnnex(id: string, bandId: string): boolean {
    const ok = buildAnnex(this.ci, this.s, id, bandId)
    if (ok) { this.dirty(); this.events.emit('annex', { id, bandId, level: this.s.annexLevels[id] ?? 0 }); this.resolveGoals() }
    return ok
  }
  upgradeAnnex(id: string): boolean {
    const ok = upgradeAnnex(this.ci, this.s, id)
    if (ok) { this.dirty(); this.events.emit('annex', { id, bandId: Object.keys(this.s.limbs).find((b) => this.s.limbs[b]!.includes(id)) ?? '', level: this.s.annexLevels[id] ?? 0 }) }
    return ok
  }
  setHearth(station: string | null) { this.s.hearthTarget = station; this.dirty() }
  setFeed(station: string, feed: number) { this.s.feed[station] = feed }

  /* ---------- chests, prestige, codex ---------- */
  openChest(id: string) {
    const r = openChest(this.ci, this.s, this.rng, id, this.now, this.steadyIdleSap)
    if (!r) return null
    if (r.got.token) this.dirty()
    if (r.got.cosmetic) this.events.emit('cosmetic', { id: r.got.cosmetic, how: 'earned' })
    this.events.emit('chest', { tier: r.chest.tier, source: r.chest.source, got: r.got })
    return r
  }
  turnSeason(): number {
    const gained = turnSeason(this.ci, this.s, this.now)
    if (gained > 0) {
      resetLaneCache()
      const mech = this.ci.raw.mechanics.find((m) => m.atTurn === this.s.prestige.count)
      if (mech?.medal && !this.s.cosmetics.owned.includes(mech.medal)) { this.s.cosmetics.owned.push(mech.medal); this.events.emit('cosmetic', { id: mech.medal, how: 'earned' }) }
      pushChest(this.s, 'season', 'Season Turn', this.now)
      this.lastSky = this.sky.id
      this.net = {}; this.heartwoodRate = 0; this.hwLast = 0
      this.dirty()
      this.events.emit('turn', { gained, count: this.s.prestige.count, seasonName: mech?.seasonName ?? `Season ${this.s.prestige.count + 1}` })
      this.checkLane(); this.checkMilestones(); this.resolveGoals()
      this.save()
    }
    return gained
  }
  buyNode(id: string): boolean {
    const ok = buyNode(this.ci, this.s, id)
    if (ok) { this.dirty(); this.events.emit('node', { id, level: this.s.prestige.nodes[id] ?? 0 }) }
    return ok
  }
  crucible(recipeId: string, slots: string[]) {
    const r = crucibleAttempt(this.ci, this.s, this.fx, recipeId, slots)
    this.events.emit('discovery', { recipeId, fireflies: r.fireflies ?? 0, success: r.success, revealed: r.revealed })
    if (r.success) { this.checkLane(); this.resolveGoals() }
    return r
  }

  /* ---------- cosmetics & shop (nothing here touches progress) ---------- */
  ownsCosmetic(id: string) { return this.s.cosmetics.owned.includes(id) }
  buyCosmetic(id: string, currency: 'glimmer' | 'fireflies'): boolean {
    const c = this.ci.cosmetics.get(id)
    if (!c || this.ownsCosmetic(id)) return false
    if (currency === 'glimmer') { if (c.price == null || this.s.glimmer < c.price) return false; this.s.glimmer -= c.price }
    else { if (c.fireflyPrice == null || this.s.fireflies < c.fireflyPrice) return false; this.s.fireflies -= c.fireflyPrice }
    this.s.cosmetics.owned.push(id); this.s.cosmetics.purchases.push(`${currency}:${id}`)
    this.events.emit('cosmetic', { id, how: 'bought' })
    this.equip(id)
    return true
  }
  buyBundle(id: string): boolean {
    const b = this.ci.bundles.get(id)
    if (!b) return false
    const missing = b.items.filter((i) => !this.ownsCosmetic(i))
    if (!missing.length || this.s.glimmer < b.price) return false
    this.s.glimmer -= b.price
    for (const i of missing) { this.s.cosmetics.owned.push(i); this.events.emit('cosmetic', { id: i, how: 'bought' }) }
    this.s.cosmetics.purchases.push(`bundle:${id}`)
    return true
  }
  equip(id: string): boolean {
    const c = this.ci.cosmetics.get(id)
    if (!c || !this.ownsCosmetic(id)) return false
    this.s.cosmetics.equipped[c.category] = id
    this.events.emit('cosmetic', { id, how: 'equipped' })
    return true
  }
  unequip(cat: CosmeticCategory) { delete this.s.cosmetics.equipped[cat] }
  equipped(cat: CosmeticCategory) { const id = this.s.cosmetics.equipped[cat]; return id ? this.ci.cosmetics.get(id) ?? null : null }
  /** Credit premium currency after a (mock or store) purchase. */
  creditGlimmer(n: number, receipt: string) { this.s.glimmer += n; this.s.cosmetics.purchases.push(receipt) }
  grantSupporter(receipt: string, initials = '') {
    if (this.s.cosmetics.supporter) return
    this.s.cosmetics.supporter = true; this.s.cosmetics.initials = initials.slice(0, 3).toUpperCase()
    this.s.cosmetics.purchases.push(receipt)
    this.s.glimmer += 300
    for (const c of this.ci.raw.cosmetics) if (c.supporter && !this.ownsCosmetic(c.id)) { this.s.cosmetics.owned.push(c.id); this.events.emit('cosmetic', { id: c.id, how: 'bought' }) }
  }
  /** Kite Yard: craft a cosmetic from goods + Fireflies. */
  craftKite(id: string, cost: Record<string, number>, fireflies: number): boolean {
    if (this.ownsCosmetic(id) || this.s.fireflies < fireflies || !canAfford(this.s, cost)) return false
    for (const [r, n] of Object.entries(cost)) this.s.res[r] = (this.s.res[r] ?? 0) - n
    this.s.fireflies -= fireflies
    this.s.cosmetics.owned.push(id); this.s.kites++
    this.events.emit('cosmetic', { id, how: 'crafted' })
    this.equip(id)
    return true
  }
  /** Weekly Firefly Market featured items: one per category with a firefly price, seeded by ISO week. */
  marketFeatured(): string[] {
    const week = Math.floor(this.clock() / (7 * 86400000))
    const r = makeRng(week * 7919)
    const cats = new Map<string, string[]>()
    for (const c of this.ci.raw.cosmetics) if (c.fireflyPrice != null) (cats.get(c.category) ?? cats.set(c.category, []).get(c.category)!).push(c.id)
    return [...cats.values()].map((ids) => r.pick(ids))
  }
}

function growsToHeightCost(g: Game, target: number): number {
  // local helper to avoid a circular import in returnBoard
  let h = g.s.height, k = g.s.grows, n = 0
  const fx = g.fx
  const meters = (at: number) => (BALANCE.grow.baseMeters + at * BALANCE.grow.slope + (fx.add['grow_meters_add'] ?? 0)) * Math.min(BALANCE.grow.vigorCap, fx.mult['grow_meters'] ?? 1)
  while (h < target && n < 100000) { h += meters(k); k++; n++ }
  const base = BALANCE.grow.baseCost * (fx.mult['grow_cost'] ?? 1), gr = BALANCE.grow.costGrowth
  return base * Math.pow(gr, g.s.grows) * (Math.pow(gr, n) - 1) / (gr - 1)
}
