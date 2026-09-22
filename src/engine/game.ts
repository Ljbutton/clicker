/**
 * Game orchestrator: owns state + content, runs the simulation tick, and exposes player actions.
 * UI, canvas scene and the headless simulator all drive this same class.
 */
import type { Content, CosmeticCategory, MilestoneDef } from '@/content/types'
import { BALANCE } from '@/content/balance'
import { type GameState, defaultState, normalizeState, SAVE_VERSION } from './state'
import { createEmitter } from './events'
import { makeRng, type Rng } from './rng'
import { createSaveStore, type Storage, memoryStorage } from './storage'
import { indexContent, type ContentIndex } from '@/systems/index'
import { buildEffects, type EffectTable, emptyEffects } from '@/systems/effects'
import { productionRates, gain, buyProducer, buyBuilding, buyBoost, producerMaxAffordable, canAfford } from '@/systems/economy'
import { grow, growMaxAffordable, bandAt } from '@/systems/grow'
import { tap, tickTap, type TapResult } from '@/systems/tap'
import { tickCraft, queueCraft } from '@/systems/craft'
import { tickMilestones, tickTokens, openChest, applyReward } from '@/systems/milestones'
import { doPrestige, buyNode, prestigeGain } from '@/systems/prestige'
import { applyOffline, type OfflineSummary } from '@/systems/offline'
import { pickGoals, goalRates, type Goal } from '@/systems/compass'
import { tickSetPiece, tapSetPiece } from '@/systems/setpiece'

export interface GameEvents {
  tap: TapResult & { x?: number; y?: number }
  grow: { grows: number; meters: number; height: number }
  band: { id: string; name: string }
  producer: { id: string; count: number; added: number }
  building: { id: string; level: number }
  boost: { id: string; tier: number }
  craft: { recipeId: string; id: string; count: number }
  milestone: MilestoneDef
  chest: { tier: string; source: string; got: ReturnType<typeof applyReward> }
  setpiece: { kind: 'spawned' | 'expired' | 'progress' | 'done'; id?: string; progress?: number; got?: ReturnType<typeof applyReward> }
  prestige: { gained: number; count: number }
  node: { id: string; level: number }
  cosmetic: { id: string; how: 'earned' | 'bought' | 'equipped' }
  offline: OfflineSummary
  bloom: { taps: number }
  daily: { petals: number }
  breakpoint: { id: string; count: number }
}

export interface GameOptions {
  storage?: Storage
  saveKey?: string
  seed?: number
  /** Wall clock provider (ms). */
  clock?: () => number
}

export class Game {
  readonly ci: ContentIndex
  s: GameState
  fx: EffectTable = emptyEffects()
  rates: Record<string, number> = {}
  goals: { primary: Goal | null; then: Goal[] } = { primary: null, then: [] }
  readonly events = createEmitter<GameEvents>()
  readonly rng: Rng
  holding = false
  private fxDirty = true
  private secondAcc = 0
  private readonly store
  private readonly clock: () => number
  private lastBand: string

  constructor(content: Content, opts: GameOptions = {}) {
    this.ci = indexContent(content)
    this.clock = opts.clock ?? (() => Date.now())
    this.rng = makeRng(opts.seed ?? (this.clock() & 0x7fffffff))
    this.store = createSaveStore<GameState>({ storage: opts.storage ?? memoryStorage(), key: opts.saveKey ?? 'clicker.save', version: SAVE_VERSION, migrations: {} })
    this.s = defaultState(this.clock())
    this.lastBand = bandAt(this.ci, 0).id
    this.refresh()
  }

  /** In-game clock: seconds of simulated play (pauses while away, so timers never burn offline). */
  get now() { return this.s.playTime }
  get base() { return this.ci.baseResource }
  get baseRate() { return this.rates[this.base] ?? 0 }
  get band() { return bandAt(this.ci, this.s.height) }

