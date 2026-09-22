/** Sky gradient, ambient sky particle layers and the night overlay. Screen-space. */
import { mix, rgba } from './colors'
import type { Frame } from './types'
import type { SkyParticle } from './cosmetics'

const NIGHT_TOP = '#070b1c', NIGHT_BOTTOM = '#161c3a'

let gradKey = ''
let grad: CanvasGradient | null = null

/** Blend the bough sky with an equipped sky cosmetic and the night, then fill the canvas. Gradient is cached by colour key. */
export function drawSky(f: Frame, top: string, bottom: string) {
  const { ctx, W, H } = f
  let t = top, b = bottom
  if (f.cos.sky) { t = mix(t, f.cos.sky.top, f.cos.sky.blend); b = mix(b, f.cos.sky.bottom, f.cos.sky.blend) }
  if (f.night > 0) { t = mix(t, NIGHT_TOP, f.night * 0.85); b = mix(b, NIGHT_BOTTOM, f.night * 0.75) }
  const key = `${t}|${b}|${H}`
  if (key !== gradKey || !grad) { grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, t); grad.addColorStop(1, b); gradKey = key }
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
}

/** Darken the world at night; lantern glows are drawn on top afterwards. */
export function drawNightOverlay(f: Frame) {
  if (f.night <= 0.01) return
  const { ctx, W, H } = f
  ctx.fillStyle = rgba('#0a1030', 0.42 * f.night)
  ctx.fillRect(0, 0, W, H)
}

/** Additive glow pass (lanterns, runes, windows, fireflies). */
export function drawGlows(f: Frame) {
  const g = f.glows
  if (g.n === 0) return
  const ctx = f.ctx
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < g.n; i++) {
    const r = g.r[i]!, x = g.x[i]!, y = g.y[i]!
    const a = g.a[i]! * (0.35 + 0.65 * f.night)
    if (a <= 0.02) continue
    if (f.low) { ctx.fillStyle = rgba(g.c[i]!, a * 0.35); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); continue }
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, rgba(g.c[i]!, a * 0.55)); rg.addColorStop(0.5, rgba(g.c[i]!, a * 0.18)); rg.addColorStop(1, rgba(g.c[i]!, 0))
    ctx.fillStyle = rg
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.restore()
}

interface Mote { x: number; y: number; vx: number; vy: number; s: number; p: number }

/** Drifting screen-space motes for a sky cosmetic layer or the season's falling particle. */
export class SkyLayer {
  private motes: Mote[] = []
  kind: SkyParticle | 'season' = 'none'
  color = '#ffffff'
  glyph: string | undefined
  private W = 0; private H = 0

