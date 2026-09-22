/** Folk sprites (circle body, two dot eyes, hat slot, swinging lantern) and their walk/carry loops. World-space. */
import { rgba, shade } from './colors'
import { drawLantern } from './huts'
import { EMOJI_FONT, type Frame } from './types'
import type { HatKind } from './cosmetics'

export interface FolkLook { hat: HatKind; hatColor: string; body?: string }

export function drawHat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hat: HatKind, color: string) {
  if (hat === 'none') return
  ctx.fillStyle = color
  ctx.beginPath()
  switch (hat) {
    case 'acorn': ctx.arc(x, y - r * 0.6, r * 1.05, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = shade(color, 0.6); ctx.fillRect(x - 1.5, y - r * 1.9, 3, 5); return
    case 'mushroom': ctx.ellipse(x, y - r * 0.7, r * 1.3, r * 0.75, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.5, y - r * 1.05, 1.3, 0, 6.283); ctx.arc(x + r * 0.4, y - r * 1.2, 1.1, 0, 6.283); ctx.fill(); return
    case 'straw': ctx.ellipse(x, y - r * 0.6, r * 1.6, r * 0.4, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(x, y - r * 0.7, r * 0.8, Math.PI, 0); ctx.closePath(); ctx.fill(); return
    case 'bee': ctx.arc(x, y - r * 0.55, r * 0.95, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - r * 0.9, y - r * 0.9); ctx.lineTo(x + r * 0.9, y - r * 0.9); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 3, y - r * 1.45); ctx.lineTo(x - 5, y - r * 2.1); ctx.moveTo(x + 3, y - r * 1.45); ctx.lineTo(x + 5, y - r * 2.1); ctx.stroke(); return
    case 'snail': ctx.arc(x + r * 0.2, y - r * 0.9, r * 0.9, 0, 6.283); ctx.fill(); ctx.strokeStyle = shade(color, 0.6); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 0.9, r * 0.5, 0, 5); ctx.stroke(); return
    case 'crown': ctx.moveTo(x - r * 0.8, y - r * 0.6); ctx.lineTo(x - r * 0.8, y - r * 1.5); ctx.lineTo(x - r * 0.3, y - r * 1.05); ctx.lineTo(x, y - r * 1.6); ctx.lineTo(x + r * 0.3, y - r * 1.05); ctx.lineTo(x + r * 0.8, y - r * 1.5); ctx.lineTo(x + r * 0.8, y - r * 0.6); ctx.closePath(); ctx.fill(); return
    case 'wizard': ctx.moveTo(x - r * 1.2, y - r * 0.6); ctx.lineTo(x + r * 1.2, y - r * 0.6); ctx.lineTo(x + r * 0.15, y - r * 2.4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(x + r * 0.2, y - r * 1.4, 1.2, 0, 6.283); ctx.fill(); return
    case 'lanternhelm': ctx.arc(x, y - r * 0.4, r * 1.05, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.arc(x, y - r * 1.65, r * 0.35, 0, 6.283); ctx.fill(); return
  }
}

/** One Folk. `carry` is an emoji glyph shown above the head. `cheer` (0..1) bounces; `sprint` adds sweat drops. */
export function drawFolk(f: Frame, x: number, y: number, r: number, look: FolkLook, opts: { carry?: string | null; cheer?: number; sprint?: boolean; chief?: boolean; cloak?: string; trim?: string; phase?: number; flip?: boolean; lantern?: boolean } = {}) {
  const ctx = f.ctx
  const ph = opts.phase ?? f.t * 6
  const bob = opts.cheer ? Math.abs(Math.sin(f.t * 12)) * 6 * opts.cheer : Math.abs(Math.sin(ph)) * 1.5
  const by = y - r - bob
  const dir = opts.flip ? -1 : 1
  // shadow
  ctx.fillStyle = rgba('#000', 0.25); ctx.beginPath(); ctx.ellipse(x, y + 1, r * 0.9, r * 0.35, 0, 0, 6.283); ctx.fill()
  // cloak (Chief)
  if (opts.chief) {
    ctx.fillStyle = opts.cloak ?? '#7a2e2e'
    ctx.beginPath(); ctx.moveTo(x - r * 0.9, by - r * 0.2); ctx.lineTo(x + r * 0.9, by - r * 0.2); ctx.lineTo(x + r * 1.2, y + 1); ctx.lineTo(x - r * 1.2, y + 1); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = opts.trim ?? '#e6c56b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - r * 0.9, by - r * 0.2); ctx.lineTo(x + r * 0.9, by - r * 0.2); ctx.stroke()
  }
  // body
  const body = look.body ?? '#f0dcc0'
  ctx.fillStyle = f.night > 0.5 ? shade(body, 0.8) : body
  ctx.beginPath(); ctx.arc(x, by, r, 0, 6.283); ctx.fill()
  ctx.strokeStyle = rgba('#3b2a1a', 0.55); ctx.lineWidth = 1; ctx.stroke()
  // eyes
  ctx.fillStyle = '#2a1a0a'
  ctx.beginPath(); ctx.arc(x + dir * r * 0.15 - r * 0.28, by - r * 0.1, 1.2, 0, 6.283); ctx.arc(x + dir * r * 0.15 + r * 0.28, by - r * 0.1, 1.2, 0, 6.283); ctx.fill()
  // hat
  drawHat(ctx, x, by, r, look.hat, look.hatColor)
  // lantern on a stick, swinging
  if (opts.lantern !== false) {
    const sw = Math.sin(ph * 0.8) * 0.35
    const lx = x + dir * (r + 5) + Math.sin(sw) * 6, ly = by + 2 + Math.cos(sw) * 5
    ctx.strokeStyle = '#4a3218'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + dir * r * 0.8, by); ctx.lineTo(lx, ly - 3); ctx.stroke()
    drawLantern(f, lx, ly, 2.6, f.cos.lanternColor, f.cos.lanternShape, f.cos.lanternGlow, Math.round(x + y))
  }
  // carried glyph
  if (opts.carry) { ctx.font = `11px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(opts.carry, x, by - r - 7) }
  // sweat drops during Resonance
  if (opts.sprint) { ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(x - dir * (r + 3), by - r * 0.6 - ((f.t * 3) % 1) * 6, 1.5, 0, 6.283); ctx.fill() }
}

/** A Folk walking a bezier loop between two points, carrying a glyph on the way out. */
export class Walker {
  phase: number
  speed: number
  constructor(public x0: number, public y0: number, public x1: number, public y1: number, public carry: string | null, seed: number, public viaTrunk = false) {
    this.phase = seed % 2
    this.speed = 0.22 + (seed * 0.137) % 0.12
  }
  retarget(x0: number, y0: number, x1: number, y1: number, carry: string | null, viaTrunk: boolean) { this.x0 = x0; this.y0 = y0; this.x1 = x1; this.y1 = y1; this.carry = carry; this.viaTrunk = viaTrunk }
  update(dt: number, sprint: number) { this.phase = (this.phase + dt * this.speed * sprint) % 2 }
  /** Position and facing for the current phase. `out` avoids allocation. */
  pos(out: { x: number; y: number; carrying: boolean; flip: boolean }) {
    const p = this.phase
    const fwd = p < 1
    let t = fwd ? p : 2 - p
    // ease in/out at the ends so Folk pause at doors
    t = t < 0.1 ? 0 : t > 0.9 ? 1 : (t - 0.1) / 0.8
    const u = 1 - t
    let cx: number, cy: number
    if (this.viaTrunk) { cx = this.x1; cy = this.y0 } else { cx = (this.x0 + this.x1) / 2; cy = Math.max(this.y0, this.y1) + 18 }
    out.x = u * u * this.x0 + 2 * u * t * cx + t * t * this.x1
    out.y = u * u * this.y0 + 2 * u * t * cy + t * t * this.y1
    out.carrying = fwd && t > 0 && t < 1
    out.flip = fwd ? this.x1 < this.x0 : this.x1 > this.x0
  }
}
