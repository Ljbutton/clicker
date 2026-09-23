/** Season mechanic modules: Wind, Frost, Bloom, Storm, Caravans. Each is a timer plus a small state block. */
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'
import type { Rng } from '@/engine/rng'
import { BALANCE } from '@/content/balance'
import { type EffectTable, add, mult } from './effects'
import { hasMechanic } from './prestige'
import { annexBuilt, gain, stepEconomy, spend, canAfford } from './economy'
import { applyReward, type Granted } from './milestones'

export type SeasonEvent =
  | { kind: 'gust' } | { kind: 'snow'; until: number } | { kind: 'bloom_start' } | { kind: 'bloom_end' }
  | { kind: 'storm_start' } | { kind: 'storm_charge'; charges: number } | { kind: 'storm_end' } | { kind: 'caravan_dock' } | { kind: 'caravan_leave' } | { kind: 'thawed'; sap: number }

export function tickSeasons(ci: ContentIndex, s: GameState, fx: EffectTable, rng: Rng, now: number, baseRate: number): SeasonEvent[] {
  const ev: SeasonEvent[] = []
  // WIND: gusts are set-pieces (special 'gust'); Windmill auto-catch pays per level at each gust window
  if (hasMechanic(ci, s, 'wind')) {
    const every = BALANCE.wind.every / mult(fx, 'wind_every')
    if (s.wind.nextAt === 0) s.wind.nextAt = now + every
    if (now >= s.wind.nextAt) {
      s.wind.nextAt = now + every * (1 - BALANCE.wind.jitter + rng.next() * 2 * BALANCE.wind.jitter)
      const lvl = s.annexLevels['windmill'] ?? 0
      if (lvl > 0) { const n = Math.round(baseRate * BALANCE.wind.leafIncomeSeconds * lvl); gain(ci, s, ci.baseResource, n); s.wind.caught += lvl }
      if (!s.setPiece && s.playTime > BALANCE.setPieces.minPlaySeconds) {
        s.setPiece = { id: 'gust', tapsDone: 0, expiresAt: now + BALANCE.wind.seconds, x: 0.2, y: 0.3, lastTapAt: 0 }
        ev.push({ kind: 'gust' })
      }
    }
  }
  // FROST: Snowfall every 5 min for 30 s (crafting x2); frozen bundle auto-thaws after 10 min at x1
  if (hasMechanic(ci, s, 'frost')) {
    if (s.frost.nextSnowAt === 0) s.frost.nextSnowAt = now + BALANCE.frost.snowEvery
    if (now >= s.frost.nextSnowAt) { s.frost.nextSnowAt = now + BALANCE.frost.snowEvery; s.frost.snowUntil = now + BALANCE.frost.snowSeconds; ev.push({ kind: 'snow', until: s.frost.snowUntil }) }
    if (s.frost.frozenSeconds > 0 && now - s.frost.frozenAt >= BALANCE.frost.autoThawSeconds) { const sap = thaw(ci, s, fx, baseRate, 1); ev.push({ kind: 'thawed', sap }) }
  }
  // BLOOM: wave every 180 s climbs one bough per 4 s; boughs it passes get x4 for 12 s (applied in effects)
  if (hasMechanic(ci, s, 'bloom')) {
    const waves = 1 + (s.annexLevels['grove'] ?? 0)
    const every = BALANCE.bloom.every / waves
    if (s.bloom.nextAt === 0) s.bloom.nextAt = now + every
    if (!s.bloom.active && now >= s.bloom.nextAt) { s.bloom.active = true; s.bloom.startedAt = now; s.bloom.front = 0; s.bloom.nextAt = now + every; s.stats.blooms++; ev.push({ kind: 'bloom_start' }) }
    if (s.bloom.active) {
      const total = s.boughs.length * BALANCE.bloom.perBough + BALANCE.bloom.boostSeconds + add(fx, 'bloom_seconds')
      s.bloom.front = Math.min(s.boughs.length, Math.floor((now - s.bloom.startedAt) / BALANCE.bloom.perBough))
      if (now - s.bloom.startedAt >= total) { s.bloom.active = false; ev.push({ kind: 'bloom_end' }) }
    }
  }
  // STORM: storms every 5 min for 40 s; a strike every 8 s charges the Rod; auto-discharge at 50% two minutes after full
  if (hasMechanic(ci, s, 'storm') && annexBuilt(s, 'lightning_rod')) {
    if (s.storm.nextAt === 0) s.storm.nextAt = now + BALANCE.storm.every
    const maxCharges = BALANCE.storm.maxCharges + add(fx, 'rod_charges')
    if (s.storm.activeUntil < now && now >= s.storm.nextAt) { s.storm.activeUntil = now + BALANCE.storm.seconds; s.storm.nextAt = now + BALANCE.storm.every; s.storm.lastStrikeAt = now; ev.push({ kind: 'storm_start' }) }
    if (s.storm.activeUntil >= now && now - s.storm.lastStrikeAt >= BALANCE.storm.strikeEvery && s.storm.charges < maxCharges) {
      s.storm.lastStrikeAt = now; s.storm.charges++
      if (s.storm.charges >= maxCharges) s.storm.fullAt = now
      ev.push({ kind: 'storm_charge', charges: s.storm.charges })
    }
    if (s.storm.charges >= maxCharges && s.storm.fullAt > 0 && now - s.storm.fullAt >= BALANCE.storm.autoDischargeAfter) { discharge(ci, s, fx, BALANCE.storm.autoDischargeFrac); s.storm.fullAt = 0 }
  }
  // CARAVANS: docks every 30 min of play for 5 min
  if (hasMechanic(ci, s, 'caravan')) {
    if (s.caravan.nextAt === 0) s.caravan.nextAt = now + 60
    if (s.caravan.activeUntil < now && now >= s.caravan.nextAt) { dockCaravan(ci, s, rng, now); ev.push({ kind: 'caravan_dock' }) }
    else if (s.caravan.activeUntil > 0 && s.caravan.activeUntil < now && s.caravan.offers.length) { s.caravan.offers = []; s.caravan.taken = []; ev.push({ kind: 'caravan_leave' }) }
  }
  return ev
}

