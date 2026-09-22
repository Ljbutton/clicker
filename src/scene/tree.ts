/** Trunk, limbs, leaf clouds, bark runes, stump + nameplate, roots, ghost bough and crown ornament. World-space. */
import { rgba, shade, mix, hash01 } from './colors'
import { trunkEdge, trunkHalfWidth, TRUNK_W, STUMP_H, BAND_H, type BoughSlot, type Limb } from './layout'
import { FONT, type Frame } from './types'
import type { LeafShape } from './cosmetics'

/** Draw the trunk column between two world y values (top < bottom), tapering into the tip. */
export function drawTrunk(f: Frame, top: number, bottom: number, tipY: number, bark: string, stretch = 1) {
  const { ctx, cx } = f
  const step = f.low ? 28 : 16
  const from = Math.max(top, tipY), to = bottom
  if (to <= from) return
  ctx.beginPath()
  // left edge bottom→top, right edge top→bottom
  for (let y = to; y >= from; y -= step) {
    const hw = trunkHalfWidth(y, tipY) * stretch
    const x = trunkEdge(y, -1, cx, hw)
    if (y === to) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.lineTo(cx, tipY - 6)
  for (let y = from; y <= to; y += step) { const hw = trunkHalfWidth(y, tipY) * stretch; ctx.lineTo(trunkEdge(y, 1, cx, hw), y) }
  ctx.closePath()
  ctx.fillStyle = bark
  ctx.fill()
  // bark grain: a few darker vertical streaks
  if (!f.low) {
    ctx.strokeStyle = rgba(shade(bark, 0.7), 0.5)
    ctx.lineWidth = 1.5
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath()
      for (let y = to; y >= from + 30; y -= 24) {
        const x = cx + k * 16 + Math.sin(y * 0.05 + k) * 4
        if (y === to) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // lit edge (moonlight / sun) on the right
    ctx.strokeStyle = rgba(shade(bark, 1.35), 0.35)
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let y = to; y >= from; y -= step) { const hw = trunkHalfWidth(y, tipY) * stretch; const x = trunkEdge(y, 1, cx, hw) - 2; if (y === to) ctx.moveTo(x, y); else ctx.lineTo(x, y) }
    ctx.stroke()
  }
  if (f.cos.tree.glow && f.night > 0.2) {
    // Glowbark: bark veins glow at night
    ctx.strokeStyle = rgba('#7cf2c4', 0.5 * f.night); ctx.lineWidth = 1.2
    ctx.beginPath()
    for (let y = to; y >= from + 40; y -= 40) { const x = cx + Math.sin(y * 0.09) * 20; ctx.moveTo(x, y); ctx.lineTo(x + 10, y - 22); ctx.lineTo(x - 6, y - 40) }
    ctx.stroke()
    for (let y = to; y >= from + 40; y -= 80) f.glows.add(cx + Math.sin(y * 0.09) * 20, y - 20, 26, '#7cf2c4', 0.5)
  }
}

/** A side branch (quadratic bezier), tapering. */
export function drawLimb(f: Frame, l: Limb, bark: string) {
  const ctx = f.ctx
  ctx.strokeStyle = bark
  ctx.lineCap = 'round'
  ctx.lineWidth = 14
  ctx.beginPath(); ctx.moveTo(l.x0, l.y0); ctx.quadraticCurveTo(l.cx, l.cy, (l.cx + l.x1) / 2, (l.cy + l.y1) / 2); ctx.stroke()
  ctx.lineWidth = 7
  ctx.beginPath(); ctx.moveTo((l.cx + l.x0) / 2, (l.cy + l.y0) / 2); ctx.quadraticCurveTo(l.cx, l.cy, l.x1, l.y1); ctx.stroke()
  // twig
  ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(l.cx, l.cy); ctx.lineTo(l.cx + l.side * 14, l.cy - 22); ctx.stroke()
}

/** One leaf of the bough's species at (x,y). */
export function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, shape: LeafShape, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
  ctx.fillStyle = color
  ctx.beginPath()
  switch (shape) {
    case 'needle': ctx.moveTo(0, -r); ctx.lineTo(r * 0.35, r * 0.4); ctx.lineTo(-r * 0.35, r * 0.4); ctx.closePath(); break
    case 'birch': ctx.moveTo(0, -r); ctx.quadraticCurveTo(r, 0, 0, r); ctx.quadraticCurveTo(-r, 0, 0, -r); break
    case 'blossom': for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; ctx.moveTo(0, 0); ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.5, 0, 6.283) } break
    case 'willow': ctx.ellipse(0, r * 0.6, r * 0.35, r * 1.3, 0, 0, 6.283); break
    case 'crystal': ctx.moveTo(0, -r); ctx.lineTo(r * 0.6, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.6, 0); ctx.closePath(); break
    case 'elder': ctx.ellipse(0, 0, r * 1.4, r, 0.4, 0, 6.283); break
    default: ctx.arc(0, 0, r, 0, 6.283)
  }
  ctx.fill()
  ctx.restore()
}

