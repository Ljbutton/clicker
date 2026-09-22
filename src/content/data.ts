// Placeholder so the app boots; replaced by the full content pack transcribed from docs/GAME_DESIGN.md.
import type { Content } from './types'
export const content: Content = {
  resources: [
    { id: 'sap', name: 'Sap', glyph: '💧', tier: 0, worth: 1, color: '#ffb547', desc: 'The lifeblood of the tree.', base: true, source: 'Sap comes from Strikes and Sapper Lodges' },
    { id: 'bark', name: 'Bark', glyph: '🪵', tier: 0, worth: 2, color: '#b07a4a', desc: '', source: 'Bark comes from Peeler Lodges' },
    { id: 'resin', name: 'Resin', glyph: '🫙', tier: 1, worth: 20, color: '#e0a040', desc: '', source: 'Resin is made at the Kiln' },
  ],
  bands: [{ id: 'trunk', index: 1, name: 'Trunk', line: 0, glyph: '🌳', sky: ['#1a2340', '#3b4a6b'], leaf: '#4caf50', ambient: ['🦋'], drops: [{ id: 'bark', weight: 1 }], desc: '', direction: 'up', limbSlots: 0 }],
  producers: [
    { id: 'sapper', name: 'Sapper Lodge', glyph: '🫧', kind: 'lodge', produces: { id: 'sap', rate: 0.5 }, baseCost: { sap: 15 }, costGrowth: 1.13, unlock: { kind: 'always' }, bandId: 'trunk', desc: '' },
    { id: 'kiln_crew', name: 'Kiln crew', glyph: '👷', kind: 'crew', station: 'kiln', baseCost: { sap: 30 }, costGrowth: 1.15, foremanCost: { resin: 25 }, unlock: { kind: 'workshop', id: 'kiln' }, bandId: 'trunk', desc: '' },
  ],
  workshops: [{ id: 'kiln', name: 'Kiln', glyph: '🔥', bandId: 'trunk', hook: 0, cost: { sap: 40 }, recipe: 'resin', tier: 1, desc: '' }],
  recipes: [{ id: 'resin', name: 'Resin', station: 'kiln', inputs: { sap: 5 }, output: { id: 'resin', count: 1 }, seconds: 4 }],
  annexes: [], runes: [], milestones: [], waystoneSeason1: [], legacyLane: [], prestigeNodes: [], mechanics: [], cosmetics: [], bundles: [], setPieces: [], caravanOffers: [], wishes: [], landmarks: [],
}