/** Thaw the Frost Cellar bundle: pays frozenSeconds of income at `multiplier`. */
export function thaw(ci: ContentIndex, s: GameState, fx: EffectTable, baseRate: number, multiplier: number): number {
  const secs = s.frost.frozenSeconds
  if (secs <= 0) return 0
  s.frost.frozenSeconds = 0; s.frost.thawTaps = 0
  const sap = Math.round(baseRate * secs * multiplier)
  gain(ci, s, ci.baseResource, sap)
  s.stats.thaws++
  return sap
}
export function tapFrozen(ci: ContentIndex, s: GameState, fx: EffectTable, baseRate: number): { done: boolean; taps: number; sap?: number } {
  if (s.frost.frozenSeconds <= 0) return { done: false, taps: 0 }
  s.frost.thawTaps++
  if (s.frost.thawTaps >= BALANCE.frost.thawTaps) return { done: true, taps: s.frost.thawTaps, sap: thaw(ci, s, fx, baseRate, BALANCE.frost.thawMult * mult(fx, 'thaw_mult')) }
  return { done: false, taps: s.frost.thawTaps }
}

/** Discharge the Lightning Rod: each charge completes 60 s of all Foreman crafting instantly from stock (feed ignored). */
export function discharge(ci: ContentIndex, s: GameState, fx: EffectTable, fraction = 1): number {
  const charges = Math.floor(s.storm.charges * fraction)
  if (charges <= 0) return 0
  s.storm.charges -= charges
  const saved = { ...s.feed }
  for (const k of Object.keys(s.feed)) s.feed[k] = 1e9
  for (const w of ci.workshopOrder) if (s.workshops[w.id] && s.feed[w.id] == null) s.feed[w.id] = 1e9
  // crafting only: run the economy step with zero lodge output
  stepEconomy(ci, s, fx, BALANCE.storm.chargeCraftSeconds * charges, 0)
  s.feed = saved
  s.stats.discharges++
  return charges
}

