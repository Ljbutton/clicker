/**
 * Resolves the equipped (or previewed) cosmetics into one typed parameter set the renderer reads
 * every frame. Keys follow the content ↔ scene contract in the design doc (§14.1). Pure.
 */
import type { CosmeticCategory, CosmeticDef } from '@/content/types'

export type LanternShape = 'round' | 'paper' | 'gourd' | 'bell' | 'crystal' | 'jelly'
export type LanternGlow = 'steady' | 'flicker' | 'pulse' | 'swarm' | 'golden'
export type LeafShape = 'round' | 'birch' | 'needle' | 'blossom' | 'willow' | 'crystal' | 'elder'
export type HatKind = 'none' | 'acorn' | 'mushroom' | 'straw' | 'bee' | 'snail' | 'crown' | 'wizard' | 'lanternhelm'
export type RoofKind = 'thatch' | 'slate' | 'mushroom' | 'moss' | 'hive' | 'pagoda' | 'shell' | 'glass'
export type SkyParticle = 'none' | 'stars' | 'petals' | 'snow' | 'aurora' | 'mist' | 'fireflies'
export type TapParticle = 'sparks' | 'petals' | 'notes' | 'gold' | 'runes' | 'ink' | 'stars'
export type MeterStyle = 'wood' | 'vine' | 'clock'
export type CrownOrnament = 'none' | 'vane' | 'chime' | 'lantern' | 'crystal' | 'kite' | 'elder'
export type Pet = 'owl' | 'snail' | 'swarm' | 'bee' | 'cat' | 'fox' | 'dragon' | 'deer'
export type FrameStyle = 'bark' | 'rings' | 'star' | 'gilded' | 'aurora'

export interface ResolvedCosmetics {
  lanternColor: string
  lanternShape: LanternShape
  lanternGlow: LanternGlow
  tree: { id: string; bark: string; leaf: string; leafShape: LeafShape; glow: boolean; petals: boolean; animated: boolean }
  hat: { hat: HatKind; color: string }
  chief: { cloak: string; trim: string }
  roof: { roof: RoofKind; color: string }
  sky: { top: string; bottom: string; particle: SkyParticle; blend: number } | null
  tap: { particle: TapParticle; color: string }
  meter: MeterStyle
  crown: { ornament: CrownOrnament; color: string }
  companion: { pet: Pet; color: string } | null
  frame: { style: FrameStyle; color: string }
  title: string | null
}

export const DEFAULT_COSMETICS: ResolvedCosmetics = {
  lanternColor: '#ffb547',
  lanternShape: 'round',
  lanternGlow: 'steady',
  tree: { id: 'tr_oak', bark: '#5a3b22', leaf: '#4caf50', leafShape: 'round', glow: false, petals: false, animated: false },
  hat: { hat: 'none', color: '#b5651d' },
  chief: { cloak: '#7a2e2e', trim: '#e6c56b' },
  roof: { roof: 'thatch', color: '#b8893a' },
  sky: null,
  tap: { particle: 'sparks', color: '#ffd166' },
  meter: 'wood',
  crown: { ornament: 'none', color: '#e6c56b' },
  companion: null,
  frame: { style: 'bark', color: '#8a5a2b' },
  title: null,
}

type Params = Record<string, string | number | boolean>
const HEX = /^#[0-9a-fA-F]{3,8}$/

function str<T extends string>(p: Params, key: string, allowed: readonly T[], fallback: T): T {
  const v = p[key]
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}
function color(p: Params, key: string, fallback: string): string {
  const v = p[key]
  return typeof v === 'string' && (HEX.test(v) || v.startsWith('rgb')) ? v : fallback
}
function bool(p: Params, key: string): boolean { return p[key] === true }

const LSHAPES: LanternShape[] = ['round', 'paper', 'gourd', 'bell', 'crystal', 'jelly']
const LGLOWS: LanternGlow[] = ['steady', 'flicker', 'pulse', 'swarm', 'golden']
const LEAVES: LeafShape[] = ['round', 'birch', 'needle', 'blossom', 'willow', 'crystal', 'elder']
const HATS: HatKind[] = ['none', 'acorn', 'mushroom', 'straw', 'bee', 'snail', 'crown', 'wizard', 'lanternhelm']
const ROOFS: RoofKind[] = ['thatch', 'slate', 'mushroom', 'moss', 'hive', 'pagoda', 'shell', 'glass']
const SKYP: SkyParticle[] = ['none', 'stars', 'petals', 'snow', 'aurora', 'mist', 'fireflies']
const TAPP: TapParticle[] = ['sparks', 'petals', 'notes', 'gold', 'runes', 'ink', 'stars']
const METERS: MeterStyle[] = ['wood', 'vine', 'clock']
const CROWNS: CrownOrnament[] = ['none', 'vane', 'chime', 'lantern', 'crystal', 'kite', 'elder']
const PETS: Pet[] = ['owl', 'snail', 'swarm', 'bee', 'cat', 'fox', 'dragon', 'deer']
const FRAMES: FrameStyle[] = ['bark', 'rings', 'star', 'gilded', 'aurora']

