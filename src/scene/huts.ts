/** Procedural huts (walls + roof cosmetic + tier extras), lanterns, lantern strings and Landmark objects. World-space. */
import { rgba, shade, hash01 } from './colors'
import { roundRect } from './tree'
import { FONT, EMOJI_FONT, type Frame } from './types'
import type { LanternShape, LanternGlow, RoofKind } from './cosmetics'

export interface HutStyle { storeys: 1 | 2; lanterns: boolean; smoke: boolean; garden: boolean }

/** Intensity of a lantern's light this frame for the equipped glow style. */
export function lanternIntensity(f: Frame, seed: number, glow: LanternGlow): number {
  switch (glow) {
    case 'flicker': return 0.7 + 0.3 * Math.abs(Math.sin(f.t * 9 + seed * 3) * Math.sin(f.t * 2.3 + seed))
    case 'pulse': return 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(f.t * (2 + f.thrum * 6))) * (0.5 + f.thrum * 0.5)
    case 'golden': return 0.85 + 0.15 * Math.sin(f.t * 1.5 + seed)
    default: return 1
  }
}

/** One lantern of the equipped shape at (x,y), `size` ≈ radius. Lit strength follows day/night and glow style. */
export function drawLantern(f: Frame, x: number, y: number, size: number, color: string, shape: LanternShape, glow: LanternGlow, seed = 0) {
  const ctx = f.ctx
  const k = lanternIntensity(f, seed, glow)
  const lit = 0.35 + 0.65 * f.night
  const body = glow === 'golden' ? '#ffd166' : color
  ctx.fillStyle = shade(body, 0.85 + 0.3 * k * lit)
  ctx.beginPath()
  switch (shape) {
    case 'paper': roundRect(ctx, x - size * 0.8, y - size, size * 1.6, size * 2, size * 0.5); break
    case 'gourd': ctx.ellipse(x, y - size * 0.35, size * 0.6, size * 0.6, 0, 0, 6.283); ctx.ellipse(x, y + size * 0.4, size * 0.95, size * 0.75, 0, 0, 6.283); break
    case 'bell': ctx.moveTo(x - size * 0.9, y + size * 0.7); ctx.quadraticCurveTo(x - size * 0.9, y - size, x, y - size); ctx.quadraticCurveTo(x + size * 0.9, y - size, x + size * 0.9, y + size * 0.7); ctx.closePath(); break
    case 'crystal': ctx.moveTo(x, y - size * 1.1); ctx.lineTo(x + size * 0.8, y); ctx.lineTo(x, y + size * 1.1); ctx.lineTo(x - size * 0.8, y); ctx.closePath(); break
    case 'jelly': ctx.arc(x, y, size, Math.PI, 0); ctx.closePath(); break
    default: ctx.arc(x, y, size, 0, 6.283)
  }
  ctx.fill()
  if (shape === 'jelly') { ctx.strokeStyle = rgba(body, 0.7); ctx.lineWidth = 1; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * size * 0.5, y); ctx.quadraticCurveTo(x + i * size * 0.5 + Math.sin(f.t * 3 + i) * 3, y + size, x + i * size * 0.5, y + size * 1.8); ctx.stroke() } }
  if (shape === 'paper' || shape === 'gourd') { ctx.strokeStyle = rgba('#000', 0.18); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - size * 0.6, y - size * 0.4); ctx.lineTo(x + size * 0.6, y - size * 0.4); ctx.moveTo(x - size * 0.7, y + size * 0.2); ctx.lineTo(x + size * 0.7, y + size * 0.2); ctx.stroke() }
  // hot core
  ctx.fillStyle = rgba('#fff5d0', 0.5 + 0.4 * k * lit); ctx.beginPath(); ctx.arc(x, y, size * 0.35, 0, 6.283); ctx.fill()
  f.glows.add(x, y, size * 4.5, body, k)
  if (glow === 'swarm' && !f.low) {
    ctx.fillStyle = rgba('#e9ff8a', 0.9)
    for (let i = 0; i < 3; i++) { const a = f.t * (1.5 + i * 0.3) + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * size * 2.2, y + Math.sin(a * 1.3) * size * 1.6, 1.3, 0, 6.283); ctx.fill() }
  }
}