export function dockCaravan(ci: ContentIndex, s: GameState, rng: Rng, now: number) {
  const n = BALANCE.caravan.offers + Math.round(0) // Trade Routes handled via effect below
  const pool = ci.raw.caravanOffers.filter((o) => Object.keys(o.give).every((r) => ci.resources.has(r)))
  const offers: string[] = []
  const bag = [...pool]
  while (offers.length < n && bag.length) {
    const total = bag.reduce((a, o) => a + o.weight, 0)
    let r = rng.next() * total
    let i = 0
    for (; i < bag.length; i++) { r -= bag[i]!.weight; if (r <= 0) break }
    const o = bag.splice(Math.min(i, bag.length - 1), 1)[0]!
    offers.push(o.id)
  }
  // a weekly cosmetic offer: an unowned firefly-market item
  const cos = ci.raw.cosmetics.filter((c) => c.fireflyPrice != null && !s.cosmetics.owned.includes(c.id))
  s.caravan = { nextAt: now + BALANCE.caravan.everyPlay, activeUntil: now + BALANCE.caravan.dockSeconds, offers, taken: [], cosmeticOffer: cos.length ? rng.pick(cos).id : null }
}
export function tradeCaravan(ci: ContentIndex, s: GameState, offerId: string, now: number, baseRate: number): Granted | null {
  if (s.caravan.activeUntil < now || !s.caravan.offers.includes(offerId) || s.caravan.taken.includes(offerId)) return null
  const o = ci.caravanOffers.get(offerId)
  if (!o || !canAfford(s, o.give)) return null
  spend(s, o.give)
  s.caravan.taken.push(offerId)
  s.stats.trades++
  return applyReward(ci, s, o.get, now, baseRate)
}

/* ---------- Stewards (Turn 6): a helper per bough buys the cheapest affordable level every 30 s ---------- */
import { producerAvailable, producerCost, buyProducer, needsForeman, producerCount } from './economy'
export const STEWARD_EVERY = 30
export const STEWARD_SPEND = 0.1
export function tickStewards(ci: ContentIndex, s: GameState, fx: EffectTable, now: number, headSteward: boolean): { bought: string[]; dialed: string[] } {
  const out = { bought: [] as string[], dialed: [] as string[] }
  if (!s.stewardsOn || !hasMechanic(ci, s, 'stewards') || now - s.lastStewardAt < STEWARD_EVERY) return out
  s.lastStewardAt = now
  for (const bandId of s.boughs) {
    let best: { id: string; worth: number } | null = null
    for (const p of ci.raw.producers) {
      if (p.bandId !== bandId || !producerAvailable(ci, s, p.id) || needsForeman(ci, s, p.id)) continue
      if (p.kind === 'crew' && producerCount(s, p.id) === 0) continue
      const cost = producerCost(ci, s, p.id, fx, 1)
      if (!Object.entries(cost).every(([r, n]) => n <= STEWARD_SPEND * (s.res[r] ?? 0))) continue
      const worth = Object.entries(cost).reduce((a, [r, n]) => a + n * (ci.resources.get(r)?.worth ?? 1), 0)
      if (!best || worth < best.worth) best = { id: p.id, worth }
    }
    if (best && buyProducer(ci, s, best.id, fx, 1) > 0) { out.bought.push(best.id); s.stats.stewardBuys++ }
  }
  if (headSteward) {
    // tune dials: starve nothing, hoard nothing — lower dials of consumers whose input stock is under 30 s of gross, raise when over 10 min
    const gross = lodgeRates(ci, s, fx)
    for (const w of ci.workshopOrder) {
      if (!s.workshops[w.id]) continue
      const inputs = ci.recipes.get(w.recipe)?.inputs ?? {}
      let low = false, high = true
      for (const rid of Object.keys(inputs)) { const g = gross[rid] ?? 0; const st = s.res[rid] ?? 0; if (g > 0 && st < 30 * g) low = true; if (!(g > 0 && st > 600 * g)) high = false }
      const cur = s.feed[w.id] ?? BALANCE.producers.feedDefault
      const opts = BALANCE.producers.feedOptions as readonly number[]
      const i = opts.indexOf(cur)
      if (low && i > 1) { s.feed[w.id] = opts[i - 1]!; out.dialed.push(w.id) }
      else if (high && i >= 0 && i < opts.length - 1) { s.feed[w.id] = opts[i + 1]!; out.dialed.push(w.id) }
    }
  }
  return out
}
import { lodgeRates } from './economy'

