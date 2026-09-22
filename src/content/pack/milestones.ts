/** §12.2 Milestones — the data-driven spine. Medium/big celebrations also drop an x2 token (handled by the system). */
import type { MilestoneDef, Reward } from '../types'

const ff = (n: number, extra: Reward = {}): Reward => ({ fireflies: n, ...extra })

const taps: MilestoneDef[] = [
  { id: 'm_taps_100', name: '100 Strikes', glyph: '👆', cond: { kind: 'strikes', min: 100 }, reward: ff(10), celebration: 'small' },
  { id: 'm_taps_1k', name: '1,000 Strikes', glyph: '👆', cond: { kind: 'strikes', min: 1000 }, reward: ff(25, { cosmetic: 'tap_sparks2' }), celebration: 'small' },
  { id: 'm_taps_10k', name: '10,000 Strikes', glyph: '👆', cond: { kind: 'strikes', min: 10000 }, reward: ff(50), celebration: 'small' },
  { id: 'm_taps_100k', name: '100,000 Strikes', glyph: '👆', cond: { kind: 'strikes', min: 100000 }, reward: ff(100, { cosmetic: 'tap_notes' }), celebration: 'medium' },
  { id: 'm_taps_1m', name: 'A Million Strikes', glyph: '👆', cond: { kind: 'strikes', min: 1000000 }, reward: ff(250), celebration: 'medium' },
  { id: 'm_crit_100', name: '100 Crits', glyph: '💥', cond: { kind: 'crits', min: 100 }, reward: ff(25), celebration: 'small' },
  { id: 'm_crit_1k', name: '1,000 Crits', glyph: '💥', cond: { kind: 'crits', min: 1000 }, reward: ff(100, { cosmetic: 'tap_gold' }), celebration: 'small' },
  { id: 'm_reso_10', name: '10 Resonances', glyph: '🥁', cond: { kind: 'resonances', min: 10 }, reward: ff(20), celebration: 'small' },
  { id: 'm_reso_100', name: '100 Resonances', glyph: '🥁', cond: { kind: 'resonances', min: 100 }, reward: ff(60, { cosmetic: 'meter_vine' }), celebration: 'small' },
  { id: 'm_reso_1k', name: '1,000 Resonances', glyph: '🥁', cond: { kind: 'resonances', min: 1000 }, reward: ff(200), celebration: 'small' },
]

const grows: MilestoneDef[] = ([[10, 'bark'], [50, 'amber'], [100, 'amber'], [250, 'star'], [500, 'star']] as const).map(([n, chest]) => ({
  id: `m_grow_${n}`, name: `GROW ${n} times this Season`, glyph: '🌳', cond: { kind: 'grows', min: n }, reward: { chest }, celebration: 'medium' as const,
}))

/** First time at each height line (big: sky crossfade, title card). */
const lines: MilestoneDef[] = [
  { id: 'm_line_roots', name: 'The Roots line — 30 m', glyph: '🍄', cond: { kind: 'height', min: 30 }, reward: ff(10), celebration: 'big' },
  { id: 'm_line_canopy', name: 'The Canopy line — 60 m', glyph: '🍃', cond: { kind: 'height', min: 60 }, reward: ff(15, { cosmetic: 'sky_dawn' }), celebration: 'big' },
  { id: 'm_line_upper', name: 'The Upper Trunk line — 200 m', glyph: '🌉', cond: { kind: 'height', min: 200 }, reward: ff(20, { cosmetic: 'sky_twilight' }), celebration: 'big' },
  { id: 'm_line_deeproots', name: 'The Deep Roots line — 400 m', glyph: '💎', cond: { kind: 'height', min: 400 }, reward: ff(25), celebration: 'big' },
  { id: 'm_line_crown', name: 'The Crown line — 800 m', glyph: '👑', cond: { kind: 'height', min: 800 }, reward: ff(30), celebration: 'big' },
  { id: 'm_line_cloudreach', name: 'The Cloudreach line — 2,000 m', glyph: '🌌', cond: { kind: 'height', min: 2000 }, reward: ff(40, { cosmetic: 'title_cloudreacher' }), celebration: 'big' },
  { id: 'm_line_starbough', name: 'The Starbough line — 5,000 m', glyph: '🌠', cond: { kind: 'height', min: 5000 }, reward: ff(60), celebration: 'big' },
  { id: 'm_line_elder', name: 'The Elder line — 12,000 m', glyph: '🌙', cond: { kind: 'height', min: 12000 }, reward: ff(80), celebration: 'big' },
  { id: 'm_line_worldcrown', name: 'The Worldcrown line — 20,000 m', glyph: '🌞', cond: { kind: 'height', min: 20000 }, reward: ff(100), celebration: 'big' },
]

