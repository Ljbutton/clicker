/**
 * HOLLOWSPIRE canvas Scene & Spire Renderer (GDD §1.2, §12.3, §14.1, §15, §16 system 7).
 *
 * createScene(canvas, game) owns the requestAnimationFrame loop, DPR-aware sizing, all in-scene pointer
 * interactions (strike / hold-to-Rally / huts / set-pieces / droplet / chests / fireflies / frozen bundle /
 * Lightning Rod / Bloom front / drag-to-scroll with inertia), the camera, and every juice reaction to game events.
 * Drawing is split across sky.ts, tree.ts, huts.ts, folk.ts and actors.ts; layout math lives in layout.ts (pure).
 */
import type { Game, GameEvents } from '@/engine/game'
import type { BandDef, WorkshopDef } from '@/content/types'
import { haptic } from '@/engine/haptics'
import { fmt } from '@/engine/numbers'
import { BALANCE } from '@/content/balance'
import { ritualCost } from '@/systems/grow'
import { ParticleSystem } from './particles'
import { ease, Shake, Punch } from './tween'
import { Camera } from './camera'
import * as L from './layout'
import { resolveCosmetics, cosmeticsKey, type ResolvedCosmetics } from './cosmetics'
import { drawSky, drawNightOverlay, drawGlows, SkyLayer } from './sky'
import { drawTrunk, drawLimb, drawLeafCloud, drawRune, drawStump, drawRoots, drawGhost, drawCrownOrnament, drawBoughBackdrop, roundRect } from './tree'
import { drawHut, drawLanternString, drawLandmark } from './huts'
import { drawFolk, Walker } from './folk'
import { drawSetPiece, drawDroplet, drawChest, drawFirefly, drawFrozen, drawBloomFront, drawCompanion, drawThrumRing, drawRallyArc, drawCritter, type SetPieceView, type Firefly, type Critter } from './actors'
import { GlowList, FONT, type Frame, type Palette } from './types'
import { renderSeasonCard } from './seasoncard'
import { mix, rgba, hash01 } from './colors'

export interface SceneHandle {
  destroy(): void
  setQuality(q: 'high' | 'low'): void
  scrollToTip(): void
  jumpToBough(bandId: string): void
  preview(cosmeticId: string | null): void
  renderSeasonCard(): Promise<Blob | null>
  resize(): void
}

export interface SceneOptions { reducedMotion?: boolean }

// Pure helpers the UI may want (bough dots, layout maths) are re-exported here.
export { layoutBoughs, tipFraction, tipWorldY, cameraFor, worldToScreen, screenToWorld, BAND_H, TRUNK_W, STUMP_H } from './layout'
export { resolveCosmetics } from './cosmetics'

/* ---------- internal view model ---------- */
interface HutView {
  key: string; kind: 'lodge' | 'workshop' | 'annex'; id: string; bandId: string
  x: number; y: number; w: number; h: number; glyph: string; side: -1 | 1
  punch: Punch; flash: number; cheer: number; walkers: Walker[]
}
interface LandmarkView { id: string; x: number; y: number; side: -1 | 1; pop: number }
interface BoughView { slot: L.BoughSlot; band: BandDef; limbs: L.Limb[]; huts: HutView[]; critters: Critter[]; landmarks: LandmarkView[]; lit: boolean }
interface ChestAnim { taps: number; shake: number; drop: number }
interface Pointer { id: number; x0: number; y0: number; x: number; y: number; t0: number; dragging: boolean; struck: boolean; rally: boolean; timer: ReturnType<typeof setTimeout> | null }

const HUT_W = 34, HUT_H = 24
const walkerPos = { x: 0, y: 0, carrying: false, flip: false }