/* ---------- Kite flights: a built Kite Yard launches a kite every 30 min that returns with a package ---------- */
export const KITE_EVERY = 1800
export function tickKites(ci: ContentIndex, s: GameState, now: number): boolean {
  if (!annexBuilt(s, 'kite_yard')) return false
  if (s.kite.nextAt === 0) { s.kite.nextAt = now + KITE_EVERY; return false }
  if (now < s.kite.nextAt) return false
  s.kite.nextAt = now + KITE_EVERY
  s.stats.kitesReturned++
  s.chests.push({ id: `bark:kite:${Math.floor(now)}:${s.chests.length}`, tier: 'bark', source: 'Kite' })
  return true
}

/* ---------- Expeditions (Turn 8): Folk leave for 2/4/8 h and return with a chest ---------- */
export const EXPEDITION_HOURS = [2, 4, 8] as const
export function startExpedition(ci: ContentIndex, s: GameState, hours: number, wallMs: number, folk: number): boolean {
  if (!hasMechanic(ci, s, 'expeditions') || !annexBuilt(s, 'trailhead') || s.expedition) return false
  if (!EXPEDITION_HOURS.includes(hours as 2 | 4 | 8)) return false
  s.expedition = { until: wallMs + hours * 3600 * 1000, hours, folk }
  return true
}
/** Resolve a finished expedition (called on load and once per second). */
export function resolveExpedition(s: GameState, wallMs: number, now: number): { hours: number; tier: 'bark' | 'amber' | 'star' } | null {
  const e = s.expedition
  if (!e || wallMs < e.until) return null
  s.expedition = null
  s.stats.expeditions++
  const tier = e.hours >= 8 ? 'star' : e.hours >= 4 ? 'amber' : 'bark'
  s.chests.push({ id: `${tier}:expedition:${Math.floor(now)}:${s.chests.length}`, tier, source: 'Expedition' })
  return { hours: e.hours, tier }
}

/* ---------- Star Charts (Turn 7): choose a constellation per Season ---------- */
export const CHARTS = [
  { id: 'raw', name: 'The Gatherer', glyph: '🌾', desc: 'All raw production x2' },
  { id: 'craft', name: 'The Loom', glyph: '🧶', desc: 'All crafting x2' },
  { id: 'night', name: 'The Lantern', glyph: '🏮', desc: 'Nightwatch rate +50%' },
  { id: 'strikes', name: 'The Hammer', glyph: '🔨', desc: 'Strikes x1.5' },
] as const
export function chooseChart(ci: ContentIndex, s: GameState, id: string, maxPicks: number): boolean {
  if (!hasMechanic(ci, s, 'charts') || !CHARTS.some((c) => c.id === id) || s.charts.includes(id) || s.charts.length >= maxPicks) return false
  s.charts.push(id)
  s.stats.chartsPicked++
  return true
}