  configure(kind: SkyParticle | 'season', color: string, glyph: string | undefined, W: number, H: number, low: boolean) {
    const count = kind === 'none' ? 0 : kind === 'stars' ? (low ? 30 : 60) : kind === 'aurora' ? 3 : kind === 'mist' ? 5 : low ? 14 : 28
    if (kind !== this.kind || W !== this.W || H !== this.H || this.motes.length !== count) {
      this.motes.length = 0
      for (let i = 0; i < count; i++) this.motes.push(this.seed(kind, W, H, true))
    }
    this.kind = kind; this.color = color; this.glyph = glyph; this.W = W; this.H = H
  }
  private seed(kind: string, W: number, H: number, anywhere: boolean): Mote {
    const y = anywhere ? Math.random() * H : -20
    const s = 0.5 + Math.random()
    switch (kind) {
      case 'stars': return { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, s, p: Math.random() * 6.28 }
      case 'aurora': return { x: Math.random() * W, y: H * (0.05 + Math.random() * 0.3), vx: 6, vy: 0, s: 1 + Math.random(), p: Math.random() * 6.28 }
      case 'mist': return { x: Math.random() * W, y: H * (0.3 + Math.random() * 0.6), vx: 8 + Math.random() * 6, vy: 0, s: 1 + Math.random(), p: Math.random() * 6.28 }
      case 'fireflies': return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 12, s, p: Math.random() * 6.28 }
      case 'snow': return { x: Math.random() * W, y, vx: 0, vy: 18 + Math.random() * 18, s, p: Math.random() * 6.28 }
      default: return { x: Math.random() * W, y, vx: 0, vy: 26 + Math.random() * 30, s, p: Math.random() * 6.28 }
    }
  }
  update(dt: number) {
    const { W, H } = this
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i]!
      m.p += dt
      if (this.kind === 'stars') continue
      m.x += (m.vx + Math.sin(m.p * 1.3) * 14) * dt
      m.y += m.vy * dt
      if (this.kind === 'fireflies') { if (m.x < 0 || m.x > W) m.vx = -m.vx; if (m.y < 0 || m.y > H) m.vy = -m.vy; continue }
      if (m.y > H + 20 || m.x < -40 || m.x > W + 40) {
        const n = this.seed(this.kind, W, H, false)
        m.x = n.x; m.y = n.y; m.vx = n.vx; m.vy = n.vy; m.s = n.s; m.p = n.p
      }
    }
  }
  draw(f: Frame) {
    if (this.kind === 'none' || !this.motes.length) return
    const ctx = f.ctx
    const c = this.color
    switch (this.kind) {
      case 'stars': {
        const a = 0.35 + 0.65 * f.night
        for (const m of this.motes) { ctx.fillStyle = rgba(c, a * (0.4 + 0.6 * Math.abs(Math.sin(m.p * 0.8)))); ctx.beginPath(); ctx.arc(m.x, m.y, 0.8 + m.s, 0, 6.283); ctx.fill() }
        return
      }
      case 'aurora': {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'
        for (const m of this.motes) {
          const g = ctx.createLinearGradient(0, m.y - 40 * m.s, 0, m.y + 40 * m.s)
          g.addColorStop(0, rgba(c, 0)); g.addColorStop(0.5, rgba(c, 0.16 + 0.1 * Math.sin(m.p))); g.addColorStop(1, rgba(c, 0))
          ctx.fillStyle = g
          ctx.beginPath()
          for (let x = -10; x <= f.W + 10; x += 20) { const y = m.y + Math.sin(x * 0.02 + m.p) * 18 * m.s; if (x === -10) ctx.moveTo(x, y - 40 * m.s); else ctx.lineTo(x, y - 40 * m.s) }
          for (let x = f.W + 10; x >= -10; x -= 20) ctx.lineTo(x, m.y + Math.sin(x * 0.02 + m.p) * 18 * m.s + 40 * m.s)
          ctx.closePath(); ctx.fill()
        }
        ctx.restore(); return
      }
      case 'mist': {
        for (const m of this.motes) {
          const w = f.W * 0.5 * m.s
          const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, w)
          g.addColorStop(0, rgba(c, 0.12)); g.addColorStop(1, rgba(c, 0))
          ctx.fillStyle = g; ctx.fillRect(m.x - w, m.y - w * 0.4, w * 2, w * 0.8)
          if (m.x > f.W + w) m.x = -w
        }
        return
      }
      case 'fireflies': {
        for (const m of this.motes) { const a = 0.3 + 0.7 * Math.abs(Math.sin(m.p * 2)); ctx.fillStyle = rgba(c, a); ctx.beginPath(); ctx.arc(m.x, m.y, 1.5 + m.s, 0, 6.283); ctx.fill(); f.glows.add(m.x, m.y, 10, c, a * 0.5) }
        return
      }
      case 'snow': {
        ctx.fillStyle = rgba(c, 0.85)
        for (const m of this.motes) { ctx.beginPath(); ctx.arc(m.x, m.y, 1 + m.s * 1.6, 0, 6.283); ctx.fill() }
        return
      }
      default: {
        // petals / season particle: small rotated ovals, or the season glyph
        if (this.glyph) {
          ctx.font = `${12}px ${'"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          for (const m of this.motes) { ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.sin(m.p) * 0.6); ctx.globalAlpha = 0.9; ctx.fillText(this.glyph, 0, 0); ctx.restore() }
          return
        }
        ctx.fillStyle = rgba(c, 0.85)
        for (const m of this.motes) { ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.p * 2); ctx.beginPath(); ctx.ellipse(0, 0, 2 + m.s * 2.5, 1.2 + m.s, 0, 0, 6.283); ctx.fill(); ctx.restore() }
      }
    }
  }
}
