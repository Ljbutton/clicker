// Placeholder content pack so the app boots before the real content lands. Replaced by the full pack.
import type { Content } from './types'
export const content: Content = {
  resources: [
    { id: 'sap', name: 'Sap', glyph: '💧', tier: 0, worth: 1, color: '#ffb547', desc: 'The lifeblood of the tree.', base: true },
    { id: 'bark', name: 'Bark', glyph: '🪵', tier: 1, worth: 2, color: '#b07a4a', desc: '' },
  ],
  bands: [{ id: 'trunk', name: 'Trunk', minHeight: 0, glyph: '🌳', sky: ['#1a2340', '#3b4a6b'], leaf: '#4caf50', ambient: ['🦋'], drops: [{ id: 'bark', weight: 1 }], desc: '' }],
  producers: [{ id: 'sapper', name: 'Sapper', glyph: '🫧', kind: 'gatherer', produces: { id: 'sap', rate: 0.5 }, baseCost: { sap: 15 }, costGrowth: 1.13, unlock: { kind: 'always' }, bandId: 'trunk', breakpoints: [10, 25, 50, 100, 200], desc: '' }],
  buildings: [], recipes: [], boosts: [], milestones: [], prestigeNodes: [], mechanics: [], cosmetics: [], bundles: [], setPieces: [],
}
