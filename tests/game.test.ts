import { describe, it, expect } from 'vitest'
import { Game } from '../src/engine/game'
import { fixture } from './fixtures/content'
import { memoryStorage } from '../src/engine/storage'

function mk(clock = { t: 1_700_000_000_000 }) {
  return new Game(fixture, { storage: memoryStorage(), seed: 7, clock: () => clock.t })
}

describe('Game core loop', () => {
  it('taps earn base currency, combo builds within the window, and a burst fires every 25th tap', () => {
    const g = mk()
    let bursts = 0
    for (let i = 0; i < 25; i++) { const r = g.tap(); if (r.burst) bursts++; g.tick(0.1) }
    expect(g.s.res.sap!).toBeGreaterThan(25)
    expect(g.s.combo.best).toBeGreaterThanOrEqual(25)
    expect(bursts).toBeGreaterThanOrEqual(1)
    expect(g.s.stats.tapsTotal).toBe(25)
  })

  it('buys producers, produces idly, and hits breakpoints', () => {
    const g = mk()
    g.s.res.sap = 10_000
    expect(g.buyProducer('tapper', 10)).toBe(10)
    expect(g.rates.sap).toBeCloseTo(1 * 10 * 2) // 10 tappers × breakpoint x2
    g.tick(1)
    expect(g.s.res.sap!).toBeGreaterThan(10_000 - 500)
  })

  it('grows, crosses a band, awards milestone cosmetic', () => {
    const g = mk()
    g.s.res.sap = 1e9
    let band = ''
    g.events.on('band', (b) => { band = b.name })
    const r = g.grow('max')
    expect(r.grows).toBeGreaterThan(50)
    expect(g.s.height).toBeGreaterThan(60)
    expect(band).toBe('Treeline')
    g.tick(1)
    expect(g.s.milestones).toContain('m_h60')
    expect(g.s.cosmetics.owned).toContain('hat_straw')
    expect(g.s.cosmetics.petals).toBe(20)
  })

  it('crafts manually, then automates with a crafter and respects the reserve', () => {
    const g = mk()
    g.s.res.sap = 10_000; g.s.res.leaf = 30
    g.s.height = 25
    expect(g.buyBuilding('workbench')).toBe(true)
    expect(g.queueCraft('fiber')).toBe(true)
    expect(g.s.res.leaf).toBe(27)
    g.tick(1); g.tick(1.1)
    expect(g.s.res.fiber).toBe(1)
    expect(g.buyProducer('weaver', 1)).toBe(1)
    g.setReserve('workbench', 24)
    for (let i = 0; i < 20; i++) g.tick(1)
    // 27 leaves, reserve 24 -> only one more craft (3 leaves)
    expect(g.s.res.fiber).toBe(2)
    expect(g.s.res.leaf).toBe(24)
    g.setReserve('workbench', 0)
    for (let i = 0; i < 40; i++) g.tick(1)
    expect(g.s.res.fiber).toBe(10)
  })

  it('boosts multiply production', () => {
    const g = mk()
    g.s.res.sap = 1e6; g.s.res.fiber = 100; g.s.height = 25
    g.buyBuilding('workbench'); g.buyProducer('tapper', 1)
    const before = g.rates.sap!
    expect(g.buyBoost('rope_graft')).toBe(true)
    expect(g.rates.sap!).toBeCloseTo(before * 1.25)
  })

  it('compass picks a finite, sensible goal', () => {
    const g = mk()
    g.tick(1)
    expect(g.goals.primary).not.toBeNull()
    expect(g.goals.primary!.kind).toBe('producer')
    expect(g.goals.primary!.name).toContain('Tapper')
    g.s.res.sap = 30; g.buyProducer('tapper', 1); g.tick(1)
    expect(Number.isFinite(g.goals.primary!.eta)).toBe(true)
  })

  it('prestige awards currency, resets the run, keeps cosmetics, applies head start', () => {
    const g = mk()
    g.s.res.sap = 1e30
    g.grow('max')
    expect(g.s.height).toBeGreaterThan(1200)
    const gain = g.prestigeGain()
    expect(gain).toBeGreaterThanOrEqual(1)
    g.s.cosmetics.owned.push('hat_straw')
    expect(g.prestige()).toBe(gain)
    expect(g.s.height).toBe(0)
    expect(g.s.res.sap ?? 0).toBe(0)
    expect(g.s.prestige.count).toBe(1)
    expect(g.s.cosmetics.owned).toContain('hat_straw')
    g.s.prestige.currency = 10
    expect(g.buyNode('roots_start')).toBe(true)
    g.prestige.bind(g)
    g.s.res.sap = 1e30; g.grow('max'); g.prestige()
    expect(g.s.producers.tapper).toBe(3)
  })

  it('offline progress applies production and crafting, with rate windows', () => {
    const clock = { t: 1_700_000_000_000 }
    const g = mk(clock)
    g.s.res.sap = 10_000; g.s.height = 25
    g.buyBuilding('workbench'); g.buyProducer('tapper', 5); g.buyProducer('leafer', 2); g.buyProducer('weaver', 1)
    g.save()
    clock.t += 3 * 3600 * 1000 // 3 hours away
    const g2 = new Game(fixture, { storage: (g as any).store.constructor === Object ? memoryStorage() : undefined, clock: () => clock.t })
    // share storage by re-loading into the same instance instead
    const summary = g.load()!
    expect(summary.elapsed).toBeCloseTo(3 * 3600, 0)
    // 2h full + 1h half = 2.5h effective
    expect(summary.effective).toBeCloseTo(2.5 * 3600, 0)
    expect(summary.gained.sap).toBeGreaterThan(5 * 2.5 * 3600 * 0.9)
    expect(summary.crafted.fiber ?? 0).toBeGreaterThan(100)
    void g2
  })

  it('set-pieces spawn and pay out on completion', () => {
    const g = mk()
    g.s.res.sap = 1000; g.buyProducer('tapper', 5)
    let spawned = 0, done = 0
    g.events.on('setpiece', (e) => { if (e.kind === 'spawned') spawned++; if (e.kind === 'done') done++ })
    for (let i = 0; i < 120; i++) { g.tick(1); if (g.s.setPiece) for (let k = 0; k < 5; k++) g.tapSetPiece() }
    expect(spawned).toBeGreaterThanOrEqual(1)
    expect(done).toBeGreaterThanOrEqual(1)
    expect(g.s.stats.setPiecesTotal).toBe(done)
  })

  it('cosmetic shop: buy with petals, equip, never touches progress', () => {
    const g = mk()
    g.s.cosmetics.petals = 150
    const sapBefore = g.s.res.sap ?? 0
    expect(g.buyCosmetic('hat_crown')).toBe(true)
    expect(g.s.cosmetics.petals).toBe(50)
    expect(g.equipped('hat')?.id).toBe('hat_crown')
    expect(g.buyCosmetic('hat_crown')).toBe(false)
    expect(g.s.res.sap ?? 0).toBe(sapBefore)
  })

  it('save/export/import round-trips', () => {
    const g = mk()
    g.s.res.sap = 123; g.s.height = 42
    const blob = g.exportSave()
    g.reset()
    expect(g.s.height).toBe(0)
    expect(g.importSave(blob)).toBe(true)
    expect(g.s.height).toBe(42)
  })
})