/** Soft leaf canopy blobs around a limb end (behind huts). Deterministic per key. */
export function drawLeafCloud(f: Frame, x: number, y: number, key: string, leaf: string, shape: LeafShape, size = 1, sway = 0) {
  const ctx = f.ctx
  const n = f.low ? 5 : 9
  const dark = shade(leaf, 0.75), light = shade(leaf, 1.2)
  for (let i = 0; i < n; i++) {
    const a = hash01(key, i * 7) * 6.283, d = (0.3 + hash01(key, i * 11) * 0.7) * 42 * size
    const r = (10 + hash01(key, i * 13) * 12) * size
    const px = x + Math.cos(a) * d + sway * (1 + i * 0.1), py = y + Math.sin(a) * d * 0.6 - 12 * size
    const c = i % 3 === 0 ? dark : i % 3 === 1 ? leaf : light
    if (shape === 'round' || shape === 'elder') { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill() }
    else { drawLeaf(ctx, px, py, r, c, shape, a) }
  }
  if (f.cos.tree.petals && !f.low) { ctx.fillStyle = rgba('#ffd6e7', 0.8); for (let i = 0; i < 3; i++) { const t = (f.t * 0.3 + hash01(key, i)) % 1; ctx.beginPath(); ctx.arc(x + (hash01(key, 40 + i) - 0.5) * 60, y + t * 90, 2, 0, 6.283); ctx.fill() } }
  if (f.cos.tree.animated && f.night > 0.3) { for (let i = 0; i < 3; i++) { const px = x + (hash01(key, 50 + i) - 0.5) * 60, py = y - 10 + (hash01(key, 60 + i) - 0.5) * 40; ctx.fillStyle = rgba('#8cf3ff', 0.8 * f.night); ctx.beginPath(); ctx.arc(px, py, 2.5, 0, 6.283); ctx.fill(); f.glows.add(px, py, 16, '#8cf3ff', 0.5) } }
}

