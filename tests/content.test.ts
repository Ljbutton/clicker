/** Data lint for the content pack (§17.25 and cross-reference integrity). */
import { describe, it, expect } from 'vitest'
import { content } from '../src/content/data'
import type { Condition, Cost, Reward, Unlock } from '../src/content/types'

const ids = <T extends { id: string }>(arr: T[]) => new Set(arr.map((x) => x.id))
const R = ids(content.resources), B = ids(content.bands), P = ids(content.producers), W = ids(content.workshops), REC = ids(content.recipes)
const A = ids(content.annexes), RU = ids(content.runes), C = ids(content.cosmetics), SP = ids(content.setPieces), LM = ids(content.landmarks)
const N = ids(content.prestigeNodes), M = ids(content.mechanics), MS = ids(content.milestones), G = ids(content.waystoneSeason1)
const worth = (id: string) => content.resources.find((r) => r.id === id)!.worth

function expectCost(cost: Cost, where: string) {
  for (const [id, n] of Object.entries(cost)) { expect(R.has(id), `${where}: resource ${id}`).toBe(true); expect(n, `${where}: ${id} amount`).toBeGreaterThan(0) }
}
function expectReward(r: Reward, where: string) {
  if (r.resources) expectCost(r.resources, where)
  if (r.cosmetic) expect(C.has(r.cosmetic), `${where}: cosmetic ${r.cosmetic}`).toBe(true)
  if (r.landmark) expect(LM.has(r.landmark), `${where}: landmark ${r.landmark}`).toBe(true)
}
function expectUnlock(u: Unlock, where: string) {
  switch (u.kind) {
    case 'bough': expect(B.has(u.id), `${where}: bough ${u.id}`).toBe(true); break
    case 'workshop': case 'crew': expect(W.has(u.id), `${where}: workshop ${u.id}`).toBe(true); break
    case 'producer': expect(P.has(u.id), `${where}: producer ${u.id}`).toBe(true); break
    case 'annex': expect(A.has(u.id), `${where}: annex ${u.id}`).toBe(true); break
    case 'discovered': expect(REC.has(u.recipe), `${where}: recipe ${u.recipe}`).toBe(true); break
    case 'goal': expect(G.has(u.id), `${where}: goal ${u.id}`).toBe(true); break
    case 'all': u.of.forEach((x) => expectUnlock(x, where)); break
    default: break
  }
}
function expectCondition(c: Condition, where: string) {
  switch (c.kind) {
    case 'bough': expect(B.has(c.id), `${where}: bough ${c.id}`).toBe(true); break
    case 'producer': expect(P.has(c.id), `${where}: producer ${c.id}`).toBe(true); break
    case 'workshop': expect(W.has(c.id), `${where}: workshop ${c.id}`).toBe(true); break
    case 'annex': expect(A.has(c.id), `${where}: annex ${c.id}`).toBe(true); break
    case 'handcrafts': expect(W.has(c.station), `${where}: station ${c.station}`).toBe(true); break
    case 'crafted': expect(REC.has(c.id), `${where}: recipe ${c.id}`).toBe(true); break
    case 'rune': expect(RU.has(c.id), `${where}: rune ${c.id}`).toBe(true); break
    case 'discovered': expect(REC.has(c.recipe), `${where}: recipe ${c.recipe}`).toBe(true); break
    case 'setpiece': expect(SP.has(c.id), `${where}: setpiece ${c.id}`).toBe(true); break
    default: break
  }
}

describe('ids are unique per table', () => {
  for (const [name, arr] of Object.entries(content) as [string, { id: string }[]][]) {
    it(name, () => { expect(new Set(arr.map((x) => x.id)).size).toBe(arr.length) })
  }
})

