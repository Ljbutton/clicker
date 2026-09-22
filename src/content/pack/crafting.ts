/** §5.1 Workshops (one recipe, a hook height) and recipes (every output worth 4.0-4.3x its inputs). */
import type { WorkshopDef, RecipeDef } from '../types'

export const workshops: WorkshopDef[] = [
  { id: 'kiln', name: 'Kiln', glyph: '🔥', bandId: 'trunk', hook: 0, cost: { sap: 40 }, recipe: 'resin', tier: 1, desc: 'Boils Sap down to Resin at the stump. Tap the hut to hand-craft; 25 Resin hires the Foreman.' },
  { id: 'sawmill', name: 'Sawmill', glyph: '🪚', bandId: 'trunk', hook: 20, cost: { bark: 30 }, recipe: 'plank', tier: 1, desc: 'Cuts Bark into Planks. Hook at 20 m.' },
  { id: 'beamworks', name: 'Beamworks', glyph: '🏗️', bandId: 'trunk', hook: 40, cost: { plank: 30, resin: 10 }, recipe: 'beam', tier: 2, desc: 'Laminates Planks with Resin into Beams. Hook at 40 m.' },
  { id: 'brickyard', name: 'Brickyard', glyph: '🧱', bandId: 'roots', hook: 30, cost: { resin: 20, stone: 20 }, recipe: 'brick', tier: 1, desc: 'Fires Stone and Resin into Bricks. Lives in the Roots.' },
  { id: 'glasshouse', name: 'Glasshouse', glyph: '🔮', bandId: 'roots', hook: 30, cost: { brick: 15 }, recipe: 'glass', tier: 2, desc: 'Fuses Stone and Resin into Glass. Lives in the Roots.' },
  { id: 'ropewalk', name: 'Ropewalk', glyph: '🪢', bandId: 'canopy', hook: 80, cost: { plank: 20 }, recipe: 'cord', tier: 1, desc: 'Twists Fiber into Cord. Hook at 80 m on the Canopy.' },
  { id: 'lacquery', name: 'Lacquery', glyph: '🎨', bandId: 'canopy', hook: 120, cost: { beam: 10, brick: 5 }, recipe: 'lacquer', tier: 2, desc: 'Cures Resin, Cord and Honey into Lacquer. Discovered in the Crucible; hook at 120 m.' },
  { id: 'lanternry', name: 'Lanternry', glyph: '🏮', bandId: 'upper', hook: 250, cost: { beam: 20, glass: 10 }, recipe: 'lantern', tier: 3, desc: 'Assembles Glass, Lacquer and Cord into Lanterns. Every 100 lights a bough. Hook at 250 m.' },
  { id: 'ambervault', name: 'Amber Vault', glyph: '🟠', bandId: 'upper', hook: 300, cost: { beam: 30, lacquer: 20 }, recipe: 'amber', tier: 3, desc: 'Ages Resin and Honey into Amber. Discovered in the Crucible; hook at 300 m.' },
  { id: 'forge', name: 'Forge', glyph: '⚙️', bandId: 'deeproots', hook: 400, cost: { beam: 30, brick: 20 }, recipe: 'ingot', tier: 2, desc: 'Smelts Ore in a Brick-lined furnace into Ingots. Lives in the Deep Roots.' },
  { id: 'clockworks', name: 'Clockworks', glyph: '⏱️', bandId: 'crown', hook: 1000, cost: { ingot: 20, lantern: 20 }, recipe: 'clockwork', tier: 3, desc: 'Assembles Ingots, Cord and Lacquer into Clockwork. Discovered in the Crucible; hook at 1,000 m.' },
  { id: 'observatory', name: 'Observatory', glyph: '🔭', bandId: 'cloudreach', hook: 3000, cost: { clockwork: 50, lantern: 50 }, recipe: 'starglass', tier: 4, desc: 'Fuses Glass, Amber and Starfall into Starglass. Discovered in the Crucible; hook at 3,000 m.' },
]

export const recipes: RecipeDef[] = [
  { id: 'resin', name: 'Resin', station: 'kiln', inputs: { sap: 5 }, output: { id: 'resin', count: 1 }, seconds: 4 },
  { id: 'plank', name: 'Plank', station: 'sawmill', inputs: { bark: 3 }, output: { id: 'plank', count: 1 }, seconds: 5 },
  { id: 'beam', name: 'Beam', station: 'beamworks', inputs: { plank: 4, resin: 1 }, output: { id: 'beam', count: 1 }, seconds: 12 },
  { id: 'brick', name: 'Brick', station: 'brickyard', inputs: { stone: 3, resin: 1 }, output: { id: 'brick', count: 1 }, seconds: 6 },
  { id: 'glass', name: 'Glass', station: 'glasshouse', inputs: { stone: 4, resin: 2 }, output: { id: 'glass', count: 1 }, seconds: 10 },
  { id: 'cord', name: 'Cord', station: 'ropewalk', inputs: { fiber: 4 }, output: { id: 'cord', count: 1 }, seconds: 5 },
  { id: 'lacquer', name: 'Lacquer', station: 'lacquery', inputs: { resin: 2, cord: 1, honey: 1 }, output: { id: 'lacquer', count: 1 }, seconds: 12,
    discover: true, hint: 'Something sticky, something twisted, and something sweet from the hives.' },
  { id: 'ingot', name: 'Ingot', station: 'forge', inputs: { ore: 5, brick: 2 }, output: { id: 'ingot', count: 1 }, seconds: 15 },
  { id: 'lantern', name: 'Lantern', station: 'lanternry', inputs: { glass: 2, lacquer: 1, cord: 1 }, output: { id: 'lantern', count: 1 }, seconds: 20,
    discover: true, hint: 'A clear shell, a glossy coat, and a cord to hang it from.' },
  { id: 'amber', name: 'Amber', station: 'ambervault', inputs: { resin: 25, honey: 5 }, output: { id: 'amber', count: 1 }, seconds: 45,
    discover: true, hint: 'A great deal of Resin, aged with something the bees would miss.' },
  { id: 'clockwork', name: 'Clockwork', station: 'clockworks', inputs: { ingot: 3, cord: 2, lacquer: 1 }, output: { id: 'clockwork', count: 1 }, seconds: 30,
    discover: true, hint: 'Metal gears, a cord to drive them, and a coat that keeps the weather out.' },
  { id: 'starglass', name: 'Starglass', station: 'observatory', inputs: { glass: 10, amber: 5, starfall: 1 }, output: { id: 'starglass', count: 1 }, seconds: 90,
    discover: true, hint: 'Glass and Amber, fused around something that fell from the sky.' },
]
