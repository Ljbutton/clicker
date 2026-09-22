import { game, frame } from '../store'
import { Card, CostLine, BuyButton, Row, Small } from '../cards'
import { Bar } from '../primitives'
import { fmt, fmtRate } from '@/engine/numbers'
import { producerAvailable, producerCost, producerCount, nextMilestone, milestoneMult, needsForeman, producerMaxAffordable } from '@/systems/economy'
import { describeUnlock } from '@/systems/unlock'

export function FolkTab() {
  void frame.value
  const s = game.s, ci = game.ci
  const lodges = ci.raw.producers.filter((p) => p.kind === 'lodge' && (producerAvailable(ci, s, p.id) || producerCount(s, p.id) > 0))
  const crews = ci.raw.producers.filter((p) => p.kind === 'crew' && p.station && s.workshops[p.station] && !needsForeman(ci, s, p.id))
  const locked = ci.raw.producers.filter((p) => p.kind === 'lodge' && !producerAvailable(ci, s, p.id) && s.boughs.includes(p.bandId))
  return (
    <div class="tab-body">
      {lodges.map((p) => <ProducerCard key={p.id} id={p.id} />)}
      {crews.length > 0 && <h3 class="h">Workshop crews</h3>}
      {crews.map((p) => <ProducerCard key={p.id} id={p.id} />)}
      {locked.map((p) => <Card key={p.id} id={p.id} class="locked"><div class="title">{p.glyph} {p.name}</div><Small>🔒 {describeUnlock(ci, p.unlock)}</Small></Card>)}
    </div>
  )
}

export function ProducerCard({ id }: { id: string }) {
  const s = game.s, ci = game.ci
  const p = ci.producers.get(id)!
  const n = producerCount(s, id)
  const nm = nextMilestone(n)
  const prevM = [0, 10, 25, 50, 100, 200].filter((x) => x <= n).pop() ?? 0
  const cost1 = producerCost(ci, s, id, game.fx, 1)
  const max = producerMaxAffordable(ci, s, id, game.fx)
  const rate = p.produces ? game.gross[p.produces.id] : 0
  const isCrew = p.kind === 'crew'
  const each = p.produces ? p.produces.rate * milestoneMult(n, game.fx) : 0
  const res = p.produces ? ci.resources.get(p.produces.id) : null
  const affordable = game.canAfford(cost1)
  return (
    <Card id={id}>
      <Row>
        <div class="grow1">
          <div class="title">{p.glyph} {p.name} <span class="chip">{isCrew ? 'crew' : 'Lv'} {n}</span>{n >= 50 && !isCrew && <span class="chip">Chief</span>}</div>
          {p.produces && !isCrew && <Small>{res?.glyph} {fmtRate(rate ?? 0)} total · {fmt(each, { digits: 2 })}/s each · x{milestoneMult(n, game.fx)}</Small>}
          {isCrew && <Small>{ci.workshops.get(p.station!)?.name} · x{milestoneMult(n, game.fx)} throughput</Small>}
          <Bar value={n - prevM} max={nm - prevM} height={6} />
          <Small>next: x{nm >= 25 ? 2 : 1.5} at {nm} ({n}/{nm})</Small>
        </div>
        <div class="col">
          <BuyButton primary={affordable} label="+1" sub={<CostLine cost={cost1} />} disabled={!affordable} onClick={() => game.buyProducer(id, 1)} onMax={() => game.buyProducer(id, 'max')} />
          {n >= 10 && <Row class="tight"><button class="btn sm" disabled={max < 10} onClick={() => game.buyProducer(id, 10)}>x10</button><button class="btn sm" disabled={max < 1} onClick={() => game.buyProducer(id, 'max')}>MAX</button></Row>}
        </div>
      </Row>
    </Card>
  )
}
