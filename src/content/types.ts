/**
 * Content schema. Every piece of game content is data conforming to these types so that
 * balance, names, and breadth can change without touching systems code.
 */

/** A currency or material. `worth` is its value in the base currency, used for pacing and pricing. */
export interface ResourceDef {
  id: string
  name: string
  glyph: string
  tier: number
  worth: number
  color: string
  desc: string
  /** Base currency (the number that reaches 1e24+). Exactly one resource has this. */
  base?: boolean
  /** Prestige / premium currencies are never reset and never sold for progress. */
  persistent?: boolean
}

/** A height band ("Reach"): the islands replacement. Crossing into one is a set-piece. */
export interface BandDef {
  id: string
  name: string
  minHeight: number
  glyph: string
  /** Sky gradient top/bottom colors. */
  sky: [string, string]
  /** Ground / vine accent color for segments grown in this band. */
  leaf: string
  /** Ambient critter glyphs that drift through the scene. */
  ambient: string[]
  /** Resources a tap can shake loose while the tip is in this band, weighted. */
  drops: { id: string; weight: number }[]
  desc: string
}

/** Gating condition for content. */
export type Unlock =
  | { kind: 'always' }
  | { kind: 'height'; min: number }
  | { kind: 'building'; id: string; level?: number }
  | { kind: 'producer'; id: string; count: number }
  | { kind: 'prestige'; count: number }
  | { kind: 'mechanic'; id: string }
  | { kind: 'resource'; id: string; lifetime: number }
  | { kind: 'all'; of: Unlock[] }

export type Cost = Record<string, number>

/** Numeric effect applied by boosts, buildings, prestige nodes, and milestone tokens. */
export interface Effect {
  /** What the effect changes. */
  target:
    | 'tap' | 'tap_burst_chance' | 'combo_window' | 'cheer_stamina'
    | 'all_production' | 'base_production' | `producer:${string}` | `resource:${string}`
    | 'craft_speed' | 'grow_cost' | 'grow_meters' | 'offline_rate' | 'offline_cap'
    | 'producer_cost' | 'building_cost' | 'prestige_gain' | 'drop_chance'
  /** 'mult' multiplies (stacks multiplicatively), 'add' adds (stacks additively, applied before mult). */
  op: 'mult' | 'add'
  value: number
}

/** A worker / producer: gathers a resource idly, taps for you, or auto-runs a recipe. */
export interface ProducerDef {
  id: string
  name: string
  glyph: string
  kind: 'gatherer' | 'crafter'
  /** For gatherers: what it produces per second at count 1. */
  produces?: { id: string; rate: number }
  /** For crafters: the station whose queue it automates. */
  station?: string
  baseCost: Cost
  costGrowth: number
  unlock: Unlock
  bandId: string
  /** Count breakpoints that multiply output (e.g. 10/25/50/100 -> x2 each). */
  breakpoints: number[]
  desc: string
}

/** A building on the vine at a fixed height. Levels multiply attached crafters / unlock recipes. */
export interface BuildingDef {
  id: string
  name: string
  glyph: string
  height: number
  baseCost: Cost
  costGrowth: number
  maxLevel: number
  /** Effects applied per level. */
  perLevel: Effect[]
  /** Recipes this building runs (it is a crafting station) if any. */
  recipes: string[]
  desc: string
}

export interface RecipeDef {
  id: string
  name: string
  station: string
  inputs: Cost
  output: { id: string; count: number }
  seconds: number
  unlock: Unlock
}

/** A permanent (per-run) multiplier bought with crafted goods, in escalating tiers. */
export interface BoostDef {
  id: string
  name: string
  glyph: string
  /** Cost of tier n = baseCost * costGrowth^n (per resource). */
  baseCost: Cost
  costGrowth: number
  maxTier: number
  /** Effect per tier. */
  effect: Effect
  unlock: Unlock
  desc: string
}

export type Condition =
  | { kind: 'height'; min: number }
  | { kind: 'taps'; min: number }
  | { kind: 'grows'; min: number }
  | { kind: 'producers'; min: number }
  | { kind: 'producer'; id: string; min: number }
  | { kind: 'crafts'; min: number }
  | { kind: 'craft'; id: string; min: number }
  | { kind: 'boosts'; min: number }
  | { kind: 'building'; id: string; level: number }
  | { kind: 'prestiges'; min: number }
  | { kind: 'lifetime'; id: string; min: number }
  | { kind: 'bursts'; min: number }
  | { kind: 'combo'; min: number }
  | { kind: 'setpieces'; min: number }
  | { kind: 'cosmetics'; min: number }

export interface Reward {
  resources?: Cost
  /** Base-currency reward expressed as seconds of current idle income (scales with progress); floored at `incomeFloor`. */
  incomeSeconds?: number
  incomeFloor?: number
  petals?: number
  cosmetic?: string
  /** Temporary multiplier token: all production x value for `seconds`. */
  token?: { value: number; seconds: number }
  chest?: 'wood' | 'silver' | 'gold' | 'giant'
}

export interface MilestoneDef {
  id: string
  name: string
  glyph: string
  cond: Condition
  reward: Reward
  celebration: 'small' | 'medium' | 'big'
  /** Hidden until achieved (surprise). */
  secret?: boolean
}

export interface PrestigeNodeDef {
  id: string
  limb: string
  name: string
  glyph: string
  /** Cost of level n = baseCost * costGrowth^n in prestige currency. */
  baseCost: number
  costGrowth: number
  maxLevel: number
  effect?: Effect
  /** Special non-numeric effects handled by systems. */
  special?: 'start_producers' | 'keep_boosts_pct' | 'unlock_mechanic' | 'producer_cap'
  specialValue?: number | string
  /** Node is only visible/buyable after this many prestiges. */
  requiresPrestiges?: number
  desc: string
}

/** Mechanic unlocked by prestige count (the ladder shown on the prestige screen). */
export interface MechanicDef {
  id: string
  name: string
  glyph: string
  atPrestige: number
  desc: string
  /** Implemented in this build, or shown as "coming soon". */
  implemented: boolean
}

export type CosmeticCategory = 'hat' | 'vine' | 'building' | 'sky' | 'tap' | 'companion' | 'title' | 'tip'

export interface CosmeticDef {
  id: string
  category: CosmeticCategory
  name: string
  glyph: string
  desc: string
  /** Premium price, or undefined when only earnable. */
  price?: number
  /** Milestone id that awards it, when earnable. */
  earnedBy?: string
  /** Included in the supporter pack. */
  supporter?: boolean
  /** Rendering parameters consumed by the scene (colors, particle style, etc). */
  params: Record<string, string | number | boolean>
}

export interface BundleDef { id: string; name: string; glyph: string; items: string[]; price: number; desc: string }

export interface SetPieceDef {
  id: string
  name: string
  glyph: string
  bandId: string
  /** Seconds between spawns (randomized ±40%). */
  every: number
  /** Taps needed to complete and time allowed. */
  taps: number
  seconds: number
  reward: Reward
  desc: string
}

/** The whole content pack. */
export interface Content {
  resources: ResourceDef[]
  bands: BandDef[]
  producers: ProducerDef[]
  buildings: BuildingDef[]
  recipes: RecipeDef[]
  boosts: BoostDef[]
  milestones: MilestoneDef[]
  prestigeNodes: PrestigeNodeDef[]
  mechanics: MechanicDef[]
  cosmetics: CosmeticDef[]
  bundles: BundleDef[]
  setPieces: SetPieceDef[]
}