/** Apply one cosmetic's params onto a resolved set (mutates and returns `out`). */
export function applyCosmetic(out: ResolvedCosmetics, c: CosmeticDef): ResolvedCosmetics {
  const p = c.params ?? {}
  switch (c.category) {
    case 'lantern_color': out.lanternColor = color(p, 'color', out.lanternColor); break
    case 'lantern_shape': out.lanternShape = str(p, 'shape', LSHAPES, out.lanternShape); break
    case 'lantern_glow': out.lanternGlow = str(p, 'glow', LGLOWS, out.lanternGlow); break
    case 'tree':
      out.tree = { id: c.id, bark: color(p, 'bark', DEFAULT_COSMETICS.tree.bark), leaf: color(p, 'leaf', DEFAULT_COSMETICS.tree.leaf), leafShape: str(p, 'leafShape', LEAVES, 'round'), glow: bool(p, 'glow'), petals: bool(p, 'petals'), animated: bool(p, 'animated') }
      break
    case 'hat': out.hat = { hat: str(p, 'hat', HATS, 'none'), color: color(p, 'color', DEFAULT_COSMETICS.hat.color) }; break
    case 'chief': out.chief = { cloak: color(p, 'cloak', DEFAULT_COSMETICS.chief.cloak), trim: color(p, 'trim', DEFAULT_COSMETICS.chief.trim) }; break
    case 'roof': out.roof = { roof: str(p, 'roof', ROOFS, 'thatch'), color: color(p, 'color', DEFAULT_COSMETICS.roof.color) }; break
    case 'sky': {
      const blend = typeof p['blend'] === 'number' ? Math.max(0, Math.min(1, p['blend'])) : 0.6
      out.sky = { top: color(p, 'top', '#1a2340'), bottom: color(p, 'bottom', '#3b4a6b'), particle: str(p, 'particle', SKYP, 'none'), blend }
      break
    }
    case 'tap': out.tap = { particle: str(p, 'particle', TAPP, 'sparks'), color: color(p, 'color', DEFAULT_COSMETICS.tap.color) }; break
    case 'meter': out.meter = str(p, 'style', METERS, 'wood'); break
    case 'crown': out.crown = { ornament: str(p, 'ornament', CROWNS, 'none'), color: color(p, 'color', DEFAULT_COSMETICS.crown.color) }; break
    case 'companion': out.companion = { pet: str(p, 'pet', PETS, 'owl'), color: color(p, 'color', '#c9a36b') }; break
    case 'frame': out.frame = { style: str(p, 'style', FRAMES, 'bark'), color: color(p, 'color', DEFAULT_COSMETICS.frame.color) }; break
    case 'title': { const t = p['text']; out.title = typeof t === 'string' && t.trim() ? t.trim() : c.name; break }
  }
  return out
}

/** Resolve the equipped set, with an optional try-on cosmetic overriding its own category. */
export function resolveCosmetics(
  lookup: (id: string) => CosmeticDef | undefined,
  equipped: Partial<Record<CosmeticCategory, string>>,
  previewId: string | null = null,
): ResolvedCosmetics {
  const out: ResolvedCosmetics = { ...DEFAULT_COSMETICS, tree: { ...DEFAULT_COSMETICS.tree }, hat: { ...DEFAULT_COSMETICS.hat }, chief: { ...DEFAULT_COSMETICS.chief }, roof: { ...DEFAULT_COSMETICS.roof }, tap: { ...DEFAULT_COSMETICS.tap }, crown: { ...DEFAULT_COSMETICS.crown }, frame: { ...DEFAULT_COSMETICS.frame } }
  const preview = previewId ? lookup(previewId) : undefined
  for (const id of Object.values(equipped)) {
    if (!id) continue
    const c = lookup(id)
    if (c && (!preview || preview.category !== c.category)) applyCosmetic(out, c)
  }
  if (preview) applyCosmetic(out, preview)
  return out
}

/** A stable string that changes only when the resolved set changes (for caching derived assets). */
export function cosmeticsKey(equipped: Partial<Record<CosmeticCategory, string>>, previewId: string | null): string {
  return Object.entries(equipped).map(([k, v]) => `${k}=${v}`).sort().join('|') + '#' + (previewId ?? '')
}