describe('recipes (§5.1, §17.25)', () => {
  it('every crafted good is worth 3.9-4.4x its inputs', () => {
    for (const r of content.recipes) {
      const inW = Object.entries(r.inputs).reduce((a, [id, n]) => a + worth(id) * n, 0)
      const outW = worth(r.output.id) * r.output.count
      const k = outW / inW
      expect(k, `${r.id}: ${outW}/${inW}`).toBeGreaterThanOrEqual(3.9)
      expect(k, `${r.id}: ${outW}/${inW}`).toBeLessThanOrEqual(4.4)
    }
  })
  it('recipe ids equal their output, stations exist and every workshop has its recipe + crew', () => {
    for (const r of content.recipes) { expect(r.id).toBe(r.output.id); expect(W.has(r.station), r.id).toBe(true); expectCost(r.inputs, r.id) }
    for (const w of content.workshops) {
      expect(REC.has(w.recipe), w.id).toBe(true)
      expect(B.has(w.bandId), w.id).toBe(true)
      expectCost(w.cost, w.id)
      const crew = content.producers.find((p) => p.kind === 'crew' && p.station === w.id)
      expect(crew, `${w.id} crew`).toBeDefined()
      expect(crew!.id).toBe(`${w.id}_crew`)
      expect(Object.keys(crew!.foremanCost!)).toEqual([content.recipes.find((r) => r.id === w.recipe)!.output.id])
    }
    const cross = content.recipes.filter((r) => r.discover)
    expect(cross.map((r) => r.id).sort()).toEqual(['amber', 'clockwork', 'lacquer', 'lantern', 'starglass'])
    for (const r of cross) expect(r.hint, r.id).toBeTruthy()
  })
  it('every crafted good is used by at least one rune, lodge, ritual or annex cost', () => {
    const used = new Set<string>()
    for (const r of content.runes) used.add(r.good)
    for (const p of content.producers) if (p.kind === 'lodge') Object.keys(p.baseCost).forEach((k) => used.add(k))
    for (const b of content.bands) if (b.ritual) Object.keys(b.ritual.cost).forEach((k) => used.add(k))
    for (const a of content.annexes) Object.keys(a.cost).forEach((k) => used.add(k))
    for (const r of content.resources) if (r.tier > 0) expect(used.has(r.id), `dead good ${r.id}`).toBe(true)
  })
})

describe('resources and bands', () => {
  it('has the 19 goods with the GDD ids and one base', () => {
    expect([...R]).toEqual(['sap', 'bark', 'stone', 'fiber', 'honey', 'ore', 'starfall', 'resin', 'plank', 'cord', 'brick', 'beam', 'glass', 'lacquer', 'ingot', 'lantern', 'amber', 'clockwork', 'starglass'])
    expect(content.resources.filter((r) => r.base).map((r) => r.id)).toEqual(['sap'])
    for (const r of content.resources) expect(r.source.length, r.id).toBeGreaterThan(10)
  })
  it('has 10 boughs indexed 1..10 with rituals, drops and landmark slots that exist', () => {
    expect(content.bands.map((b) => b.id)).toEqual(['trunk', 'roots', 'canopy', 'upper', 'deeproots', 'crown', 'cloudreach', 'starbough', 'elder', 'worldcrown'])
    content.bands.forEach((b, i) => {
      expect(b.index).toBe(i + 1)
      if (i > 0) { expect(b.ritual, b.id).toBeDefined(); expectCost(b.ritual!.cost, b.id); expect(b.line).toBeGreaterThan(content.bands[i - 1]!.line) } else expect(b.ritual).toBeUndefined()
      for (const d of b.drops) expect(R.has(d.id), `${b.id} drop ${d.id}`).toBe(true)
      for (const l of b.landmarkSlots ?? []) expect(LM.has(l), `${b.id} landmark ${l}`).toBe(true)
      expect(b.sky).toHaveLength(2)
    })
    expect(content.bands.find((b) => b.id === 'starbough')!.ritual!.requiresSeason).toBe(2)
    expect(content.bands.filter((b) => b.direction === 'down').map((b) => b.id)).toEqual(['roots', 'deeproots'])
  })
})

describe('producers, annexes, runes', () => {
  it('7 lodges + 12 crews with valid references', () => {
    expect(content.producers.filter((p) => p.kind === 'lodge')).toHaveLength(7)
    expect(content.producers.filter((p) => p.kind === 'crew')).toHaveLength(12)
    for (const p of content.producers) {
      expect(B.has(p.bandId), p.id).toBe(true); expectCost(p.baseCost, p.id); expectUnlock(p.unlock, p.id)
      if (p.produces) expect(R.has(p.produces.id), p.id).toBe(true)
      if (p.kind === 'crew') { expect(W.has(p.station!), p.id).toBe(true); expectCost(p.foremanCost!, p.id) }
    }
    expect(content.producers.find((p) => p.id === 'beekeeper')!.unlock).toEqual({ kind: 'annex', id: 'apiary' })
  })
  it('annexes reference real boughs/resources; specials are unique', () => {
    expect([...A]).toEqual(['apiary', 'kite_yard', 'hearth', 'windmill', 'frost_cellar', 'grove', 'lightning_rod', 'caravan_post', 'owl_nest', 'trailhead'])
    for (const a of content.annexes) { expectCost(a.cost, a.id); expectUnlock(a.unlock, a.id); if (a.bandId) expect(B.has(a.bandId), a.id).toBe(true) }
    expect(new Set(content.annexes.map((a) => a.special)).size).toBe(content.annexes.length)
  })
  it('13 runes with growth 6 and valid goods/unlocks', () => {
    expect(content.runes).toHaveLength(13)
    for (const r of content.runes) { expect(R.has(r.good), r.id).toBe(true); expect(r.costGrowth).toBe(6); expect(r.maxTier).toBeLessThanOrEqual(12); expectUnlock(r.unlock, r.id) }
    expect(content.runes.find((r) => r.id === 'rune_stars')!.maxTier).toBe(8)
  })
})

