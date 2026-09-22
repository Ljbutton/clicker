import { game, frame, sheet } from '../store'
import { Card, CostLine, BuyButton, Row, Small, Segmented } from '../cards'
import { Bar } from '../primitives'
import { fmt } from '@/engine/numbers'
import { workshopBuildable, needsForeman, producerCount, throughput, recipeInputs, workshopBuilt } from '@/systems/economy'
import { recipeLine, feedName } from '../helpers'
import { BALANCE } from '@/content/balance'
import { toast } from '../primitives'

export function CraftTab() {
  void frame.value
  const s = game.s, ci = game.ci
  const hints = game.hints()
  const shown = ci.raw.workshops.filter((w) => s.boughs.includes(w.bandId) && (s.workshops[w.id] || (s.height >= w.hook && (!ci.recipes.get(w.recipe)?.discover || s.codex.discovered.includes(w.recipe)))))
  const upcoming = ci.raw.workshops.filter((w) => s.boughs.includes(w.bandId) && !s.workshops[w.id] && !shown.includes(w))
  return (
    <div class="tab-body">
      {(hints.length > 0 || s.codex.discovered.length > 0) && (
        <Card id="crucible"><Row><div class="grow1"><div class="title">🔮 Crucible &amp; Codex</div><Small>{hints.length ? `${hints.length} recipe hint${hints.length > 1 ? 's' : ''} to discover` : `${s.codex.discovered.length} recipes discovered`}</Small></div><button class={`btn${hints.length ? ' btn-primary' : ''}`} onClick={() => (sheet.value = 'crucible')}>Open</button></Row></Card>
      )}
      {shown.map((w) => <WorkshopCard key={w.id} id={w.id} />)}
      {upcoming.map((w) => { const r = ci.recipes.get(w.recipe); const needsDiscovery = r?.discover && !s.codex.discovered.includes(w.recipe)
        return <Card key={w.id} id={w.id} class="locked"><div class="title">{w.glyph} {w.name}</div><Small>🔒 {needsDiscovery ? `Discover ${r?.name} in the Crucible` : `GROW to ${w.hook} m`}</Small></Card> })}
    </div>
  )
}

function WorkshopCard({ id }: { id: string }) {
  const s = game.s, ci = game.ci
  const w = ci.workshops.get(id)!
  const r = ci.recipes.get(w.recipe)!
  const out = ci.resources.get(r.output.id)!
  const built = workshopBuilt(s, id)
  const crew = ci.crewByStation.get(id)
  const crewN = crew ? producerCount(s, crew.id) : 0
  const foreman = crew ? needsForeman(ci, s, crew.id) : false
  const inputs = recipeInputs(ci, w.recipe, game.fx)
  const tp = throughput(ci, s, id, game.fx)
  const starved = game.starved[id]
  const feed = s.feed[id] ?? BALANCE.producers.feedDefault
  const canHand = game.canAfford(inputs)
  if (!built) {
    return (
      <Card id={id}><Row><div class="grow1"><div class="title">{w.glyph} {w.name}</div><Small>{recipeLine(ci, r)}</Small></div>
        <BuyButton primary={game.canAfford(w.cost)} label="Build" sub={<CostLine cost={w.cost} />} disabled={!workshopBuildable(ci, s, id) || !game.canAfford(w.cost)} onClick={() => game.buildWorkshop(id)} /></Row></Card>
    )
  }
  return (
    <Card id={id}>
      <div class="title">{w.glyph} {w.name} {crewN > 0 && <span class="chip">crew {crewN}</span>}{starved && <span class="chip bad">! {ci.resources.get(starved)?.glyph} {ci.resources.get(starved)?.name}</span>}</div>
      <Small>{recipeLine(ci, r, inputs)}</Small>
      <Row>
        <div class="grow1">
          {crewN > 0 ? <Small>{out.glyph} {fmt(tp, { digits: 2 })} crafts/s · stock {fmt(s.res[out.id] ?? 0, { int: true })}</Small> : <Small>No Foreman yet — tap to hand-craft</Small>}
          {foreman && crew && <><Bar value={s.res[out.id] ?? 0} max={Object.values(crew.foremanCost!)[0] ?? 1} height={6} /><Small>Foreman: {fmt(Math.min(s.res[out.id] ?? 0, Object.values(crew.foremanCost!)[0] ?? 0), { int: true })}/{Object.values(crew.foremanCost!)[0]} {out.name}</Small></>}
        </div>
        <div class="col">
          <button class={`btn${crewN === 0 ? ' btn-primary' : ''}`} disabled={!canHand} onClick={() => { const r = game.tapWorkshop(id); if (r.masterwork) toast('Masterwork! x3', 'reward', '💜') }}>⚒️ Craft</button>
          {foreman && crew && <BuyButton primary={game.canAfford(crew.foremanCost!)} label="Hire Foreman" sub={<CostLine cost={crew.foremanCost!} />} disabled={!game.canAfford(crew.foremanCost!)} onClick={() => game.hireForeman(crew.id)} />}
        </div>
      </Row>
      {crewN > 0 && <Row><Small>Feed</Small><Segmented value={feed} options={[...BALANCE.producers.feedOptions]} onChange={(v) => game.setFeed(id, v)} labels={(v) => feedName(v)} /></Row>}
    </Card>
  )
}
