/** Interactive actors: set-pieces, amber droplet, chests, fireflies, frozen bundle, Bloom front, companion, Thrum/Rally meters. */
import { rgba, shade, hash01 } from './colors'
import { roundRect, drawLeaf } from './tree'
import { FONT, EMOJI_FONT, type Frame } from './types'
import type { LeafShape, Pet, MeterStyle } from './cosmetics'

/* ---------- timer ring ---------- */
export function drawTimerRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frac: number, color: string) {
  ctx.strokeStyle = rgba('#000', 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke()
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.max(0, Math.min(1, frac))); ctx.stroke()
}

/* ---------- set-pieces (screen-space) ---------- */
export interface SetPieceView { id: string; special?: string; x: number; y: number; frac: number; progress: number; taps: number; tapsDone: number; hitR: number; glyph: string; wobble: number }

export function drawSetPiece(f: Frame, v: SetPieceView) {
  const ctx = f.ctx
  const { x, y } = v
  ctx.save()
  switch (v.special ?? v.id) {
    case 'beehive': {
      const sw = Math.sin(f.t * 3) * (0.25 + v.wobble * 0.5)
      ctx.translate(x, y - 60); ctx.rotate(sw); ctx.translate(-x, -y + 60)
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 60); ctx.lineTo(x, y - 24); ctx.stroke()
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#d9a441' : '#e8b85a'; ctx.beginPath(); ctx.ellipse(x, y - 16 + i * 9, 20 - Math.abs(i - 1.5) * 3, 6, 0, 0, 6.283); ctx.fill() }
      ctx.fillStyle = '#2a1a08'; ctx.beginPath(); ctx.arc(x, y + 6, 3, 0, 6.283); ctx.fill()
      ctx.fillStyle = '#ffd24d'
      for (let i = 0; i < 4; i++) { const a = f.t * 4 + i * 1.6; ctx.beginPath(); ctx.arc(x + Math.cos(a) * (26 + i * 3), y - 4 + Math.sin(a * 1.7) * 14, 2, 0, 6.283); ctx.fill() }
      break
    }
    case 'woodpecker': {
      const peck = Math.max(0, Math.sin(f.t * 10)) * 6
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(x + 8, y, 9, 13, -0.3, 0, 6.283); ctx.fill()
      ctx.fillStyle = '#d9333f'; ctx.beginPath(); ctx.arc(x + 2 - peck, y - 12, 6, 0, 6.283); ctx.fill()
      ctx.fillStyle = '#e8d8a0'; ctx.beginPath(); ctx.moveTo(x - 3 - peck, y - 12); ctx.lineTo(x - 14 - peck, y - 10); ctx.lineTo(x - 3 - peck, y - 8); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 1 - peck, y - 13, 1.5, 0, 6.283); ctx.fill()
      break
    }
    case 'acorn': {
      const b = Math.abs(Math.sin(f.t * 4)) * 26
      const ay = y - b
      ctx.fillStyle = rgba('#000', 0.25); ctx.beginPath(); ctx.ellipse(x, y + 14, 12 - b * 0.15, 4, 0, 0, 6.283); ctx.fill()
      ctx.fillStyle = '#c98a3a'; ctx.beginPath(); ctx.ellipse(x, ay + 2, 11, 14, 0, 0, 6.283); ctx.fill()
      ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.ellipse(x, ay - 8, 13, 6, 0, 0, 6.283); ctx.fill(); ctx.fillRect(x - 1.5, ay - 18, 3, 6)
      ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(x - 4, ay - 1, 2, 0, 6.283); ctx.fill()
      f.glows.add(x, ay, 30, '#ffd166', 0.6)
      break
    }
    case 'star': {
      ctx.strokeStyle = rgba('#fff', 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 60, y + 20); ctx.lineTo(x, y); ctx.stroke()
      ctx.fillStyle = '#fff8c9'
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 14; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) } ctx.closePath(); ctx.fill()
      f.glows.add(x, y, 40, '#fff2a8', 1)
      break
    }
    case 'gust': {
      const left = Math.max(0, v.taps - v.tapsDone)
      for (let i = 0; i < left; i++) {
        const a = f.t * 1.2 + i * 0.52, r = 22 + (i % 4) * 9
        drawLeaf(ctx, x + Math.cos(a) * r * 1.4, y + Math.sin(a * 1.3) * r * 0.7, 6, i % 2 ? '#e0892f' : '#c9612c', 'birch', a)
      }
      ctx.strokeStyle = rgba('#fff', 0.35); ctx.lineWidth = 1.5
      for (let i = 0; i < 3; i++) { const yy = y - 20 + i * 18, off = (f.t * 120 + i * 40) % 160; ctx.beginPath(); ctx.moveTo(x - 80 + off, yy); ctx.quadraticCurveTo(x - 60 + off, yy - 6, x - 40 + off, yy); ctx.stroke() }
      break
    }
    case 'lightning': {
      ctx.strokeStyle = '#d8dde6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y + 20); ctx.lineTo(x, y - 24); ctx.stroke()
      ctx.fillStyle = '#e8f2ff'; ctx.beginPath(); ctx.arc(x, y - 26, 4, 0, 6.283); ctx.fill()
      ctx.strokeStyle = '#8fe3ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y - 60); ctx.lineTo(x - 4, y - 44); ctx.lineTo(x + 3, y - 42); ctx.lineTo(x - 2, y - 30); ctx.stroke()
      f.glows.add(x, y - 26, 30 + Math.sin(f.t * 20) * 6, '#8fe3ff', 0.9)
      break
    }
    default: {
      ctx.font = `28px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v.glyph, x, y)
    }
  }
  ctx.restore()
  drawTimerRing(ctx, x, y, v.hitR, v.frac, '#ffd166')
  if (v.taps > 1) {
    ctx.fillStyle = rgba('#000', 0.5); roundRect(ctx, x - 18, y + v.hitR + 4, 36, 14, 7); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${v.tapsDone}/${v.taps}`, x, y + v.hitR + 11.5)
  }
}

