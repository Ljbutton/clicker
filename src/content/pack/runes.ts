/** §7 Runes — tiered permanent multipliers priced in one crafted good. cost(tier k) = base · 6^k. */
import type { BoostDef } from '../types'

const G = 6

export const runes: BoostDef[] = [
  { id: 'rune_sap', name: 'Rune of Sap', glyph: '💧', good: 'resin', baseCost: 10, costGrowth: G, maxTier: 12,
    effect: { target: 'resource:sap', op: 'mult', value: 1.5 }, unlock: { kind: 'crew', id: 'kiln' }, desc: 'Sap production x1.5 per tier. Carved with Resin once the Kiln Foreman is hired.' },
  { id: 'rune_bark', name: 'Rune of Bark', glyph: '🪵', good: 'plank', baseCost: 10, costGrowth: G, maxTier: 12,
    effect: { target: 'resource:bark', op: 'mult', value: 1.5 }, unlock: { kind: 'crew', id: 'sawmill' }, desc: 'Bark production x1.5 per tier. Priced in Planks.' },
  { id: 'rune_stone', name: 'Rune of Stone', glyph: '🪨', good: 'brick', baseCost: 10, costGrowth: G, maxTier: 12,
    effect: { target: 'resource:stone', op: 'mult', value: 1.5 }, unlock: { kind: 'crew', id: 'brickyard' }, desc: 'Stone production x1.5 per tier. Priced in Bricks.' },
  { id: 'rune_fiber', name: 'Rune of Fiber', glyph: '🧵', good: 'cord', baseCost: 10, costGrowth: G, maxTier: 12,
    effect: { target: 'resource:fiber', op: 'mult', value: 1.5 }, unlock: { kind: 'crew', id: 'ropewalk' }, desc: 'Fiber production x1.5 per tier. Priced in Cord.' },
  { id: 'rune_hive', name: 'Rune of the Hive', glyph: '🍯', good: 'lacquer', baseCost: 5, costGrowth: G, maxTier: 12,
    effect: { target: 'resource:honey', op: 'mult', value: 1.5 }, unlock: { kind: 'crew', id: 'lacquery' }, desc: 'Honey production x1.5 per tier. Priced in Lacquer.' },
  { id: 'rune_ore', name: 'Rune of Ore', glyph: '⛏️', good: 'ingot', baseCost: 5, costGrowth: G, maxTier: 12,
    effect: { target: 'resource:ore', op: 'mult', value: 1.5 }, unlock: { kind: 'crew', id: 'forge' }, desc: 'Ore production x1.5 per tier. Priced in Ingots.' },
  { id: 'rune_bell', name: "Foreman's Bell", glyph: '🔔', good: 'beam', baseCost: 10, costGrowth: G, maxTier: 12,
    effect: { target: 'craft_throughput', op: 'mult', value: 1.5 }, unlock: { kind: 'crew', id: 'beamworks' }, desc: 'All workshop throughput x1.5 per tier. Priced in Beams.' },
  { id: 'rune_thrum', name: 'Rune of Thrum', glyph: '🥁', good: 'glass', baseCost: 10, costGrowth: G, maxTier: 12,
    effect: { target: 'tap', op: 'mult', value: 2 }, unlock: { kind: 'crew', id: 'glasshouse' }, desc: 'Strike value x2 per tier (the carving also sharpens your crits). Priced in Glass.' },
  { id: 'rune_reach', name: 'Rune of Reach', glyph: '📏', good: 'beam', baseCost: 25, costGrowth: G, maxTier: 12,
    effect: { target: 'grow_meters_add', op: 'add', value: 0.5 }, unlock: { kind: 'bough', id: 'upper' }, desc: '+0.5 m per GROW per tier, added before Vigor. Priced in Beams; opens with the Upper Trunk.' },
  { id: 'rune_roots', name: 'Rune of Roots', glyph: '🌱', good: 'lantern', baseCost: 5, costGrowth: G, maxTier: 12,
    effect: { target: 'raw_production', op: 'mult', value: 1.5 }, unlock: { kind: 'crew', id: 'lanternry' }, desc: 'All raw production x1.5 per tier. Priced in Lanterns.' },
  { id: 'rune_time', name: 'Rune of Time', glyph: '⏳', good: 'amber', baseCost: 5, costGrowth: G, maxTier: 6,
    effect: { target: 'offline_cap_add', op: 'add', value: 2 }, unlock: { kind: 'crew', id: 'ambervault' }, desc: 'Offline cap +2 h per tier (max +12 h). Priced in Amber.' },
  { id: 'rune_ritual', name: 'Rune of Rituals', glyph: '🕯️', good: 'clockwork', baseCost: 5, costGrowth: G, maxTier: 5,
    effect: { target: 'ritual_cost', op: 'mult', value: 0.9 }, unlock: { kind: 'crew', id: 'clockworks' }, desc: 'Ritual costs x0.9 per tier (5 tiers; floor 25% with all discounts). Priced in Clockwork.' },
  { id: 'rune_stars', name: 'Rune of Stars', glyph: '⭐', good: 'starglass', baseCost: 3, costGrowth: G, maxTier: 8,
    effect: { target: 'all_production', op: 'mult', value: 2 }, unlock: { kind: 'crew', id: 'observatory' }, desc: 'Everything x2 per tier: production, crafting and taps. Priced in Starglass.' },
]
