import { game, frame, sheet } from '../store'
import { Card, CostLine, BuyButton, HoldButton, Row, Small } from '../cards'
import { Bar } from '../primitives'
import { fmt } from '@/engine/numbers'
import { growCostOne, growMeters, growMaxAffordable, ritualCost, ritualAvailable } from '@/systems/grow'
import { runeAvailable, runeCost, runeTier, limbCost, annexCost, annexAvailable, freeLimb, annexLevelCost, annexBuilt } from '@/systems/economy'
import { isUnlocked } from '@/systems/unlock'
import { roman, effectText, etaText } from '../helpers'
import { toast } from '../primitives'
import { BALANCE } from '@/content/balance'
import { EXPEDITION_HOURS } from '@/systems/seasons'
import { fmtDuration } from '@/engine/numbers'


export function GrowTab() {
  void frame.value
  const s = game.s, ci = game.ci
  const cost1 = growCostOne(s, game.fx), m = growMeters(s, game.fx), max = growMaxAffordable(ci, s, game.fx)
  const nb = game.nextBough()
  const runes = ci.raw.runes.filter((r) => runeAvailable(ci, s, r.id) || (s.runes[r.id] ?? 0) > 0)
  return (
    <div class="tab-body">
      <Card id="grow" class="grow-card">
        <Row>
          <BuyButton primary testid="grow" label={`GROW  +${m.toFixed(1)} m`} sub={<CostLine cost={{ [game.base]: cost1 }} />} disabled={(s.res[game.base] ?? 0) < cost1} onClick={() => game.grow(1)} onMax={() => game.grow('max')} />
          <button class="btn" disabled={max < 10} onClick={() => game.grow(10)}>x10</button>
          <button class="btn" disabled={max < 1} onClick={() => game.grow('max')}>MAX{max > 0 ? ` (${fmt(max, { int: true })})` : ''}</button>
        </Row>
        <Small>{Math.floor(s.height)} m · {s.grows} grows this Season · hold GROW for MAX</Small>
      </Card>
      {nb && <BoughCard id={nb.id} />}
      {game.hasMechanic('stewards') && <Stewards />}
      {game.hasMechanic('expeditions') && annexBuilt(s, 'trailhead') && <Expedition />}
      {ci.bands.filter((b) => s.boughs.includes(b.id) && b.limbSlots > 0).map((b) => <LimbsCard key={b.id} bandId={b.id} />)}
      {runes.length > 0 && <h3 class="h">Runes</h3>}
      {runes.map((r) => {
        const t = runeTier(s, r.id); const c = runeCost(ci, s, r.id); const can = t < r.maxTier && game.canAfford(c)
        return (
          <Card key={r.id} id={r.id}>
            <Row>
              <div class="grow1"><div class="title">{r.glyph} {r.name} {t > 0 && <span class="chip">{roman(t)}</span>}</div><Small>{effectText(r.effect, 1, ci)} per tier · {r.desc}</Small></div>
              <BuyButton label={t >= r.maxTier ? 'Max' : `Carve ${roman(t + 1)}`} sub={t < r.maxTier ? <CostLine cost={c} /> : undefined} disabled={!can} onClick={() => game.carveRune(r.id)} />
            </Row>
          </Card>
        )
      })}
      <Wishes />
    </div>
  )
}

function BoughCard({ id }: { id: string }) {
  const s = game.s, ci = game.ci
  const b = ci.bandById.get(id)!
  const avail = ritualAvailable(ci, s, id)
  const cost = ritualCost(ci, s, id, game.fx)
  const below = s.height < b.line
  const prog = Math.min(1, s.height / Math.max(1, b.line))
  return (
    <Card id={`ritual:${id}`} class="bough-card">
      <div class="title">{b.glyph} Next bough: {b.name} <span class="chip">{b.line} m</span></div>
      <Small>{b.desc}</Small>
      {below ? <><Bar value={s.height} max={b.line} color={b.leaf} /><Small>GROW to {b.line} m ({Math.round(prog * 100)}%)</Small></> : (
        <>
          {cost && <Row><Small>Ritual cost:</Small><CostLine cost={cost} /></Row>}
          <HoldButton class="btn-primary" seconds={BALANCE.ritual.holdMs / 1000} disabled={!avail.ok || !game.canAffordRitual(id)} onComplete={() => { if (!game.performRitual(id)) toast('Not enough goods for the Ritual', 'bad') }} label={avail.ok ? `Hold to perform the Ritual (${b.direction === 'down' ? 'plunge' : 'sprout'})` : avail.reason} />
        </>
      )}
    </Card>
  )
}

