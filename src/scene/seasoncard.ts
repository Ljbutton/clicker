/** Offscreen 1080x1920 Season Card: tree snapshot, Season number, best height, Rings, lit lanterns, titles and the frame cosmetic. */
import type { Game } from '@/engine/game'
import { fmt } from '@/engine/numbers'
import { rgba, shade, mix } from './colors'
import { drawSky, drawGlows } from './sky'
import { drawTrunk, drawLeafCloud, drawCrownOrnament, roundRect } from './tree'
import { drawLantern } from './huts'
import { GlowList, FONT, type Frame, type Palette } from './types'
import type { ResolvedCosmetics } from './cosmetics'

const CW = 1080, CH = 1920

function makeCanvas(): { c: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } | null {
  try {
    if (typeof document !== 'undefined') {
      const c = document.createElement('canvas'); c.width = CW; c.height = CH
      const ctx = c.getContext('2d'); if (ctx) return { c, ctx }
    }
    if (typeof OffscreenCanvas !== 'undefined') { const c = new OffscreenCanvas(CW, CH); const ctx = c.getContext('2d'); if (ctx) return { c, ctx } }
  } catch { /* no canvas here */ }
  return null
}

function toBlob(c: HTMLCanvasElement | OffscreenCanvas): Promise<Blob | null> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: 'image/png' }).catch(() => null)
  return new Promise((res) => { try { (c as HTMLCanvasElement).toBlob((b) => res(b), 'image/png') } catch { res(null) } })
}

function drawFrame(ctx: CanvasRenderingContext2D, style: string, color: string, t: number) {
  ctx.save()
  ctx.lineWidth = 26
  switch (style) {
    case 'rings': ctx.strokeStyle = shade(color, 0.9); for (let i = 0; i < 4; i++) { ctx.lineWidth = 6; roundRect(ctx, 30 + i * 12, 30 + i * 12, CW - 60 - i * 24, CH - 60 - i * 24, 40); ctx.stroke() } break
    case 'star': ctx.strokeStyle = color; roundRect(ctx, 30, 30, CW - 60, CH - 60, 40); ctx.stroke(); ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const a = i * 2.399; const x = 60 + ((i * 197) % (CW - 120)), y = 60 + ((i * 331) % (CH - 120)); if (x > 120 && x < CW - 120 && y > 120 && y < CH - 120) continue; ctx.beginPath(); ctx.arc(x, y, 3 + (i % 3), 0, 6.283); ctx.fill(); void a } break
    case 'gilded': { const g = ctx.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, '#f7e08a'); g.addColorStop(0.5, '#b8860b'); g.addColorStop(1, '#f7e08a'); ctx.strokeStyle = g; roundRect(ctx, 30, 30, CW - 60, CH - 60, 40); ctx.stroke(); ctx.lineWidth = 4; roundRect(ctx, 56, 56, CW - 112, CH - 112, 30); ctx.stroke(); break }
    case 'aurora': { const g = ctx.createLinearGradient(0, 0, CW, CH); g.addColorStop(0, '#6ef2c4'); g.addColorStop(0.5, '#8a7bff'); g.addColorStop(1, '#ff8fb8'); ctx.strokeStyle = g; roundRect(ctx, 30, 30, CW - 60, CH - 60, 40); ctx.stroke(); break }
    default: ctx.strokeStyle = color; roundRect(ctx, 30, 30, CW - 60, CH - 60, 40); ctx.stroke(); ctx.strokeStyle = rgba(shade(color, 0.6), 0.6); ctx.lineWidth = 3; for (let i = 0; i < 30; i++) { const y = 60 + i * 60; ctx.beginPath(); ctx.moveTo(34, y); ctx.lineTo(50, y + 20); ctx.moveTo(CW - 34, y + 10); ctx.lineTo(CW - 50, y + 30); ctx.stroke() }
  }
  ctx.restore()
  void t
}

export interface CardInput { game: Game; cos: ResolvedCosmetics; pal: Palette; night: number; sky: [string, string] }