describe('milestones, lanes and rewards', () => {
  it('milestone conditions and rewards reference existing ids', () => {
    expect(content.milestones.length).toBeGreaterThanOrEqual(60)
    for (const m of content.milestones) { expectCondition(m.cond, m.id); expectReward(m.reward, m.id) }
  })
  it('the Season-1 lane has exactly 63 goals in order with the authored spine', () => {
    const lane = content.waystoneSeason1
    expect(lane).toHaveLength(63)
    lane.forEach((g, i) => { expect(g.id).toBe(`g${i + 1}`); expectCondition(g.cond, g.id); expectReward(g.reward, g.id) })
    expect(lane.filter((g) => g.tutorial).map((g) => g.id)).toEqual(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g11'])
    expect(lane.filter((g) => g.optional).map((g) => g.id)).toEqual(['g61', 'g62'])
    expect(lane[0]!.cond).toEqual({ kind: 'strikes', min: 5 })
    expect(lane[15]!.cond).toEqual({ kind: 'bough', id: 'roots' })
    expect(lane[13]!.reward.cosmetic).toBe('lc_amber')
    expect(lane[62]!.cond).toEqual({ kind: 'seasons', min: 1 })
    // landmarks every 10th goal
    for (const i of [9, 19, 29, 39, 49, 59]) expect(lane[i]!.reward.landmark, `goal ${i + 1}`).toBeTruthy()
    expect(new Set(lane.map((g) => g.reward.landmark).filter(Boolean)).size).toBe(6)
  })
  it('legacy lane conditions are well-formed', () => { for (const g of content.legacyLane) expectCondition(g.cond, g.id) })
  it('mechanic intro goals and medals/annexes exist', () => {
    for (const m of content.mechanics) {
      if (m.annex) expect(A.has(m.annex), m.id).toBe(true)
      if (m.medal) expect(C.has(m.medal), m.id).toBe(true)
      for (const g of m.introGoals ?? []) { expectCondition(g.cond, `${m.id}/${g.id}`); expectReward(g.reward, `${m.id}/${g.id}`) }
    }
    expect(content.mechanics.map((m) => m.atTurn)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10])
    expect(content.mechanics.filter((m) => m.implemented).map((m) => m.id)).toEqual(['first_ring', 'wind', 'frost', 'bloom', 'storm', 'caravan', 'stewards', 'charts', 'expeditions', 'greatring'])
  })
})

describe('prestige nodes (§11.4)', () => {
  it('has exactly the 37 GDD ids, growth 2, valid requiresNode/mechanic', () => {
    const expected = ['roots_rich', 'roots_start', 'roots_old', 'roots_vigor1', 'roots_cheap', 'roots_vigor2', 'roots_ancient', 'roots_vigor3',
      'trunk_grip', 'trunk_eye', 'trunk_long', 'trunk_deep', 'trunk_auto', 'trunk_master', 'trunk_wind',
      'canopy_pride', 'canopy_kept', 'canopy_carve', 'canopy_thrift', 'canopy_lit', 'canopy_guild', 'canopy_codex',
      'crown_night', 'crown_long', 'crown_quick', 'crown_dawn', 'crown_sprout', 'crown_golden', 'crown_time',
      'hw_wind', 'hw_frost', 'hw_bloom', 'hw_storm', 'hw_caravan', 'hw_steward', 'hw_chart', 'hw_exped']
    expect(content.prestigeNodes.map((n) => n.id)).toEqual(expected)
    for (const n of content.prestigeNodes) {
      expect(n.costGrowth).toBe(2)
      expect(n.effect || n.special || n.mechanic, `${n.id} does something`).toBeTruthy()
      if (n.requiresNode) expect(N.has(n.requiresNode), n.id).toBe(true)
      if (n.mechanic) { expect(M.has(n.mechanic), n.id).toBe(true); expect(n.limb).toBe('heartwood') }
    }
    expect(content.prestigeNodes.find((n) => n.id === 'roots_start')!.special).toBe('start_sappers')
  })
})

