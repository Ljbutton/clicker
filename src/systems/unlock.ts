import type { Unlock, Condition } from '@/content/types'
import type { GameState } from '@/engine/state'
import type { ContentIndex } from './index'

export function isUnlocked(ci: ContentIndex, s: GameState, u: Unlock): boolean {
  switch (u.kind) {
    case 'always': return true
    case 'height': return s.height >= u.min
    case 'bough': return s.boughs.includes(u.id)
    case 'workshop': return !!s.workshops[u.id]
    case 'crew': { const c = ci.crewByStation.get(u.id); return !!c && (s.producers[c.id] ?? 0) >= (u.min ?? 1) }
    case 'producer': return (s.producers[u.id] ?? 0) >= u.count
    case 'annex': return Object.values(s.limbs).some((l) => l.includes(u.id))
    case 'season': return s.prestige.count >= u.min
    case 'discovered': return s.codex.discovered.includes(u.recipe)
    case 'goal': { const i = ci.raw.waystoneSeason1.findIndex((g) => g.id === u.id); return i >= 0 && (s.prestige.count > 0 || s.laneIndex > i) }
    case 'all': return u.of.every((x) => isUnlocked(ci, s, x))
  }
}

export function describeUnlock(ci: ContentIndex, u: Unlock): string {
  switch (u.kind) {
    case 'always': return ''
    case 'height': return `Reach ${u.min} m`
    case 'bough': return `Open ${ci.bandById.get(u.id)?.name ?? u.id}`
    case 'workshop': return `Build the ${ci.workshops.get(u.id)?.name ?? u.id}`
    case 'crew': return `Hire the ${ci.workshops.get(u.id)?.name ?? u.id} Foreman`
    case 'producer': return `${u.count}× ${ci.producers.get(u.id)?.name ?? u.id}`
    case 'annex': return `Build the ${ci.annexes.get(u.id)?.name ?? u.id}`
    case 'season': return `Season ${u.min + 1}`
    case 'discovered': return `Discover ${ci.recipes.get(u.recipe)?.name ?? u.recipe}`
    case 'goal': return `Waystone goal`
    case 'all': return u.of.map((x) => describeUnlock(ci, x)).filter(Boolean).join(', ')
  }
}

export function codexPct(ci: ContentIndex, s: GameState): number {
  const total = ci.raw.recipes.filter((r) => r.discover).length
  return total ? s.codex.discovered.length / total : 1
}

export function totalCraftsTier(ci: ContentIndex, s: GameState, tier: number): number {
  let n = 0
  for (const [id, c] of Object.entries(s.crafted)) { const r = ci.recipes.get(id); if (r && (ci.resources.get(r.output.id)?.tier ?? 0) === tier) n += c }
  return n
}

/** Progress toward a condition: {have, need}. Satisfied when have >= need. */
export function conditionProgress(ci: ContentIndex, s: GameState, c: Condition): { have: number; need: number } {
  const st = s.stats
  switch (c.kind) {
    case 'strikes': return { have: st.strikesTotal, need: c.min }
    case 'crits': return { have: st.critsTotal, need: c.min }
    case 'resonances': return { have: st.resonancesTotal, need: c.min }
    case 'grows': return { have: s.grows, need: c.min }
    case 'height': return { have: s.height, need: c.min }
    case 'bough': return { have: s.boughs.includes(c.id) ? 1 : 0, need: 1 }
    case 'boughs': return { have: s.boughs.length, need: c.min }
    case 'producer': return { have: s.producers[c.id] ?? 0, need: c.min }
    case 'workshop': return { have: s.workshops[c.id] ? 1 : 0, need: 1 }
    case 'annex': return { have: Object.values(s.limbs).some((l) => l.includes(c.id)) ? 1 : 0, need: 1 }
    case 'limbs': return { have: s.limbsBought, need: c.min }
    case 'handcrafts': return { have: s.handcrafts[c.station] ?? 0, need: c.min }
    case 'crafted': return { have: Math.floor(s.crafted[c.id] ?? 0), need: c.min }
    case 'craftsTier': return { have: Math.floor(totalCraftsTier(ci, s, c.tier)), need: c.min }
    case 'lanterns': return { have: Math.floor(c.lifetime ? s.lifetimeLanterns : (s.crafted['lantern'] ?? 0)), need: c.min }
    case 'rune': return { have: s.runes[c.id] ?? 0, need: c.min }
    case 'runes': return { have: s.lifetimeRunes, need: c.min }
    case 'discovered': return { have: s.codex.discovered.includes(c.recipe) ? 1 : 0, need: 1 }
    case 'codex': return { have: Math.round(codexPct(ci, s) * 100), need: c.pct }
    case 'seasons': return { have: s.prestige.count, need: c.min }
    case 'rings': return { have: 0, need: c.min } // filled by prestige system via ringsNow (see waystone)
    case 'lifetimeRings': return { have: s.prestige.lifetimeRings, need: c.min }
    case 'setpiece': return { have: s.setPieceCounts[c.id] ?? 0, need: c.min }
    case 'setpieces': return { have: st.setPiecesTotal, need: c.min }
    case 'fireflies': return { have: s.firefliesLifetime, need: c.min }
    case 'streak': return { have: s.streak.count, need: c.min }
    case 'masterworks': return { have: st.masterworksTotal, need: c.min }
    case 'kites': return { have: s.kites, need: c.min }
    case 'cosmetics': return { have: s.cosmetics.owned.length, need: c.min }
    case 'thaws': return { have: st.thaws, need: c.min }
    case 'gusts': return { have: st.gusts, need: c.min }
    case 'discharges': return { have: st.discharges, need: c.min }
    case 'trades': return { have: st.trades, need: c.min }
    case 'blooms': return { have: st.blooms, need: c.min }
  }
}

export function checkCondition(ci: ContentIndex, s: GameState, c: Condition, ringsNow = 0): boolean {
  if (c.kind === 'rings') return ringsNow >= c.min
  const p = conditionProgress(ci, s, c)
  return p.have >= p.need
}
