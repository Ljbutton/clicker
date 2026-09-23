/** A modeled multi-day run: exercises Turns 6-10 (Stewards, Star Charts, Expeditions, Great Ring). */
import { content } from '@/content/data'
import { runBot } from './bot'
import { fmt, fmtDuration } from '@/engine/numbers'
const r = runBot(content, { profile: 'active', seconds: 6 * 3600, turn: true, sessionOn: 600, sessionOff: 3600, seed: 11 })
const g = r.game
console.log(`play ${fmtDuration(r.seconds)} · turns ${g.s.prestige.count} · rings ${g.s.prestige.lifetimeRings} · mechanics ${g.ci.raw.mechanics.filter((m) => m.implemented && m.atTurn > 0 && g.s.prestige.count >= m.atTurn).map((m) => m.id).join(',')} · stewardBuys ${g.s.stats.stewardBuys} · charts ${g.s.stats.chartsPicked} · expeditions ${g.s.stats.expeditions} · kites ${g.s.stats.kitesReturned} · height ${Math.round(g.s.height)} · sap ${fmt(g.s.res.sap ?? 0)} · cosmetics ${g.s.cosmetics.owned.length}`)
for (const e of r.timeline.filter((e) => e.kind === 'turn')) console.log(`${fmtDuration(e.t).padStart(9)} ${e.what}`)
const bad = Object.entries(g.s.res).filter(([, v]) => !Number.isFinite(v) || v < 0)
console.log('non-finite:', bad.length, '· save bytes:', JSON.stringify(g.s).length)
