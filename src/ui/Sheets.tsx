import { useState } from 'preact/hooks'
import { signal } from '@preact/signals'
import { game, frame, sheet, returnBoard, goTo } from './store'
import { Sheet, Bar, toast } from './primitives'
import { Row, Small, BuyButton, CostLine } from './cards'
import { fmt, fmtDuration } from '@/engine/numbers'
import { rewardText, awayText, roman } from './helpers'
import { conditionProgress } from '@/systems/unlock'
import { setHapticsEnabled } from '@/engine/haptics'
import { setSoundEnabled } from '@/engine/audio'
import { pwaInstall } from './share'
import { ritualCost } from '@/systems/grow'
import { costText } from './helpers'

/** Unlock cards raised from game events. */
export const unlockQueue = signal<{ id: number; title: string; body: string; action?: { label: string; run: () => void } }[]>([])
let uid = 1
export function raiseCard(title: string, body: string, action?: { label: string; run: () => void }) { unlockQueue.value = [...unlockQueue.value.slice(-2), { id: uid++, title, body, action }] }

export function Sheets() {
  void frame.value
  const open = sheet.value
  const close = () => (sheet.value = null)
  return (
    <>
      <Sheet open={open === 'waystone'} onClose={close} title="Road ahead"><RoadAhead /></Sheet>
      <Sheet open={open === 'return'} onClose={close} title="Nightwatch"><ReturnBoard /></Sheet>
      <Sheet open={open === 'crucible'} onClose={close} title="Crucible & Codex" wide><Crucible /></Sheet>
      <Sheet open={open === 'settings'} onClose={close} title="Settings"><Settings /></Sheet>
      <Sheet open={open === 'stats'} onClose={close} title="Stats & Codex"><Stats /></Sheet>
      <Sheet open={open === 'caravan'} onClose={close} title="Caravan"><Caravan /></Sheet>
      <Sheet open={open === 'ladder'} onClose={close} title="The tree"><Ladder /></Sheet>
      <UnlockCards />
    </>
  )
}

function UnlockCards() {
  const q = unlockQueue.value
  const c = q[0]
  if (!c) return null
  const dismiss = () => (unlockQueue.value = q.filter((x) => x.id !== c.id))
  return (
    <div class="unlock-card" role="status">
      <div class="grow1"><div class="title">{c.title}</div><Small>{c.body}</Small></div>
      {c.action && <button class="btn btn-primary sm" onClick={() => { c.action!.run(); dismiss() }}>{c.action.label}</button>}
      <button class="btn btn-ghost sm" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  )
}