/** Render the card and return a PNG Blob (null where canvas is unavailable). */
export async function renderSeasonCard(input: CardInput): Promise<Blob | null> {
  const made = makeCanvas()
  if (!made) return null
  const ctx = made.ctx as CanvasRenderingContext2D
  const { game, cos, pal } = input
  const s = game.s
  const f: Frame = { ctx, W: CW, H: CH, cx: CW / 2, t: 1.5, dt: 0, now: game.now, night: input.night, cos, pal, reducedMotion: true, low: false, camY: 0, glows: new GlowList(), thrum: 0 }
  drawSky(f, input.sky[0], input.sky[1])
  // stars sprinkle
  ctx.fillStyle = rgba('#fff', 0.5)
  for (let i = 0; i < 80; i++) { ctx.beginPath(); ctx.arc((i * 199) % CW, (i * 331) % (CH * 0.6), 1.5 + (i % 3), 0, 6.283); ctx.fill() }
  // ground + stump + tree, scaled up
  const groundY = CH * 0.78
  ctx.fillStyle = rgba('#000', 0.25); ctx.beginPath(); ctx.ellipse(CW / 2, groundY + 10, 420, 40, 0, 0, 6.283); ctx.fill()
  ctx.save(); ctx.translate(CW / 2, groundY); ctx.scale(3.2, 3.2); ctx.translate(-CW / 2, 0)
  const boughs = s.boughs.length
  const tipY = -(120 + Math.min(320, boughs * 55))
  drawTrunk(f, tipY, 0, tipY, pal.bark)
  const lit = game.litBoughs
  for (let i = 0; i < Math.max(1, Math.min(boughs, 7)); i++) {
    const y = -40 - i * ((-tipY - 60) / Math.max(1, Math.min(boughs, 7)))
    for (const side of [-1, 1] as const) {
      const x = CW / 2 + side * (44 + (i % 2) * 14)
      drawLeafCloud(f, x, y, `card${i}${side}`, mix(pal.leaf, game.ci.bands[Math.min(i, game.ci.bands.length - 1)]?.leaf ?? pal.leaf, 0.4), cos.tree.leafShape, 1.2)
      if (i < lit) drawLantern(f, x, y + 18, 4, cos.lanternColor, cos.lanternShape, cos.lanternGlow, i * 2 + (side > 0 ? 1 : 0))
    }
  }
  drawCrownOrnament(f, CW / 2, tipY, cos.crown.ornament, cos.crown.color)
  ctx.restore()
  // glow pass under the same transform
  ctx.save(); ctx.translate(CW / 2, groundY); ctx.scale(3.2, 3.2); ctx.translate(-CW / 2, 0); drawGlows(f); ctx.restore()
  // text
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = rgba('#000', 0.35); roundRect(ctx, 120, 120, CW - 240, 300, 40); ctx.fill()
  ctx.fillStyle = '#fff'; ctx.font = `800 96px ${FONT}`; ctx.fillText('HOLLOWSPIRE', CW / 2, 200)
  ctx.font = `600 54px ${FONT}`; ctx.fillStyle = '#ffe9b0'
  ctx.fillText(`Season ${s.prestige.count + 1}${pal.name ? ' · ' + pal.name : ''}`, CW / 2, 290)
  if (cos.title) { ctx.font = `600 44px ${FONT}`; ctx.fillStyle = '#c8f0ff'; ctx.fillText(cos.title, CW / 2, 360) }
  const stats = [
    `best ${fmt(Math.max(s.prestige.bestHeight, s.height), { int: true })} m`,
    `${fmt(s.prestige.lifetimeRings, { int: true })} Rings`,
    `${lit} lit bough${lit === 1 ? '' : 's'}`,
    `${s.boughs.length} bough${s.boughs.length === 1 ? '' : 's'} open`,
  ]
  ctx.fillStyle = rgba('#000', 0.35); roundRect(ctx, 160, CH - 380, CW - 320, 260, 40); ctx.fill()
  ctx.font = `700 46px ${FONT}`; ctx.fillStyle = '#fff'
  stats.forEach((line, i) => ctx.fillText(line, CW / 2, CH - 330 + i * 60))
  if (s.cosmetics.supporter && s.cosmetics.initials) { ctx.font = `800 36px ${FONT}`; ctx.fillStyle = '#ffd166'; ctx.fillText(s.cosmetics.initials, CW / 2, CH - 90) }
  drawFrame(ctx, cos.frame.style, cos.frame.color, f.t)
  return toBlob(made.c)
}
