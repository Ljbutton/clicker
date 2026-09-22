import { content } from '@/content/data'
import { runBot } from './bot'
import { fmt, fmtDuration } from '@/engine/numbers'
const r = runBot(content, { profile: 'active', seconds: 100 * 60, turn: true, sessionOn: 480, sessionOff: 7200, seed: 3 })
const g = r.game
console.log(`played ${fmtDuration(r.seconds)} (incl. offline) · turns ${g.s.prestige.count} · lifetime rings ${g.s.prestige.lifetimeRings} · height ${Math.round(g.s.height)} · bough ${g.bough.name} · sap ${fmt(g.s.res.sap ?? 0)} · idle ${fmt(g.idleSap)}/s · HW lifetime ${fmt(g.s.lifetimeHeartwood)} · fireflies ${g.s.firefliesLifetime} · glimmer ${g.s.glimmerEarned} · cosmetics ${g.s.cosmetics.owned.length} · nodes ${Object.keys(g.s.prestige.nodes).length} · mechanics ${g.ci.raw.mechanics.filter((m) => m.implemented && m.atTurn > 0 && g.s.prestige.count >= m.atTurn).map((m) => m.id).join(',')}`)
for (const e of r.timeline.filter((e) => ['turn', 'offline', 'season', 'annex'].includes(e.kind))) console.log(`${fmtDuration(e.t).padStart(9)} ${e.kind.padEnd(8)} ${e.what} ${e.detail ?? ''}`)
const bad = Object.entries(g.s.res).filter(([, v]) => !Number.isFinite(v) || v < 0)
console.log('non-finite/negative resources:', bad.length, '· save bytes:', JSON.stringify(g.s).length)
console.log('season HW', fmt(g.s.heartwood), 'rings', g.rings, 'laneIndex', g.s.laneIndex, 'pinned', g.pinned?.kind, g.pinned?.name, 'compassBest', g.compassBest?.kind, g.compassBest?.name, 'canTurn', g.canTurn)
const s = g.s
console.log('hints', g.hints().map((h) => h.recipe.id), 'discovered', s.codex.discovered, 'honey', fmt(s.res.honey ?? 0), 'resin', fmt(s.res.resin ?? 0), 'beekeeper', s.producers.beekeeper, 'ambervault', s.workshops.ambervault, 'amber', fmt(s.res.amber ?? 0), 'lacquer', fmt(s.res.lacquer ?? 0), 'limbs', JSON.stringify(s.limbs), 'lane head', g.ci.raw.waystoneSeason1[s.laneIndex]?.name)
