import { describe, it, expect } from 'vitest'
import { Game } from '../src/engine/game'
import { mini } from './fixtures/mini'
import { memoryStorage } from '../src/engine/storage'
import { ringsFor, heartwoodFor } from '../src/systems/prestige'
import { milestoneMult, stepEconomy, producerCost } from '../src/systems/economy'
import { growsToHeight, ritualCost } from '../src/systems/grow'
import { emptyEffects } from '../src/systems/effects'
import { BALANCE } from '../src/content/balance'

const mk = (clock = { t: 1_700_000_000_000 }) => new Game(mini, { storage: memoryStorage(), seed: 11, clock: () => clock.t })

describe('formulas from the design doc', () => {
  it('rings(HW) follows floor(2·log10(HW/K)^1.5) relative to K', () => {
    const K = BALANCE.prestige.K
    const table: [number, number][] = [[0.5, 0], [1, 2], [2, 5], [3, 10], [4, 16], [6, 29], [10, 63]]
    for (const [n, r] of table) expect(ringsFor(K * Math.pow(10, n))).toBe(r)
    expect(ringsFor(heartwoodFor(5) * 1.0001)).toBe(5)
    expect(ringsFor(heartwoodFor(5) * 0.9999)).toBe(4)
  })
  it('GROW cumulative cost matches §8.1 (vigor 1)', () => {
    const g = mk(); const fx = emptyEffects()
    for (const [h, grows, sap] of [[30, 13, 4.2e2], [60, 19, 1.0e3], [200, 37, 2.5e4], [400, 54, 4.2e5], [800, 77, 1.9e7]] as [number, number, number][]) {
      const r = growsToHeight(g.s, fx, h)
      expect(r.grows).toBe(grows)
      expect(r.cost / sap).toBeGreaterThan(0.8); expect(r.cost / sap).toBeLessThan(1.25)
    }
  })
  it('milestone multiplier pattern (10 x1.5; 25/50/100/200 x2; every 100 after)', () => {
    expect(milestoneMult(9)).toBe(1); expect(milestoneMult(10)).toBe(1.5); expect(milestoneMult(25)).toBe(3); expect(milestoneMult(100)).toBe(12); expect(milestoneMult(200)).toBe(24); expect(milestoneMult(500)).toBe(192)
  })
  it('ritual discounts floor at 25% of list', () => {
    const g = mk(); g.s.prestige.count = 40
    const fx = emptyEffects(); fx.mult['ritual_cost'] = 0.1
    const c = ritualCost(g.ci, g.s, 'roots', fx)!
    expect(c.plank).toBe(10); expect(c.resin).toBe(5)
  })
  it('lodge cost curve x1.13 and crew cost excludes the Foreman', () => {
    const g = mk(); const fx = emptyEffects()
    expect(producerCost(g.ci, g.s, 'sapper', fx, 1).sap).toBeCloseTo(15)
    g.s.producers.sapper = 3
    expect(producerCost(g.ci, g.s, 'sapper', fx, 1).sap).toBeCloseTo(15 * 1.13 ** 3)
    g.s.producers.kiln_crew = 1
    expect(producerCost(g.ci, g.s, 'kiln_crew', fx, 1).sap).toBeCloseTo(30)
    g.s.producers.kiln_crew = 3
    expect(producerCost(g.ci, g.s, 'kiln_crew', fx, 1).sap).toBeCloseTo(30 * 1.15 ** 2)
  })
})

