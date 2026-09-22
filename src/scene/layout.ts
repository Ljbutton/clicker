/**
 * Pure layout math for the spire scene: world-space bough bands, the growing tip, limb geometry,
 * hut slots, camera mapping and hit tests. No canvas, no DOM — unit-tested in node.
 *
 * World space: x is canvas x, y grows downward. The ground line (top of the stump base) is y = 0.
 * 'up' boughs stack upward (negative y) in fixed 440 px bands; 'down' boughs hang below the stump.
 */
export const BAND_H = 440
export const TRUNK_W = 80
export const STUMP_H = 64
/** Gap between the ground line and the first root band. */
export const ROOT_GAP = 90
/** Fraction of the canvas height where the growing tip sits with the default camera. */
export const TIP_ANCHOR = 0.7
/** Movement below which a pointer gesture is a tap, not a drag. */
export const TAP_SLOP = 10
/** Hold duration that turns a trunk press into a Rally. */
export const HOLD_MS = 400
export const MAX_HUTS_PER_BOUGH = 12

export interface BandLike { id: string; index: number; direction: 'up' | 'down'; line: number; name: string }

export interface BoughSlot {
  id: string; index: number; name: string; line: number
  dir: 'up' | 'down'
  /** 0-based position among boughs of the same direction. */
  slot: number
  /** World y of the bough line (its base for up boughs, its ceiling for down boughs). */
  lineY: number
  /** World y extent (top < bottom numerically). */
  top: number
  bottom: number
}

/** Lay out the open boughs (by band index) into fixed world bands. */
export function layoutBoughs(bands: readonly BandLike[], open: readonly string[]): BoughSlot[] {
  const sorted = bands.filter((b) => open.includes(b.id)).sort((a, b) => a.index - b.index)
  let up = 0, down = 0
  return sorted.map((b) => {
    if (b.direction === 'down') {
      const top = ROOT_GAP + down * BAND_H
      return { id: b.id, index: b.index, name: b.name, line: b.line, dir: 'down', slot: down++, lineY: top, top, bottom: top + BAND_H }
    }
    const lineY = -up * BAND_H
    return { id: b.id, index: b.index, name: b.name, line: b.line, dir: 'up', slot: up++, lineY, top: lineY - BAND_H, bottom: lineY }
  })
}

/** Where the NEXT (not yet open) bough would sit, for the ghost silhouette. */
export function ghostSlot(slots: readonly BoughSlot[], dir: 'up' | 'down'): { lineY: number; top: number; bottom: number } {
  const same = slots.filter((s) => s.dir === dir)
  const n = same.length
  if (dir === 'down') { const top = ROOT_GAP + n * BAND_H; return { lineY: top, top, bottom: top + BAND_H } }
  const lineY = -n * BAND_H
  return { lineY, top: lineY - BAND_H, bottom: lineY }
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : Number.isFinite(v) ? v : 0)

/**
 * Progress of the growing tip inside the topmost bough: 0 at `fromLine`, 1 at `toLine`.
 * With no target line (last bough open) the tip creeps toward 1 as height doubles the bough line.
 */
export function tipFraction(height: number, fromLine: number, toLine: number | null): number {
  if (toLine == null || toLine <= fromLine) return clamp01((height - fromLine) / Math.max(1, fromLine || 100))
  return clamp01((height - fromLine) / (toLine - fromLine))
}

/** World y of the growing tip for a tip fraction (0 = at the top bough's line). */
export function tipWorldY(slots: readonly BoughSlot[], frac: number): number {
  let top: BoughSlot | undefined
  for (const s of slots) if (s.dir === 'up' && (!top || s.slot > top.slot)) top = s
  const lineY = top ? top.lineY : 0
  return lineY - clamp01(frac) * BAND_H
}

/** The topmost open 'up' bough (the one the trunk grows in). */
export function topUpSlot(slots: readonly BoughSlot[]): BoughSlot | null {
  let top: BoughSlot | null = null
  for (const s of slots) if (s.dir === 'up' && (!top || s.slot > top.slot)) top = s
  return top
}

/* ---------- camera mapping ---------- */
export function worldToScreen(worldY: number, camY: number, H: number): number { return worldY - camY + H / 2 }
export function screenToWorld(screenY: number, camY: number, H: number): number { return screenY + camY - H / 2 }
/** Camera y that pins a world y at `anchor` of the canvas height. */
export function cameraFor(worldY: number, H: number, anchor = TIP_ANCHOR): number { return worldY - (anchor - 0.5) * H }
/** Scroll bounds so the tree never leaves the viewport entirely. */
export function cameraBounds(slots: readonly BoughSlot[], tipY: number, H: number): { min: number; max: number } {
  let top = Math.min(tipY, 0), bottom = STUMP_H + ROOT_GAP + 60
  for (const s of slots) { top = Math.min(top, s.top); bottom = Math.max(bottom, s.bottom) }
  const min = top - H * 0.2 + H / 2
  const max = bottom + H * 0.15 - H / 2
  return min > max ? { min: max, max } : { min, max }
}
/** Which boughs to draw for a visible world range (visible band ±1 neighbour). */
export function visibleSlots(slots: readonly BoughSlot[], camY: number, H: number, margin = BAND_H): BoughSlot[] {
  const top = screenToWorld(0, camY, H) - margin, bottom = screenToWorld(H, camY, H) + margin
  return slots.filter((s) => s.bottom >= top && s.top <= bottom)
}