/** A catenary string of lanterns between two points. */
export function drawLanternString(f: Frame, x0: number, y0: number, x1: number, y1: number, count: number, seed: number) {
  const ctx = f.ctx
  const sag = Math.abs(x1 - x0) * 0.18
  ctx.strokeStyle = rgba('#2b1a0a', 0.8); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1); ctx.stroke()
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1), u = 1 - t
    const x = u * u * x0 + 2 * u * t * (x0 + x1) / 2 + t * t * x1
    const y = u * u * y0 + 2 * u * t * ((y0 + y1) / 2 + sag * 2) + t * t * y1
    drawLantern(f, x + Math.sin(f.t * 1.4 + i + seed) * 1.5, y + 8, 4.5, f.cos.lanternColor, f.cos.lanternShape, f.cos.lanternGlow, seed * 10 + i)
  }
}

/** A hut sitting on a limb at (x, baseY). `w`/`h` are the wall box. Returns nothing; hit boxes are computed in layout. */
export function drawHut(f: Frame, x: number, baseY: number, w: number, h: number, style: HutStyle, opts: { starvedGlyph?: string | null; glyph?: string; dim?: boolean; flash?: number; punch?: number; kind: 'lodge' | 'workshop' | 'annex'; storm?: boolean; charges?: number; chief?: boolean; roof?: RoofKind; roofColor?: string }) {
  const ctx = f.ctx
  const punch = opts.punch ?? 1
  const roofKind = opts.roof ?? f.cos.roof.roof
  const roofColor = opts.roofColor ?? f.cos.roof.color
  ctx.save()
  ctx.translate(x, baseY); ctx.scale(punch, punch); ctx.translate(-x, -baseY)
  if (opts.dim) ctx.globalAlpha = 0.65
  const storeys = style.storeys
  const wallH = h * (storeys === 2 ? 1.55 : 1)
  const top = baseY - wallH
  // garden
  if (style.garden) {
    ctx.fillStyle = '#4c8a3a'; ctx.beginPath(); ctx.ellipse(x, baseY + 2, w * 0.9, 7, 0, 0, 6.283); ctx.fill()
    for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#ff6b8a', '#ffd166', '#c084fc'][i % 3]!; ctx.beginPath(); ctx.arc(x - w * 0.7 + i * w * 0.35, baseY - 1 + Math.sin(i) * 2, 2, 0, 6.283); ctx.fill() }
  }
  // walls
  const wall = opts.kind === 'workshop' ? '#8c7a66' : opts.kind === 'annex' ? '#a68b5b' : '#c8a66a'
  ctx.fillStyle = shade(wall, 1 - 0.25 * f.night)
  roundRect(ctx, x - w / 2, top, w, wallH, 3); ctx.fill()
  ctx.strokeStyle = rgba('#3b2a14', 0.6); ctx.lineWidth = 1.5; roundRect(ctx, x - w / 2, top, w, wallH, 3); ctx.stroke()
  if (storeys === 2) { ctx.strokeStyle = rgba('#3b2a14', 0.5); ctx.beginPath(); ctx.moveTo(x - w / 2, top + wallH * 0.48); ctx.lineTo(x + w / 2, top + wallH * 0.48); ctx.stroke() }
  // door + window (lit at night)
  ctx.fillStyle = '#4a3218'; roundRect(ctx, x - 5, baseY - 12, 10, 12, 2); ctx.fill()
  const winLit = f.night > 0.15 || style.smoke
  const winC = winLit ? '#ffd88a' : '#7e9ab5'
  for (let s = 0; s < storeys; s++) {
    const wy = baseY - h * 0.62 - s * h * 0.55
    ctx.fillStyle = winC; ctx.fillRect(x + w * 0.16, wy - 4, 7, 7)
    if (s === 1) ctx.fillRect(x - w * 0.16 - 7, wy - 4, 7, 7)
    if (winLit) f.glows.add(x + w * 0.16 + 3, wy, 12, '#ffb547', 0.6 * f.night + 0.1)
  }
  // roof
  drawRoof(f, x, top, w, roofKind, roofColor, opts.kind)
  // chimney smoke
  if (style.smoke && !f.reducedMotion) {
    ctx.fillStyle = '#5b4a3a'; ctx.fillRect(x + w * 0.28, top - 16, 6, 14)
    ctx.fillStyle = rgba('#ddd', 0.35)
    for (let i = 0; i < 3; i++) { const p = (f.t * 0.5 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(x + w * 0.31 + Math.sin(p * 6 + i) * 4, top - 18 - p * 26, 3 + p * 4, 0, 6.283); ctx.fill() }
  }
  // lanterns on the eaves
  if (style.lanterns) {
    drawLantern(f, x - w / 2 - 3, top + 6, 3.5, f.cos.lanternColor, f.cos.lanternShape, f.cos.lanternGlow, Math.round(x))
    drawLantern(f, x + w / 2 + 3, top + 6, 3.5, f.cos.lanternColor, f.cos.lanternShape, f.cos.lanternGlow, Math.round(x) + 1)
  }
  // storm: lightning rod pips on the annex
  if (opts.storm) {
    ctx.strokeStyle = '#d8dde6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, top - 4); ctx.lineTo(x, top - 30); ctx.stroke()
    ctx.fillStyle = '#e8f2ff'; ctx.beginPath(); ctx.arc(x, top - 31, 2.5, 0, 6.283); ctx.fill()
    const ch = opts.charges ?? 0
    for (let i = 0; i < ch; i++) { ctx.fillStyle = '#8fe3ff'; ctx.beginPath(); ctx.arc(x - 12 + i * 6, top - 38, 2, 0, 6.283); ctx.fill() }
    if (ch > 0) f.glows.add(x, top - 31, 20 + ch * 4, '#8fe3ff', 0.5 + 0.1 * ch)
  }
  // building glyph badge
  if (opts.glyph) { ctx.font = `12px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(opts.glyph, x, top - 8 - (style.lanterns ? 0 : 0)) }
  ctx.restore()
  // starving marker: red '!' with the missing input glyph
  if (opts.starvedGlyph) {
    const bx = x + w / 2 + 2, by = top - 14
    ctx.fillStyle = '#d9333f'; ctx.beginPath(); ctx.arc(bx, by, 8, 0, 6.283); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = `800 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', bx, by + 0.5)
    ctx.font = `11px ${EMOJI_FONT}`; ctx.fillText(opts.starvedGlyph, bx + 12, by)
  }
  // masterwork / craft flash
  if (opts.flash && opts.flash > 0) {
    ctx.fillStyle = rgba('#c084fc', 0.5 * opts.flash); roundRect(ctx, x - w / 2 - 4, top - 14, w + 8, wallH + 18, 5); ctx.fill()
    f.glows.add(x, top + wallH / 2, w * 1.4, '#c084fc', opts.flash)
  }
}

function drawRoof(f: Frame, x: number, top: number, w: number, kind: RoofKind, color: string, hutKind: 'lodge' | 'workshop' | 'annex') {
  const ctx = f.ctx
  const c = shade(color, 1 - 0.25 * f.night)
  const ov = 5, rh = 14
  ctx.fillStyle = c
  ctx.beginPath()
  switch (kind) {
    case 'slate': ctx.moveTo(x - w / 2 - ov, top + 1); ctx.lineTo(x, top - rh); ctx.lineTo(x + w / 2 + ov, top + 1); ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgba('#000', 0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w / 4, top - rh / 2); ctx.lineTo(x + w / 4, top - rh / 2); ctx.stroke(); break
    case 'mushroom': ctx.ellipse(x, top - 2, w / 2 + ov + 2, rh, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = rgba('#fff', 0.7); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * w * 0.28, top - 6 - Math.abs(i) * 2, 2.5, 0, 6.283); ctx.fill() } break
    case 'moss': ctx.moveTo(x - w / 2 - ov, top + 1); ctx.quadraticCurveTo(x, top - rh - 6, x + w / 2 + ov, top + 1); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5d9b3f'; ctx.beginPath(); ctx.arc(x - w * 0.2, top - 6, 4, 0, 6.283); ctx.arc(x + w * 0.15, top - 8, 5, 0, 6.283); ctx.fill(); break
    case 'hive': for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, top - 3 - i * 5, (w / 2 + ov) * (1 - i * 0.22), 4, 0, 0, 6.283); ctx.fill() } break
    case 'pagoda': ctx.moveTo(x - w / 2 - ov - 4, top + 2); ctx.quadraticCurveTo(x - w / 4, top - 4, x, top - rh); ctx.quadraticCurveTo(x + w / 4, top - 4, x + w / 2 + ov + 4, top + 2); ctx.closePath(); ctx.fill(); ctx.fillRect(x - 1.5, top - rh - 6, 3, 6); break
    case 'shell': ctx.arc(x, top + 1, w / 2 + ov, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = rgba('#000', 0.2); ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x, top + 1); ctx.lineTo(x + i * (w / 4), top - rh * 0.9 + Math.abs(i) * 2); ctx.stroke() } break
    case 'glass': ctx.moveTo(x - w / 2 - ov, top + 1); ctx.lineTo(x, top - rh); ctx.lineTo(x + w / 2 + ov, top + 1); ctx.closePath(); ctx.fillStyle = rgba(f.cos.lanternColor, 0.75); ctx.fill(); ctx.strokeStyle = rgba('#222', 0.5); ctx.lineWidth = 1; ctx.stroke(); f.glows.add(x, top - 5, w * 0.9, f.cos.lanternColor, 0.5); break
    default: // thatch
      ctx.moveTo(x - w / 2 - ov, top + 2); ctx.lineTo(x, top - rh); ctx.lineTo(x + w / 2 + ov, top + 2); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = rgba('#000', 0.18); ctx.lineWidth = 1; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(x + i * w * 0.18, top + 1); ctx.lineTo(x + i * w * 0.1, top - rh * 0.5) } ctx.stroke()
  }
  if (hutKind === 'workshop') { ctx.fillStyle = '#6b5a4a'; ctx.fillRect(x - w * 0.36, top - 12, 5, 12) }
}