describe('economy step', () => {
  it('workshops draw at most feed × gross of each input and carry fractional progress', () => {
    const g = mk()
    g.s.res.sap = 1000; g.s.producers.sapper = 4 // 2 sap/s gross
    g.s.workshops.kiln = true; g.s.producers.kiln_crew = 4 // 1 craft/s capacity, needs 5 sap each
    g.s.feed.kiln = 0.5
    const before = g.s.res.resin ?? 0
    for (let i = 0; i < 100; i++) stepEconomy(g.ci, g.s, g.fx, 0.1) // 10 s
    // feed cap: 0.5 × 2 sap/s = 1 sap/s → 0.2 crafts/s → ~2 resin in 10 s (not 10)
    expect((g.s.res.resin ?? 0) - before).toBeGreaterThanOrEqual(1)
    expect((g.s.res.resin ?? 0) - before).toBeLessThanOrEqual(3)
    expect(g.starved).toBeDefined()
  })
  it('hand-crafting ignores feed and the Foreman is bought with output units', () => {
    const g = mk()
    g.s.res.sap = 500
    expect(g.buildWorkshop('kiln')).toBe(true)
    for (let i = 0; i < 30; i++) g.tapWorkshop('kiln')
    expect(g.s.res.resin!).toBeGreaterThanOrEqual(30)
    expect(g.s.handcrafts.kiln).toBe(30)
    expect(g.hireForeman('kiln_crew')).toBe(true)
    expect(g.s.producers.kiln_crew).toBe(1)
    expect(g.s.res.resin!).toBeGreaterThanOrEqual(5)
  })
  it('Heartwood counts every unit produced at its worth', () => {
    const g = mk()
    g.s.res.sap = 100; g.buildWorkshop('kiln'); g.tapWorkshop('kiln')
    // 40 sap building cost is not production; the hand-craft produced 1 resin (worth 20); no lodge output yet
    expect(g.s.heartwood).toBeCloseTo(20)
  })
  it('offline and live stepEconomy agree for identical inputs (§17.26)', () => {
    const a = mk(), b = mk()
    for (const g of [a, b]) { g.s.res.sap = 200; g.s.producers.sapper = 10; g.s.producers.peeler = 5; g.s.workshops.kiln = true; g.s.producers.kiln_crew = 3; g.s.workshops.sawmill = true; g.s.producers.sawmill_crew = 2 }
    for (let i = 0; i < 60; i++) stepEconomy(a.ci, a.s, a.fx, 60, 0.5)
    const clock = { t: 1_700_000_000_000 }
    const c = new Game(mini, { storage: memoryStorage(), seed: 1, clock: () => clock.t })
    c.s.res.sap = 200; c.s.producers.sapper = 10; c.s.producers.peeler = 5; c.s.workshops.kiln = true; c.s.producers.kiln_crew = 3; c.s.workshops.sawmill = true; c.s.producers.sawmill_crew = 2
    c.save(); clock.t += 3600 * 1000
    const board = c.load()!
    expect(board.summary.simulated).toBe(3600)
    expect(board.summary.rate).toBe(0.5)
    expect(c.s.res.sap).toBeCloseTo(a.s.res.sap!, 3)
    expect(c.s.res.plank).toBeCloseTo(a.s.res.plank!, 3)
  })
})