/* ---------- amber droplet ---------- */
export function drawDroplet(f: Frame, x: number, y: number) {
  const ctx = f.ctx
  ctx.fillStyle = '#ffb547'
  ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.quadraticCurveTo(x + 11, y + 2, x, y + 10); ctx.quadraticCurveTo(x - 11, y + 2, x, y - 14); ctx.fill()
  ctx.fillStyle = rgba('#fff', 0.6); ctx.beginPath(); ctx.arc(x - 3, y, 2.5, 0, 6.283); ctx.fill()
  f.glows.add(x, y, 28, '#ffb547', 1)
}

/* ---------- chests ---------- */
export const CHEST_COLORS: Record<string, { body: string; trim: string }> = {
  bark: { body: '#7a4b23', trim: '#c9a24a' }, amber: { body: '#c26a1b', trim: '#ffd166' }, star: { body: '#3f3d8a', trim: '#e9e6ff' }, season: { body: '#2f7a6f', trim: '#a9f0e1' },
}
export function drawChest(f: Frame, x: number, y: number, tier: string, taps: number, shake: number, drop: number) {
  const ctx = f.ctx
  const c = CHEST_COLORS[tier] ?? CHEST_COLORS['bark']!
  const w = 30, h = 20
  const sx = shake > 0 ? Math.sin(f.t * 60) * 3 * shake : 0
  const dy = drop > 0 ? -drop * drop * 240 : 0
  const bx = x + sx, by = y + dy
  ctx.fillStyle = rgba('#000', 0.25); ctx.beginPath(); ctx.ellipse(x, y + 1, w * 0.6, 4, 0, 0, 6.283); ctx.fill()
  ctx.fillStyle = c.body; roundRect(ctx, bx - w / 2, by - h, w, h, 3); ctx.fill()
  const lidOpen = taps * 3
  ctx.fillStyle = shade(c.body, 1.2); roundRect(ctx, bx - w / 2, by - h - 8 - lidOpen, w, 10, 4); ctx.fill()
  ctx.strokeStyle = c.trim; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(bx - w / 2, by - h + 4); ctx.lineTo(bx + w / 2, by - h + 4); ctx.stroke()
  ctx.fillStyle = c.trim; ctx.fillRect(bx - 3, by - h - 1, 6, 6)
  // cracks after each tap, light leaking out
  if (taps > 0) {
    ctx.strokeStyle = rgba('#fff2a8', 0.9); ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < taps; i++) { const ox = bx - w / 2 + 6 + i * 9; ctx.moveTo(ox, by - h); ctx.lineTo(ox + 3, by - h + 6); ctx.lineTo(ox - 2, by - h + 12) }
    ctx.stroke()
    f.glows.add(bx, by - h / 2, 20 + taps * 8, tier === 'star' ? '#e9e6ff' : '#ffd166', 0.4 + taps * 0.25)
  }
  if (tier === 'star') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx - 8, by - h - 4, 1.5, 0, 6.283); ctx.arc(bx + 9, by - h - 3, 1.2, 0, 6.283); ctx.fill() }
}