/** Small procedural Landmark objects. Positioned at a limb end or near the trunk. */
export function drawLandmark(f: Frame, id: string, x: number, y: number, side: -1 | 1) {
  const ctx = f.ctx
  ctx.save()
  ctx.lineCap = 'round'
  switch (id) {
    case 'lm_bridge': {
      const x1 = x - side * 120
      ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + x1) / 2, y + 22, x1, y); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.quadraticCurveTo((x + x1) / 2, y + 6, x1, y - 14); ctx.stroke()
      ctx.strokeStyle = '#9a6b3b'; ctx.lineWidth = 3
      for (let i = 1; i < 9; i++) { const t = i / 9, u = 1 - t; const px = u * u * x + 2 * u * t * (x + x1) / 2 + t * t * x1, py = u * u * y + 2 * u * t * (y + 22) + t * t * y; ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px + 4, py); ctx.stroke() }
      break
    }
    case 'lm_birdhouse': ctx.fillStyle = '#d9b370'; ctx.fillRect(x - 7, y - 16, 14, 14); ctx.fillStyle = '#8a3b2b'; ctx.beginPath(); ctx.moveTo(x - 9, y - 16); ctx.lineTo(x, y - 24); ctx.lineTo(x + 9, y - 16); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#2a1a08'; ctx.beginPath(); ctx.arc(x, y - 9, 2.5, 0, 6.283); ctx.fill(); break
    case 'lm_owl': ctx.fillStyle = '#7a6046'; ctx.beginPath(); ctx.ellipse(x, y - 9, 7, 10, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffe58a'; ctx.beginPath(); ctx.arc(x - 3, y - 12, 2.2, 0, 6.283); ctx.arc(x + 3, y - 12, 2.2, 0, 6.283); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x - 3, y - 12, 1, 0, 6.283); ctx.arc(x + 3, y - 12, 1, 0, 6.283); ctx.fill(); f.glows.add(x, y - 12, 10, '#ffe58a', 0.4 * f.night); break
    case 'lm_chimes': ctx.strokeStyle = '#c9c9c9'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { const sw = Math.sin(f.t * 2.5 + i) * 2; ctx.beginPath(); ctx.moveTo(x + i * 5, y - 18); ctx.lineTo(x + i * 5 + sw, y - 4 + Math.abs(i) * 3); ctx.stroke() } ctx.strokeStyle = '#6b4a2b'; ctx.beginPath(); ctx.moveTo(x - 8, y - 18); ctx.lineTo(x + 8, y - 18); ctx.stroke(); break
    case 'lm_mushrooms': for (let i = 0; i < 3; i++) { const px = x + (i - 1) * 9, py = y - 2; ctx.fillStyle = '#e8dcc0'; ctx.fillRect(px - 1.5, py - 8, 3, 8); ctx.fillStyle = '#b8f0ff'; ctx.beginPath(); ctx.arc(px, py - 8, 5 - Math.abs(i - 1), Math.PI, 0); ctx.fill(); f.glows.add(px, py - 8, 12, '#8ce8ff', 0.5) } break
    case 'lm_flags': { const x1 = x - side * 100; ctx.strokeStyle = '#eee'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.quadraticCurveTo((x + x1) / 2, y - 6, x1, y - 24); ctx.stroke(); const cols = ['#4d7cff', '#f2f2f2', '#ff4d4d', '#4dd964', '#ffd24d']; for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6, u = 1 - t; const px = u * u * x + 2 * u * t * (x + x1) / 2 + t * t * x1, py = u * u * (y - 20) + 2 * u * t * (y - 6) + t * t * (y - 24); ctx.fillStyle = cols[i % 5]!; ctx.fillRect(px - 4, py, 8 + Math.sin(f.t * 3 + i) * 1.5, 7) } break }
    case 'lm_bell': ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.moveTo(x - 7, y - 4); ctx.quadraticCurveTo(x - 7, y - 20, x, y - 20); ctx.quadraticCurveTo(x + 7, y - 20, x + 7, y - 4); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(x, y - 3, 2.5, 0, 6.283); ctx.fill(); break
    case 'lm_swing': { const sw = Math.sin(f.t * 1.6) * 8; ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 6, y - 30); ctx.lineTo(x - 6 + sw, y - 4); ctx.moveTo(x + 6, y - 30); ctx.lineTo(x + 6 + sw, y - 4); ctx.stroke(); ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x - 9 + sw, y - 5, 18, 3); break }
    case 'lm_hammock': ctx.strokeStyle = '#d9c9a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 18, y - 16); ctx.quadraticCurveTo(x, y + 2, x + 18, y - 16); ctx.stroke(); ctx.fillStyle = rgba('#e3d1a0', 0.9); ctx.beginPath(); ctx.moveTo(x - 14, y - 14); ctx.quadraticCurveTo(x, y - 2, x + 14, y - 14); ctx.quadraticCurveTo(x, y + 4, x - 14, y - 14); ctx.fill(); break
    case 'lm_door': ctx.fillStyle = '#4a3218'; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x - 8, y - 14); ctx.arc(x, y - 14, 8, Math.PI, 0); ctx.lineTo(x + 8, y); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.arc(x + 4, y - 8, 1.5, 0, 6.283); ctx.fill(); f.glows.add(x, y - 8, 12, '#ffb547', 0.4); break
    default: ctx.fillStyle = '#c9a24a'; ctx.beginPath(); ctx.arc(x, y - 8, 5, 0, 6.283); ctx.fill()
  }
  ctx.restore()
  void hash01
}
