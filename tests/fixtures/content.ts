import type { Content } from '../../src/content/types'

/** Tiny content pack for engine tests. */
export const fixture: Content = {
  resources: [
    { id: 'sap', name: 'Sap', glyph: '💧', tier: 0, worth: 1, color: '#fc0', desc: '', base: true },
    { id: 'leaf', name: 'Leaf', glyph: '🍃', tier: 1, worth: 3, color: '#0c0', desc: '' },
    { id: 'fiber', name: 'Fiber', glyph: '🧵', tier: 2, worth: 12, color: '#cc9', desc: '' },
  ],
  bands: [
    { id: 'meadow', name: 'Meadow', minHeight: 0, glyph: '🌱', sky: ['#8cf', '#fff'], leaf: '#4c4', ambient: ['🦋'], drops: [{ id: 'leaf', weight: 1 }], desc: '' },
    { id: 'treeline', name: 'Treeline', minHeight: 60, glyph: '🌳', sky: ['#fc8', '#fff'], leaf: '#2a2', ambient: ['🐦'], drops: [{ id: 'leaf', weight: 1 }], desc: '' },
  ],
  producers: [
    { id: 'tapper', name: 'Tapper', glyph: '🫘', kind: 'gatherer', produces: { id: 'sap', rate: 1 }, baseCost: { sap: 25 }, costGrowth: 1.15, unlock: { kind: 'always' }, bandId: 'meadow', breakpoints: [10, 25], desc: '' },
    { id: 'leafer', name: 'Leafer', glyph: '🍃', kind: 'gatherer', produces: { id: 'leaf', rate: 0.5 }, baseCost: { sap: 80 }, costGrowth: 1.15, unlock: { kind: 'always' }, bandId: 'meadow', breakpoints: [10], desc: '' },
    { id: 'weaver', name: 'Weaver', glyph: '🧶', kind: 'crafter', station: 'workbench', baseCost: { sap: 100 }, costGrowth: 1.5, unlock: { kind: 'building', id: 'workbench' }, bandId: 'meadow', breakpoints: [], desc: '' },
  ],
  buildings: [
    { id: 'workbench', name: 'Workbench', glyph: '🪚', height: 20, baseCost: { sap: 150 }, costGrowth: 2, maxLevel: 10, perLevel: [{ target: 'craft_speed', op: 'mult', value: 1.1 }], recipes: ['fiber'], desc: '' },
  ],
  recipes: [{ id: 'fiber', name: 'Fiber', station: 'workbench', inputs: { leaf: 3 }, output: { id: 'fiber', count: 1 }, seconds: 2, unlock: { kind: 'always' } }],
  boosts: [{ id: 'rope_graft', name: 'Rope Graft', glyph: '🪢', baseCost: { fiber: 5 }, costGrowth: 2.5, maxTier: 5, effect: { target: 'all_production', op: 'mult', value: 1.25 }, unlock: { kind: 'building', id: 'workbench' }, desc: '' }],
  milestones: [
    { id: 'm_taps_10', name: 'Ten taps', glyph: '👆', cond: { kind: 'taps', min: 10 }, reward: { chest: 'wood', incomeSeconds: 30, incomeFloor: 20, petals: 5 }, celebration: 'small' },
    { id: 'm_h60', name: 'Treeline!', glyph: '🌳', cond: { kind: 'height', min: 60 }, reward: { cosmetic: 'hat_straw', petals: 20 }, celebration: 'big' },
  ],
  prestigeNodes: [
    { id: 'roots_sap', limb: 'roots', name: 'Rich Sap', glyph: '💧', baseCost: 1, costGrowth: 2, maxLevel: 5, effect: { target: 'all_production', op: 'mult', value: 1.5 }, desc: '' },
    { id: 'roots_start', limb: 'roots', name: 'Head Start', glyph: '🫘', baseCost: 2, costGrowth: 2, maxLevel: 3, special: 'start_producers', specialValue: 'tapper:3', desc: '' },
  ],
  mechanics: [{ id: 'weather', name: 'Weather', glyph: '🌦️', atPrestige: 1, desc: '', implemented: true }],
  cosmetics: [{ id: 'hat_straw', category: 'hat', name: 'Straw Hat', glyph: '👒', desc: '', earnedBy: 'm_h60', params: {} }, { id: 'hat_crown', category: 'hat', name: 'Crown', glyph: '👑', desc: '', price: 100, params: {} }],
  bundles: [],
  setPieces: [{ id: 'bees', name: 'Bee Swarm', glyph: '🐝', bandId: 'meadow', every: 40, taps: 5, seconds: 8, reward: { incomeSeconds: 30, incomeFloor: 10 }, desc: '' }],
}