function LimbsCard({ bandId }: { bandId: string }) {
  const s = game.s, ci = game.ci
  const b = ci.bandById.get(bandId)!
  const built = s.limbs[bandId] ?? []
  const free = freeLimb(ci, s, bandId)
  const options = ci.raw.annexes.filter((a) => annexAvailable(ci, s, a.id, bandId) && isUnlocked(ci, s, a.unlock))
  if (!built.length && !options.length) return null
  return (
    <Card id={`limbs:${bandId}`}>
      <div class="title">🌿 {b.name} limbs <span class="chip">{built.length}/{b.limbSlots}</span></div>
      {built.map((aid) => { const a = ci.annexes.get(aid)!; const lvl = s.annexLevels[aid] ?? 0; const lc = annexLevelCost(ci, s, aid)
        return <Row key={aid}><div class="grow1"><div>{a.glyph} {a.name}{a.maxLevel ? ` · Lv ${lvl}/${a.maxLevel}` : ''}</div><Small>{a.desc}</Small>{a.special === 'hearth' && <HearthPicker />}</div>{lc && <BuyButton label="Upgrade" sub={<CostLine cost={lc} />} disabled={!game.canAfford(lc)} onClick={() => game.upgradeAnnex(aid)} />}</Row> })}
      {free && options.map((a) => { const cost = { ...annexCost(ci, s, a.id) }; for (const [r, n] of Object.entries(limbCost(s))) cost[r] = (cost[r] ?? 0) + n
        return <Row key={a.id}><div class="grow1"><div>{a.glyph} {a.name}</div><Small>{a.desc}</Small></div><BuyButton label="Sprout limb" sub={<CostLine cost={cost} />} disabled={!game.canAfford(cost)} onClick={() => game.buildAnnex(a.id, bandId)} /></Row> })}
    </Card>
  )
}

function HearthPicker() {
  const s = game.s, ci = game.ci
  const ws = ci.raw.workshops.filter((w) => s.workshops[w.id])
  return <select class="select" value={s.hearthTarget ?? ''} onChange={(e) => game.setHearth((e.target as HTMLSelectElement).value || null)}><option value="">Hearth: choose a workshop (x2)</option>{ws.map((w) => <option key={w.id} value={w.id}>{w.glyph} {w.name}</option>)}</select>
}

function Wishes() {
  const s = game.s, ci = game.ci
  if (!s.wishes.list.length) return null
  return (
    <Card id="wishes">
      <div class="title">🌠 Today's wishes</div>
      {s.wishes.list.map((w) => { const def = ci.wishes.get(w.id); if (!def) return null; const p = game.wishProgress(w.id)
        return <Row key={w.id}><div class="grow1"><div>{w.done ? '✅ ' : ''}{def.name}</div>{p && !w.done && <Bar value={p.have} max={p.need} height={6} />}</div><span class="chip">✨{def.fireflies}</span></Row> })}
      <Small>Fresh wishes every day. <button class="link" onClick={() => (sheet.value = 'waystone')}>Road ahead →</button> {etaText(0) === '' ? '' : ''}</Small>
    </Card>
  )
}

function Stewards() {
  const s = game.s
  return (
    <Card id="stewards"><Row><div class="grow1"><div class="title">🧑‍🌾 Stewards {s.stewardsOn ? <span class="chip good">working</span> : <span class="chip">resting</span>}</div><Small>One per bough; every 30 s they buy the cheapest lodge or crew level, never spending more than a tenth of your stock. {s.stats.stewardBuys} levels bought so far.</Small></div><button class={`btn sm${s.stewardsOn ? ' btn-good' : ''}`} onClick={() => game.setStewards(!s.stewardsOn)}>{s.stewardsOn ? 'On' : 'Off'}</button></Row></Card>
  )
}

function Expedition() {
  const rem = game.expeditionRemaining()
  const e = game.s.expedition
  return (
    <Card id="expedition">
      <div class="title">🧭 Expedition {e && <span class="chip">{e.folk} Folk away</span>}</div>
      {e ? <><Bar value={e.hours * 3600 - (rem ?? 0)} max={e.hours * 3600} height={6} /><Small>Back in ~{fmtDuration(rem ?? 0)} with a {e.hours >= 8 ? 'Star' : e.hours >= 4 ? 'Amber' : 'Bark'} chest. They keep walking while you are away.</Small></> : (
        <Row class="wrap"><Small>Send Folk off-tree. Longer trips bring better chests.</Small>{EXPEDITION_HOURS.map((h) => <button key={h} class="btn" onClick={() => game.startExpedition(h)}>{h} h → {h >= 8 ? '⭐' : h >= 4 ? '🟠' : '🪵'}</button>)}</Row>
      )}
    </Card>
  )
}