/** Ritual performed for the first time ever. Glimmer only where the Season-1 lane does not already pay it (B7, B8) so the week total stays ~210. */
const boughs: MilestoneDef[] = [
  { id: 'm_bough_roots', name: 'Roots opened', glyph: '🍄', cond: { kind: 'bough', id: 'roots' }, reward: { glimmer: 20 }, celebration: 'big' },
  { id: 'm_bough_canopy', name: 'Canopy opened', glyph: '🍃', cond: { kind: 'bough', id: 'canopy' }, reward: { glimmer: 20 }, celebration: 'big' },
  { id: 'm_bough_upper', name: 'Upper Trunk opened', glyph: '🌉', cond: { kind: 'bough', id: 'upper' }, reward: { glimmer: 20 }, celebration: 'big' },
  { id: 'm_bough_deeproots', name: 'Deep Roots opened', glyph: '💎', cond: { kind: 'bough', id: 'deeproots' }, reward: { glimmer: 20 }, celebration: 'big' },
  { id: 'm_bough_crown', name: 'Crown opened', glyph: '👑', cond: { kind: 'bough', id: 'crown' }, reward: { glimmer: 20, cosmetic: 'crown_vane' }, celebration: 'big' },
  { id: 'm_bough_cloudreach', name: 'Cloudreach opened', glyph: '🌌', cond: { kind: 'bough', id: 'cloudreach' }, reward: { glimmer: 20 }, celebration: 'big' },
  { id: 'm_bough_starbough', name: 'Starbough opened', glyph: '🌠', cond: { kind: 'bough', id: 'starbough' }, reward: { glimmer: 20 }, celebration: 'big' },
  { id: 'm_bough_elder', name: 'Elder Bough opened', glyph: '🌙', cond: { kind: 'bough', id: 'elder' }, reward: { glimmer: 20, cosmetic: 'tr_elder' }, celebration: 'big' },
  { id: 'm_bough_worldcrown', name: 'Worldcrown opened', glyph: '🌞', cond: { kind: 'bough', id: 'worldcrown' }, reward: { glimmer: 20, cosmetic: 'title_giantfriend', fireflies: 200 }, celebration: 'big' },
]

const lodgeNames: Record<string, string> = { sapper: 'Sapper Lodge', peeler: 'Peeler Lodge', digger: 'Digger Lodge', weaver: 'Weaver Lodge', beekeeper: 'Apiary', miner: 'Miner Lodge', stargazer: 'Stargazer Roost' }
const lodgeGlyphs: Record<string, string> = { sapper: '💧', peeler: '🪵', digger: '🪨', weaver: '🧵', beekeeper: '🐝', miner: '⛏️', stargazer: '🔭' }
const lodgeSteps: [number, number][] = [[25, 10], [50, 15], [100, 25], [200, 50]]
/** First-ever hat rewards ride on the Sapper Lodge (the first lodge to reach each step). */
const sapperHats: Record<number, string> = { 50: 'hat_acorn', 100: 'hat_mushroom', 200: 'hat_crown' }
const lodgeMilestones: MilestoneDef[] = Object.keys(lodgeNames).flatMap((id) => lodgeSteps.map(([n, f]) => ({
  id: `m_lodge_${id}_${n}`, name: `${lodgeNames[id]} ${n} (x2)`, glyph: lodgeGlyphs[id] ?? '🏠', cond: { kind: 'producer' as const, id, min: n },
  reward: ff(f, id === 'sapper' && sapperHats[n] ? { cosmetic: sapperHats[n] } : {}), celebration: 'medium' as const,
})))

const workshopNames: Record<string, string> = { kiln: 'Kiln', sawmill: 'Sawmill', brickyard: 'Brickyard', ropewalk: 'Ropewalk', beamworks: 'Beamworks', glasshouse: 'Glasshouse', lacquery: 'Lacquery', forge: 'Forge', lanternry: 'Lanternry', ambervault: 'Amber Vault', clockworks: 'Clockworks', observatory: 'Observatory' }
const crewSteps: [number, number][] = [[25, 10], [50, 15], [100, 25]]
const crewMilestones: MilestoneDef[] = Object.keys(workshopNames).flatMap((ws) => crewSteps.map(([n, f]) => ({
  id: `m_crew_${ws}_${n}`, name: `${workshopNames[ws]} crew ${n} (x2)`, glyph: '👷', cond: { kind: 'producer' as const, id: `${ws}_crew`, min: n },
  reward: ff(f, ws === 'kiln' && n === 100 ? { cosmetic: 'roof_slate' } : {}), celebration: 'medium' as const,
})))