describe('progression', () => {
  it('strikes earn Sap, the 25th strike crits, and the Waystone advances through the tutorial', () => {
    const g = mk()
    let crits = 0
    for (let i = 0; i < 25; i++) { if (g.strike().crit) crits++ }
    expect(crits).toBeGreaterThanOrEqual(1)
    g.tick(1)
    expect(g.s.laneIndex).toBe(1) // goal 1 done (5 strikes), goal 2 (GROW) pending
    expect(g.pinned?.name).toBe('GROW once')
    g.grow(1); g.tick(1)
    expect(g.s.laneIndex).toBe(2)
    expect(g.s.fireflies).toBe(5)
  })
  it('Ritual opens Roots, awards the milestone chest and glimmer, and diggers become available', () => {
    const g = mk()
    g.s.res.sap = 1e6; g.s.res.plank = 100; g.s.res.resin = 100
    g.grow('max')
    expect(g.s.height).toBeGreaterThanOrEqual(30)
    expect(g.performRitual('roots')).toBe(true)
    expect(g.s.boughs).toContain('roots')
    g.tick(1)
    expect(g.s.milestones).toContain('m_bough_roots')
    expect(g.s.glimmer).toBe(20)
    expect(g.s.chests.some((c) => c.tier === 'amber')).toBe(true)
    expect(g.buyProducer('digger', 1)).toBe(1)
  })
  it('Turn the Season pays Rings from Heartwood, resets the run, keeps cosmetics, applies Head Start and Kept Foremen', () => {
    const g = mk()
    g.s.heartwood = heartwoodFor(8) * 1.001; g.s.runTime = 3600
    expect(g.rings).toBe(8)
    g.s.cosmetics.owned.push('hat_acorn')
    expect(g.turnSeason()).toBe(8)
    expect(g.s.prestige.count).toBe(1); expect(g.s.prestige.rings).toBe(8); expect(g.s.height).toBe(0); expect(g.s.heartwood).toBe(0)
    expect(g.s.cosmetics.owned).toContain('hat_acorn'); expect(g.s.cosmetics.owned).toContain('tr_autumn')
    expect(g.buyNode('roots_start')).toBe(true); expect(g.buyNode('canopy_kept')).toBe(true)
    g.s.heartwood = heartwoodFor(8) * 1.001; g.s.runTime = 3600; g.turnSeason()
    expect(g.s.producers.sapper).toBe(5)
    expect(g.s.workshops.kiln).toBe(true); expect(g.s.producers.kiln_crew).toBe(1)
    expect(g.pinned).not.toBeNull()
  })
  it('ring passive multiplies production by 1 + 0.05 per lifetime ring', () => {
    const g = mk(); g.s.producers.sapper = 1; g.tick(0.1)
    const base = g.gross.sap!
    g.s.prestige.lifetimeRings = 20; g.tick(1)
    expect(g.gross.sap! / base).toBeCloseTo(2, 1)
  })
  it('chests open into income-scaled rewards and cosmetics; pending chests cap at 5', () => {
    const g = mk(); g.s.producers.sapper = 10; g.tick(0.1)
    for (let i = 0; i < 7; i++) g.s.chests.push({ id: `c${i}`, tier: 'bark', source: 't' })
    g.tick(1)
    expect(g.s.chests.length).toBeLessThanOrEqual(5)
    const r = g.openChest(g.s.chests[0]!.id)!
    expect(r.got.resources?.sap).toBeGreaterThanOrEqual(10)
    expect(r.got.fireflies).toBeGreaterThanOrEqual(10)
  })
  it('shop: Fireflies and Glimmer buy cosmetics only; supporter grants its items; nothing touches Sap', () => {
    const g = mk(); g.s.res.sap = 123; g.s.fireflies = 100; g.s.glimmer = 300
    expect(g.buyCosmetic('hat_straw', 'fireflies')).toBe(true); expect(g.s.fireflies).toBe(40)
    expect(g.buyCosmetic('hat_wizard', 'glimmer')).toBe(true); expect(g.s.glimmer).toBe(100)
    expect(g.equipped('hat')?.id).toBe('hat_wizard')
    g.grantSupporter('mock'); expect(g.ownsCosmetic('lg_golden')).toBe(true); expect(g.s.glimmer).toBe(400)
    expect(g.s.res.sap).toBe(123)
  })
  it('save export/import round-trips', () => {
    const g = mk(); g.s.res.sap = 77; g.s.height = 12
    const blob = g.exportSave(); g.reset(); expect(g.s.height).toBe(0)
    expect(g.importSave(blob)).toBe(true); expect(g.s.height).toBe(12)
  })
  it('wishes assign daily and pay on completion', () => {
    const g = mk(); g.s.stats.strikesTotal = 30; g.tick(1)
    expect(g.s.wishes.list.length).toBe(1)
    for (let i = 0; i < 700; i++) g.strike()
    g.tick(1)
    expect(g.s.wishes.list[0]!.done).toBe(true)
  })
})
