/** §6 Producers — 7 Folk lodges (raws) and 12 workshop crews (recipes). */
import type { ProducerDef } from '../types'

const LODGE_GROWTH = 1.13
const CREW_GROWTH = 1.15

export const lodges: ProducerDef[] = [
  { id: 'sapper', name: 'Sapper Lodge', glyph: '💧', kind: 'lodge', produces: { id: 'sap', rate: 0.5 }, baseCost: { sap: 15 }, costGrowth: LODGE_GROWTH,
    unlock: { kind: 'always' }, bandId: 'trunk', desc: 'Folk who tap the trunk for Sap while you are away. Your first automation.' },
  { id: 'peeler', name: 'Peeler Lodge', glyph: '🪵', kind: 'lodge', produces: { id: 'bark', rate: 0.4 }, baseCost: { sap: 60 }, costGrowth: LODGE_GROWTH,
    unlock: { kind: 'workshop', id: 'kiln' }, bandId: 'trunk', desc: 'Folk who peel Bark from the trunk. The Sawmill needs it.' },
  { id: 'digger', name: 'Digger Lodge', glyph: '🪨', kind: 'lodge', produces: { id: 'stone', rate: 0.3 }, baseCost: { resin: 6 }, costGrowth: LODGE_GROWTH,
    unlock: { kind: 'bough', id: 'roots' }, bandId: 'roots', desc: 'Folk who dig Stone from between the roots. Priced in Resin.' },
  { id: 'weaver', name: 'Weaver Lodge', glyph: '🧵', kind: 'lodge', produces: { id: 'fiber', rate: 0.25 }, baseCost: { plank: 10 }, costGrowth: LODGE_GROWTH,
    unlock: { kind: 'bough', id: 'canopy' }, bandId: 'canopy', desc: 'Folk who comb Fiber from the canopy leaves. Priced in Planks.' },
  { id: 'beekeeper', name: 'Apiary', glyph: '🐝', kind: 'lodge', produces: { id: 'honey', rate: 0.1 }, baseCost: { cord: 5 }, costGrowth: LODGE_GROWTH,
    unlock: { kind: 'annex', id: 'apiary' }, bandId: 'canopy', desc: 'Beekeepers who tend the Apiary annex for idle Honey. Priced in Cord.' },
  { id: 'miner', name: 'Miner Lodge', glyph: '⛏️', kind: 'lodge', produces: { id: 'ore', rate: 0.2 }, baseCost: { beam: 4 }, costGrowth: LODGE_GROWTH,
    unlock: { kind: 'bough', id: 'deeproots' }, bandId: 'deeproots', desc: 'Folk who chip Ore from the deep-root veins. Priced in Beams.' },
  { id: 'stargazer', name: 'Stargazer Roost', glyph: '🔭', kind: 'lodge', produces: { id: 'starfall', rate: 0.01 }, baseCost: { amber: 5 }, costGrowth: LODGE_GROWTH,
    unlock: { kind: 'bough', id: 'cloudreach' }, bandId: 'cloudreach', desc: 'Folk who wait on the Cloudreach with nets for Starfall. Priced in Amber.' },
]

interface CrewRow { station: string; name: string; output: string; seconds: number; foreman: number; sap: number; bandId: string }
const crewRows: CrewRow[] = [
  { station: 'kiln', name: 'Kiln crew', output: 'resin', seconds: 4, foreman: 25, sap: 30, bandId: 'trunk' },
  { station: 'sawmill', name: 'Sawmill crew', output: 'plank', seconds: 5, foreman: 25, sap: 30, bandId: 'trunk' },
  { station: 'brickyard', name: 'Brickyard crew', output: 'brick', seconds: 6, foreman: 25, sap: 150, bandId: 'roots' },
  { station: 'ropewalk', name: 'Ropewalk crew', output: 'cord', seconds: 5, foreman: 25, sap: 150, bandId: 'canopy' },
  { station: 'beamworks', name: 'Beamworks crew', output: 'beam', seconds: 12, foreman: 15, sap: 150, bandId: 'trunk' },
  { station: 'glasshouse', name: 'Glasshouse crew', output: 'glass', seconds: 10, foreman: 15, sap: 800, bandId: 'roots' },
  { station: 'lacquery', name: 'Lacquery crew', output: 'lacquer', seconds: 12, foreman: 15, sap: 800, bandId: 'canopy' },
  { station: 'forge', name: 'Forge crew', output: 'ingot', seconds: 15, foreman: 15, sap: 5000, bandId: 'deeproots' },
  { station: 'lanternry', name: 'Lanternry crew', output: 'lantern', seconds: 20, foreman: 10, sap: 5000, bandId: 'upper' },
  { station: 'ambervault', name: 'Amber Vault crew', output: 'amber', seconds: 45, foreman: 10, sap: 5000, bandId: 'upper' },
  { station: 'clockworks', name: 'Clockworks crew', output: 'clockwork', seconds: 30, foreman: 10, sap: 25000, bandId: 'crown' },
  { station: 'observatory', name: 'Observatory crew', output: 'starglass', seconds: 90, foreman: 5, sap: 150000, bandId: 'cloudreach' },
]

export const crews: ProducerDef[] = crewRows.map((r) => ({
  id: `${r.station}_crew`, name: r.name, glyph: '👷', kind: 'crew', station: r.station,
  produces: { id: r.output, rate: Math.round((1 / r.seconds) * 1000) / 1000 },
  baseCost: { sap: r.sap }, costGrowth: CREW_GROWTH, foremanCost: { [r.output]: r.foreman },
  unlock: { kind: 'workshop', id: r.station }, bandId: r.bandId,
  desc: `Crew #1 is the Foreman: hand-craft ${r.foreman} ${r.output} to hire them and the ${r.name.replace(' crew', '')} runs on its own. Crew #2+ cost Sap.`,
}))

export const producers: ProducerDef[] = [...lodges, ...crews]