const crafts: MilestoneDef[] = ([[1, 25], [2, 50], [3, 100], [4, 200]] as const).map(([tier, f]) => ({
  id: `m_craft_tier${tier}_1k`, name: `1,000 tier-${tier} crafts`, glyph: '⚒️', cond: { kind: 'craftsTier' as const, tier, min: 1000 }, reward: ff(f), celebration: 'small' as const,
}))

const lanterns: MilestoneDef[] = [
  { id: 'm_lantern_100', name: '100 Lanterns (lifetime)', glyph: '🏮', cond: { kind: 'lanterns', min: 100, lifetime: true }, reward: { cosmetic: 'ls_paper', fireflies: 25 }, celebration: 'medium' },
  { id: 'm_lantern_1k', name: '1,000 Lanterns (lifetime)', glyph: '🏮', cond: { kind: 'lanterns', min: 1000, lifetime: true }, reward: { cosmetic: 'lc_moss', fireflies: 50 }, celebration: 'medium' },
  { id: 'm_lantern_10k', name: '10,000 Lanterns (lifetime)', glyph: '🏮', cond: { kind: 'lanterns', min: 10000, lifetime: true }, reward: { cosmetic: 'ls_gourd', fireflies: 100 }, celebration: 'medium' },
  { id: 'm_lantern_100k', name: '100,000 Lanterns (lifetime)', glyph: '🏮', cond: { kind: 'lanterns', min: 100000, lifetime: true }, reward: { cosmetic: 'lg_swarm', fireflies: 200 }, celebration: 'medium' },
  { id: 'm_starglass_1', name: 'First Starglass', glyph: '💠', cond: { kind: 'crafted', id: 'starglass', min: 1 }, reward: { cosmetic: 'frame_star', fireflies: 50 }, celebration: 'medium' },
]

const runesM: MilestoneDef[] = [
  { id: 'm_rune_10', name: '10 Runes carved', glyph: '🔯', cond: { kind: 'runes', min: 10 }, reward: ff(30), celebration: 'small' },
  { id: 'm_rune_25', name: '25 Runes carved', glyph: '🔯', cond: { kind: 'runes', min: 25 }, reward: ff(80, { cosmetic: 'tr_glowbark' }), celebration: 'small' },
  { id: 'm_rune_50', name: '50 Runes carved', glyph: '🔯', cond: { kind: 'runes', min: 50 }, reward: ff(200), celebration: 'small' },
]

const codex: MilestoneDef[] = [
  { id: 'm_codex_25', name: 'Codex 25%', glyph: '📖', cond: { kind: 'codex', pct: 25 }, reward: { chest: 'amber' }, celebration: 'medium' },
  { id: 'm_codex_50', name: 'Codex 50%', glyph: '📖', cond: { kind: 'codex', pct: 50 }, reward: { chest: 'amber', cosmetic: 'lg_flicker' }, celebration: 'medium' },
  { id: 'm_codex_75', name: 'Codex 75%', glyph: '📖', cond: { kind: 'codex', pct: 75 }, reward: { chest: 'star' }, celebration: 'medium' },
  { id: 'm_codex_100', name: 'Codex complete', glyph: '📖', cond: { kind: 'codex', pct: 100 }, reward: { chest: 'star', cosmetic: 'title_loremaster' }, celebration: 'medium' },
]

const seasons: MilestoneDef[] = [
  { id: 'm_season_1', name: 'First Turn', glyph: '🌀', cond: { kind: 'seasons', min: 1 }, reward: ff(50, { cosmetic: 'pet_owl' }), celebration: 'big' },
  { id: 'm_season_3', name: 'Three Rings on the stump', glyph: '🌀', cond: { kind: 'seasons', min: 3 }, reward: ff(100, { cosmetic: 'tr_birch' }), celebration: 'big' },
  { id: 'm_season_5', name: 'Five Rings on the stump', glyph: '🌀', cond: { kind: 'seasons', min: 5 }, reward: ff(150, { cosmetic: 'frame_rings' }), celebration: 'big' },
  { id: 'm_season_10', name: 'The Great Ring', glyph: '🌀', cond: { kind: 'seasons', min: 10 }, reward: ff(250, { cosmetic: 'frame_greatring' }), celebration: 'big' },
  { id: 'm_season_20', name: 'Twenty Seasons', glyph: '🌀', cond: { kind: 'seasons', min: 20 }, reward: ff(500, { cosmetic: 'crown_elder' }), celebration: 'big' },
]