export function createScene(canvas: HTMLCanvasElement, game: Game, opts: SceneOptions = {}): SceneHandle {
  const ctx = canvas.getContext('2d', { alpha: false }) ?? canvas.getContext('2d')
  const ci = game.ci
  let W = 0, H = 0, cx = 0, dpr = 1
  let quality: 'high' | 'low' = 'high'
  let previewId: string | null = null
  let cos: ResolvedCosmetics = resolveCosmetics((id) => ci.cosmetics.get(id), game.s.cosmetics.equipped, null)
  let cosKey = ''
  const cam = new Camera()
  const shake = new Shake()
  let ps = new ParticleSystem(300)
  const glows = new GlowList()
  const seasonLayer = new SkyLayer()
  const cosmeticLayer = new SkyLayer()
  let t = 0, lastTs = 0, lastDraw = 0, secondAcc = 1
  let raf = 0
  let destroyed = false
  let dirty = true

  // world model
  let boughs: BoughView[] = []
  let slots: L.BoughSlot[] = []
  let tipTarget = 0
  const tipTween = { from: 0, to: 0, t: 1, dur: 0.6 }
  let tipDisplay = 0
  let stretch = 1
  let firstFrame = true
  let nightAmt = 0
  let skyFrom: [string, string] | null = null
  let skyFade = 1
  let pal: Palette = { leaf: '#4caf50', bark: '#5a3b22', accent: '#ffd166', particle: '#ffffff', name: '' }
  let nameplate = '', ghostText = '', ghostName = ''
  let titleCard = { text: '', life: 0 }
  let edgeGlow = 0, discoveryFlash = 0, resonanceRipple = 0, companionHop = 0, ritualHold = 0, turnFade = 0
  const chestAnim = new Map<string, ChestAnim>()
  const fireflies: Firefly[] = []
  let dropletPos = { x: 0, y: 0, visible: false }
  let bloomFrontY = 0
  const ripples: { x: number; y: number; life: number }[] = []
  const spView: SetPieceView = { id: '', x: 0, y: 0, frac: 0, progress: 0, taps: 1, tapsDone: 0, hitR: 44, glyph: '', wobble: 0 }
  let spWobble = 0
  const pointers = new Map<number, Pointer>()
  let primary: Pointer | null = null
  const unsub: (() => void)[] = []
  let ro: ResizeObserver | null = null

  const rm = () => !!opts.reducedMotion || game.s.settings.reducedMotion
  const low = () => quality === 'low' || game.s.settings.fps30

  /* ---------- sizing ---------- */
  function resize() {
    const w = canvas.clientWidth || 390, h = canvas.clientHeight || 491
    dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1)
    W = w; H = h; cx = Math.round(w / 2)
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr)
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph }
    dirty = true
  }

  /* ---------- palette & cosmetics ---------- */
  function refreshCosmetics() {
    const key = cosmeticsKey(game.s.cosmetics.equipped, previewId)
    if (key === cosKey) return
    cosKey = key
    cos = resolveCosmetics((id) => ci.cosmetics.get(id), game.s.cosmetics.equipped, previewId)
  }
  function refreshPalette() {
    const rows = ci.raw.mechanics
    const count = game.s.prestige.count
    let row = rows.find((m) => m.atTurn === count)
    if (!row && count > 0) { const cyc = rows.filter((m) => m.atTurn >= 1).sort((a, b) => a.atTurn - b.atTurn); if (cyc.length) row = cyc[(count - 1) % cyc.length] }
    const custom = cos.tree.id !== 'tr_oak'
    const seasonal = !!row && count > 0 && !custom
    pal = {
      leaf: custom ? cos.tree.leaf : seasonal ? row!.palette.leaf : cos.tree.leaf,
      bark: custom ? cos.tree.bark : seasonal ? row!.palette.bark : cos.tree.bark,
      accent: row?.palette.accent ?? '#ffd166',
      particle: seasonal ? row!.palette.particle : '',
      particleGlyph: seasonal ? row?.palette.particleGlyph : undefined,
      name: row?.seasonName ?? '',
    }
  }
  const leafFor = (band: BandDef) => (cos.tree.id !== 'tr_oak' ? cos.tree.leaf : game.s.prestige.count > 0 && pal.particle ? mix(band.leaf, pal.leaf, 0.6) : band.leaf)

  /* ---------- world rebuild ---------- */
  function rebuild() {
    dirty = false
    const s = game.s
    slots = L.layoutBoughs(ci.bands, s.boughs)
    const prev = new Map<string, BoughView>()
    for (const b of boughs) prev.set(b.slot.id, b)
    const lit = game.litBoughs
    const litIds = new Set(slots.slice(0, lit).map((x) => x.id))
    const next: BoughView[] = []
    for (const slot of slots) {
      const band = ci.bandById.get(slot.id)!
      const old = prev.get(slot.id)
      const items: { kind: HutView['kind']; id: string; glyph: string }[] = []
      for (const p of ci.raw.producers) if (p.kind === 'lodge' && p.bandId === slot.id && (s.producers[p.id] ?? 0) > 0) items.push({ kind: 'lodge', id: p.id, glyph: p.glyph })
      for (const w of ci.workshopOrder) if (w.bandId === slot.id && s.workshops[w.id]) items.push({ kind: 'workshop', id: w.id, glyph: w.glyph })
      for (const a of s.limbs[slot.id] ?? []) { const def = ci.annexes.get(a); items.push({ kind: 'annex', id: a, glyph: def?.glyph ?? '🏚️' }) }
      const shown = items.slice(0, L.MAX_HUTS_PER_BOUGH)
      const limbs: L.Limb[] = []
      for (let k = 0; k < L.limbCount(shown.length); k++) limbs.push(L.limbGeom(slot, k, cx, W))
      const huts: HutView[] = shown.map((it, i) => {
        const hs = L.hutSlot(i)
        const limb = limbs[Math.min(hs.limb, limbs.length - 1)]!
        const p = L.pointOnLimb(limb, hs.t)
        const key = `${slot.id}:${it.kind}:${it.id}`
        const o = old?.huts.find((h) => h.key === key)
        return { key, kind: it.kind, id: it.id, bandId: slot.id, x: p.x, y: p.y - 3, w: HUT_W, h: HUT_H, glyph: it.glyph, side: limb.side, punch: o?.punch ?? new Punch(), flash: o?.flash ?? 0, cheer: o?.cheer ?? 0, walkers: o?.walkers ?? [] }
      })
      const critters: Critter[] = old?.critters ?? []
      const want = band.ambient.length ? (low() ? 1 : 2) : 0
      while (critters.length > want) critters.pop()
      while (critters.length < want) {
        const g = band.ambient[critters.length % band.ambient.length]!
        critters.push({ glyph: g, x: Math.random() * W, y: slot.top + 40 + Math.random() * (L.BAND_H - 120), vx: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 16), p: Math.random() * 6, enter: 0 })
      }
      next.push({ slot, band, limbs, huts, critters, landmarks: old?.landmarks ?? [], lit: litIds.has(slot.id) })
    }
    boughs = next
    // landmarks: on the bough that lists them, else round-robin
    for (const b of boughs) b.landmarks = []
    s.landmarks.forEach((id, i) => {
      let b = boughs.find((x) => x.band.landmarkSlots?.includes(id))
      if (!b) b = boughs[i % Math.max(1, boughs.length)]
      if (!b) return
      const limb = b.limbs[(i + 1) % b.limbs.length]!
      const p = L.pointOnLimb(limb, 0.8)
      const oldB = prev.get(b.slot.id)
      const o = oldB?.landmarks.find((l) => l.id === id)
      b.landmarks.push({ id, x: p.x, y: p.y - 4, side: limb.side, pop: o?.pop ?? 0 })
    })
    rebuildWalkers()
    refreshTip()
  }

  function hutOf(kind: HutView['kind'], id: string): HutView | null {
    for (const b of boughs) for (const h of b.huts) if (h.kind === kind && h.id === id) return h
    return null
  }
  function consumersOf(resource: string): WorkshopDef[] {
    const out: WorkshopDef[] = []
    for (const w of ci.workshopOrder) { if (!game.s.workshops[w.id]) continue; const r = ci.recipes.get(w.recipe); if (r && r.inputs[resource] != null) out.push(w) }
    return out
  }
  function rebuildWalkers() {
    const s = game.s
    let budget = low() ? 36 : 60
    for (const b of boughs) for (const h of b.huts) {
      let count = 0, carry: string | null = null, tx = 0, ty = 0, via = false
      if (h.kind === 'lodge') {
        const def = ci.producers.get(h.id)
        count = L.folkCount(s.producers[h.id] ?? 0)
        const res = def?.produces?.id
        carry = res ? ci.resources.get(res)?.glyph ?? null : null
        let best: HutView | null = null, bd = Infinity
        if (res) for (const w of consumersOf(res)) { const hv = hutOf('workshop', w.id); if (!hv) continue; const d = Math.hypot(hv.x - h.x, hv.y - h.y); if (d < bd) { bd = d; best = hv } }
        if (best) { tx = best.x; ty = best.y } else { tx = h.side > 0 ? cx + L.TRUNK_W / 2 + 6 : cx - L.TRUNK_W / 2 - 6; ty = h.y + 6 }
      } else if (h.kind === 'workshop') {
        const crew = ci.crewByStation.get(h.id)
        count = crew ? L.folkCount(s.producers[crew.id] ?? 0) : 0
        const rec = ci.recipes.get(ci.workshops.get(h.id)?.recipe ?? '')
        carry = rec ? ci.resources.get(rec.output.id)?.glyph ?? null : null
        tx = h.side > 0 ? cx + L.TRUNK_W / 2 + 4 : cx - L.TRUNK_W / 2 - 4; ty = h.y - 70; via = true
      } else if (h.id === 'apiary') {
        const bee = [...ci.producers.values()].find((p) => p.kind === 'lodge' && p.unlock.kind === 'annex' && p.unlock.id === 'apiary')
        count = bee ? Math.min(4, L.folkCount(s.producers[bee.id] ?? 0)) : 0
        carry = '🍯'; tx = h.x + h.side * 30; ty = h.y + 4
      }
      count = Math.min(count, budget); budget -= count
      while (h.walkers.length > count) h.walkers.pop()
      for (let i = 0; i < h.walkers.length; i++) h.walkers[i]!.retarget(h.x, h.y, tx, ty, carry, via)
      while (h.walkers.length < count) h.walkers.push(new Walker(h.x, h.y, tx, ty, carry, h.walkers.length + hash01(h.key) * 7, via))
    }
  }

  function refreshTip() {
    const s = game.s
    const top = L.topUpSlot(slots)
    const fromLine = top?.line ?? 0
    let toLine: number | null = null
    if (top) for (const b of ci.bands) if (b.direction === 'up' && b.index > top.index) { toLine = b.line; break }
    tipTarget = L.tipWorldY(slots, L.tipFraction(s.height, fromLine, toLine))
    if (firstFrame) { tipTween.from = tipTween.to = tipDisplay = tipTarget; tipTween.t = 1 }
    else if (Math.abs(tipTarget - tipTween.to) > 0.5) { tipTween.from = tipDisplay; tipTween.to = tipTarget; tipTween.t = 0; tipTween.dur = tipTarget > tipTween.to ? 1.2 : 0.6 }
  }
  function refreshTexts() {
    const s = game.s
    nameplate = `Season ${s.prestige.count + 1} · best ${fmt(Math.max(s.prestige.bestHeight, s.height), { int: true })} m${cos.title ? ' · ' + cos.title : ''}`
    const nb = game.nextBough()
    if (nb) {
      ghostName = nb.name
      const cost = ritualCost(ci, s, nb.id, game.fx)
      const parts = cost ? Object.entries(cost).map(([id, n]) => `${fmt(n, { int: true })} ${ci.resources.get(id)?.glyph ?? id}`) : []
      const season = nb.ritual?.requiresSeason && s.prestige.count < nb.ritual.requiresSeason ? ` · Season ${nb.ritual.requiresSeason + 1}` : ''
      ghostText = s.height < nb.line ? `GROW to ${fmt(nb.line, { int: true })} m · Ritual ${parts.join(' + ')}${season}` : `Ritual: ${parts.join(' + ')}${season}`
    } else { ghostName = ''; ghostText = '' }
  }

  /* ---------- juice helpers ---------- */
  function particleCap() { return rm() ? 150 : low() ? 200 : 300 }
  function ensureParticles() { const cap = particleCap(); if (ps.max !== cap) ps = new ParticleSystem(cap) }
  function tapBurst(x: number, y: number, crit: boolean) {
    const c = crit ? '#ffd166' : cos.tap.color
    if (rm()) { ps.burst(x, y, 4, { color: c, speed: 20, gravity: 0, life: 0.5, shape: 'circle', size: 6 }); return }
    const n = crit ? 22 : 9
    switch (cos.tap.particle) {
      case 'petals': ps.burst(x, y, n, { color: ['#ffd6e7', '#ff9fc2', c], speed: 140, gravity: 120, life: 1, shape: 'circle', size: 4 }); break
      case 'notes': for (let i = 0; i < Math.ceil(n / 3); i++) ps.text(x + (Math.random() - 0.5) * 30, y, i % 2 ? '♪' : '♫', { color: c, size: 14, life: 1, vy: -70 }); break
      case 'gold': ps.burst(x, y, n, { color: ['#ffd166', '#fff2a8', '#f4a82a'], speed: 240, shape: 'spark', size: 3, life: 0.6 }); break
      case 'runes': for (let i = 0; i < Math.ceil(n / 3); i++) ps.text(x + (Math.random() - 0.5) * 40, y, ['ᚱ', 'ᛉ', 'ᚦ', 'ᛟ'][i % 4]!, { color: c, size: 13, life: 0.9, vy: -60 }); break
      case 'ink': ps.burst(x, y, n, { color: ['#1b1b2a', '#2f2f4a', c], speed: 160, gravity: 260, shape: 'circle', size: 5, life: 0.7 }); break
      case 'stars': for (let i = 0; i < Math.ceil(n / 2); i++) ps.text(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 20, '✦', { color: c, size: 12, life: 0.8, vy: -50 }); break
      default: ps.burst(x, y, n, { color: [c, '#fff2a8', '#f4a82a'], speed: 220, shape: 'spark', size: 3, life: 0.6 })
    }
  }
  function leafBurst(x: number, y: number, n: number, color?: string) {
    const c = color ?? pal.leaf
    if (rm()) { ps.burst(x, y, Math.min(6, n), { color: c, speed: 20, gravity: 0, life: 0.8, shape: 'circle', size: 6 }); return }
    ps.burst(x, y, n, { color: [c, mix(c, '#fff', 0.3), mix(c, '#000', 0.25)], speed: 180, gravity: 180, life: 1.3, shape: 'square', size: 5 })
  }
  function doShake(n: number) { if (!rm()) shake.add(n) }
  function screenToWorldY(sy: number) { return L.screenToWorld(sy, cam.y, H) }
  function worldToScreenY(wy: number) { return L.worldToScreen(wy, cam.y, H) }
  function tipScreen() { return { x: cx, y: worldToScreenY(tipDisplay) } }

  /* ---------- events ---------- */
  function on<K extends keyof GameEvents>(k: K, h: (p: GameEvents[K]) => void) { unsub.push(game.events.on(k, h)) }
  on('strike', (r) => {
    let x = cx, y = worldToScreenY(tipDisplay) + 40
    if (typeof r.x === 'number' && typeof r.y === 'number' && r.x >= 0 && r.x <= W && r.y >= 0 && r.y <= H) { x = r.x; y = r.y }
    const wy = screenToWorldY(y)
    ripples.push({ x, y: wy, life: 0.5 })
    if (ripples.length > 12) ripples.shift()
    tapBurst(x, wy, r.crit)
    ps.text(x + (Math.random() - 0.5) * 20, wy - 16, `+${fmt(r.value)}`, { color: r.crit ? '#ffd166' : '#ffffff', size: r.crit ? 24 : 16, life: r.crit ? 1.3 : 0.9 })
    if (r.drop) ps.text(x + 24, wy - 4, `+${r.drop.amount} ${ci.resources.get(r.drop.id)?.glyph ?? ''}`, { color: '#c8f0ff', size: 13, life: 1 })
    if (r.crit) { edgeGlow = 1; haptic('heavy'); doShake(3) } else haptic('light')
    companionHop = 1
    stretch = 1.03
  })
  on('grow', (g) => {
    dirty = true
    stretch = 1.12
    cam.push = -Math.min(120, 18 * g.grows)
    const tp = tipScreen()
    leafBurst(cx, screenToWorldY(tp.y) - 10, Math.min(30, 8 + g.grows * 3))
    haptic('light')
  })
  on('line', (l) => {
    skyFrom = lastSky.slice() as [string, string]; skyFade = 0
    titleCard = { text: `${l.name} — ${fmt(ci.bandById.get(l.id)?.line ?? game.s.height, { int: true })} m`, life: 2.4 }
    for (const b of boughs) for (const c of b.critters) c.enter = 1
    haptic('medium')
  })
  on('ritual', (r) => {
    rebuild(); refreshTexts()
    const slot = slots.find((s) => s.id === r.id)
    const y = slot ? (slot.top + slot.bottom) / 2 : tipDisplay
    leafBurst(cx, y, 60)
    doShake(10); haptic('heavy')
    cam.ride(y, 1.8)
    ritualHold = 1
    for (const b of boughs) if (b.slot.id === r.id) for (const lm of b.landmarks) lm.pop = 1
  })
  on('producer', (p) => { dirty = true; const h = hutOf('lodge', p.id) ?? (ci.producers.get(p.id)?.station ? hutOf('workshop', ci.producers.get(p.id)!.station!) : null); if (h) { h.punch.trigger(0.15); leafBurst(h.x, h.y - 20, 6) } })
  on('milestoneMult', (m) => {
    const def = ci.producers.get(m.id)
    const h = hutOf('lodge', m.id) ?? (def?.station ? hutOf('workshop', def.station) : null)
    if (h) { h.punch.trigger(0.35); h.cheer = 1.5; leafBurst(h.x, h.y - 24, 24); dirty = true }
    haptic('medium')
  })
  on('workshop', () => { dirty = true; haptic('medium') })
  on('handcraft', (h) => {
    const hv = hutOf('workshop', h.station)
    if (!hv) return
    hv.punch.trigger(0.25)
    const rec = ci.recipes.get(ci.workshops.get(h.station)?.recipe ?? '')
    const glyph = rec ? ci.resources.get(rec.output.id)?.glyph ?? '' : ''
    ps.text(hv.x, hv.y - 34, `+${h.made} ${glyph}`, { color: h.masterwork ? '#c084fc' : '#fff', size: h.masterwork ? 18 : 13, life: 1 })
    if (h.masterwork) {
      hv.flash = 1; haptic('success')
      if (!rm()) for (let i = 0; i < 14; i++) ps.spawn({ x: cx + (Math.random() - 0.5) * 30, y: hv.y - i * 12, vx: (Math.random() - 0.5) * 20, vy: -160 - i * 8, gravity: 0, drag: 0.98, size: 4, color: i % 2 ? '#c084fc' : '#e9d5ff', maxLife: 0.9, shape: 'circle' })
    }
  })
  on('rune', (r) => { const rIdx = ci.raw.runes.findIndex((x) => x.id === r.id); const y = runeY(rIdx, r.tier - 1); ps.burst(cx, y, 12, { color: [pal.accent, '#fff'], speed: 90, gravity: 0, shape: 'circle', size: 3, life: 0.8 }); haptic('success') })
  on('annex', (a) => { dirty = true; const h = hutOf('annex', a.id); if (h) { h.punch.trigger(0.3); leafBurst(h.x, h.y - 20, 10) } })
  on('goal', (g) => { if (g.landmark) { dirty = true; setTimeout(() => { const lm = boughs.flatMap((b) => b.landmarks).find((l) => l.id === g.landmark); if (lm) { lm.pop = 1; ps.burst(lm.x, lm.y, 10, { color: '#c9b48a', speed: 60, gravity: 40, shape: 'circle', size: 4, life: 0.8 }) } }, 50) } else { const tp = tipScreen(); leafBurst(cx, screenToWorldY(tp.y), 12) } })
  on('milestone', (m) => {
    const c = m.def.cond
    const h = c.kind === 'producer' ? (hutOf('lodge', c.id) ?? (ci.producers.get(c.id)?.station ? hutOf('workshop', ci.producers.get(c.id)!.station!) : null)) : c.kind === 'workshop' ? hutOf('workshop', c.id) : null
    if (h) { h.punch.trigger(0.35); h.cheer = 1.5; leafBurst(h.x, h.y - 24, 24) }
    else { const tp = tipScreen(); leafBurst(cx, screenToWorldY(tp.y), m.def.celebration === 'big' ? 40 : 16) }
    if (m.def.celebration === 'big') doShake(6)
    haptic(m.def.celebration === 'small' ? 'light' : 'medium')
  })
  on('chestDropped', () => { const last = game.s.chests[game.s.chests.length - 1]; if (last) chestAnim.set(last.id, { taps: 0, shake: 0, drop: 1 }) })
  on('chest', () => { haptic('heavy') })
  on('setpiece', (e) => {
    if (e.kind === 'spawned') { spWobble = 0; haptic('light') }
    if (e.kind === 'progress') { spWobble = 1; if (e.paid) ps.text(spView.x, screenToWorldY(spView.y) - 30, `+${fmt(e.paid)}`, { color: '#ffd166', size: 14, life: 0.9 }); haptic('light') }
    if (e.kind === 'done') { ps.burst(spView.x, screenToWorldY(spView.y), 30, { color: ['#ffd166', '#fff2a8', pal.leaf], speed: 200, shape: 'square', size: 4, life: 1 }); haptic('success') }
  })
  on('turn', () => {
    // leaves shed from the top; the tree shrinks to a sapling through refreshTip
    const top = L.topUpSlot(slots)
    const y = top ? top.top + 60 : tipDisplay
    for (let i = 0; i < (rm() ? 10 : 60); i++) ps.spawn({ x: cx + (Math.random() - 0.5) * W * 0.8, y: y + Math.random() * L.BAND_H, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 80, gravity: 30, drag: 0.99, size: 5, color: i % 2 ? pal.leaf : '#e0892f', maxLife: 2.5, shape: 'square', rot: Math.random() * 6, vrot: (Math.random() - 0.5) * 6 })
    turnFade = 1
    chestAnim.clear()
    cam.snap()
    dirty = true
    doShake(8); haptic('heavy')
  })
  on('cosmetic', () => { cosKey = '' })
  on('bloom', () => { ps.burst(cx, tipDisplay + 80, 40, { color: ['#ff8fb8', '#ffd6e7', '#fff'], speed: 160, gravity: 100, shape: 'circle', size: 4, life: 1.2 }); haptic('medium') })
  on('droplet', (d) => { if (d.caught) { ps.burst(dropletPos.x, screenToWorldY(dropletPos.y), 16, { color: ['#ffb547', '#fff2a8'], speed: 150, shape: 'circle', size: 3, life: 0.8 }); ps.text(dropletPos.x, screenToWorldY(dropletPos.y) - 20, 'Crafting x2!', { color: '#ffb547', size: 15, life: 1.4 }); haptic('success') } })
  on('resonance', () => { resonanceRipple = 1; doShake(4); haptic('medium') })
  on('discovery', (d) => { discoveryFlash = d.success ? 1 : 0.5; if (d.success) haptic('success') })
  on('season', (ev) => { if (ev.kind === 'thawed') ps.text(cx, -80, `+${fmt(ev.sap)} thawed`, { color: '#bfe9ff', size: 14, life: 1.4 }); if (ev.kind === 'storm_charge') { const h = hutOf('annex', 'lightning_rod'); if (h) ps.burst(h.x, h.y - 40, 10, { color: '#8fe3ff', speed: 120, gravity: 0, shape: 'spark', size: 2, life: 0.5 }) } })
  on('night', () => { fireflies.length = 0 })
  on('firefly', (f) => { ps.text(cx, tipDisplay + 20, `+1 ✨ (${f.count}/${BALANCE.night.maxFireflies})`, { color: '#e9ff8a', size: 13, life: 1.1 }) })
  on('thaw', (th) => { ps.burst(cx - 140, -14, 24, { color: ['#bfe9ff', '#fff'], speed: 170, shape: 'square', size: 4, life: 1 }); ps.text(cx - 140, -50, `+${fmt(th.sap)}`, { color: '#bfe9ff', size: 16, life: 1.4 }); haptic('success') })
  on('offline', () => { dirty = true; cosKey = '' })

  function runeY(runeIndex: number, tier: number): number {
    const span = Math.max(220, -tipDisplay - L.STUMP_H - 80)
    return -L.STUMP_H - 40 - (((Math.max(0, runeIndex) * 5 + tier) * 41) % span)
  }

  /* ---------- pointer input ---------- */
  function local(e: PointerEvent): { x: number; y: number } {
    const r = canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  /** What sits under a canvas point (screen coords). */
  function classify(px: number, py: number): 'pill' | 'dot' | 'setpiece' | 'droplet' | 'firefly' | 'bloom' | 'chest' | 'frozen' | 'hut' | 'trunk' | null {
    const s = game.s
    const wy = screenToWorldY(py)
    if (cam.isAway(L.cameraFor(tipDisplay, H)) && L.hitRect(px, py, cx - 40, H - 44, 80, 32)) return 'pill'
    if (slots.length > 1 && px > W - 26 && dotAt(py) != null) return 'dot'
    if (s.setPiece && L.hitCircle(px, py, spView.x, spView.y, spView.hitR + 10)) return 'setpiece'
    if (dropletPos.visible && L.hitCircle(px, py, dropletPos.x, dropletPos.y, 30)) return 'droplet'
    if (game.isNight && fireflies.some((f) => f.alive && L.hitCircle(px, py, f.x, f.y, 22))) return 'firefly'
    if (s.bloom.active && Math.abs(wy - bloomFrontY) < 32) return 'bloom'
    for (let i = 0; i < Math.min(5, s.chests.length); i++) { const sl = L.CHEST_SLOTS[i]!; if (L.hitRect(px, wy, cx + sl.dx - 22, sl.y - 36, 44, 44)) return 'chest' }
    if (s.frost.frozenSeconds > 0 && L.hitRect(px, wy, cx - 140 - 22, -40, 44, 48)) return 'frozen'
    for (const b of boughs) for (const h of b.huts) if (L.hitRect(px, wy, h.x - 24, h.y - h.h - 24, 48, h.h + 30)) return 'hut'
    if (L.inTrunkBand(px, cx)) return 'trunk'
    return null
  }
  function dotAt(py: number): string | null {
    const order = dotOrder()
    for (let i = 0; i < order.length; i++) if (Math.abs(py - (60 + i * 20)) <= 11) return order[i]!.id
    return null
  }
  function dotOrder(): L.BoughSlot[] { return [...slots].sort((a, b) => (a.top + a.bottom) - (b.top + b.bottom)) }

  function activate(px: number, py: number) {
    const s = game.s
    const wy = screenToWorldY(py)
    switch (classify(px, py)) {
      case 'pill': cam.snap(); haptic('light'); return
      case 'dot': { const id = dotAt(py); if (id) { jumpToBough(id); haptic('light') } return }
      case 'setpiece': { game.tapSetPiece(); return }
      case 'droplet': { game.tapDroplet(); return }
      case 'firefly': {
        const fl = fireflies.find((f) => f.alive && L.hitCircle(px, py, f.x, f.y, 22))
        if (fl && game.tapFirefly()) { fl.alive = false; ps.burst(fl.x, screenToWorldY(fl.y), 8, { color: '#e9ff8a', speed: 80, gravity: 0, shape: 'circle', size: 2.5, life: 0.6 }); haptic('light') }
        return
      }
      case 'bloom': { if (game.tapBloomFront()) { ps.burst(px, wy, 14, { color: ['#ff8fb8', '#ffd6e7'], speed: 120, gravity: 60, shape: 'circle', size: 4, life: 0.9 }); haptic('light') } return }
      case 'chest': {
        for (let i = 0; i < Math.min(5, s.chests.length); i++) {
          const sl = L.CHEST_SLOTS[i]!, ch = s.chests[i]!
          if (!L.hitRect(px, wy, cx + sl.dx - 22, sl.y - 36, 44, 44)) continue
          const a = chestAnim.get(ch.id) ?? { taps: 0, shake: 0, drop: 0 }
          a.taps++; a.shake = 1; chestAnim.set(ch.id, a)
          haptic('light')
          if (a.taps >= BALANCE.chests.openTaps) {
            chestAnim.delete(ch.id)
            const r = game.openChest(ch.id)
            const x = cx + sl.dx, y = sl.y - 12
            ps.burst(x, y, 30, { color: ch.tier === 'star' ? ['#e9e6ff', '#fff'] : ['#ffd166', '#fff2a8', '#c9a24a'], speed: 220, shape: ch.tier === 'star' ? 'spark' : 'square', size: 4, life: 1 })
            if (r?.got) {
              let k = 0
              for (const [id, n] of Object.entries(r.got.resources ?? {})) ps.text(x, y - 20 - k++ * 16, `+${fmt(n)} ${ci.resources.get(id)?.glyph ?? ''}`, { color: '#fff', size: 14, life: 1.4 })
              if (r.got.fireflies) ps.text(x, y - 20 - k++ * 16, `+${r.got.fireflies} ✨`, { color: '#e9ff8a', size: 14, life: 1.4 })
              if (r.got.cosmetic) ps.text(x, y - 20 - k++ * 16, `${ci.cosmetics.get(r.got.cosmetic)?.glyph ?? '🎁'} ${ci.cosmetics.get(r.got.cosmetic)?.name ?? 'Cosmetic'}`, { color: '#c084fc', size: 14, life: 1.8 })
              if (r.got.token) ps.text(x, y - 20 - k++ * 16, `x${r.got.token.value} token`, { color: '#ffd166', size: 14, life: 1.6 })
            }
          }
          return
        }
        return
      }
      case 'frozen': { const r = game.tapFrozen(); haptic(r.done ? 'heavy' : 'light'); if (!r.done) ps.burst(cx - 140, -20, 4, { color: '#bfe9ff', speed: 60, gravity: 200, shape: 'square', size: 3, life: 0.5 }); return }
      case 'hut': {
        for (const b of boughs) for (const h of b.huts) {
          if (!L.hitRect(px, wy, h.x - 24, h.y - h.h - 24, 48, h.h + 30)) continue
          h.punch.trigger(0.2)
          if (h.kind === 'workshop') { const r = game.tapWorkshop(h.id); if (r.made > 0) haptic('light'); else { const st = game.starved[h.id]; if (st) ps.text(h.x, h.y - 40, `needs ${ci.resources.get(st)?.glyph ?? st}`, { color: '#ff7b7b', size: 12, life: 1 }) } }
          else if (h.kind === 'annex' && h.id === 'lightning_rod') { if (s.storm.charges > 0) { const n = game.dischargeRod(); if (n > 0) { ps.burst(h.x, h.y - 30, 30, { color: ['#8fe3ff', '#fff'], speed: 260, gravity: 0, shape: 'spark', size: 3, life: 0.5 }); doShake(5); haptic('heavy') } } }
          else { h.cheer = Math.max(h.cheer, 0.8); haptic('light') }
          return
        }
        return
      }
      case 'trunk': strikeAt(px, py); return
      default: return
    }
  }
  function strikeAt(px: number, py: number) { game.strike(px, py) }

  function onDown(e: PointerEvent) {
    if (destroyed) return
    e.preventDefault()
    const { x, y } = local(e)
    try { canvas.setPointerCapture(e.pointerId) } catch { /* not supported */ }
    const p: Pointer = { id: e.pointerId, x0: x, y0: y, x, y, t0: performance.now(), dragging: false, struck: false, rally: false, timer: null }
    pointers.set(e.pointerId, p)
    if (primary && pointers.has(primary.id)) {
      // secondary finger: instant tap on the trunk only (multi-finger tapping)
      if (classify(x, y) === 'trunk') { strikeAt(x, y); p.struck = true }
      return
    }
    primary = p
    if (classify(x, y) === 'trunk') {
      strikeAt(x, y); p.struck = true
      p.timer = setTimeout(() => {
        p.timer = null
        if (p.dragging || !pointers.has(p.id)) return
        if (game.rallyUnlocked) { p.rally = true; game.setRally(true); haptic('medium') }
      }, L.HOLD_MS)
    }
  }
  function onMove(e: PointerEvent) {
    const p = pointers.get(e.pointerId)
    if (!p) return
    const { x, y } = local(e)
    p.x = x; p.y = y
    if (p !== primary) return
    const now = performance.now() / 1000
    if (!p.dragging && Math.hypot(x - p.x0, y - p.y0) > L.TAP_SLOP) {
      p.dragging = true
      if (p.timer) { clearTimeout(p.timer); p.timer = null }
      if (p.rally) { p.rally = false; game.setRally(false) }
      cam.beginDrag(y, now)
    }
    if (p.dragging) cam.drag(y, now)
  }
  function onUp(e: PointerEvent) {
    const p = pointers.get(e.pointerId)
    if (!p) return
    pointers.delete(e.pointerId)
    try { canvas.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    if (p.timer) { clearTimeout(p.timer); p.timer = null }
    if (p.rally) { p.rally = false; game.setRally(false) }
    if (p === primary) {
      primary = null
      if (p.dragging) cam.endDrag(performance.now() / 1000)
      else if (!p.struck && e.type !== 'pointercancel') activate(p.x, p.y)
    }
  }
  canvas.style.touchAction = 'none'
  ;(canvas.style as unknown as Record<string, string>)['webkitUserSelect'] = 'none'
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  const onCtx = (e: Event) => e.preventDefault()
  canvas.addEventListener('contextmenu', onCtx)

  /* ---------- per-frame update ---------- */
  function update(dt: number) {
    const s = game.s
    ensureParticles()
    refreshCosmetics()
    if (dirty) rebuild()
    secondAcc += dt
    if (secondAcc >= 1) { secondAcc = 0; refreshPalette(); refreshTexts(); refreshTip(); if (boughs.length !== s.boughs.length) dirty = true; const lit = game.litBoughs; if (boughs.some((b, i) => b.lit !== (i < lit))) dirty = true }
    // tip tween (ease-out-back on growth, ease-out-cubic on shrink)
    if (tipTween.t < 1) { tipTween.t = Math.min(1, tipTween.t + dt / tipTween.dur); const k = tipTween.to < tipTween.from ? (rm() ? ease.outCubic(tipTween.t) : ease.outBack(tipTween.t)) : ease.outCubic(tipTween.t); tipDisplay = tipTween.from + (tipTween.to - tipTween.from) * k }
    stretch += (1 - stretch) * Math.min(1, 6 * dt)
    const followY = L.cameraFor(tipDisplay, H)
    const bounds = L.cameraBounds(slots, tipDisplay, H)
    cam.setBounds(bounds.min, bounds.max)
    if (firstFrame) { cam.jumpTo(followY); firstFrame = false }
    cam.update(dt, followY)
    shake.update(dt)
    ps.update(dt)
    nightAmt += ((game.isNight ? 1 : 0) - nightAmt) * Math.min(1, 1.2 * dt)
    if (skyFade < 1) skyFade = Math.min(1, skyFade + dt / 1.5)
    const decay = (v: number, k: number) => Math.max(0, v - dt * k)
    edgeGlow = decay(edgeGlow, 2.2); discoveryFlash = decay(discoveryFlash, 1.2); resonanceRipple = decay(resonanceRipple, 0.8); companionHop = decay(companionHop, 3); ritualHold = decay(ritualHold, 0.7); turnFade = decay(turnFade, 0.6); spWobble = decay(spWobble, 2)
    if (titleCard.life > 0) titleCard.life -= dt
    for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]!; r.life -= dt; if (r.life <= 0) ripples.splice(i, 1) }
    // sky layers
    seasonLayer.configure(pal.particle ? 'season' : 'none', pal.particle || '#fff', pal.particleGlyph, W, H, low())
    cosmeticLayer.configure(cos.sky?.particle ?? 'none', cos.sky ? mix(cos.sky.top, '#fff', 0.6) : '#fff', undefined, W, H, low())
    if (!rm()) { seasonLayer.update(dt); cosmeticLayer.update(dt) }
    // walkers, critters, huts
    const sprint = s.resonanceUntil > game.now ? 2.2 : (s.rally.holding && s.rally.stamina > 0 ? 1.6 : 1)
    const visible = L.visibleSlots(slots, cam.y, H)
    for (const b of boughs) {
      if (!visible.includes(b.slot)) continue
      for (const c of b.critters) { c.x += c.vx * dt; c.p += dt; if (c.enter > 0) c.enter = Math.max(0, c.enter - dt / 1.5); if (c.x < -30) { c.x = W + 20 } else if (c.x > W + 30) { c.x = -20 } }
      for (const h of b.huts) { h.punch.update(dt); h.flash = decay(h.flash, 1.5); h.cheer = decay(h.cheer, 1); for (const w of h.walkers) w.update(dt, sprint) }
      for (const lm of b.landmarks) lm.pop = decay(lm.pop, 1.5)
    }
    // chests
    for (const [id, a] of chestAnim) { a.shake = decay(a.shake, 4); a.drop = decay(a.drop, 1.7); if (!s.chests.some((c) => c.id === id)) chestAnim.delete(id) }
    // fireflies (screen-space, only at night, only while the night cap allows)
    if (game.isNight && s.nightFireflies < BALANCE.night.maxFireflies) {
      const want = Math.min(6, BALANCE.night.maxFireflies - s.nightFireflies)
      let alive = 0
      for (const f of fireflies) if (f.alive) alive++
      while (alive < want && fireflies.length < 12) { fireflies.push({ x: Math.random() * W, y: H * 0.15 + Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, p: Math.random() * 6, alive: true }); alive++ }
      for (const f of fireflies) { if (!f.alive) { f.p += dt; if (f.p > 2) { f.alive = true; f.x = Math.random() * W; f.y = H * 0.15 + Math.random() * H * 0.6 } continue } f.p += dt; f.x += (f.vx + Math.sin(f.p * 1.7) * 20) * dt; f.y += (f.vy + Math.cos(f.p * 1.3) * 16) * dt; if (f.x < 10 || f.x > W - 10) f.vx = -f.vx; if (f.y < 20 || f.y > H - 40) f.vy = -f.vy }
    } else fireflies.length = 0
    // bloom front world y
    if (s.bloom.active && slots.length) {
      const pos = (game.now - s.bloom.startedAt) / BALANCE.bloom.perBough
      const i = Math.max(0, Math.min(slots.length - 1, Math.floor(pos))), j = Math.min(slots.length - 1, i + 1)
      const a = slots[i]!, b = slots[j]!, fr = Math.min(1, pos - i)
      bloomFrontY = ((a.top + a.bottom) / 2) * (1 - fr) + ((b.top + b.bottom) / 2) * fr
    }
  }

  /* ---------- draw ---------- */
  let lastSky: [string, string] = ['#1a2340', '#3b4a6b']
  function draw() {
    if (!ctx) return
    const s = game.s
    const f: Frame = { ctx, W, H, cx, t, dt: 0, now: game.now, night: nightAmt, cos, pal, reducedMotion: rm(), low: low(), camY: cam.y, glows, thrum: s.thrum / 100 }
    glows.reset()
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // sky
    const band = game.sky
    let top = band.sky[0], bottom = band.sky[1]
    if (skyFrom && skyFade < 1) { const k = ease.inOutSine(skyFade); top = mix(skyFrom[0], top, k); bottom = mix(skyFrom[1], bottom, k) }
    lastSky = [top, bottom]
    drawSky(f, top, bottom)
    cosmeticLayer.draw(f)
    seasonLayer.draw(f)
    // world
    ctx.save()
    ctx.translate(shake.x, -cam.y + H / 2 + shake.y)
    const visible = L.visibleSlots(slots, cam.y, H)
    const bark = pal.bark
    const topVisible = screenToWorldY(-40), bottomVisible = screenToWorldY(H + 40)
    // backdrops + ghost
    for (const b of boughs) if (visible.includes(b.slot)) drawBoughBackdrop(f, b.slot, leafFor(b.band))
    const nb = game.nextBough()
    if (nb) { const g = L.ghostSlot(slots, nb.direction); if (g.bottom >= topVisible && g.top <= bottomVisible) drawGhost(f, g.lineY, nb.direction, ghostName, ghostText, nb.leaf) }
    // roots below the stump
    if (bottomVisible > 0) drawRoots(f, bark, Object.values(s.prestige.nodes).reduce((a, n) => a + n, 0), slots.some((x) => x.dir === 'down') ? L.ROOT_GAP + 20 : 140)
    // leaf clouds behind limbs, then limbs
    for (const b of boughs) {
      if (!visible.includes(b.slot)) continue
      const leaf = leafFor(b.band)
      for (let k = 0; k < b.limbs.length; k++) {
        const l = b.limbs[k]!
        if (b.slot.dir === 'up') drawLeafCloud(f, l.x1, l.y1, `${b.slot.id}${k}`, leaf, cos.tree.leafShape, 1 + (k % 2) * 0.15, rm() ? 0 : Math.sin(t * 0.8 + k) * 2)
        drawLimb(f, l, bark)
      }
    }
    // trunk (from ground up to the tip) and root trunk through the down bands
    drawTrunk(f, Math.max(topVisible, tipDisplay), Math.min(0, bottomVisible) - 0, tipDisplay, bark, stretch)
    if (slots.some((x) => x.dir === 'down')) { const deepest = Math.max(...slots.filter((x) => x.dir === 'down').map((x) => x.bottom)); ctx.fillStyle = bark; ctx.beginPath(); ctx.moveTo(cx - 30, 0); ctx.quadraticCurveTo(cx - 24, deepest * 0.5, cx - 12, deepest); ctx.lineTo(cx + 12, deepest); ctx.quadraticCurveTo(cx + 24, deepest * 0.5, cx + 30, 0); ctx.closePath(); ctx.fill() }
    // bark ripples from strikes
    for (const r of ripples) { const p = 1 - r.life / 0.5; ctx.strokeStyle = rgba('#fff2a8', (1 - p) * 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(r.x, r.y, 6 + p * 30, 3 + p * 12, 0, 0, 6.283); ctx.stroke() }
    // runes carved on the bark
    for (const [id, tier] of Object.entries(s.runes)) {
      if (tier <= 0) continue
      const idx = ci.raw.runes.findIndex((r) => r.id === id)
      for (let k = 0; k < tier; k++) { const y = runeY(idx, k); if (y < tipDisplay + 24 || y < topVisible || y > bottomVisible) continue; drawRune(f, cx + (hash01(id, k) - 0.5) * 36, y, idx * 13 + k, pal.accent) }
    }
    // lantern strings on lit boughs, landmarks, huts, folk
    for (const b of boughs) {
      if (!visible.includes(b.slot)) continue
      if (b.lit && b.limbs.length >= 2) { const a = b.limbs[0]!, c = b.limbs[1]!; drawLanternString(f, a.x1, a.y1 - 6, c.x1, c.y1 - 6, 5, b.slot.index) }
      for (const lm of b.landmarks) { ctx.save(); if (lm.pop > 0) { const k = 1 + 0.4 * lm.pop; ctx.translate(lm.x, lm.y); ctx.scale(k, k); ctx.translate(-lm.x, -lm.y) } drawLandmark(f, lm.id, lm.x, lm.y, lm.side); ctx.restore() }
      for (const h of b.huts) {
        const count = h.kind === 'lodge' ? (s.producers[h.id] ?? 0) : h.kind === 'workshop' ? (s.producers[ci.crewByStation.get(h.id)?.id ?? ''] ?? 0) : (s.annexLevels[h.id] ?? 1) * 10
        const tier = L.hutTier(count)
        const starved = h.kind === 'workshop' ? game.starved[h.id] : null
        drawHut(f, h.x, h.y, h.w, h.h, tier, { kind: h.kind, glyph: h.glyph, dim: !!starved, starvedGlyph: starved ? ci.resources.get(starved)?.glyph ?? '?' : null, flash: h.flash, punch: h.punch.scale, storm: h.id === 'lightning_rod', charges: s.storm.charges })
        if (tier.lanterns) drawFolk(f, h.x + h.side * 26, h.y, 8, { hat: cos.hat.hat, hatColor: cos.hat.color }, { chief: true, cloak: cos.chief.cloak, trim: cos.chief.trim, cheer: h.cheer, flip: h.side < 0, phase: t * 2 })
        for (let i = 0; i < h.walkers.length; i++) {
          const w = h.walkers[i]!
          w.pos(walkerPos)
          drawFolk(f, walkerPos.x, walkerPos.y + (i % 3) * 2, 6, { hat: cos.hat.hat, hatColor: cos.hat.color }, { carry: walkerPos.carrying ? w.carry : null, cheer: h.cheer, sprint: sprint(s), flip: walkerPos.flip, phase: w.phase * 12 + i, lantern: i % 2 === 0 })
        }
      }
      for (const c of b.critters) drawCritter(f, c)
    }
    // stump, nameplate, chests, frozen bundle
    if (bottomVisible > -L.STUMP_H - 40 && topVisible < 60) {
      const jar = Math.round((BALANCE.offline.capHours + (game.fx.add['offline_cap_add'] ?? 0)) * (0.5 + (BALANCE.offline.rate + (game.fx.add['offline_rate_add'] ?? 0))))
      drawStump(f, bark, s.prestige.count, nameplate, s.cosmetics.supporter && s.cosmetics.initials ? s.cosmetics.initials : null, jar, s.cosmetics.supporter)
      for (let i = 0; i < Math.min(5, s.chests.length); i++) { const ch = s.chests[i]!, sl = L.CHEST_SLOTS[i]!, a = chestAnim.get(ch.id); drawChest(f, cx + sl.dx, sl.y, ch.tier, a?.taps ?? 0, a?.shake ?? 0, a?.drop ?? 0) }
      if (s.frost.frozenSeconds > 0) drawFrozen(f, cx - 140, 0, s.frost.thawTaps / BALANCE.frost.thawTaps)
      if (discoveryFlash > 0) { const k = Math.abs(Math.cos(discoveryFlash * Math.PI * 2)); ctx.save(); ctx.translate(cx, -L.STUMP_H - 40); ctx.scale(Math.max(0.05, k), 1); ctx.fillStyle = rgba('#ffe9b0', 0.9 * Math.min(1, discoveryFlash * 2)); roundRect(ctx, -26, -18, 52, 36, 6); ctx.fill(); ctx.fillStyle = '#5a3b22'; ctx.font = `800 14px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', 0, 0); ctx.restore(); f.glows.add(cx, -L.STUMP_H - 40, 50, '#ffe9b0', discoveryFlash) }
    }
    // tip: crown ornament, companion, thrum ring, rally arc
    const tipS = tipScreen()
    if (tipS.y > -80 && tipS.y < H + 80) {
      drawCrownOrnament(f, cx, tipDisplay, cos.crown.ornament, cos.crown.color)
      if (cos.companion) { const side = Math.sin(t * 0.35) > 0 ? 1 : -1; const px = L.trunkEdge(tipDisplay + 70, side as -1 | 1, cx) + side * 10 + Math.sin(t * 0.7) * 6; drawCompanion(f, px, tipDisplay + 72, cos.companion.pet, cos.companion.color, companionHop, side < 0) }
      if (game.thrumUnlocked) drawThrumRing(f, cx, tipDisplay + 34, s.thrum / 100, cos.meter, s.resonanceUntil > game.now)
      if (game.rallyUnlocked && (s.rally.holding || s.rally.stamina < 0.999)) drawRallyArc(f, cx, tipDisplay + 34, s.rally.stamina, s.rally.holding && game.now - s.rally.since >= BALANCE.rally.holdMs / 1000)
      if (resonanceRipple > 0) { const p = 1 - resonanceRipple; ctx.strokeStyle = rgba('#ffd166', (1 - p) * 0.8); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, tipDisplay + 34, 30 + p * H * 0.9, 0, 6.283); ctx.stroke() }
      if (ritualHold > 0) { ctx.strokeStyle = rgba('#fff', ritualHold * 0.7); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, tipDisplay + 34, 60 + (1 - ritualHold) * 120, 0, 6.283); ctx.stroke() }
    }
    // bloom front
    if (s.bloom.active && bloomFrontY > topVisible && bloomFrontY < bottomVisible) drawBloomFront(f, bloomFrontY)
    // particles (world space)
    ps.draw(ctx)
    ctx.restore()
    // night, then glows (screen space; convert world glows through the camera)
    drawNightOverlay(f)
    ctx.save(); ctx.translate(shake.x, -cam.y + H / 2 + shake.y); drawGlows(f); ctx.restore()
    // screen-space actors: set-piece, droplet, fireflies
    glows.reset()
    drawScreenActors(f)
    drawGlows(f)
    drawHud(f)
  }
  const sprint = (s: Game['s']) => s.resonanceUntil > game.now

  function drawScreenActors(f: Frame) {
    const s = game.s
    if (s.setPiece) {
      const sp = s.setPiece
      const def = ci.setPieces.get(sp.id)
      const special = def?.special ?? (sp.id === 'gust' ? 'gust' : undefined)
      const seconds = def ? Math.min(def.seconds, BALANCE.setPieces.maxOnScreen) : (sp.id === 'gust' ? BALANCE.wind.seconds : 15)
      const left = Math.max(0, sp.expiresAt - game.now)
      const progress = 1 - left / Math.max(0.1, seconds)
      spView.id = sp.id; spView.special = special; spView.taps = def?.taps ?? (sp.id === 'gust' ? BALANCE.wind.leaves : 1); spView.tapsDone = sp.tapsDone
      spView.frac = left / Math.max(0.1, seconds); spView.progress = progress; spView.glyph = def?.glyph ?? '✨'; spView.wobble = spWobble
      spView.hitR = special === 'star' ? 52 : 44
      if (special === 'star') { spView.x = W * (0.05 + 0.9 * progress); spView.y = H * (0.12 + sp.y * 0.4) + Math.sin(progress * 3) * 10 }
      else if (special === 'woodpecker') { spView.x = cx + 34; spView.y = H * Math.max(0.15, Math.min(0.6, sp.y)) }
      else { spView.x = W * Math.max(0.15, Math.min(0.85, sp.x)); spView.y = H * Math.max(0.12, Math.min(0.62, sp.y)) }
      drawSetPiece(f, spView)
    }
    if (s.droplet && s.droplet.until > game.now) {
      const p = 1 - (s.droplet.until - game.now) / BALANCE.tap.dropletSeconds
      const ty = L.worldToScreen(tipDisplay, cam.y, H)
      const y0 = Math.max(20, Math.min(H * 0.5, ty + 40))
      dropletPos = { x: cx + Math.sin(p * 9) * 26, y: y0 + p * (H - y0 - 30) - Math.abs(Math.sin(p * 9)) * 22, visible: true }
      drawDroplet(f, dropletPos.x, dropletPos.y)
    } else dropletPos.visible = false
    if (game.isNight) for (const fl of fireflies) if (fl.alive) drawFirefly(f, fl)
  }

  function drawHud(f: Frame) {
    const s = game.s
    const c = ctx!
    // crit edge glow
    if (edgeGlow > 0) { c.save(); c.strokeStyle = rgba('#ffd166', 0.9 * edgeGlow); c.lineWidth = 26; c.shadowBlur = 40; c.shadowColor = '#ffd166'; roundRect(c, -8, -8, W + 16, H + 16, 30); c.stroke(); c.restore() }
    // snowfall / storm tint
    if (s.frost.snowUntil > game.now) { c.fillStyle = rgba('#dff3ff', 0.08); c.fillRect(0, 0, W, H) }
    if (s.storm.activeUntil > game.now) { const fl = Math.random() < 0.02 ? 0.35 : 0; c.fillStyle = rgba('#3a3f5c', 0.18 + fl); c.fillRect(0, 0, W, H) }
    // Turn fade
    if (turnFade > 0) { c.fillStyle = rgba('#fff8e8', turnFade * 0.8); c.fillRect(0, 0, W, H) }
    // title card
    if (titleCard.life > 0) {
      const a = Math.min(1, titleCard.life / 0.6, (2.4 - titleCard.life) / 0.4)
      c.fillStyle = rgba('#000', 0.45 * a); roundRect(c, cx - 110, H * 0.28 - 22, 220, 44, 12); c.fill()
      c.fillStyle = rgba('#fff', a); c.font = `800 18px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(titleCard.text, cx, H * 0.28)
    }
    // "Now" pill
    const followY = L.cameraFor(tipDisplay, H)
    if (cam.isAway(followY)) {
      c.fillStyle = rgba('#000', 0.55); roundRect(c, cx - 40, H - 44, 80, 32, 16); c.fill()
      c.strokeStyle = rgba('#ffd166', 0.8); c.lineWidth = 1.5; roundRect(c, cx - 40, H - 44, 80, 32, 16); c.stroke()
      c.fillStyle = '#fff'; c.font = `700 13px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText(`${cam.y > followY ? '▲' : '▼'} Now`, cx, H - 28)
    }
    // bough-jump dots on the right edge
    if (slots.length > 1) {
      const order = dotOrder()
      for (let i = 0; i < order.length; i++) {
        const sl = order[i]!, y = 60 + i * 20
        const here = cam.y >= sl.top && cam.y <= sl.bottom
        c.fillStyle = here ? '#ffd166' : rgba('#fff', 0.45)
        c.beginPath(); c.arc(W - 12, y, here ? 5 : 3.5, 0, 6.283); c.fill()
      }
    }
    // night vignette + fireflies hint
    if (nightAmt > 0.5 && fireflies.some((x) => x.alive)) { c.fillStyle = rgba('#e9ff8a', 0.8); c.font = `600 11px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(`✨ ${s.nightFireflies}/${BALANCE.night.maxFireflies}`, 10, H - 16) }
  }

  /* ---------- loop ---------- */
  function frame(ts: number) {
    if (destroyed) return
    raf = requestAnimationFrame(frame)
    if (typeof document !== 'undefined' && document.hidden) { lastTs = ts; return }
    if (lastTs === 0) lastTs = ts
    const dt = Math.min(0.1, Math.max(0, (ts - lastTs) / 1000))
    lastTs = ts
    t += dt
    // 30 fps gate in battery / low-quality modes (the sim keeps its own clock; we just skip frames)
    const minFrame = low() ? 1 / 30 - 0.004 : 0
    pendingDt += dt
    if (ts - lastDraw < minFrame * 1000) return
    lastDraw = ts
    const step = pendingDt; pendingDt = 0
    if (canvas.clientWidth !== W || canvas.clientHeight !== H) resize()
    update(step)
    draw()
  }
  let pendingDt = 0

  /* ---------- public API ---------- */
  function jumpToBough(bandId: string) {
    const sl = slots.find((x) => x.id === bandId)
    if (!sl) return
    cam.ride((sl.top + sl.bottom) / 2, 0.8, false)
  }

  resize()
  if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => resize()); ro.observe(canvas) }
  refreshPalette(); rebuild(); refreshTexts(); refreshTip()
  raf = requestAnimationFrame(frame)

  return {
    destroy() {
      destroyed = true
      cancelAnimationFrame(raf)
      for (const u of unsub) u()
      unsub.length = 0
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('contextmenu', onCtx)
      ro?.disconnect()
      for (const p of pointers.values()) { if (p.timer) clearTimeout(p.timer); if (p.rally) game.setRally(false) }
      pointers.clear()
    },
    setQuality(q) { quality = q },
    scrollToTip() { cam.snap() },
    jumpToBough,
    preview(id) { previewId = id; cosKey = ''; refreshCosmetics(); refreshPalette(); refreshTexts() },
    renderSeasonCard() { refreshCosmetics(); refreshPalette(); return renderSeasonCard({ game, cos, pal, night: nightAmt, sky: [game.sky.sky[0], game.sky.sky[1]] }) },
    resize,
  }
}