/* ---------- fireflies (screen-space) ---------- */
export interface Firefly { x: number; y: number; vx: number; vy: number; p: number; alive: boolean }
export function drawFirefly(f: Frame, fl: Firefly) {
  const a = 0.45 + 0.55 * Math.abs(Math.sin(fl.p * 2.4))
  f.ctx.fillStyle = rgba('#e9ff8a', a); f.ctx.beginPath(); f.ctx.arc(fl.x, fl.y, 2.5, 0, 6.283); f.ctx.fill()
  f.glows.add(fl.x, fl.y, 16, '#d8ff6a', a)
}

/* ---------- frozen bundle ---------- */
export function drawFrozen(f: Frame, x: number, y: number, thawFrac: number) {
  const ctx = f.ctx
  const w = 34, h = 28
  ctx.fillStyle = rgba('#bfe9ff', 0.85); roundRect(ctx, x - w / 2, y - h, w, h, 5); ctx.fill()
  ctx.strokeStyle = rgba('#fff', 0.9); ctx.lineWidth = 1.5; roundRect(ctx, x - w / 2, y - h, w, h, 5); ctx.stroke()
  ctx.fillStyle = '#8a5a2b'; roundRect(ctx, x - 9, y - h + 9, 18, 12, 2); ctx.fill()
  const cracks = Math.floor(thawFrac * 5)
  ctx.strokeStyle = rgba('#3d7ea6', 0.9); ctx.lineWidth = 1.2; ctx.beginPath()
  for (let i = 0; i < cracks; i++) { const ox = x - w / 2 + 4 + i * 7; ctx.moveTo(ox, y - h); ctx.lineTo(ox + 3, y - h + 8); ctx.lineTo(ox - 2, y - h + 16) }
  ctx.stroke()
  f.glows.add(x, y - h / 2, 26, '#bfe9ff', 0.5)
  ctx.font = `10px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('❄️', x, y - h - 8)
}

/* ---------- Bloom wave front (world-space horizontal glow line) ---------- */
export function drawBloomFront(f: Frame, y: number) {
  const { ctx, W } = f
  const g = ctx.createLinearGradient(0, y - 24, 0, y + 24)
  g.addColorStop(0, rgba('#ff8fb8', 0)); g.addColorStop(0.5, rgba('#ff8fb8', 0.35)); g.addColorStop(1, rgba('#ff8fb8', 0))
  ctx.fillStyle = g; ctx.fillRect(0, y - 24, W, 48)
  for (let i = 0; i < 7; i++) { const x = ((f.t * 60 + i * W / 7) % (W + 20)) - 10; drawLeaf(ctx, x, y + Math.sin(f.t * 4 + i) * 6, 5, '#ffd6e7', 'blossom', f.t + i) }
  f.glows.add(f.cx, y, 60, '#ff8fb8', 0.6)
}

/* ---------- companion ---------- */
export function drawCompanion(f: Frame, x: number, y: number, pet: Pet, color: string, hop: number, flip: boolean) {
  const ctx = f.ctx
  const dir = flip ? -1 : 1
  const by = y - hop * 14
  ctx.save(); ctx.translate(x, by); ctx.scale(dir, 1)
  ctx.fillStyle = rgba('#000', 0.22); ctx.beginPath(); ctx.ellipse(0, y - by + 1, 9, 3, 0, 0, 6.283); ctx.fill()
  ctx.fillStyle = color
  switch (pet) {
    case 'owl': ctx.beginPath(); ctx.ellipse(0, -8, 7, 10, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(-3, -11, 2.4, 0, 6.283); ctx.arc(3, -11, 2.4, 0, 6.283); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-3, -11, 1, 0, 6.283); ctx.arc(3, -11, 1, 0, 6.283); ctx.fill(); break
    case 'snail': ctx.beginPath(); ctx.ellipse(-2, -3, 10, 4, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = shade(color, 0.7); ctx.beginPath(); ctx.arc(-3, -8, 6, 0, 6.283); ctx.fill(); ctx.strokeStyle = shade(color, 0.4); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-3, -8, 3, 0, 5); ctx.stroke(); ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(9, -11); ctx.stroke(); break
    case 'swarm': for (let i = 0; i < 6; i++) { const a = f.t * 2 + i * 1.05; const px = Math.cos(a) * 12, py = -8 + Math.sin(a * 1.6) * 8; ctx.fillStyle = rgba('#e9ff8a', 0.9); ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fill(); f.glows.add(x + px * dir, by + py, 12, '#d8ff6a', 0.6) } break
    case 'bee': ctx.beginPath(); ctx.ellipse(0, -8, 8, 5.5, 0, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, -13); ctx.lineTo(-3, -3); ctx.moveTo(2, -13); ctx.lineTo(2, -3); ctx.stroke(); ctx.fillStyle = rgba('#fff', 0.7); ctx.beginPath(); ctx.ellipse(-1, -14, 5, 3 + Math.sin(f.t * 40) * 1, 0, 0, 6.283); ctx.fill(); break
    case 'cat': ctx.beginPath(); ctx.ellipse(0, -6, 9, 6, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(7, -11, 5, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, -14); ctx.lineTo(5, -19); ctx.lineTo(8, -15); ctx.moveTo(10, -15); ctx.lineTo(11, -19); ctx.lineTo(12, -14); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -6); ctx.quadraticCurveTo(-16, -10 + Math.sin(f.t * 2) * 4, -14, -16); ctx.stroke(); ctx.fillStyle = '#9fe0a0'; ctx.beginPath(); ctx.arc(8, -12, 1, 0, 6.283); ctx.fill(); break
    case 'fox': ctx.beginPath(); ctx.ellipse(0, -6, 10, 6, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(16, -8); ctx.lineTo(9, -14); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(8, -13); ctx.lineTo(9, -19); ctx.lineTo(12, -13); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-9, -6, 3, 0, 6.283); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(15, -8, 1, 0, 6.283); ctx.fill(); break
    case 'dragon': ctx.beginPath(); ctx.ellipse(0, -8, 9, 7, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.arc(8, -13, 5, 0, 6.283); ctx.fill(); ctx.fillStyle = shade(color, 1.3); ctx.beginPath(); ctx.moveTo(-3, -13); ctx.lineTo(-8, -22 - Math.sin(f.t * 8) * 3); ctx.lineTo(2, -15); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff9b3d'; ctx.beginPath(); ctx.arc(14, -13, 1.5 + Math.abs(Math.sin(f.t * 6)) * 1.5, 0, 6.283); ctx.fill(); f.glows.add(x + 14 * dir, by - 13, 12, '#ff9b3d', 0.6); break
    case 'deer': ctx.fillStyle = rgba(color, 0.7); ctx.beginPath(); ctx.ellipse(0, -8, 9, 6, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(8, -14, 4, 5, 0.4, 0, 6.283); ctx.fill(); ctx.strokeStyle = rgba(color, 0.8); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(7, -18); ctx.lineTo(4, -25); ctx.moveTo(9, -18); ctx.lineTo(12, -25); ctx.moveTo(-4, -3); ctx.lineTo(-4, 2); ctx.moveTo(4, -3); ctx.lineTo(4, 2); ctx.stroke(); f.glows.add(x, by - 8, 18, '#c8f0ff', 0.5); break
  }
  ctx.restore()
}

/* ---------- Thrum ring / Resonance / Rally around the tip ---------- */
export function drawThrumRing(f: Frame, x: number, y: number, thrum: number, style: MeterStyle, resonance: boolean) {
  const ctx = f.ctx
  const r = 34
  ctx.lineCap = 'round'
  switch (style) {
    case 'vine': ctx.strokeStyle = rgba('#3e6b2a', 0.7); ctx.lineWidth = 5; break
    case 'clock': ctx.strokeStyle = rgba('#e6c56b', 0.55); ctx.lineWidth = 3; break
    default: ctx.strokeStyle = rgba('#5a3b22', 0.7); ctx.lineWidth = 6
  }
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.stroke()
  if (style === 'clock') { ctx.strokeStyle = rgba('#e6c56b', 0.7); ctx.lineWidth = 1.5; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4)); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke() } }
  if (thrum > 0) {
    const col = thrum >= 0.75 ? '#ffd166' : thrum >= 0.5 ? '#ffb547' : thrum >= 0.25 ? '#e0892f' : '#c9612c'
    ctx.strokeStyle = style === 'vine' ? '#9be36d' : col; ctx.lineWidth = style === 'clock' ? 3 : 5
    ctx.beginPath(); ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + 6.283 * thrum); ctx.stroke()
    if (style === 'vine') { ctx.fillStyle = '#9be36d'; for (let i = 0; i < Math.floor(thrum * 8); i++) { const a = -Math.PI / 2 + (i + 0.5) / 8 * 6.283; drawLeaf(ctx, x + Math.cos(a) * (r + 6), y + Math.sin(a) * (r + 6), 4, '#9be36d', 'birch' as LeafShape, a + 1.2) } }
    if (style === 'clock') { const a = -Math.PI / 2 + 6.283 * thrum; ctx.strokeStyle = '#e6c56b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8)); ctx.stroke() }
    f.glows.add(x, y, r + 20 * thrum, col, 0.3 + 0.5 * thrum)
  }
  if (resonance) {
    for (let i = 0; i < 3; i++) { const p = (f.t * 0.9 + i / 3) % 1; ctx.strokeStyle = rgba('#ffd166', (1 - p) * 0.7); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + p * 90, 0, 6.283); ctx.stroke() }
    f.glows.add(x, y, 90, '#ffd166', 0.8)
  }
}

export function drawRallyArc(f: Frame, x: number, y: number, stamina: number, active: boolean) {
  const ctx = f.ctx
  const r = 46
  ctx.strokeStyle = rgba('#000', 0.35); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke()
  ctx.strokeStyle = active ? '#5be3a0' : rgba('#5be3a0', 0.6); ctx.lineWidth = 4; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.max(0, Math.min(1, stamina))); ctx.stroke()
  if (active) { ctx.fillStyle = '#fff'; ctx.font = `800 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('RALLY x2', x, y + r + 12) }
}

/** Ambient critter (emoji) drifting inside a bough. */
export interface Critter { glyph: string; x: number; y: number; vx: number; p: number; enter: number }
export function drawCritter(f: Frame, c: Critter) {
  const ctx = f.ctx
  const slide = c.enter > 0 ? (c.vx > 0 ? -1 : 1) * c.enter * c.enter * f.W * 0.6 : 0
  ctx.save(); ctx.translate(c.x + slide, c.y + Math.sin(c.p) * 6)
  if (c.vx < 0) ctx.scale(-1, 1)
  ctx.font = `14px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.9
  ctx.fillText(c.glyph, 0, 0)
  ctx.restore()
  void hash01
}