describe('cosmetics, bundles, set-pieces, caravan, wishes', () => {
  it('every cosmetic has a way to be obtained and the contract params; every category has firefly-priced items', () => {
    const cats = new Map<string, number>()
    for (const c of content.cosmetics) {
      expect(c.price != null || c.fireflyPrice != null || c.earnedBy || c.supporter || c.starter, `${c.id} obtainable`).toBeTruthy()
      if (c.fireflyPrice != null) { expect(c.fireflyPrice).toBeGreaterThanOrEqual(60); expect(c.fireflyPrice).toBeLessThanOrEqual(400); cats.set(c.category, (cats.get(c.category) ?? 0) + 1) }
      if (c.earnedBy && /^(m_|g\d)/.test(c.earnedBy)) expect(MS.has(c.earnedBy) || G.has(c.earnedBy), `${c.id} earnedBy ${c.earnedBy}`).toBe(true)
      const p = c.params
      switch (c.category) {
        case 'lantern_color': expect(typeof p['color']).toBe('string'); break
        case 'lantern_shape': expect(['round', 'paper', 'gourd', 'bell', 'crystal', 'jelly']).toContain(p['shape']); break
        case 'lantern_glow': expect(['steady', 'flicker', 'pulse', 'swarm', 'golden']).toContain(p['glow']); break
        case 'tree': expect(['round', 'birch', 'needle', 'blossom', 'willow', 'crystal', 'elder']).toContain(p['leafShape']); expect(typeof p['bark']).toBe('string'); expect(typeof p['leaf']).toBe('string'); break
        case 'hat': expect(['none', 'acorn', 'mushroom', 'straw', 'bee', 'snail', 'crown', 'wizard', 'lanternhelm']).toContain(p['hat']); break
        case 'chief': expect(typeof p['cloak']).toBe('string'); break
        case 'roof': expect(['thatch', 'slate', 'mushroom', 'moss', 'hive', 'pagoda', 'shell', 'glass']).toContain(p['roof']); break
        case 'sky': expect(['none', 'stars', 'petals', 'snow', 'aurora', 'mist', 'fireflies']).toContain(p['particle']); expect(typeof p['top']).toBe('string'); break
        case 'tap': expect(['sparks', 'petals', 'notes', 'gold', 'runes', 'ink', 'stars']).toContain(p['particle']); break
        case 'meter': expect(['wood', 'vine', 'clock']).toContain(p['style']); break
        case 'crown': expect(['none', 'vane', 'chime', 'lantern', 'crystal', 'kite', 'elder']).toContain(p['ornament']); break
        case 'companion': expect(['owl', 'snail', 'swarm', 'bee', 'cat', 'fox', 'dragon', 'deer']).toContain(p['pet']); break
        case 'frame': expect(['bark', 'rings', 'star', 'gilded', 'aurora']).toContain(p['style']); break
        case 'title': expect(typeof p['text']).toBe('string'); break
      }
    }
    for (const cat of ['lantern_color', 'lantern_shape', 'lantern_glow', 'tree', 'hat', 'chief', 'roof', 'sky', 'tap', 'meter', 'crown', 'companion', 'frame', 'title']) expect(cats.get(cat) ?? 0, cat).toBeGreaterThanOrEqual(2)
    expect(content.cosmetics.filter((c) => c.starter).map((c) => c.id).sort()).toEqual(['frame_bark', 'meter_wood', 'roof_thatch', 'tap_sparks', 'tr_oak'])
    for (const id of ['lc_amber', 'ls_paper', 'lg_flicker', 'tr_oak', 'hat_acorn', 'chief_regal', 'roof_thatch', 'sky_dawn', 'tap_sparks', 'meter_wood', 'crown_vane', 'kite_carp', 'pet_owl', 'frame_bark', 'title_cloudreacher', 'lg_golden', 'chief_keeper', 'title_keeper', 'frame_keeper']) expect(C.has(id), id).toBe(true)
  })
  it('bundles contain existing items', () => { expect(content.bundles).toHaveLength(4); for (const b of content.bundles) for (const i of b.items) expect(C.has(i), `${b.id}: ${i}`).toBe(true) })
  it('set-pieces have the six GDD ids and valid unlocks/rewards', () => {
    expect([...SP]).toEqual(['beehive', 'woodpecker', 'acorn', 'star', 'gust', 'lightning'])
    for (const sp of content.setPieces) { expectUnlock(sp.unlock, sp.id); expectReward(sp.reward, sp.id); expect(sp.every[0]).toBeLessThanOrEqual(sp.every[1]) }
    expect(content.setPieces.find((s) => s.id === 'gust')!.payPerTap).toBe(true)
  })
  it('caravan offers, wishes and landmarks are well-formed', () => {
    expect(content.caravanOffers.length).toBeGreaterThanOrEqual(8)
    for (const o of content.caravanOffers) { expectCost(o.give, o.id); expectReward(o.get, o.id); expect(o.weight).toBeGreaterThan(0) }
    expect(content.wishes.length).toBeGreaterThanOrEqual(8)
    for (const w of content.wishes) { expectCondition(w.cond, w.id); expect(w.fireflies).toBeGreaterThanOrEqual(20); expect(w.fireflies).toBeLessThanOrEqual(60) }
    expect([...LM]).toEqual(['lm_bridge', 'lm_birdhouse', 'lm_owl', 'lm_chimes', 'lm_mushrooms', 'lm_flags', 'lm_bell', 'lm_swing', 'lm_hammock', 'lm_door'])
  })
})
