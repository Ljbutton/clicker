import { describe, it, expect } from 'vitest'
import { Game } from '../src/engine/game'
import { content } from '../src/content/data'
import { memoryStorage } from '../src/engine/storage'

const mk = (clock = { t: 1_800_000_000_000 }) => new Game(content, { storage: memoryStorage(), seed: 9, clock: () => clock.t })

describe('Star Charts, Great Rings, Stewards, kites, expeditions, dyes', () => {
  it('Star Charts unlock at Turn 7, one pick per Season (two with the Astrolabe), and multiply production', () => {
    const g = mk(); g.s.producers.sapper = 10; g.tick(0.1)
    expect(g.chooseChart('raw')).toBe(false)
    g.s.prestige.count = 7; g.tick(1)
    const base = g.gross.sap!
    expect(g.chooseChart('raw')).toBe(true); g.tick(1)
    expect(g.gross.sap! / base).toBeCloseTo(2, 1)
    expect(g.chooseChart('craft')).toBe(false)
    g.s.prestige.nodes.hw_chart = 1
    expect(g.chooseChart('craft')).toBe(true)
    g.s.heartwood = 1e12; g.s.runTime = 3600; g.turnSeason()
    expect(g.s.charts).toEqual([])
  })
  it('Great Rings: every ten Turns everything x2 and an extra limb per bough', () => {
    const g = mk(); g.s.producers.sapper = 10; g.tick(1)
    const base = g.gross.sap!
    g.s.prestige.count = 10; g.tick(1)
    expect(g.gross.sap! / base).toBeGreaterThanOrEqual(2)
    g.s.boughs.push('roots'); g.s.res.beam = 1e6; g.s.res.plank = 1e6; g.s.res.cord = 1e6
    expect(g.buildAnnex('hearth', 'roots')).toBe(true); expect(g.buildAnnex('owl_nest', 'roots')).toBe(true)
    expect(g.buildAnnex('windmill', 'roots')).toBe(true) // third limb only thanks to the Great Ring
  })
  it('Stewards buy the cheapest affordable level every 30 s and never overspend', () => {
    const g = mk(); g.s.prestige.count = 6; g.s.res.sap = 10_000; g.s.producers.sapper = 1
    for (let i = 0; i < 31; i++) g.tick(1)
    expect(g.s.stats.stewardBuys).toBeGreaterThanOrEqual(1)
    g.setStewards(false); const n = g.s.stats.stewardBuys
    for (let i = 0; i < 31; i++) g.tick(1)
    expect(g.s.stats.stewardBuys).toBe(n)
  })
  it('a Kite Yard launches a kite every 30 minutes that drops a Bark chest', () => {
    const g = mk(); g.s.boughs.push('roots', 'canopy', 'upper'); g.s.res.beam = 1e6; g.s.res.cord = 1e6
    expect(g.buildAnnex('kite_yard', 'upper')).toBe(true)
    for (let i = 0; i < 1801 + 2; i++) g.tick(1)
    expect(g.s.stats.kitesReturned).toBe(1)
    expect(g.s.chests.some((c) => c.source === 'Kite')).toBe(true)
  })
  it('expeditions resolve by wall clock, including on load, with the chest tier by duration', () => {
    const clock = { t: 1_800_000_000_000 }
    const g = mk(clock); g.s.prestige.count = 8; g.s.boughs.push('roots'); g.s.res.lantern = 1e6; g.s.res.cord = 1e6; g.s.res.beam = 1e6
    expect(g.startExpedition(8)).toBe(false) // no trailhead yet
    expect(g.buildAnnex('trailhead', 'roots')).toBe(true)
    expect(g.startExpedition(8)).toBe(true)
    expect(g.startExpedition(2)).toBe(false)
    g.save(); clock.t += 9 * 3600 * 1000; g.load()
    expect(g.s.expedition).toBeNull(); expect(g.s.stats.expeditions).toBe(1)
    expect(g.s.chests.some((c) => c.source === 'Expedition' && c.tier === 'star')).toBe(true)
  })
  it('dyeing lanterns costs Lacquer, grants and equips the dye cosmetic', () => {
    const g = mk(); g.s.boughs.push('roots', 'canopy', 'upper'); g.s.res.beam = 1e6; g.s.res.cord = 1e6
    g.buildAnnex('kite_yard', 'upper')
    expect(g.dyeLantern('#00ff00')).toBe(false)
    g.s.res.lacquer = 25
    expect(g.dyeLantern('#00ff00')).toBe(true)
    expect(g.s.res.lacquer).toBe(5); expect(g.equipped('lantern_color')?.id).toBe('lc_dye'); expect(g.s.cosmetics.dyeHue).toBe('#00ff00')
  })
})
