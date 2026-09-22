/** Shared per-frame context handed to every draw module. */
import type { ResolvedCosmetics } from './cosmetics'

export interface Palette { leaf: string; bark: string; accent: string; particle: string; particleGlyph?: string; name: string }

/** Glow points collected during the world pass and drawn additively after the night overlay. */
export class GlowList {
  x: number[] = []; y: number[] = []; r: number[] = []; c: string[] = []; a: number[] = []
  n = 0
  reset() { this.n = 0 }
  add(x: number, y: number, r: number, c: string, a = 1) {
    const i = this.n++
    this.x[i] = x; this.y[i] = y; this.r[i] = r; this.c[i] = c; this.a[i] = a
  }
}

export interface Frame {
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  cx: number
  /** Animation clock in seconds (monotonic, scene-local). */
  t: number
  dt: number
  /** Game clock (game.now, seconds of play). */
  now: number
  /** 0 = day, 1 = night. */
  night: number
  cos: ResolvedCosmetics
  pal: Palette
  reducedMotion: boolean
  low: boolean
  camY: number
  glows: GlowList
  /** Thrum 0..1 (for pulse lantern glow). */
  thrum: number
}

export const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