/* ---------- limbs and huts ---------- */
export interface Limb { x0: number; y0: number; cx: number; cy: number; x1: number; y1: number; side: -1 | 1; tier: number }

/** Number of side branches drawn for a bough with `items` huts (2-4). */
export function limbCount(items: number): number { return Math.max(2, Math.min(4, items)) }

/** Geometry of limb k on a bough: alternating sides, two tiers per side. */
export function limbGeom(slot: BoughSlot, k: number, cx: number, W: number): Limb {
  const side: -1 | 1 = k % 2 === 0 ? -1 : 1
  const tier = Math.floor(k / 2)
  const fy = 0.24 + tier * 0.3
  const y0 = slot.dir === 'up' ? slot.lineY - BAND_H * fy : slot.lineY + BAND_H * (fy - 0.02)
  const len = W * (tier === 0 ? 0.36 : 0.31)
  const x0 = cx + side * (TRUNK_W / 2 - 6)
  const droop = slot.dir === 'up' ? -1 : 1
  const x1 = x0 + side * len
  const y1 = y0 + droop * len * 0.22
  return { x0, y0, cx: x0 + side * len * 0.45, cy: y0 + droop * len * 0.02, x1, y1, side, tier }
}

export function pointOnLimb(l: Limb, t: number): { x: number; y: number } {
  const u = 1 - t
  return { x: u * u * l.x0 + 2 * u * t * l.cx + t * t * l.x1, y: u * u * l.y0 + 2 * u * t * l.cy + t * t * l.y1 }
}

export interface HutSlot { limb: number; t: number }
/** Deterministic hut slot for the i-th item on a bough: limb ends first, then mid-limb, then near the trunk. */
export function hutSlot(i: number): HutSlot {
  const limb = i % 4
  const ring = Math.floor(i / 4)
  return { limb, t: ring === 0 ? 1 : ring === 1 ? 0.58 : 0.3 }
}

/** Sprite count for a lodge/crew of `count` members (≤ 12). */
export function folkCount(count: number): number { return count <= 0 ? 0 : Math.min(12, Math.ceil(Math.sqrt(count))) }

/** Hut tier visuals per §12.2 milestone pattern. */
export function hutTier(count: number): { storeys: 1 | 2; lanterns: boolean; smoke: boolean; garden: boolean } {
  return { storeys: count >= 25 ? 2 : 1, lanterns: count >= 50, smoke: count >= 100, garden: count >= 200 }
}

/* ---------- hit tests ---------- */
export function hitCircle(px: number, py: number, x: number, y: number, r: number): boolean {
  const dx = px - x, dy = py - y
  return dx * dx + dy * dy <= r * r
}
export function hitRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h
}
/** The trunk band is a full-height column, `TRUNK_W` wide, plus a little forgiveness. */
export function inTrunkBand(px: number, cx: number, slack = 8): boolean { return Math.abs(px - cx) <= TRUNK_W / 2 + slack }

/** Stable trunk edge wobble as a function of world y (bezier-ish column). */
export function trunkEdge(worldY: number, side: -1 | 1, cx: number, halfW = TRUNK_W / 2): number {
  const w = Math.sin(worldY * 0.013 + (side > 0 ? 1.7 : 0)) * 5 + Math.sin(worldY * 0.031 + (side > 0 ? 0.4 : 2.1)) * 3
  return cx + side * halfW + w
}
/** Trunk half-width taper near the tip: full width below, narrowing over the last 140 px. */
export function trunkHalfWidth(worldY: number, tipY: number, halfW = TRUNK_W / 2): number {
  const d = worldY - tipY
  if (d >= 140) return halfW
  if (d <= 0) return 3
  return 3 + (halfW - 3) * Math.pow(d / 140, 0.6)
}

/** Fixed chest slots around the stump (world coords relative to cx). */
export const CHEST_SLOTS: readonly { dx: number; y: number }[] = [
  { dx: 66, y: -2 }, { dx: -66, y: -2 }, { dx: 108, y: 4 }, { dx: -108, y: 4 }, { dx: 0, y: -STUMP_H - 6 },
]
