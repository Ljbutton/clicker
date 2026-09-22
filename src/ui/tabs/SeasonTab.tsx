import { game, frame } from '../store'
import { Card, HoldButton, BuyButton, Row, Small } from '../cards'
import { Bar } from '../primitives'
import { fmt, fmtDuration } from '@/engine/numbers'
import { heartwoodFor, nodeCost, nodeLevel, nodeVisible } from '@/systems/prestige'
import { effectText } from '../helpers'
import { BALANCE } from '@/content/balance'
import type { Limb } from '@/content/types'

const LIMBS: { id: Limb; name: string; glyph: string }[] = [{ id: 'roots', name: 'Roots', glyph: '🌱' }, { id: 'trunk', name: 'Trunk', glyph: '🪵' }, { id: 'canopy', name: 'Canopy', glyph: '🍃' }, { id: 'crown', name: 'Crown', glyph: '👑' }, { id: 'heartwood', name: 'Heartwood', glyph: '🌀' }]

export function SeasonTab() {
  void frame.value
  const s = game.s, ci = game.ci
  const rings = game.rings, min = BALANCE.prestige.minRings
  const nextHW = heartwoodFor(rings + 1)
  const eta = game.heartwoodRate > 0 ? (nextHW - s.heartwood) / game.heartwoodRate : Infinity
  const cur = ci.raw.mechanics.find((m) => m.atTurn === s.prestige.count)
  const next = ci.raw.mechanics.find((m) => m.atTurn === s.prestige.count + 1)
  return (
    <div class="tab-body">
      <Card id="turn" class="turn-card">
        <div class="title">🌀 Turn the Season <span class="chip">Season {s.prestige.count + 1}{cur ? ` · ${cur.seasonName}` : ''}</span></div>
        <Small>Heartwood {fmt(s.heartwood)} · Rings now: <b>{rings}</b>{Number.isFinite(eta) ? ` · +1 in ~${fmtDuration(eta)}` : ''} · unspent {s.prestige.rings} · lifetime {s.prestige.lifetimeRings}</Small>
        <Bar value={Math.log10(Math.max(1, s.heartwood))} max={Math.log10(nextHW)} height={6} />
        {rings < min ? <Small>Turn at {min} Rings. {next ? `Next: ${next.seasonName} — ${next.name}` : ''}</Small> : (
          <HoldButton class="btn-primary" seconds={BALANCE.prestige.holdMs / 1000} onComplete={() => game.turnSeason()} label={`Hold to Turn: +${rings} Rings${rings < BALANCE.prestige.recommendRings ? ' (recommended at 5)' : ''}`} />
        )}
        {next && <Small>{next.glyph} Turn {next.atTurn} unlocks <b>{next.name}</b>: {next.desc}{next.implemented ? '' : ' (next update)'}</Small>}
      </Card>
      {(s.prestige.count > 0 || s.prestige.lifetimeRings > 0) && <RingTree />}
      <Ladder />
    </div>
  )
}

function RingTree() {
  const s = game.s, ci = game.ci
  return (
    <>
      <h3 class="h">Ring Tree · {s.prestige.rings} Rings</h3>
      {LIMBS.map((l) => {
        const nodes = ci.raw.prestigeNodes.filter((n) => n.limb === l.id)
        if (!nodes.length) return null
        return (
          <Card key={l.id} id={`limb:${l.id}`}>
            <div class="title">{l.glyph} {l.name}</div>
            {nodes.map((n) => { const lvl = nodeLevel(s, n.id); const vis = nodeVisible(ci, s, n.id); const cost = nodeCost(ci, s, n.id); const maxed = lvl >= n.maxLevel
              return <Row key={n.id} class={vis ? '' : 'dimrow'}><div class="grow1"><div>{n.glyph} {n.name} <span class="chip">{lvl}/{n.maxLevel}</span></div><Small>{n.effect ? effectText(n.effect, 1, ci) + ' · ' : ''}{n.desc}{!vis ? ` · 🔒 ${n.requiresSeason ? `Season ${n.requiresSeason + 1}` : n.requiresNode ? ci.prestigeNodes.get(n.requiresNode)?.name : 'later'}` : ''}</Small></div>
                <BuyButton label={maxed ? 'Max' : `${cost} 🌀`} disabled={!vis || maxed || s.prestige.rings < cost} onClick={() => game.buyNode(n.id)} /></Row> })}
          </Card>
        )
      })}
    </>
  )
}

function Ladder() {
  const s = game.s, ci = game.ci
  return (
    <Card id="ladder">
      <div class="title">📜 The Season ladder</div>
      {ci.raw.mechanics.filter((m) => m.atTurn > 0).map((m) => <Row key={m.id} class={m.atTurn <= s.prestige.count ? 'done' : ''}><span class="swatch" style={{ background: m.palette.leaf }} /><div class="grow1"><div>{m.glyph} Turn {m.atTurn}: {m.seasonName} — <b>{m.name}</b>{!m.implemented && <span class="chip">next update</span>}{m.atTurn <= s.prestige.count && ' ✅'}</div><Small>{m.desc}{m.medal ? ` · medal: ${ci.cosmetics.get(m.medal)?.name}` : ''}</Small></div></Row>)}
    </Card>
  )
}