function RoadAhead() {
  const g = game.pinned
  const ci = game.ci
  const legacy = game.legacyNext()
  return (
    <div class="tab-body">
      {g && <Row><div class="grow1"><div class="title">{g.glyph} {g.name}</div><Small>{g.ready ? 'Ready now' : Number.isFinite(g.eta) && g.eta > 0 ? `~${fmtDuration(g.eta)}` : ''}{g.advice ? ` · ${g.advice.text}` : ''}{g.reward ? ` · ${g.reward}` : ''}</Small></div><button class="btn sm" onClick={() => { goTo(g.tab === 'rings' ? 'season' : g.tab === 'wardrobe' ? 'more' : g.tab, g.target ?? g.id); sheet.value = null }}>Go</button></Row>}
      <h3 class="h">Then</h3>
      {game.upcomingGoals(3).map((u, i) => <Row key={u.id}><div class="grow1"><div>#{game.s.laneIndex + 2 + i} {u.name}</div><Small>{rewardText(ci, u.reward)}</Small></div></Row>)}
      {game.then.map((t) => <Row key={t.id}><div class="grow1"><div>{t.glyph} {t.name}</div><Small>{Number.isFinite(t.eta) ? `~${fmtDuration(t.eta)}` : ''}</Small></div></Row>)}
      {legacy && <><h3 class="h">Legacy</h3><Row><div class="grow1"><div>{legacy.name}</div>{(() => { const p = conditionProgress(ci, game.s, legacy.cond); return <Bar value={p.have} max={p.need} height={6} /> })()}</div></Row></>}
      {game.s.wishes.list.length > 0 && <><h3 class="h">Wishes</h3>{game.s.wishes.list.map((w) => { const d = ci.wishes.get(w.id); const p = game.wishProgress(w.id); return d ? <Row key={w.id}><div class="grow1"><div>{w.done ? '✅ ' : ''}{d.name}</div>{p && !w.done && <Bar value={p.have} max={p.need} height={6} />}</div><span class="chip">✨{d.fireflies}</span></Row> : null })}</>}
    </div>
  )
}

function ReturnBoard() {
  const b = returnBoard.value
  if (!b) return <Small>Welcome back.</Small>
  const ci = game.ci
  const rows = Object.entries(b.summary.gained).filter(([, n]) => n >= 1).sort((x, y) => (ci.resources.get(y[0])?.worth ?? 0) * y[1] - (ci.resources.get(x[0])?.worth ?? 0) * x[1]).slice(0, 8)
  const crafted = Object.entries(b.summary.crafted).filter(([, n]) => n >= 1)
  return (
    <div class="tab-body">
      <div class="title">Away {awayText(b.summary.elapsed)} — Nightwatch haul</div>
      <Small>{Math.round(b.summary.rate * 100)}% rate for {fmtDuration(b.summary.simulated)}{b.summary.capped ? ' (cap reached)' : ''}</Small>
      {rows.map(([id, n]) => <Row key={id}><span>{ci.resources.get(id)?.glyph} {ci.resources.get(id)?.name}</span><b class="num">+{fmt(n, { int: true })}</b></Row>)}
      {crafted.length > 0 && <Small>Crafted: {crafted.map(([id, n]) => `${fmt(n, { int: true })} ${ci.resources.get(id)?.name}`).join(', ')}</Small>}
      {b.chest && <Small>🎁 A {b.chest} chest waits on the tree.</Small>}
      {b.morningDew && <Small>🌅 Morning Dew: +{b.morningDew.glimmer} Glimmer, +{b.morningDew.fireflies} Fireflies · streak {b.streak} day{b.streak === 1 ? '' : 's'}</Small>}
      <Small>☀️ Dawn Rush: strikes x3 for a minute.</Small>
      {b.reachable ? <button class="btn btn-primary" onClick={() => { if (b.reachable!.kind === 'line') game.grow('max'); else game.performRitual(game.nextBough()!.id); sheet.value = null }}>You can reach {b.reachable.name} right now →</button> : b.growsAffordable > 0 ? <button class="btn btn-primary" onClick={() => { game.grow('max'); sheet.value = null }}>GROW {fmt(b.growsAffordable, { int: true })} times</button> : null}
      <button class="btn" onClick={() => (sheet.value = null)}>Collect</button>
    </div>
  )
}

function Crucible() {
  const s = game.s, ci = game.ci
  const hints = game.hints()
  const [slots, setSlots] = useState<string[]>([])
  const owned = ci.raw.resources.filter((r) => (s.res[r.id] ?? 0) >= 1 && r.tier > 0)
  return (
    <div class="tab-body">
      {hints.length === 0 && <Small>No hints right now. Hints appear when you own all-but-one input of a cross-chain recipe and its bough is open.</Small>}
      {hints.map((h) => {
        const out = ci.resources.get(h.recipe.output.id)!
        const total = Object.keys(h.recipe.inputs).length
        return (
          <div key={h.recipe.id} class="card">
            <div class="title">🔮 {h.recipe.hint ?? `? → ${out.name}`}</div>
            <Small>Known: {h.known.map((k) => `${ci.resources.get(k)?.glyph} ${h.recipe.inputs[k]} ${ci.resources.get(k)?.name}`).join(' + ')}{h.hidden.length ? ` + ${h.hidden.length} more` : ''} · attempts {h.attempts}/3 (third is guaranteed)</Small>
            <div class="chips">{owned.map((r) => <button key={r.id} class={`chip btnchip${slots.includes(r.id) ? ' on' : ''}`} onClick={() => setSlots(slots.includes(r.id) ? slots.filter((x) => x !== r.id) : slots.length < total ? [...slots, r.id] : slots)}>{r.glyph} {r.name}</button>)}</div>
            <button class="btn btn-primary" disabled={slots.length !== total} onClick={() => { const r = game.crucible(h.recipe.id, slots); setSlots([]); toast(r.success ? `Discovered ${h.recipe.name}! +${r.fireflies} ✨` : `Not quite — ${r.revealed ? `${ci.resources.get(r.revealed)?.name} is in it` : 'try again'}`, r.success ? 'reward' : 'info', r.success ? '📖' : '🔮') }}>Attempt with {slots.length}/{total} goods</button>
          </div>
        )
      })}
      <h3 class="h">Codex</h3>
      {ci.raw.recipes.filter((r) => r.discover).map((r) => <Row key={r.id}><span>{s.codex.discovered.includes(r.id) ? '📖' : '📕'} {r.name}</span><Small>{s.codex.discovered.includes(r.id) ? Object.entries(r.inputs).map(([i, n]) => `${n} ${ci.resources.get(i)?.name}`).join(' + ') : '???'}</Small></Row>)}
      {s.landmarks.length > 0 && <Small>Landmarks: {s.landmarks.map((l) => ci.landmarks.get(l)?.name).join(', ')}</Small>}
    </div>
  )
}

function Settings() {
  const st = game.s.settings
  const [, bump] = useState(0)
  const toggle = (k: keyof typeof st) => { (st as any)[k] = !st[k]; if (k === 'haptics') setHapticsEnabled(st.haptics); if (k === 'sound') setSoundEnabled(st.sound); game.save(); bump((x) => x + 1) }
  const T = ({ k, label }: { k: keyof typeof st; label: string }) => <Row><span>{label}</span><button class={`btn sm${st[k] ? ' btn-good' : ''}`} onClick={() => toggle(k)}>{st[k] ? 'On' : 'Off'}</button></Row>
  return (
    <div class="tab-body">
      <T k="haptics" label="Haptics" /><T k="sound" label="Sound" /><T k="reducedMotion" label="Reduced motion" /><T k="sci" label="Scientific notation" /><T k="fps30" label="30 fps battery mode" /><T k="leftHand" label="Left-hand layout" />
      {pwaInstall.available && <button class="btn" onClick={() => pwaInstall.prompt()}>📲 Install app</button>}
      <h3 class="h">Save</h3>
      <Row class="wrap">
        <button class="btn" onClick={async () => { const b = game.exportSave(); try { await navigator.clipboard.writeText(b); toast('Save copied to clipboard', 'good') } catch { prompt('Copy your save:', b) } }}>Export</button>
        <button class="btn" onClick={() => { const b = prompt('Paste a save string:'); if (b && game.importSave(b)) toast('Save imported', 'good'); else if (b) toast('Could not read that save', 'bad') }}>Import</button>
        <button class="btn" onClick={() => { if (confirm('Reset everything? This cannot be undone.')) { game.reset(); sheet.value = null } }}>Reset</button>
      </Row>
    </div>
  )
}

function Stats() {
  const s = game.s, st = s.stats
  const rows: [string, string][] = [['Strikes', fmt(st.strikesTotal)], ['Crits', fmt(st.critsTotal)], ['Resonances', fmt(st.resonancesTotal)], ['Grows', fmt(st.growsTotal)], ['Crafts', fmt(st.craftsTotal)], ['Masterworks', fmt(st.masterworksTotal)], ['Rituals', fmt(st.ritualsTotal)], ['Runes carved', fmt(s.lifetimeRunes)], ['Lanterns (lifetime)', fmt(s.lifetimeLanterns)], ['Seasons turned', fmt(s.prestige.count)], ['Lifetime Rings', fmt(s.prestige.lifetimeRings)], ['Lifetime Heartwood', fmt(s.lifetimeHeartwood)], ['Best height', `${fmt(s.prestige.bestHeight, { int: true })} m`], ['Fireflies (lifetime)', fmt(s.firefliesLifetime)], ['Set-pieces', fmt(st.setPiecesTotal)], ['Chests opened', fmt(st.chestsOpened)], ['Play time', fmtDuration(s.playTime)]]
  return <div class="tab-body">{rows.map(([k, v]) => <Row key={k}><span>{k}</span><b class="num">{v}</b></Row>)}<Small>Milestones: {s.milestones.length}/{game.ci.raw.milestones.length} · Cosmetics: {s.cosmetics.owned.length}/{game.ci.raw.cosmetics.length} · Codex {Math.round((s.codex.discovered.length / Math.max(1, game.ci.raw.recipes.filter((r) => r.discover).length)) * 100)}%</Small></div>
}

function Caravan() {
  const s = game.s, ci = game.ci
  const c = s.caravan
  if (c.activeUntil < game.now || !c.offers.length) return <Small>No caravan at the stump right now.</Small>
  return (
    <div class="tab-body">
      <Small>Leaves in {fmtDuration(c.activeUntil - game.now)}</Small>
      {c.offers.map((id) => { const o = ci.caravanOffers.get(id); if (!o) return null; const taken = c.taken.includes(id)
        return <Row key={id}><div class="grow1"><div>{o.name}</div><Small>{rewardText(ci, o.get)}</Small></div><BuyButton label={taken ? 'Traded' : 'Trade'} sub={<CostLine cost={o.give} />} disabled={taken || !game.canAfford(o.give)} onClick={() => { if (game.trade(id)) toast('Traded!', 'good', '🐫') }} /></Row> })}
      {c.cosmeticOffer && !s.cosmetics.owned.includes(c.cosmeticOffer) && <Small>Weekly cosmetic on offer: {ci.cosmetics.get(c.cosmeticOffer)?.name} (buy it in the Market)</Small>}
    </div>
  )
}
export { roman }

function Ladder() {
  const s = game.s, ci = game.ci
  return (
    <div class="tab-body">
      <Small>{Math.floor(s.height)} m · best {Math.floor(s.prestige.bestHeight)} m · {s.boughs.length}/{ci.bands.length} boughs open</Small>
      {ci.bands.map((b) => { const open = s.boughs.includes(b.id); const reached = s.height >= b.line; const cost = b.ritual ? ritualCost(ci, s, b.id, game.fx) : null
        return <Row key={b.id} class={open ? '' : reached ? '' : 'dimrow'}><span class="swatch" style={{ background: b.leaf }}>{b.glyph}</span><div class="grow1"><div>{b.name} <span class="chip">{b.line} m</span>{open && <span class="chip good">open</span>}{!open && reached && <span class="chip">ritual ready to try</span>}</div><Small>{b.desc}{cost && !open ? ` · Ritual: ${costText(ci, cost)}` : ''}{b.ritual?.requiresSeason ? ` · Season ${b.ritual.requiresSeason + 1}+` : ''}</Small></div></Row> })}
    </div>
  )
}