  /* ---------- persistence ---------- */
  /** Load a save; returns the offline summary if time passed. */
  load(): OfflineSummary | null {
    const env = this.store.load()
    if (!env) { this.s = defaultState(this.clock()); this.refresh(); return null }
    this.s = normalizeState(env.data, this.clock())
    this.lastBand = this.band.id
    this.refresh()
    const elapsed = Math.max(0, (this.clock() - (env.savedAt || this.s.lastSeen)) / 1000)
    const summary = applyOffline(this.ci, this.s, this.fx, elapsed)
    this.s.lastSeen = this.clock()
    this.fxDirty = true
    this.refresh()
    if (summary.effective > 0) this.events.emit('offline', summary)
    this.checkDaily()
    return summary
  }
  save() { this.s.lastSeen = this.clock(); this.store.save(this.s, this.clock()) }
  exportSave(): string { this.save(); return btoa(unescape(encodeURIComponent(this.store.export() ?? ''))) }
  importSave(b64: string): boolean {
    try { const raw = decodeURIComponent(escape(atob(b64.trim()))); if (!this.store.import(raw)) return false; this.load(); return true } catch { return false }
  }
  reset() { this.store.clear(); this.s = defaultState(this.clock()); this.fxDirty = true; this.refresh() }

  private checkDaily() {
    const day = Math.floor(this.clock() / 86400000)
    if (this.s.stats.lastDailyBonus !== day && this.s.stats.tapsTotal > 20) {
      this.s.stats.lastDailyBonus = day
      this.s.cosmetics.petals += BALANCE.daily.petals; this.s.cosmetics.petalsEarned += BALANCE.daily.petals
      this.events.emit('daily', { petals: BALANCE.daily.petals })
    }
  }

  /* ---------- simulation ---------- */
  private refresh() {
    if (this.fxDirty) { this.fx = buildEffects(this.ci, this.s, this.now); this.fxDirty = false }
    this.rates = productionRates(this.ci, this.s, this.fx)
  }
  /** Force effect/rate recomputation (after any purchase). */
  private dirty() { this.fxDirty = true; this.refresh() }

  tick(dt: number) {
    const s = this.s
    s.playTime += dt; s.runTime += dt
    // token / cheer expiry affects effects each tick cheaply
    const hadTokens = s.tokens.length > 0, wasCheer = s.cheer.active
    tickTokens(s, this.now)
    tickTap(s, this.fx, dt, this.now, this.holding)
    if (hadTokens !== s.tokens.length > 0 || wasCheer !== s.cheer.active) this.fxDirty = true
    if (this.fxDirty) this.refresh()
    for (const [id, r] of Object.entries(this.rates)) gain(s, id, r * dt)
    for (const d of tickCraft(this.ci, s, this.fx, dt)) this.events.emit('craft', d)
    const sp = tickSetPiece(this.ci, s, this.rng, this.now)
    if (sp) this.events.emit('setpiece', { kind: sp, id: s.setPiece?.id })
    this.secondAcc += dt
    if (this.secondAcc >= 1) {
      this.secondAcc = 0
      for (const m of tickMilestones(this.ci, s, this.now, this.baseRate)) this.events.emit('milestone', m)
      this.goals = pickGoals(this.ci, s, this.fx, goalRates(this.ci, s, this.fx, this.rates))
      // cheer/tokens toggled by time: rebuild effects once a second regardless
      this.fxDirty = true; this.refresh()
    }
  }

  /* ---------- actions ---------- */
  tap(x?: number, y?: number): TapResult {
    const wasCheer = this.s.cheer.active
    const r = tap(this.ci, this.s, this.fx, this.rng, this.now, this.baseRate)
    if (!wasCheer && this.s.cheer.active) this.dirty()
    if (r.bloom) { this.s.chests.push({ id: `bloom:${this.s.taps}`, tier: 'wood', source: 'Bud Bloom', reward: { incomeSeconds: 60, incomeFloor: 25, petals: 2 } }); this.events.emit('bloom', { taps: this.s.taps }) }
    this.events.emit('tap', { ...r, x, y })
    return r
  }

  tapSetPiece() {
    const r = tapSetPiece(this.ci, this.s, this.rng, this.now, this.baseRate)
    if (r.done) this.events.emit('setpiece', { kind: 'done', id: r.def?.id, got: r.got })
    else if (r.def) this.events.emit('setpiece', { kind: 'progress', id: r.def.id, progress: r.progress })
    return r
  }

  grow(n: number | 'max' = 1) {
    const count = n === 'max' ? growMaxAffordable(this.ci, this.s, this.fx) : n
    if (count <= 0) return { grows: 0, meters: 0 }
    const r = grow(this.ci, this.s, this.fx, count)
    if (r.grows > 0) {
      this.events.emit('grow', { ...r, height: this.s.height })
      const b = this.band
      if (b.id !== this.lastBand) { this.lastBand = b.id; if (!this.s.seenBands.includes(b.id)) this.s.seenBands.push(b.id); this.events.emit('band', { id: b.id, name: b.name }) }
      this.goals = pickGoals(this.ci, this.s, this.fx, goalRates(this.ci, this.s, this.fx, this.rates))
    }
    return r
  }

