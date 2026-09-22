/**
 * Content schema for HOLLOWSPIRE (see docs/GAME_DESIGN.md). Every piece of content is data conforming
 * to these types; systems never hard-code an item.
 */

export type Cost = Record<string, number>

/** Tier 0 raw, 1-4 crafted. Meta currencies (Heartwood, Fireflies, Rings, Glimmer) live in state, not here. */
export interface ResourceDef {
  id: string
  name: string
  glyph: string
  tier: 0 | 1 | 2 | 3 | 4
  /** Hidden value in Sap: drives Heartwood, bottleneck ranking, chest scaling. */
  worth: number
  color: string
  desc: string
  base?: boolean
  /** Blocking-reason text for the Waystone advice line when net rate is zero. */
  source: string
}

/** A Bough: biome floor of the tree. B1 is open at start; others open via a Ritual. */
export interface BandDef {
  id: string
  index: number
  name: string
  /** Height at which the sky changes and the bough's hooks appear; Ritual requires height >= line. */
  line: number
  glyph: string
  sky: [string, string]
  leaf: string
  /** Ambient critter glyphs. */
  ambient: string[]
  /** Raws a Strike can shake loose while this is the highest open bough. */
  drops: { id: string; weight: number }[]
  desc: string
  /** Ritual to open the bough (undefined for B1). */
  ritual?: { cost: Cost; requiresSeason?: number }
  /** Roots plunge downward instead of up. */
  direction: 'up' | 'down'
  limbSlots: number
  /** Scene: Landmark objects that live on this bough. */
  landmarkSlots?: string[]
}

export type Unlock =
  | { kind: 'always' }
  | { kind: 'height'; min: number }
  | { kind: 'bough'; id: string }
  | { kind: 'workshop'; id: string }
  | { kind: 'crew'; id: string; min?: number }
  | { kind: 'producer'; id: string; count: number }
  | { kind: 'annex'; id: string }
  | { kind: 'season'; min: number }
  | { kind: 'discovered'; recipe: string }
  | { kind: 'goal'; id: string }
  | { kind: 'all'; of: Unlock[] }

export type EffectTarget =
  | 'all_production'        // raws, crafting and taps
  | 'raw_production'        // all lodges
  | 'craft_throughput'      // all workshops
  | `resource:${string}`    // lodge output of one raw
  | `station:${string}`     // one workshop's throughput
  | 'tap' | 'tap_peg' | 'crit_chance' | 'resonance_mult' | 'resonance_seconds' | 'masterwork_chance' | 'rally_stamina' | 'rally_refill'
  | 'grow_meters' | 'grow_meters_add' | 'grow_cost'
  | 'offline_rate_add' | 'offline_cap_add'
  | 'ritual_cost' | 'producer_cost' | 'crew_cost' | 'recipe_inputs' | 'milestone_bonus'
  | 'discovery_fireflies' | 'lit_every' | 'dawn_rush_seconds' | 'acorn_minutes' | 'auto_thrum'
  | 'wind_every' | 'windmill_cap' | 'cellar_hours' | 'thaw_mult' | 'bloom_seconds' | 'rod_charges' | 'caravan_offers'

export interface Effect { target: EffectTarget; op: 'mult' | 'add'; value: number }

/** Lodges gather a raw; crews run a workshop. `count` is the level. */
export interface ProducerDef {
  id: string
  name: string
  glyph: string
  kind: 'lodge' | 'crew'
  produces?: { id: string; rate: number }
  /** Workshop id for crews. */
  station?: string
  /** Cost of level n = baseCost * costGrowth^n (crews: n-1, since the Foreman is priced separately). */
  baseCost: Cost
  costGrowth: number
  /** Crews: the Foreman (crew #1) costs N units of the workshop's own output, hand-crafted. */
  foremanCost?: Cost
  unlock: Unlock
  bandId: string
  desc: string
}

