/** CLI: npm run sim [-- minutes profile]. Prints the unlock timeline and the §17 assertions. */
import { content } from '@/content/data'
import { runBot, firstTime, goalTime, type BotResult } from './bot'
import { fmtDuration, fmt } from '@/engine/numbers'

const minutes = Number(process.argv[2] ?? 70)
const profile = (process.argv[3] as 'active' | 'casual' | 'notap' | undefined) ?? 'active'
const verbose = process.argv.includes('-v')

function report(r: BotResult, label: string) {
  console.log(`\n=== ${label}: ${fmtDuration(r.seconds)} played · height ${Math.round(r.game.s.height)} m · bough ${r.game.bough.name} · sap ${fmt(r.game.s.res.sap ?? 0)} (${fmt(r.game.idleSap)}/s) · HW ${fmt(r.game.s.heartwood)} · rings ${r.game.rings} · lane #${r.game.s.laneIndex + 1} · turns ${r.game.s.prestige.count}`)
  const tapShare = r.totalSap > 0 ? r.tapSap / r.totalSap : 0
  console.log(`tap share of Sap: ${(tapShare * 100).toFixed(0)}%  · goals done ${r.timeline.filter((e) => e.kind === 'goal').length} · foremen ${r.timeline.filter((e) => e.kind === 'foreman').length} · rituals ${r.timeline.filter((e) => e.kind === 'ritual').length}`)
}

function assertions(active: BotResult, casual: BotResult, notap: BotResult) {
  const rows: [string, boolean, string][] = []
  const t = (r: BotResult, k: string, f?: (e: any) => boolean) => firstTime(r, k, f)
  const chk = (name: string, v: number | null, lo: number, hi: number) => rows.push([name, v != null && v >= lo && v <= hi, v == null ? 'never' : fmtDuration(v)])
  chk('1 First Sapper ≤ 0:30 active', t(active, 'lodge', (e) => e.what.startsWith('Sapper')), 0, 30)
  chk('1 First Sapper ≤ 0:45 casual', t(casual, 'lodge', (e) => e.what.startsWith('Sapper')), 0, 45)
  chk('2 Kiln Foreman ≤ 1:30 active', t(active, 'foreman', (e) => e.what === 'Kiln'), 0, 90)
  chk('2 Kiln Foreman ≤ 2:00 casual', t(casual, 'foreman', (e) => e.what === 'Kiln'), 0, 120)
  chk('4 Sawmill Foreman ≤ 4:30 active', t(active, 'foreman', (e) => e.what === 'Sawmill'), 0, 270)
  chk('4 Sawmill Foreman ≤ 6:00 casual', t(casual, 'foreman', (e) => e.what === 'Sawmill'), 0, 360)
  chk('6 Bough 2 Ritual 4:00-8:00 active', t(active, 'ritual', (e) => e.what === 'Roots'), 240, 480)
  chk('6 Bough 2 Ritual ≤ 9:10 casual', t(casual, 'ritual', (e) => e.what === 'Roots'), 240, 550)
  chk('8 Canopy line 5:30-9:30 active', t(active, 'line', (e) => e.what === 'Canopy'), 330, 570)
  chk('8 Bough 3 Ritual 8:30-13:00 active', t(active, 'ritual', (e) => e.what === 'Canopy'), 510, 780)
  chk('10 Bough 4 Ritual 14-22 min active', t(active, 'ritual', (e) => e.what === 'Upper Trunk'), 840, 1320)
  chk('10 Bough 5 Ritual 22-38 min active', t(active, 'ritual', (e) => e.what === 'Deep Roots'), 1320, 2280)
  chk('11 3 Rings 30-47 min active', t(active, 'rings', (e) => e.what.startsWith('3 ')), 1800, 2820)
  chk('11 5 Rings 40-60 min active', t(active, 'rings', (e) => e.what.startsWith('5 ')), 2400, 3600)
  chk('11 5 Rings 48-75 min casual', t(casual, 'rings', (e) => e.what.startsWith('5 ')), 2880, 4500)
  // 9/12: lane gaps
  const goals = active.timeline.filter((e) => e.kind === 'goal').map((e) => e.t)
  let maxGap30 = 0, maxGapAll = 0
  for (let i = 1; i < goals.length; i++) { const gap = goals[i]! - goals[i - 1]!; if (goals[i]! <= 1800) maxGap30 = Math.max(maxGap30, gap); maxGapAll = Math.max(maxGapAll, gap) }
  rows.push(['9 No lane gap > 3:30 in first 30 min (active)', maxGap30 <= 210, fmtDuration(maxGap30)])
  rows.push(['12 No lane gap > 8 min before first Turn (active)', maxGapAll <= 480, fmtDuration(maxGapAll)])
  const cg = casual.timeline.filter((e) => e.kind === 'goal').map((e) => e.t)
  let cGap = 0; for (let i = 1; i < cg.length; i++) if (cg[i]! <= 1800) cGap = Math.max(cGap, cg[i]! - cg[i - 1]!)
  rows.push(['9 No lane gap > 4:00 in first 30 min (casual)', cGap <= 240, fmtDuration(cGap)])
  // 15: taps 25-45% after minute 10; no-tap within 1.6x for Bough 5
  const share = active.totalSap > 0 ? active.tapSap / active.totalSap : 0
  rows.push(['15 Tap share 25-45% (active, whole run)', share >= 0.2 && share <= 0.5, `${(share * 100).toFixed(0)}%`])
  const a5 = t(active, 'ritual', (e) => e.what === 'Deep Roots'), n5 = t(notap, 'ritual', (e) => e.what === 'Deep Roots')
  rows.push(['15 No-tap reaches Bough 5 within 1.6x of active', a5 != null && n5 != null && n5 <= a5 * 1.6, a5 != null && n5 != null ? `${fmtDuration(n5)} vs ${fmtDuration(a5)}` : `${n5 == null ? 'notap never' : ''} ${a5 == null ? 'active never' : ''}`])
  console.log('\n--- §17 assertions ---')
  for (const [name, ok, v] of rows) console.log(`${ok ? '✅' : '❌'} ${name.padEnd(52)} ${v}`)
  const fails = rows.filter((r) => !r[1]).length
  console.log(`${rows.length - fails}/${rows.length} passed`)
  return fails
}

if (profile === 'active' && !process.argv.includes('--single')) {
  const active = runBot(content, { profile: 'active', seconds: minutes * 60, verbose, turn: false })
  report(active, 'ACTIVE')
  const casual = runBot(content, { profile: 'casual', seconds: minutes * 60, turn: false })
  report(casual, 'CASUAL')
  const notap = runBot(content, { profile: 'notap', seconds: minutes * 60, turn: false })
  report(notap, 'NO-TAP')
  const fails = assertions(active, casual, notap)
  process.exitCode = fails > 0 ? 1 : 0
} else {
  const r = runBot(content, { profile, seconds: minutes * 60, verbose: true, turn: true })
  report(r, profile.toUpperCase())
}