  buyProducer(id: string, n: number | 'max' = 1): number {
    const count = n === 'max' ? Math.max(1, producerMaxAffordable(this.ci, this.s, id, this.fx)) : n
    const before = this.s.producers[id] ?? 0
    const added = buyProducer(this.ci, this.s, id, this.fx, count)
    if (added > 0) {
      this.dirty()
      const after = before + added
      this.events.emit('producer', { id, count: after, added })
      const p = this.ci.producers.get(id)
      if (p) for (const bp of p.breakpoints) if (before < bp && after >= bp) this.events.emit('breakpoint', { id, count: bp })
    }
    return added
  }

  buyBuilding(id: string): boolean {
    const ok = buyBuilding(this.ci, this.s, id, this.fx)
    if (ok) { this.dirty(); this.events.emit('building', { id, level: this.s.buildings[id] ?? 0 }) }
    return ok
  }

  buyBoost(id: string): boolean {
    const ok = buyBoost(this.ci, this.s, id)
    if (ok) { this.dirty(); this.events.emit('boost', { id, tier: this.s.boosts[id] ?? 0 }) }
    return ok
  }

  queueCraft(recipeId: string): boolean { return queueCraft(this.ci, this.s, recipeId) }
  setReserve(station: string, n: number) { this.s.reserves[station] = Math.max(0, n) }
  toggleAuto(recipeId: string) { const k = `auto_off:${recipeId}`; this.s.flags[k] = !this.s.flags[k] }

  openChest(id: string) {
    const r = openChest(this.ci, this.s, id, this.now, this.baseRate)
    if (!r) return null
    if (r.got.token) this.dirty()
    if (r.got.cosmetic) this.events.emit('cosmetic', { id: r.got.cosmetic, how: 'earned' })
    this.events.emit('chest', { tier: r.chest.tier, source: r.chest.source, got: r.got })
    return r
  }

  prestigeGain() { return prestigeGain(this.s, this.fx) }
  prestige(): number {
    const gained = doPrestige(this.ci, this.s, this.fx, this.now)
    if (gained > 0) { this.lastBand = this.band.id; this.dirty(); this.events.emit('prestige', { gained, count: this.s.prestige.count }); this.save() }
    return gained
  }
  buyNode(id: string): boolean {
    const ok = buyNode(this.ci, this.s, id)
    if (ok) { this.dirty(); this.events.emit('node', { id, level: this.s.prestige.nodes[id] ?? 0 }) }
    return ok
  }

  /* ---------- cosmetics & shop (cosmetics only; nothing here touches progress) ---------- */
  ownsCosmetic(id: string) { return this.s.cosmetics.owned.includes(id) }
  buyCosmetic(id: string): boolean {
    const c = this.ci.cosmetics.get(id)
    if (!c || this.ownsCosmetic(id) || c.price == null || this.s.cosmetics.petals < c.price) return false
    this.s.cosmetics.petals -= c.price
    this.s.cosmetics.owned.push(id)
    this.s.cosmetics.purchases.push(id)
    this.events.emit('cosmetic', { id, how: 'bought' })
    this.equip(id)
    return true
  }
  buyBundle(id: string): boolean {
    const b = this.ci.bundles.get(id)
    if (!b) return false
    const missing = b.items.filter((i) => !this.ownsCosmetic(i))
    if (!missing.length || this.s.cosmetics.petals < b.price) return false
    this.s.cosmetics.petals -= b.price
    for (const i of missing) { this.s.cosmetics.owned.push(i); this.events.emit('cosmetic', { id: i, how: 'bought' }) }
    this.s.cosmetics.purchases.push(id)
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
  creditPetals(n: number, receipt: string) { this.s.cosmetics.petals += n; this.s.cosmetics.purchases.push(receipt) }
  grantSupporter(receipt: string) {
    if (this.s.cosmetics.supporter) return
    this.s.cosmetics.supporter = true
    this.s.cosmetics.purchases.push(receipt)
    for (const c of this.ci.raw.cosmetics) if (c.supporter && !this.ownsCosmetic(c.id)) { this.s.cosmetics.owned.push(c.id); this.events.emit('cosmetic', { id: c.id, how: 'bought' }) }
  }

  /* ---------- helpers for UI ---------- */
  canAfford(cost: Record<string, number>) { return canAfford(this.s, cost) }
}
