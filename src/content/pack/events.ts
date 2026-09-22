/** §3.6 Set-pieces, §11.5 caravan offers, §9.4 Wishes and Landmarks. */
import type { SetPieceDef, CaravanOfferDef, WishDef, LandmarkDef } from '../types'

export const setPieces: SetPieceDef[] = [
  { id: 'beehive', name: 'Beehive Shake', glyph: '🐝', unlock: { kind: 'height', min: 40 }, every: [240, 360], seconds: 20, taps: 10,
    reward: { resources: { honey: 8 }, incomeSeconds: 20 }, desc: 'Tap the swinging hive 10 times for Honey and 20 s of income. Idle Honey comes from the Apiary one bough later.' },
  { id: 'woodpecker', name: 'Woodpecker', glyph: '🪶', unlock: { kind: 'bough', id: 'canopy' }, every: [300, 420], seconds: 15, taps: 8, special: 'woodpecker',
    reward: { incomeSeconds: 60 }, desc: 'Tap along with 8 pecks (any rhythm) for a burst of income.' },
  { id: 'acorn', name: 'Golden Acorn', glyph: '🌰', unlock: { kind: 'bough', id: 'upper' }, every: [480, 720], seconds: 20, taps: 5, special: 'acorn',
    reward: {}, desc: '5 taps on a bouncing acorn: 15 minutes of offline-rate production instantly (30 with Golden Hours).' },
  { id: 'star', name: 'Falling Star', glyph: '⭐', unlock: { kind: 'bough', id: 'crown' }, every: [600, 900], seconds: 3, taps: 1, special: 'star',
    reward: { resources: { starfall: 1 } }, desc: 'One tap as it crosses the sky: 1 Starfall, and a Star Chest the first three times.' },
  { id: 'gust', name: 'Gust leaves', glyph: '🍂', unlock: { kind: 'season', min: 1 }, every: [90, 150], seconds: 8, taps: 12, payPerTap: true, special: 'gust',
    reward: { incomeSeconds: 10 }, desc: 'Autumn Wind: tap each of 12 leaves for 10 s of income apiece. The Windmill auto-catches one per level.' },
  { id: 'lightning', name: 'Lightning', glyph: '🌩️', unlock: { kind: 'season', min: 4 }, every: [300, 300], seconds: 40, taps: 1, special: 'lightning',
    reward: {}, desc: 'Summer Storm: tap the Rod to discharge; each charge completes 60 s of all Foreman crafting instantly.' },
]

export const caravanOffers: CaravanOfferDef[] = [
  { id: 'co_resin_ff', name: '200 Resin → 15 Fireflies', give: { resin: 200 }, get: { fireflies: 15 }, weight: 10 },
  { id: 'co_plank_ff', name: '200 Planks → 20 Fireflies', give: { plank: 200 }, get: { fireflies: 20 }, weight: 10 },
  { id: 'co_beam_ff', name: '100 Beams → 30 Fireflies', give: { beam: 100 }, get: { fireflies: 30 }, weight: 8 },
  { id: 'co_lantern_ff', name: '50 Lanterns → 40 Fireflies', give: { lantern: 50 }, get: { fireflies: 40 }, weight: 6 },
  { id: 'co_lacquer_starfall', name: '200 Lacquer → 5 Starfall', give: { lacquer: 200 }, get: { resources: { starfall: 5 } }, weight: 5 },
  { id: 'co_glass_honey', name: '50 Glass → 200 Honey', give: { glass: 50 }, get: { resources: { honey: 200 } }, weight: 6 },
  { id: 'co_brick_ore', name: '100 Bricks → 300 Ore', give: { brick: 100 }, get: { resources: { ore: 300 } }, weight: 6 },
  { id: 'co_ingot_amber', name: '50 Ingots → 10 Amber', give: { ingot: 50 }, get: { resources: { amber: 10 } }, weight: 4 },
  { id: 'co_clockwork_glimmer', name: '20 Clockwork → 5 Glimmer', give: { clockwork: 20 }, get: { glimmer: 5 }, weight: 3 },
  { id: 'co_amber_glimmer', name: '100 Amber → 5 Glimmer', give: { amber: 100 }, get: { glimmer: 5 }, weight: 3 },
]

/** Two refresh daily; progress counts from the day's starting value. */
export const wishes: WishDef[] = [
  { id: 'w_setpieces_3', name: 'Catch 3 set-pieces', cond: { kind: 'setpieces', min: 3 }, fireflies: 40 },
  { id: 'w_beam_50', name: 'Craft 50 Beams', cond: { kind: 'crafted', id: 'beam', min: 50 }, fireflies: 30 },
  { id: 'w_crits_20', name: 'Land 20 crits', cond: { kind: 'crits', min: 20 }, fireflies: 20 },
  { id: 'w_reso_5', name: 'Fire 5 Resonances', cond: { kind: 'resonances', min: 5 }, fireflies: 25 },
  { id: 'w_grows_20', name: 'GROW 20 times', cond: { kind: 'grows', min: 20 }, fireflies: 30 },
  { id: 'w_resin_200', name: 'Craft 200 Resin', cond: { kind: 'crafted', id: 'resin', min: 200 }, fireflies: 20 },
  { id: 'w_lantern_25', name: 'Craft 25 Lanterns', cond: { kind: 'crafted', id: 'lantern', min: 25 }, fireflies: 40 },
  { id: 'w_strikes_300', name: 'Strike the trunk 300 times', cond: { kind: 'strikes', min: 300 }, fireflies: 20 },
  { id: 'w_masterworks_3', name: 'Hand-craft 3 Masterworks', cond: { kind: 'masterworks', min: 3 }, fireflies: 35 },
  { id: 'w_runes_2', name: 'Carve 2 Rune tiers', cond: { kind: 'runes', min: 2 }, fireflies: 30 },
]

export const landmarks: LandmarkDef[] = [
  { id: 'lm_bridge', name: 'Rope Bridge', glyph: '🌉', desc: 'A rope bridge slung between the first two limbs. Landmark #10.' },
  { id: 'lm_birdhouse', name: 'Birdhouse', glyph: '🐦', desc: 'A birdhouse at 40 m; a bird comes and goes. Landmark #20.' },
  { id: 'lm_owl', name: 'Owl', glyph: '🦉', desc: 'An owl (and its egg) roosting on the Canopy. Landmark #30.' },
  { id: 'lm_chimes', name: 'Wind Chimes', glyph: '🎐', desc: 'Chimes that ring when the wind blows. Landmark #40.' },
  { id: 'lm_mushrooms', name: 'Mushroom Lights', glyph: '🍄', desc: 'Glow-mushrooms lighting the Deep Roots. Landmark #50.' },
  { id: 'lm_flags', name: 'Prayer Flags', glyph: '🎏', desc: 'Strings of flags across the stump. Landmark #60.' },
  { id: 'lm_bell', name: 'Great Bell', glyph: '🔔', desc: 'A bronze bell hung in the roots; it rings on every Turn.' },
  { id: 'lm_swing', name: 'Swing', glyph: '🪢', desc: 'A rope swing under a Canopy limb; Folk queue for it.' },
  { id: 'lm_hammock', name: 'Hammock', glyph: '🛏️', desc: 'A hammock between two Upper Trunk limbs.' },
  { id: 'lm_door', name: 'Treehouse Door', glyph: '🚪', desc: 'A little round door in the trunk; lanterns burn on either side.' },
]
