/** §8.2 / §11.5 Annexes — built on limbs (limb Beams + annex cost). Unlock seasons are prestige counts (Season N = count N-1). */
import type { AnnexDef } from '../types'

export const annexes: AnnexDef[] = [
  { id: 'apiary', name: 'Apiary', glyph: '🐝', cost: { plank: 20 }, unlock: { kind: 'bough', id: 'canopy' }, bandId: 'canopy', special: 'apiary',
    desc: 'Hives on the Canopy limb. Unlocks Beekeepers, the idle source of Honey (Lacquer, Amber and Lanterns all need it).' },
  { id: 'kite_yard', name: 'Kite Yard', glyph: '🪁', cost: { cord: 25 }, unlock: { kind: 'bough', id: 'upper' }, bandId: 'upper', special: 'kite_yard',
    desc: 'Crafts cosmetic kites and banners from Cord, Lacquer and Fireflies, and dyes lanterns with Lacquer. Goods become things you can see.' },
  { id: 'hearth', name: 'Hearth Annex', glyph: '🔥', cost: { beam: 20 }, unlock: { kind: 'always' }, special: 'hearth',
    desc: 'A second Foreman for one chosen workshop: that workshop runs at x2 throughput. Any bough from the Roots up.' },
  { id: 'windmill', name: 'Windmill', glyph: '🌬️', cost: { beam: 30 }, unlock: { kind: 'season', min: 1 }, special: 'windmill',
    maxLevel: 10, levelCostGrowth: 1.13, perLevel: [{ target: 'raw_production', op: 'mult', value: 1.08 }],
    desc: 'Autumn (Wind). +8% lodge output per level and auto-catches one gust leaf per level. Levels up to 10.' },
  { id: 'frost_cellar', name: 'Frost Cellar', glyph: '🧊', cost: { beam: 60, glass: 20 }, unlock: { kind: 'season', min: 2 }, special: 'frost_cellar',
    desc: 'Winter (Frost). Stores offline production beyond the cap (+24 h) as a frozen bundle; 10 taps thaw it at x2.' },
  { id: 'grove', name: 'Grove', glyph: '🌸', cost: { beam: 60, lacquer: 30 }, unlock: { kind: 'season', min: 3 }, special: 'grove',
    maxLevel: 3, levelCostGrowth: 1.5,
    desc: 'Spring (Bloom). Adds one blossom wave per cycle per level (max 3) and doubles the Beekeepers.' },
  { id: 'lightning_rod', name: 'Lightning Rod', glyph: '⚡', cost: { ingot: 20, beam: 100 }, unlock: { kind: 'season', min: 4 }, special: 'lightning_rod',
    desc: 'Summer (Storm). Storms charge the Rod (max 5); tap to discharge, each charge completing 60 s of all Foreman crafting instantly.' },
  { id: 'caravan_post', name: 'Caravan Post', glyph: '🐪', cost: { lantern: 100 }, unlock: { kind: 'season', min: 5 }, special: 'caravan_post',
    desc: 'Autumn II (Caravans). A caravan docks at the stump every 30 minutes of play and on every return with three offers.' },
  { id: 'owl_nest', name: 'Owl Nest', glyph: '🦉', cost: { cord: 30 }, unlock: { kind: 'always' }, special: 'owl_nest',
    desc: 'A nest for the owl egg found at Landmark #30. Purely for company: the owl hatches after a Season and wanders the tree.' },
]