/** A workshop: one recipe, a hook height, a crew. */
export interface WorkshopDef {
  id: string
  name: string
  glyph: string
  bandId: string
  /** Hook height: buildable once height >= hook and the bough is open. */
  hook: number
  cost: Cost
  recipe: string
  tier: 1 | 2 | 3 | 4
  desc: string
}

export interface RecipeDef {
  id: string
  name: string
  station: string
  inputs: Cost
  output: { id: string; count: number }
  seconds: number
  /** Cross-chain recipes are discovered in the Crucible. */
  discover?: boolean
  hint?: string
}

/** Annexes sit on limbs. Some are producers (Apiary hosts Beekeepers), some are mechanics. */
export interface AnnexDef {
  id: string
  name: string
  glyph: string
  cost: Cost
  unlock: Unlock
  /** Must be built on this bough (undefined = any open bough with a free limb). */
  bandId?: string
  /** Levelable annexes (Windmill, Grove). */
  maxLevel?: number
  levelCostGrowth?: number
  /** Effect per level. */
  perLevel?: Effect[]
  /** Special behaviour handled by systems. */
  special?: 'apiary' | 'kite_yard' | 'hearth' | 'windmill' | 'frost_cellar' | 'grove' | 'lightning_rod' | 'caravan_post' | 'owl_nest'
  desc: string
}

/** A Rune: tiered permanent multiplier priced in one crafted good. cost(tier k) = baseCost * costGrowth^k. */
export interface BoostDef {
  id: string
  name: string
  glyph: string
  good: string
  baseCost: number
  costGrowth: number
  maxTier: number
  effect: Effect
  unlock: Unlock
  desc: string
}

export type Condition =
  | { kind: 'strikes'; min: number }
  | { kind: 'crits'; min: number }
  | { kind: 'resonances'; min: number }
  | { kind: 'grows'; min: number }
  | { kind: 'height'; min: number }
  | { kind: 'bough'; id: string }
  | { kind: 'boughs'; min: number }
  | { kind: 'producer'; id: string; min: number }
  | { kind: 'workshop'; id: string }
  | { kind: 'annex'; id: string }
  | { kind: 'limbs'; min: number }
  | { kind: 'handcrafts'; station: string; min: number }
  | { kind: 'crafted'; id: string; min: number }
  | { kind: 'craftsTier'; tier: number; min: number }
  | { kind: 'lanterns'; min: number; lifetime?: boolean }
  | { kind: 'rune'; id: string; min: number }
  | { kind: 'runes'; min: number }
  | { kind: 'discovered'; recipe: string }
  | { kind: 'codex'; pct: number }
  | { kind: 'seasons'; min: number }
  | { kind: 'rings'; min: number }
  | { kind: 'lifetimeRings'; min: number }
  | { kind: 'setpiece'; id: string; min: number }
  | { kind: 'setpieces'; min: number }
  | { kind: 'fireflies'; min: number }
  | { kind: 'streak'; min: number }
  | { kind: 'masterworks'; min: number }
  | { kind: 'kites'; min: number }
  | { kind: 'cosmetics'; min: number }
  | { kind: 'thaws'; min: number }
  | { kind: 'gusts'; min: number }
  | { kind: 'discharges'; min: number }
  | { kind: 'trades'; min: number }
  | { kind: 'blooms'; min: number }

export type ChestTier = 'bark' | 'amber' | 'star' | 'season'

export interface Reward {
  resources?: Cost
  /** Base-currency reward as seconds of current idle income. */
  incomeSeconds?: number
  fireflies?: number
  glimmer?: number
  cosmetic?: string
  token?: { value: number; seconds: number }
  chest?: ChestTier
  /** Permanent scene object id. */
  landmark?: string
}

export interface MilestoneDef {
  id: string
  name: string
  glyph: string
  cond: Condition
  reward: Reward
  celebration: 'small' | 'medium' | 'big'
  secret?: boolean
}