const setPieceNames: Record<string, [string, string]> = { beehive: ['Beehive Shakes', '🐝'], woodpecker: ['Woodpeckers', '🪶'], acorn: ['Golden Acorns', '🌰'], star: ['Falling Stars', '⭐'], gust: ['Gust leaves', '🍂'], lightning: ['Lightning discharges', '🌩️'] }
const setPieces: MilestoneDef[] = Object.entries(setPieceNames).flatMap(([id, [name, glyph]]) => [
  { id: `m_setpiece_${id}_10`, name: `10 ${name}`, glyph, cond: { kind: 'setpiece' as const, id, min: 10 }, reward: ff(25, id === 'star' ? { cosmetic: 'sky_star' } : {}), celebration: 'small' as const },
  { id: `m_setpiece_${id}_100`, name: `100 ${name}`, glyph, cond: { kind: 'setpiece' as const, id, min: 100 }, reward: ff(100, id === 'beehive' ? { cosmetic: 'pet_bee' } : {}), celebration: 'small' as const },
])

const misc: MilestoneDef[] = [
  { id: 'm_fireflies_1000', name: '1,000 Fireflies collected', glyph: '✨', cond: { kind: 'fireflies', min: 1000 }, reward: { cosmetic: 'pet_swarm' }, celebration: 'medium' },
  { id: 'm_streak_7', name: 'Seven days in a row', glyph: '📅', cond: { kind: 'streak', min: 7 }, reward: { cosmetic: 'pet_cat' }, celebration: 'medium' },
  { id: 'm_masterwork_50', name: '50 Masterworks', glyph: '💜', cond: { kind: 'masterworks', min: 50 }, reward: ff(40, { cosmetic: 'roof_moss' }), celebration: 'small' },
  { id: 'm_kite_1', name: 'First kite', glyph: '🪁', cond: { kind: 'kites', min: 1 }, reward: { cosmetic: 'title_kiteflyer' }, celebration: 'small' },
  // season-mechanic trophies (the extra medal items from §14.1)
  { id: 'm_gusts_50', name: '50 gust leaves caught', glyph: '🍂', cond: { kind: 'gusts', min: 50 }, reward: ff(30), celebration: 'small' },
  { id: 'm_thaws_5', name: '5 bundles thawed', glyph: '🧊', cond: { kind: 'thaws', min: 5 }, reward: ff(30, { cosmetic: 'lc_icewater' }), celebration: 'small' },
  { id: 'm_thaws_25', name: '25 bundles thawed', glyph: '🧊', cond: { kind: 'thaws', min: 25 }, reward: ff(60, { cosmetic: 'sky_snow' }), celebration: 'small' },
  { id: 'm_blooms_10', name: '10 Bloom waves', glyph: '🌸', cond: { kind: 'blooms', min: 10 }, reward: ff(30, { cosmetic: 'hat_bee' }), celebration: 'small' },
  { id: 'm_blooms_50', name: '50 Bloom waves', glyph: '🌸', cond: { kind: 'blooms', min: 50 }, reward: ff(60, { cosmetic: 'roof_hive' }), celebration: 'small' },
  { id: 'm_discharges_10', name: '10 Rod discharges', glyph: '⚡', cond: { kind: 'discharges', min: 10 }, reward: ff(40, { cosmetic: 'title_storm' }), celebration: 'small' },
  { id: 'm_trades_10', name: '10 Caravan trades', glyph: '🐪', cond: { kind: 'trades', min: 10 }, reward: ff(50), celebration: 'small' },
  { id: 'm_limbs_5', name: 'Five limbs sprouted', glyph: '🌿', cond: { kind: 'limbs', min: 5 }, reward: ff(30), celebration: 'small' },
  { id: 'm_rings_25', name: '25 lifetime Rings', glyph: '🌀', cond: { kind: 'lifetimeRings', min: 25 }, reward: ff(50), celebration: 'small' },
  { id: 'm_rings_100', name: '100 lifetime Rings', glyph: '🌀', cond: { kind: 'lifetimeRings', min: 100 }, reward: ff(100), celebration: 'small' },
]

export const milestones: MilestoneDef[] = [...taps, ...grows, ...lines, ...boughs, ...lodgeMilestones, ...crewMilestones, ...crafts, ...lanterns, ...runesM, ...codex, ...seasons, ...setPieces, ...misc]