/** A glowing procedural rune glyph carved into the bark. */
export function drawRune(f: Frame, x: number, y: number, seed: number, color: string, size = 9) {
  const ctx = f.ctx
  ctx.save(); ctx.translate(x, y)
  ctx.strokeStyle = rgba(color, 0.9); ctx.lineWidth = 2; ctx.lineCap = 'round'
  ctx.beginPath()
  const pts = 4 + (seed % 3)
  for (let i = 0; i < pts; i++) {
    const h = hash01('rune', seed * 31 + i)
    const px = (h - 0.5) * size * 2, py = ((i / (pts - 1)) - 0.5) * size * 2
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.moveTo(-size, 0); ctx.lineTo(size * 0.4, 0)
  ctx.stroke()
  ctx.restore()
  f.glows.add(x, y, size * 2.2, color, 0.7)
}

/** The stump base at the ground line, inscribed rings, the nameplate and a fireflies-in-a-jar readout. */
export function drawStump(f: Frame, bark: string, rings: number, nameplate: string, initials: string | null, jarFireflies: number, doorLit: boolean) {
  const { ctx, cx } = f
  const w = TRUNK_W / 2
  ctx.fillStyle = bark
  ctx.beginPath()
  ctx.moveTo(cx - w - 2, -STUMP_H)
  ctx.quadraticCurveTo(cx - w - 8, -20, cx - w - 38, 0)
  ctx.lineTo(cx + w + 38, 0)
  ctx.quadraticCurveTo(cx + w + 8, -20, cx + w + 2, -STUMP_H)
  ctx.closePath(); ctx.fill()
  // ground shadow
  ctx.fillStyle = rgba('#000', 0.22)
  ctx.beginPath(); ctx.ellipse(cx, 2, w + 60, 8, 0, 0, 6.283); ctx.fill()
  // inscribed season rings on the stump face
  ctx.strokeStyle = rgba(shade(bark, 1.5), 0.55); ctx.lineWidth = 1.5
  for (let i = 0; i < Math.min(rings, 12); i++) {
    const r = 10 + i * 5
    ctx.beginPath(); ctx.arc(cx, -STUMP_H + 34, r, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke()
  }
  // door with a lantern (Supporter: lit)
  ctx.fillStyle = shade(bark, 0.55)
  ctx.beginPath(); ctx.moveTo(cx - 9, -4); ctx.lineTo(cx - 9, -22); ctx.arc(cx, -22, 9, Math.PI, 0); ctx.lineTo(cx + 9, -4); ctx.closePath(); ctx.fill()
  if (doorLit) { ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.arc(cx + 15, -26, 2.5, 0, 6.283); ctx.fill(); f.glows.add(cx + 15, -26, 16, '#ffb547', 0.9) }
  // nameplate sign
  const pw = 150, ph = 22, py = 8
  ctx.fillStyle = '#3a2614'; roundRect(ctx, cx - pw / 2, py, pw, ph, 5); ctx.fill()
  ctx.strokeStyle = rgba(f.cos.frame.color, 0.9); ctx.lineWidth = 1.5; roundRect(ctx, cx - pw / 2 + 1, py + 1, pw - 2, ph - 2, 4); ctx.stroke()
  ctx.fillStyle = '#f2e6c8'; ctx.font = `600 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(nameplate, cx, py + ph / 2 + 0.5)
  if (initials) {
    ctx.fillStyle = '#c9a24a'; roundRect(ctx, cx - 18, py + ph + 4, 36, 14, 3); ctx.fill()
    ctx.fillStyle = '#2a1a08'; ctx.font = `800 9px ${FONT}`; ctx.fillText(initials, cx, py + ph + 11.5)
  }
  // fireflies in a jar (offline cap/rate readout)
  const jx = cx + w + 48, jy = -8
  ctx.fillStyle = rgba('#cfe8ff', 0.28); roundRect(ctx, jx - 8, jy - 20, 16, 22, 4); ctx.fill()
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(jx - 7, jy - 23, 14, 4)
  const n = Math.min(24, jarFireflies)
  for (let i = 0; i < n; i++) {
    const px = jx - 5 + hash01('jar', i) * 10 + Math.sin(f.t * 2 + i) * 1.5, pyy = jy - 17 + hash01('jar', i + 50) * 15
    ctx.fillStyle = rgba('#ffe58a', 0.6 + 0.4 * Math.sin(f.t * 3 + i)); ctx.beginPath(); ctx.arc(px, pyy, 1.2, 0, 6.283); ctx.fill()
  }
  if (n > 0) f.glows.add(jx, jy - 10, 14, '#ffe58a', Math.min(1, n / 12))
}

/** Root strands below the stump; prestige nodes glow as knots (the Ring Tree, drawn as roots). */
export function drawRoots(f: Frame, bark: string, nodeLevels: number, depth: number) {
  const { ctx, cx } = f
  ctx.strokeStyle = shade(bark, 0.8); ctx.lineCap = 'round'
  const strands = 5
  for (let i = 0; i < strands; i++) {
    const side = (i - 2) / 2
    ctx.lineWidth = 10 - Math.abs(side) * 4
    ctx.beginPath(); ctx.moveTo(cx + side * 26, 0)
    ctx.bezierCurveTo(cx + side * 60, 40, cx + side * 90, 60 + Math.abs(side) * 20, cx + side * 130, Math.min(depth, 110 + Math.abs(side) * 30))
    ctx.stroke()
  }
  for (let i = 0; i < Math.min(nodeLevels, 20); i++) {
    const side = ((i % 5) - 2) / 2, t = 0.35 + Math.floor(i / 5) * 0.18
    const x = cx + side * 130 * t, y = 20 + t * 90
    ctx.fillStyle = '#ffd88a'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.283); ctx.fill()
    f.glows.add(x, y, 14, '#ffb547', 0.6)
  }
}

/** Ghost silhouette of the next bough with its Ritual cost floating beside it. */
export function drawGhost(f: Frame, lineY: number, dir: 'up' | 'down', name: string, costText: string, leaf: string) {
  const { ctx, cx, W } = f
  const y = dir === 'up' ? lineY - BAND_H * 0.35 : lineY + BAND_H * 0.35
  ctx.save()
  ctx.setLineDash([6, 6]); ctx.strokeStyle = rgba('#ffffff', 0.35); ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(cx - W * 0.42, lineY); ctx.lineTo(cx + W * 0.42, lineY); ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = rgba(leaf, 0.14)
  for (const side of [-1, 1] as const) {
    const lx = cx + side * (TRUNK_W / 2), ly = y + side * 20
    ctx.strokeStyle = rgba('#ffffff', 0.22); ctx.lineWidth = 8; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(lx + side * 60, ly - 6, lx + side * W * 0.3, ly - 26); ctx.stroke()
    ctx.beginPath(); ctx.arc(lx + side * W * 0.3, ly - 40, 34, 0, 6.283); ctx.fill()
  }
  ctx.fillStyle = rgba('#ffffff', 0.75); ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(name, cx, y - 2)
  ctx.font = `600 11px ${FONT}`; ctx.fillStyle = rgba('#ffe9b0', 0.85)
  ctx.fillText(costText, cx, y + 14)
  ctx.restore()
}

/** Crown ornament at the tip. */
export function drawCrownOrnament(f: Frame, x: number, y: number, kind: string, color: string) {
  const ctx = f.ctx
  if (kind === 'none') return
  ctx.save(); ctx.translate(x, y - 8)
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2; ctx.lineCap = 'round'
  switch (kind) {
    case 'vane': {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -26); ctx.stroke()
      ctx.save(); ctx.translate(0, -22); ctx.rotate(Math.sin(f.t * 0.7) * 0.6)
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.lineTo(4, -5); ctx.moveTo(10, 0); ctx.lineTo(4, 5); ctx.stroke()
      ctx.restore(); break
    }
    case 'chime': {
      ctx.beginPath(); ctx.moveTo(-12, -20); ctx.lineTo(12, -20); ctx.stroke()
      for (let i = -1; i <= 1; i++) { const sw = Math.sin(f.t * 3 + i) * 3; ctx.beginPath(); ctx.moveTo(i * 9, -20); ctx.lineTo(i * 9 + sw, -2); ctx.stroke() }
      break
    }
    case 'lantern': {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -14); ctx.stroke()
      ctx.fillStyle = f.cos.lanternColor; ctx.beginPath(); ctx.ellipse(0, -24, 10, 12, 0, 0, 6.283); ctx.fill()
      f.glows.add(0 + x, y - 32, 40, f.cos.lanternColor, 1); break
    }
    case 'crystal': {
      ctx.fillStyle = rgba(color, 0.85)
      ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(9, -12); ctx.lineTo(0, 0); ctx.lineTo(-9, -12); ctx.closePath(); ctx.fill()
      f.glows.add(x, y - 24, 30, color, 0.9); break
    }
    case 'kite': {
      const kx = 30 + Math.sin(f.t * 1.1) * 8, ky = -46 + Math.cos(f.t * 0.9) * 6
      ctx.strokeStyle = rgba('#fff', 0.5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(kx * 0.5, ky * 0.3, kx, ky); ctx.stroke()
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(kx, ky - 12); ctx.lineTo(kx + 9, ky); ctx.lineTo(kx, ky + 12); ctx.lineTo(kx - 9, ky); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(kx, ky + 12); ctx.lineTo(kx - 4, ky + 20); ctx.lineTo(kx + 3, ky + 26); ctx.stroke(); break
    }
    case 'elder': {
      ctx.fillStyle = rgba(color, 0.9)
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.5; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(Math.cos(a) * 28, -4 + Math.sin(a) * 28); ctx.lineTo(Math.cos(a + 0.25) * 14, -4 + Math.sin(a + 0.25) * 14); ctx.closePath(); ctx.fill() }
      f.glows.add(x, y - 20, 34, color, 0.8); break
    }
  }
  ctx.restore()
}

/** Ambient background tint per bough (roots get dark loam behind the trunk). */
export function drawBoughBackdrop(f: Frame, slot: BoughSlot, leaf: string) {
  const { ctx, W } = f
  if (slot.dir === 'down') {
    const g = ctx.createLinearGradient(0, slot.top - 60, 0, slot.bottom)
    g.addColorStop(0, rgba('#1b1208', 0)); g.addColorStop(0.15, rgba('#1b1208', 0.85)); g.addColorStop(1, rgba('#0d0904', 0.95))
    ctx.fillStyle = g; ctx.fillRect(0, slot.top - 60, W, slot.bottom - slot.top + 60)
    // pale stones and glow mushrooms / crystal glints
    for (let i = 0; i < 8; i++) {
      const x = hash01(slot.id, i) * W, y = slot.top + hash01(slot.id, i + 20) * BAND_H
      ctx.fillStyle = rgba('#a9a08c', 0.35); ctx.beginPath(); ctx.ellipse(x, y, 10 + hash01(slot.id, i + 40) * 12, 6, 0, 0, 6.283); ctx.fill()
    }
    const glowC = slot.slot === 0 ? '#9be7ff' : '#6fb7ff'
    for (let i = 0; i < 5; i++) {
      const x = hash01(slot.id, i + 60) * W, y = slot.top + 40 + hash01(slot.id, i + 80) * (BAND_H - 80)
      ctx.fillStyle = glowC; ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.283); ctx.fill()
      f.glows.add(x, y, 22, glowC, 0.7)
    }
  } else {
    // faint leaf haze behind the bough
    ctx.fillStyle = rgba(mix(leaf, '#000', 0.2), 0.06)
    ctx.beginPath(); ctx.ellipse(f.cx, slot.lineY - BAND_H * 0.5, W * 0.6, BAND_H * 0.42, 0, 0, 6.283); ctx.fill()
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}