export interface WaystoneGoalDef {
  id: string
  name: string
  cond: Condition
  reward: Reward
  /** Dropped from generated Season lanes. */
  tutorial?: boolean
  optional?: boolean
  /** Which tab the goal lives on (tap-through). */
  tab?: 'grow' | 'folk' | 'craft' | 'rings' | 'wardrobe'
  /** Item id to highlight. */
  target?: string
}

export type Limb = 'roots' | 'trunk' | 'canopy' | 'crown' | 'heartwood'

export interface PrestigeNodeDef {
  id: string
  limb: Limb
  name: string
  glyph: string
  baseCost: number
  costGrowth: number
  maxLevel: number
  effect?: Effect
  special?: 'start_sappers' | 'kept_foremen' | 'deep_carving' | 'sprout' | 'nightwatch' | 'vigor'
  specialValue?: number
  requiresSeason?: number
  requiresNode?: string
  /** For HEARTWOOD nodes: the mechanic this upgrades. */
  mechanic?: string
  desc: string
}

/** Season ladder row (prestige count keyed). */
export interface MechanicDef {
  id: string
  name: string
  glyph: string
  /** Unlocked once prestige.count >= atTurn. */
  atTurn: number
  seasonName: string
  palette: { leaf: string; bark: string; accent: string; particle: string; particleGlyph?: string }
  annex?: string
  medal?: string
  implemented: boolean
  desc: string
  /** Intro goals inserted into generated lanes after Bough 3. */
  introGoals?: WaystoneGoalDef[]
}

export type CosmeticCategory = 'lantern_color' | 'lantern_shape' | 'lantern_glow' | 'tree' | 'hat' | 'chief' | 'roof' | 'sky' | 'tap' | 'meter' | 'crown' | 'companion' | 'frame' | 'title'

export interface CosmeticDef {
  id: string
  category: CosmeticCategory
  name: string
  glyph: string
  desc: string
  /** Glimmer price (premium). */
  price?: number
  /** Firefly price (earned currency). */
  fireflyPrice?: number
  /** How it is earned (milestone/goal id, or free text). */
  earnedBy?: string
  supporter?: boolean
  /** Owned from the start. */
  starter?: boolean
  /** Rendering parameters consumed by the scene. */
  params: Record<string, string | number | boolean>
}

export interface BundleDef { id: string; name: string; glyph: string; items: string[]; price: number; desc: string }

export interface SetPieceDef {
  id: string
  name: string
  glyph: string
  unlock: Unlock
  /** Spawn cadence range in seconds. */
  every: [number, number]
  /** Seconds on screen. */
  seconds: number
  taps: number
  /** Pay `payPerTap` on every tap instead of once at completion. */
  payPerTap?: boolean
  reward: Reward
  /** Special handling. */
  special?: 'acorn' | 'star' | 'woodpecker' | 'gust' | 'lightning'
  desc: string
}

export interface CaravanOfferDef { id: string; name: string; give: Cost; get: Reward; weight: number }

export interface WishDef { id: string; name: string; cond: Condition; fireflies: number }

export interface LandmarkDef { id: string; name: string; glyph: string; desc: string }

export interface Content {
  resources: ResourceDef[]
  bands: BandDef[]
  producers: ProducerDef[]
  workshops: WorkshopDef[]
  recipes: RecipeDef[]
  annexes: AnnexDef[]
  runes: BoostDef[]
  milestones: MilestoneDef[]
  waystoneSeason1: WaystoneGoalDef[]
  legacyLane: { id: string; name: string; cond: Condition }[]
  prestigeNodes: PrestigeNodeDef[]
  mechanics: MechanicDef[]
  cosmetics: CosmeticDef[]
  bundles: BundleDef[]
  setPieces: SetPieceDef[]
  caravanOffers: CaravanOfferDef[]
  wishes: WishDef[]
  landmarks: LandmarkDef[]
}
